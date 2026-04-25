# Local LLM Web Portal Implementation Plan

## Phase 1: Foundation

- Create a dependency-free Node.js app.
- Add package scripts for starting and testing the portal.
- Serve static frontend assets from `public/`.
- Add `/api/health` and `/api/chat` backend routes.

## Phase 2: Model Bridge

- Read the local model endpoint from `LOCAL_LLM_BASE_URL`.
- Forward chat messages to `/v1/chat/completions`.
- Normalize assistant responses into a compact API for the frontend.
- Surface useful errors when the local model is offline.

## Phase 3: Attachments

- Let users attach multiple files in the browser.
- Extract text from text-like files.
- Display selected files as removable chips.
- Send attachment content with the next prompt.
- Preserve the attachment-expanded user message in conversation context so
  follow-up prompts can still refer to the file.

## Phase 4: Chat UI

- Build a ChatGPT-style layout with a sidebar, message thread, and composer.
- Add local model health status.
- Add temperature and max-token controls.
- Store conversation history in `localStorage`.
- Handle loading, error, empty, and offline states.

## Phase 5: Verification

- Add focused tests for prompt and attachment formatting.
- Run `npm test`.
- Start the portal locally and verify the server boots.
- Confirm the UI is available at `http://127.0.0.1:5173`.

## Current First Build

This initial build intentionally avoids external dependencies. That keeps the
project portable and prevents install friction on the local model host. The
tradeoff is that advanced file formats such as PDF and DOCX are planned for a
later phase.
