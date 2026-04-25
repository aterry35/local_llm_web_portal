# Runbook

Operational commands for the local LLM web portal.

## Web Portal

Start the web portal:

```bash
npm start
```

Open:

```text
http://127.0.0.1:5173
```

Start on a custom port:

```bash
PORT=8080 npm start
```

Point the portal at a custom model endpoint:

```bash
LOCAL_LLM_BASE_URL=http://<MODEL_HOST>:8012 npm start
```

Bind the portal to localhost explicitly:

```bash
HOST=127.0.0.1 npm start
```

## Health Checks

Portal homepage:

```bash
curl -s -I http://127.0.0.1:5173/
```

Portal-to-model health bridge:

```bash
curl -s http://127.0.0.1:5173/api/health
```

Expected healthy shape:

```json
{
  "ok": true,
  "status": 200,
  "latencyMs": 25,
  "endpoint": "http://127.0.0.1:8012",
  "body": "{\"status\":\"ok\"}"
}
```

If the model is offline, the portal returns `502` with the configured endpoint.

## Chat Bridge Test

```bash
curl -s http://127.0.0.1:5173/api/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[{"role":"user","content":"Reply with exactly WEB_PORTAL_OK"}],
    "options":{"temperature":0,"maxTokens":32}
  }'
```

## Local Model Checks

Direct model health:

```bash
curl -s http://127.0.0.1:8012/health
```

Direct model chat completion:

```bash
curl -s http://127.0.0.1:8012/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[{"role":"user","content":"Reply with exactly LOCAL_LLM_OK"}],
    "max_tokens":16,
    "temperature":0
  }'
```

## User Service Template

If the model is managed by a systemd user service, the common commands are:

```bash
systemctl --user status local-llm-qwen.service --no-pager
systemctl --user restart local-llm-qwen.service
journalctl --user -u local-llm-qwen.service -n 100 --no-pager
```

Adjust the service name if your local model service uses a different one.

## Tests

Run portal tests:

```bash
npm test
```

Run syntax checks:

```bash
node --check src/server.js
node --check src/prompt.js
node --check public/app.js
```

## Cautions

- Keep the portal and model bound to `127.0.0.1` unless you intentionally need
  LAN access.
- Do not commit real `.env` files, private IP addresses, hostnames, tokens, or
  machine-specific paths.
- CPU-only local models can be slow, so keep attachment and response sizes
  reasonable.
