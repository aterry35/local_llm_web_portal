# Local LLM Web Portal Design

## Goal

Build a ChatGPT-style web app for the local Qwen model served by `llama.cpp`.
The app gives users a browser-based chat window, routes prompts to the local
OpenAI-compatible API, and lets users attach files whose extracted text is sent
to the model for analysis.

## Product Scope

The first version focuses on a reliable local portal:

- Chat UI with user and assistant messages.
- Local model health indicator.
- File attachment support for text-like files.
- Per-request controls for temperature and max tokens.
- Conversation context retained in the browser during the session.
- No cloud services and no database.

The model endpoint remains configurable because the existing documentation has
both localhost-only and LAN-access variants.

## Architecture

```text
Browser UI
  |
  | HTTP JSON
  v
Node portal server
  |
  | OpenAI-compatible chat completions
  v
llama.cpp local model server
```

### Browser UI

The frontend is a plain HTML/CSS/JavaScript app in `public/`.
It owns the interactive experience:

- Render the chat thread.
- Read attached text files in the browser.
- Show attachment chips before sending.
- Store local conversation history in `localStorage`.
- Send normalized chat requests to the portal server.

### Portal Server

The backend is a dependency-free Node.js server in `src/`.
It owns the local model integration:

- Serve static frontend assets.
- Provide `/api/health` for model reachability.
- Provide `/api/chat` as the browser-safe bridge to `llama.cpp`.
- Validate request payloads and enforce size limits.
- Format attachments into the final user message before forwarding.

### Local Model Server

The model server is the existing `llama.cpp` service. The portal calls:

- `GET /health`
- `POST /v1/chat/completions`

Default endpoint:

```text
http://127.0.0.1:8012
```

Override with:

```bash
LOCAL_LLM_BASE_URL=http://<MODEL_HOST>:8012 npm start
```

## Attachment Design

The first implementation supports text extraction in the browser for files that
can be safely read as text, including:

- `.txt`, `.md`, `.csv`, `.json`, `.log`, `.xml`, `.yaml`, `.yml`
- common source files such as `.js`, `.ts`, `.py`, `.html`, `.css`, `.sh`

Each attachment is sent as:

```json
{
  "name": "notes.md",
  "type": "text/markdown",
  "size": 1234,
  "content": "file text..."
}
```

The server wraps attachments into the latest user message using a structured
section:

```text
User prompt...

Attached files for analysis:

--- File: notes.md
Type: text/markdown
Size: 1234 bytes

...file content...
--- End file: notes.md
```

Limits:

- Request body limit: 2 MB.
- Per-file content limit: 40,000 characters.
- Total attachment text limit: 120,000 characters.

These limits keep the app responsive on the current CPU-only model host.

## Security And Privacy

- The portal binds to `127.0.0.1` by default.
- Files are not uploaded to a cloud provider.
- The server does not persist prompts, responses, or attachments.
- Conversation history is stored only in the browser's `localStorage`.
- If the model server is bound to a LAN IP, any device with LAN access to that
  endpoint may send prompts to it.

## Future Enhancements

- Streaming assistant responses.
- PDF and DOCX text extraction.
- Multi-conversation management backed by local files.
- Model and endpoint switcher in the UI.
- Optional authentication when running on a LAN.
- Token counting and automatic attachment chunking.
