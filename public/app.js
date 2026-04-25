const STORAGE_KEY = 'local-llm-portal-conversations-v1';
const CURRENT_KEY = 'local-llm-portal-current-id';
const MAX_FILE_CHARS = 40_000;
const MAX_FILES = 6;

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'csv',
  'json',
  'jsonl',
  'log',
  'xml',
  'yaml',
  'yml',
  'js',
  'jsx',
  'ts',
  'tsx',
  'mjs',
  'cjs',
  'html',
  'css',
  'scss',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'sh',
  'zsh',
  'sql',
  'ini',
  'conf',
  'env'
]);

const state = {
  conversations: [],
  currentId: null,
  pendingAttachments: [],
  sending: false
};

const elements = {
  conversationList: document.querySelector('#conversationList'),
  newChatButton: document.querySelector('#newChatButton'),
  messages: document.querySelector('#messages'),
  composerForm: document.querySelector('#composerForm'),
  promptInput: document.querySelector('#promptInput'),
  attachButton: document.querySelector('#attachButton'),
  fileInput: document.querySelector('#fileInput'),
  attachmentTray: document.querySelector('#attachmentTray'),
  sendButton: document.querySelector('#sendButton'),
  healthPill: document.querySelector('#healthPill'),
  healthText: document.querySelector('#healthText'),
  refreshHealthButton: document.querySelector('#refreshHealthButton'),
  modelEndpoint: document.querySelector('#modelEndpoint'),
  temperatureInput: document.querySelector('#temperatureInput'),
  temperatureValue: document.querySelector('#temperatureValue'),
  maxTokensInput: document.querySelector('#maxTokensInput')
};

function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function getExtension(fileName) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function isTextLike(file) {
  return file.type.startsWith('text/') || TEXT_EXTENSIONS.has(getExtension(file.name));
}

function createConversation() {
  const now = Date.now();

  return {
    id: createId(),
    title: 'New chat',
    createdAt: now,
    updatedAt: now,
    messages: [],
    options: {
      temperature: 0.3,
      maxTokens: 512
    }
  };
}

function loadState() {
  try {
    state.conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    state.conversations = [];
  }

  if (!Array.isArray(state.conversations) || state.conversations.length === 0) {
    const conversation = createConversation();
    state.conversations = [conversation];
    state.currentId = conversation.id;
    saveState();
    return;
  }

  const savedCurrentId = localStorage.getItem(CURRENT_KEY);
  state.currentId = state.conversations.some((conversation) => conversation.id === savedCurrentId)
    ? savedCurrentId
    : state.conversations[0].id;
}

function saveState() {
  const capped = state.conversations
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 24);

  state.conversations = capped;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.conversations));
  localStorage.setItem(CURRENT_KEY, state.currentId || '');
}

function currentConversation() {
  return state.conversations.find((conversation) => conversation.id === state.currentId);
}

function updateConversationTitle(conversation) {
  if (!conversation || conversation.title !== 'New chat') {
    return;
  }

  const firstUserMessage = conversation.messages.find((message) => message.role === 'user');
  if (!firstUserMessage) {
    return;
  }

  const title = firstUserMessage.content.replace(/\s+/g, ' ').trim();
  conversation.title = title ? title.slice(0, 54) : 'File analysis';
}

function messageForApi(message) {
  return {
    role: message.role,
    content: message.content,
    apiContent: message.apiContent || message.content
  };
}

function renderConversations() {
  elements.conversationList.innerHTML = '';

  state.conversations.forEach((conversation) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `conversation-item${conversation.id === state.currentId ? ' active' : ''}`;
    button.dataset.id = conversation.id;

    const title = document.createElement('div');
    title.className = 'conversation-title';
    title.textContent = conversation.title || 'New chat';

    const date = document.createElement('div');
    date.className = 'conversation-date';
    date.textContent = formatDate(conversation.updatedAt);

    button.append(title, date);
    elements.conversationList.append(button);
  });
}

function renderEmptyState() {
  const empty = document.createElement('div');
  empty.className = 'empty-state';

  const mark = document.createElement('img');
  mark.src = '/mark.svg';
  mark.alt = '';

  const title = document.createElement('div');
  title.className = 'empty-title';
  title.textContent = 'Local Qwen';

  const sub = document.createElement('div');
  sub.textContent = 'Ready when the model is.';

  empty.append(mark, title, sub);
  elements.messages.append(empty);
}

