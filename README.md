# local-llm web portal

ChatGPT-style browser portal for a local model served by an OpenAI-compatible
`llama.cpp` server.

The web app provides:

- A local chat window for the model.
- File attachment support for text-like files.
- A backend bridge to the local OpenAI-compatible API.
- Local browser conversation history.
- Model health status from the configured endpoint.

## Quick Start

Start the portal:

```bash
npm start
```

Open:

```text
http://127.0.0.1:5173
```

By default, the portal talks to:

```text
http://127.0.0.1:8012
```

To point it at another local or LAN model server, set `LOCAL_LLM_BASE_URL`:

```bash
LOCAL_LLM_BASE_URL=http://<MODEL_HOST>:8012 npm start
```

Run tests:

```bash
npm test
```

## Configuration

Environment variables:

- `HOST`: web portal bind host. Defaults to `127.0.0.1`.
- `PORT`: web portal port. Defaults to `5173`.
- `LOCAL_LLM_BASE_URL`: model server URL. Defaults to `http://127.0.0.1:8012`.

Example:

```bash
HOST=127.0.0.1 PORT=5173 LOCAL_LLM_BASE_URL=http://127.0.0.1:8012 npm start
```

Do not commit real `.env` files. Use `.env.example` as a template.

## Project Documents

- `DESIGN.md`: web portal architecture and attachment design.
- `IMPLEMENTATION_PLAN.md`: implementation phases and current scope.
- `MODEL_TEST_PROMPTS.md`: prompt pack for evaluating the local model.
- `RUNBOOK.md`: operational commands.
- `TEST_COMMANDS.md`: model and portal test commands.

## Local Model Requirements

The portal expects a model server compatible with the OpenAI chat completions
shape:

- `GET /health`
- `POST /v1/chat/completions`

The current app is designed around a local Qwen model served through
`llama.cpp`, but the bridge should work with any compatible local endpoint.

## Attachment Support

The first version supports text-like files, including:

- `.txt`, `.md`, `.csv`, `.json`, `.log`, `.xml`, `.yaml`, `.yml`
- common source files such as `.js`, `.ts`, `.py`, `.html`, `.css`, `.sh`

Advanced binary formats such as PDF and DOCX are planned for a later phase.

## Security Notes

- The portal binds to `127.0.0.1` by default.
- Files are not sent to a cloud service by this app.
- Prompts, responses, and attachments are not persisted by the server.
- Browser conversation history is stored in local browser storage.
- If you bind the model server or portal to a LAN interface, protect it as a
  trusted-network service.
