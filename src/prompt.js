export const MAX_ATTACHMENT_CHARS_PER_FILE = 40_000;
export const MAX_ATTACHMENT_CHARS_TOTAL = 120_000;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(CONTROL_CHARS, '').trim();
}

export function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .map((message) => {
      const role = message?.role === 'assistant' ? 'assistant' : 'user';
      const content = cleanText(message?.apiContent || message?.content);
      return { role, content };
    })
    .filter((message) => message.content.length > 0);
}

export function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }

  let remaining = MAX_ATTACHMENT_CHARS_TOTAL;

  return attachments
    .map((attachment) => {
      const name = cleanText(attachment?.name).slice(0, 180) || 'attachment';
      const type = cleanText(attachment?.type).slice(0, 120) || 'text/plain';
      const size = Number.isFinite(attachment?.size) ? Math.max(0, attachment.size) : 0;
      const originalContent = cleanText(attachment?.content);
      const allowed = Math.max(0, Math.min(MAX_ATTACHMENT_CHARS_PER_FILE, remaining));
      const content = originalContent.slice(0, allowed);
      remaining -= content.length;

      return {
        name,
        type,
        size,
        content,
        truncated: originalContent.length > content.length
      };
    })
    .filter((attachment) => attachment.content.length > 0);
}

export function formatAttachmentsForPrompt(attachments) {
  const normalized = normalizeAttachments(attachments);

  if (normalized.length === 0) {
    return '';
  }

  const blocks = normalized.map((attachment) => {
    const truncationNote = attachment.truncated
      ? '\nNote: This file was truncated to fit the local context limit.'
      : '';

    return [
      `--- File: ${attachment.name}`,
      `Type: ${attachment.type}`,
      `Size: ${attachment.size} bytes${truncationNote}`,
      '',
      attachment.content,
      `--- End file: ${attachment.name}`
    ].join('\n');
  });

  return ['Attached files for analysis:', '', ...blocks].join('\n');
}

export function buildLlmMessages(messages, attachments = []) {
  const normalizedMessages = normalizeMessages(messages);

  if (normalizedMessages.length === 0) {
    return {
      messages: [],
      contextUserContent: ''
    };
  }

  const attachmentPrompt = formatAttachmentsForPrompt(attachments);

  if (!attachmentPrompt) {
    const lastUser = [...normalizedMessages].reverse().find((message) => message.role === 'user');
    return {
      messages: normalizedMessages,
      contextUserContent: lastUser?.content || ''
    };
  }

  const enhancedMessages = normalizedMessages.map((message) => ({ ...message }));

  for (let index = enhancedMessages.length - 1; index >= 0; index -= 1) {
    if (enhancedMessages[index].role === 'user') {
      enhancedMessages[index].content = `${enhancedMessages[index].content}\n\n${attachmentPrompt}`;
      return {
        messages: enhancedMessages,
        contextUserContent: enhancedMessages[index].content
      };
    }
  }

  return {
    messages: enhancedMessages,
    contextUserContent: ''
  };
}