function renderMessage(message) {
  const wrapper = document.createElement('article');
  wrapper.className = `message ${message.role}${message.error ? ' error' : ''}`;

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = message.role === 'user' ? 'You' : 'AI';

  const body = document.createElement('div');
  body.className = 'message-body';

  const author = document.createElement('div');
  author.className = 'message-author';
  author.textContent = message.role === 'user' ? 'You' : 'Assistant';

  const content = document.createElement('div');
  content.className = 'message-content';
  content.textContent = message.content;

  body.append(author, content);

  if (message.attachments?.length) {
    const attachmentList = document.createElement('div');
    attachmentList.className = 'message-attachments';

    message.attachments.forEach((attachment) => {
      const chip = document.createElement('span');
      chip.className = 'sent-attachment';
      chip.textContent = `${attachment.name} (${formatSize(attachment.size)})`;
      attachmentList.append(chip);
    });

    body.append(attachmentList);
  }

  wrapper.append(avatar, body);
  elements.messages.append(wrapper);
}

function renderTypingMessage() {
  const wrapper = document.createElement('article');
  wrapper.className = 'message assistant';

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = 'AI';

  const body = document.createElement('div');
  body.className = 'message-body';

  const author = document.createElement('div');
  author.className = 'message-author';
  author.textContent = 'Assistant';

  const content = document.createElement('div');
  content.className = 'message-content';

  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.innerHTML = '<span></span><span></span><span></span>';

  content.append(typing);
  body.append(author, content);
  wrapper.append(avatar, body);
  elements.messages.append(wrapper);
}

function renderMessages() {
  const conversation = currentConversation();
  elements.messages.innerHTML = '';

  if (!conversation || conversation.messages.length === 0) {
    renderEmptyState();
  } else {
    conversation.messages.forEach(renderMessage);
  }

  if (state.sending) {
    renderTypingMessage();
  }

  requestAnimationFrame(() => {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  });
}

function renderAttachments() {
  elements.attachmentTray.innerHTML = '';

  state.pendingAttachments.forEach((attachment) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';

    const label = document.createElement('span');
    label.textContent = `${attachment.name} (${formatSize(attachment.size)})`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.ariaLabel = `Remove ${attachment.name}`;
    remove.title = `Remove ${attachment.name}`;
    remove.dataset.id = attachment.id;
    remove.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>';

    chip.append(label, remove);
    elements.attachmentTray.append(chip);
  });
}

function syncOptionsToUi() {
  const conversation = currentConversation();
  const options = conversation?.options || { temperature: 0.3, maxTokens: 512 };

  elements.temperatureInput.value = String(options.temperature);
  elements.temperatureValue.value = Number(options.temperature).toFixed(1);
  elements.maxTokensInput.value = String(options.maxTokens);
}

function saveOptionsFromUi() {
  const conversation = currentConversation();
  if (!conversation) {
    return;
  }

  conversation.options = {
    temperature: Number(elements.temperatureInput.value),
    maxTokens: Number.parseInt(elements.maxTokensInput.value || '512', 10)
  };
  conversation.updatedAt = Date.now();
  saveState();
}

function render() {
  renderConversations();
  renderMessages();
  renderAttachments();
  syncOptionsToUi();
}

function setHealth(status, label, endpoint = '') {
  elements.healthPill.classList.remove('online', 'offline', 'checking');
  elements.healthPill.classList.add(status);
  elements.healthText.textContent = label;
  elements.modelEndpoint.textContent = endpoint || 'Endpoint unavailable';
}

async function checkHealth() {
  setHealth('checking', 'Checking', elements.modelEndpoint.textContent);

  try {
    const response = await fetch('/api/health');
    const data = await response.json();

    if (!response.ok || !data.ok) {
      setHealth('offline', 'Offline', data.endpoint);
      return;
    }

    setHealth('online', `${data.latencyMs} ms`, data.endpoint);
  } catch {
    setHealth('offline', 'Offline');
  }
}

