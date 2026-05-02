import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLlmMessages } from './prompt.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = normalize(join(__dirname, '..'));
const publicRoot = join(projectRoot, 'public');

loadEnvFile(join(projectRoot, '.env'));

const PORT = Number.parseInt(process.env.PORT || '5173', 10);
const HOST = process.env.HOST || '127.0.0.1';
const LOCAL_LLM_BASE_URL = (process.env.LOCAL_LLM_BASE_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const REQUEST_BODY_LIMIT = 2 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function loadEnvFile(filePath) {
  try {
    const contents = readFileSync(filePath, 'utf8');

    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) {
        continue;
      }

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

function safeStaticPath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const normalizedPath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, '');
  const absolutePath = join(publicRoot, normalizedPath);

  if (!absolutePath.startsWith(publicRoot)) {
    return null;
  }

  return absolutePath;
}

async function readJsonBody(request) {
  let size = 0;
  const chunks = [];

  for await (const chunk of request) {
    size += chunk.length;

    if (size > REQUEST_BODY_LIMIT) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function validateChatRequest(body) {
  if (!Array.isArray(body.messages)) {
    const error = new Error('messages must be an array.');
    error.statusCode = 400;
    throw error;
  }

  const temperature = Number(body.options?.temperature ?? 0.3);
  const maxTokens = Number.parseInt(body.options?.maxTokens ?? '512', 10);

  return {
    messages: body.messages,
    attachments: Array.isArray(body.attachments) ? body.attachments : [],
    options: {
      temperature: Number.isFinite(temperature) ? Math.min(2, Math.max(0, temperature)) : 0.3,
      maxTokens: Number.isFinite(maxTokens) ? Math.min(2048, Math.max(16, maxTokens)) : 512
    }
  };
}

async function proxyHealth() {
  const startedAt = Date.now();
  const response = await fetch(`${LOCAL_LLM_BASE_URL}/health`, {
    signal: AbortSignal.timeout(3000)
  });
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    latencyMs: Date.now() - startedAt,
    endpoint: LOCAL_LLM_BASE_URL,
    body: text
  };
}

async function proxyChat(body) {
  const request = validateChatRequest(body);
  const { messages, contextUserContent } = buildLlmMessages(request.messages, request.attachments);

  if (messages.length === 0) {
    const error = new Error('A message is required before sending to the model.');
    error.statusCode = 400;
    throw error;
  }

  const startedAt = Date.now();
  const llmResponse = await fetch(`${LOCAL_LLM_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages,
      max_tokens: request.options.maxTokens,
      temperature: request.options.temperature,
      stream: false
    }),
    signal: AbortSignal.timeout(120000)
  });

  const responseText = await llmResponse.text();
  let payload;

  try {
    payload = JSON.parse(responseText);
  } catch {
    payload = null;
  }

  if (!llmResponse.ok) {
    const error = new Error(payload?.error?.message || responseText || 'Local model request failed.');
    error.statusCode = llmResponse.status;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== 'string') {
    const error = new Error('Local model returned an unexpected response shape.');
    error.statusCode = 502;
    throw error;
  }

  return {
    message: {
      role: 'assistant',
      content
    },
    contextUserContent,
    usage: payload.usage || null,
    latencyMs: Date.now() - startedAt,
    endpoint: LOCAL_LLM_BASE_URL
  };
}

async function serveStatic(request, response, url) {
  const staticPath = safeStaticPath(url.pathname);

  if (!staticPath) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  try {
    const file = await readFile(staticPath);
    const extension = extname(staticPath);
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-store' : 'public, max-age=3600'
    });
    response.end(file);
  } catch {
    sendText(response, 404, 'Not found');
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (request.method === 'GET' && url.pathname === '/api/health') {
      const health = await proxyHealth();
      sendJson(response, health.ok ? 200 : 502, health);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/chat') {
      const body = await readJsonBody(request);
      const result = await proxyChat(body);
      sendJson(response, 200, result);
      return;
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      await serveStatic(request, response, url);
      return;
    }

    sendText(response, 405, 'Method not allowed');
  } catch (error) {
    const statusCode = error.statusCode || (error.name === 'TimeoutError' ? 504 : 502);
    sendJson(response, statusCode, {
      error: error.message || 'Unexpected server error.',
      endpoint: LOCAL_LLM_BASE_URL
    });
  }
}

const server = createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`Local LLM portal: http://${HOST}:${PORT}`);
  console.log(`Model endpoint: ${LOCAL_LLM_BASE_URL}`);
});
