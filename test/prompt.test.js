import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ATTACHMENT_CHARS_PER_FILE,
  buildLlmMessages,
  formatAttachmentsForPrompt,
  normalizeMessages
} from '../src/prompt.js';

test('normalizes chat messages to user and assistant roles', () => {
  assert.deepEqual(
    normalizeMessages([
      { role: 'system', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'user', content: '   ' }
    ]),
    [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' }
    ]
  );
});

test('formats attachments into a readable prompt block', () => {
  const prompt = formatAttachmentsForPrompt([
    {
      name: 'notes.md',
      type: 'text/markdown',
      size: 12,
      content: '# Notes\nLocal model portal'
    }
  ]);

  assert.match(prompt, /Attached files for analysis:/);
  assert.match(prompt, /--- File: notes\.md/);
  assert.match(prompt, /# Notes/);
  assert.match(prompt, /--- End file: notes\.md/);
});

test('adds attachments to the latest user message', () => {
  const result = buildLlmMessages(
    [
      { role: 'user', content: 'Analyze this.' },
      { role: 'assistant', content: 'Sure.' },
      { role: 'user', content: 'What stands out?' }
    ],
    [{ name: 'log.txt', type: 'text/plain', size: 3, content: 'abc' }]
  );

  assert.equal(result.messages[0].content, 'Analyze this.');
  assert.equal(result.messages[1].content, 'Sure.');
  assert.match(result.messages[2].content, /What stands out\?/);
  assert.match(result.messages[2].content, /log\.txt/);
  assert.equal(result.contextUserContent, result.messages[2].content);
});

test('truncates oversized attachments', () => {
  const content = 'a'.repeat(MAX_ATTACHMENT_CHARS_PER_FILE + 10);
  const prompt = formatAttachmentsForPrompt([
    { name: 'large.txt', type: 'text/plain', size: content.length, content }
  ]);

  assert.match(prompt, /truncated/);
  assert.ok(prompt.length < content.length + 500);
});