async function readSelectedFiles(files) {
  const accepted = [];
  const rejected = [];

  for (const file of files) {
    if (state.pendingAttachments.length + accepted.length >= MAX_FILES) {
      rejected.push(`${file.name} skipped`);
      continue;
    }

    if (!isTextLike(file)) {
      rejected.push(`${file.name} unsupported`);
      continue;
    }

    const rawContent = await file.text();
    const content = rawContent.slice(0, MAX_FILE_CHARS);

    accepted.push({
      id: createId(),
      name: file.name,
      type: file.type || 'text/plain',
      size: file.size,
      content,
      truncated: rawContent.length > content.length
    });
  }

  state.pendingAttachments.push(...accepted);
  renderAttachments();

  if (rejected.length > 0) {
    addTransientError(rejected.join('. '));
  }
}

function addTransientError(text) {
  const conversation = currentConversation();
  if (!conversation) {
    return;
  }

  conversation.messages.push({
    role: 'assistant',
    content: text,
    error: true
  });
  conversation.updatedAt = Date.now();
  saveState();
  render();
}

function resetPromptHeight() {
  elements.promptInput.style.height = 'auto';
  elements.promptInput.style.height = `${Math.min(elements.promptInput.scrollHeight, 180)}px`;
}

function setSending(isSending) {
  state.sending = isSending;
  elements.sendButton.disabled = isSending;
  elements.attachButton.disabled = isSending;
  elements.promptInput.disabled = isSending;
  renderMessages();
}

async function sendMessage() {
  const conversation = currentConversation();
  const prompt = elements.promptInput.value.trim();

  if (!conversation || state.sending) {
    return;
  }

  if (!prompt && state.pendingAttachments.length === 0) {
    return;
  }

  const attachments = state.pendingAttachments;
  const userMessage = {
    role: 'user',
    content: prompt || 'Analyze the attached file.',
    apiContent: '',
    attachments: attachments.map((attachment) => ({
      name: attachment.name,
      size: attachment.size,
      truncated: attachment.truncated
    }))
  };

  conversation.messages.push(userMessage);
  const userMessageIndex = conversation.messages.length - 1;
  updateConversationTitle(conversation);
  conversation.updatedAt = Date.now();

  state.pendingAttachments = [];
  elements.promptInput.value = '';
  resetPromptHeight();
  saveState();
  render();
  setSending(true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: conversation.messages.map(messageForApi),
        attachments: attachments.map((attachment) => ({
          name: attachment.name,
          type: attachment.type,
          size: attachment.size,
          content: attachment.content
        })),
        options: conversation.options
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Local model request failed.');
    }

    conversation.messages[userMessageIndex].apiContent = data.contextUserContent || userMessage.content;
    conversation.messages.push({
      role: 'assistant',
      content: data.message.content
    });
    conversation.updatedAt = Date.now();
    saveState();
  } catch (error) {
    conversation.messages.push({
      role: 'assistant',
      content: error.message,
      error: true
    });
    conversation.updatedAt = Date.now();
    saveState();
  } finally {
    setSending(false);
    render();
  }
}

elements.newChatButton.addEventListener('click', () => {
  const conversation = createConversation();
  state.conversations.unshift(conversation);
  state.currentId = conversation.id;
  state.pendingAttachments = [];
  saveState();
  render();
});

elements.conversationList.addEventListener('click', (event) => {
  const button = event.target.closest('.conversation-item');
  if (!button) {
    return;
  }

  state.currentId = button.dataset.id;
  state.pendingAttachments = [];
  saveState();
  render();
});

elements.attachButton.addEventListener('click', () => {
  elements.fileInput.click();
});

elements.fileInput.addEventListener('change', async () => {
  await readSelectedFiles([...elements.fileInput.files]);
  elements.fileInput.value = '';
});

elements.attachmentTray.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-id]');
  if (!button) {
    return;
  }

  state.pendingAttachments = state.pendingAttachments.filter((attachment) => attachment.id !== button.dataset.id);
  renderAttachments();
});

elements.composerForm.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage();
});

elements.promptInput.addEventListener('input', resetPromptHeight);

elements.promptInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

elements.temperatureInput.addEventListener('input', () => {
  elements.temperatureValue.value = Number(elements.temperatureInput.value).toFixed(1);
  saveOptionsFromUi();
});

elements.maxTokensInput.addEventListener('change', saveOptionsFromUi);
elements.refreshHealthButton.addEventListener('click', checkHealth);

loadState();
render();
resetPromptHeight();
checkHealth();
setInterval(checkHealth, 30000);
