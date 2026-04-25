# Test Commands

Quick reference for checking, managing, and testing the local LLM web portal.

## Portal Checks

Start:

```bash
npm start
```

Start with a custom model endpoint:

```bash
LOCAL_LLM_BASE_URL=http://<MODEL_HOST>:8012 npm start
```

Open:

```text
http://127.0.0.1:5173
```

Homepage:

```bash
curl -s -I http://127.0.0.1:5173/
```

Health bridge:

```bash
curl -s http://127.0.0.1:5173/api/health
```

Chat bridge:

```bash
curl -s http://127.0.0.1:5173/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Reply with exactly WEB_PORTAL_OK"}
    ],
    "options":{"temperature":0,"maxTokens":32}
  }'
```

## Model Endpoint Checks

These commands assume the model server is available at
`http://127.0.0.1:8012`. Replace the URL with your configured
`LOCAL_LLM_BASE_URL` when needed.

Health:

```bash
curl -s http://127.0.0.1:8012/health
```

Exact response test:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Reply with exactly LOCAL_LLM_OK"}
    ],
    "max_tokens":16,
    "temperature":0
  }'
```

Extract just the answer with `jq`:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Reply with exactly LOCAL_LLM_OK"}
    ],
    "max_tokens":16,
    "temperature":0
  }' | jq -r '.choices[0].message.content'
```

Short summary prompt:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Summarize this in one sentence: the local model is running, the portal is connected, and the chat bridge is healthy."}
    ],
    "max_tokens":40,
    "temperature":0.2
  }' | jq -r '.choices[0].message.content'
```

Log triage style prompt:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Analyze this short log and give me 3 bullets: service is active, HTTP health check passed, chat request returned 200, no errors in recent logs."}
    ],
    "max_tokens":80,
    "temperature":0.2
  }' | jq -r '.choices[0].message.content'
```

Python helper prompt:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Write a short Python function that validates a JSON payload and returns a clear error message when parsing fails."}
    ],
    "max_tokens":180,
    "temperature":0.2
  }' | jq -r '.choices[0].message.content'
```

## Portal Tests

```bash
npm test
```

```bash
node --check src/server.js
node --check src/prompt.js
node --check public/app.js
```

## LAN Testing Template

Use placeholders in committed docs. Substitute your actual host only in your
local shell or private `.env` file.

```bash
LOCAL_LLM_BASE_URL=http://<LAN_MODEL_HOST>:8012 npm start
curl -s http://127.0.0.1:5173/api/health
```

## Notes

- The portal stores conversations in browser local storage.
- The server does not persist prompts, responses, or attachment content.
- Keep real hostnames, private IPs, tokens, and local machine paths out of git.
