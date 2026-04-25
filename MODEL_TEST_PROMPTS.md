# Local Model Test Prompts

Use these prompts to test the local Qwen model through the web portal.

Portal:

```text
http://127.0.0.1:5173
```

Recommended settings:

- Exact answer tests: temperature `0`, max tokens `32` to `128`.
- Coding and debugging: temperature `0.1` to `0.3`, max tokens `512` to `1024`.
- Writing and brainstorming: temperature `0.4` to `0.8`, max tokens `512` to `1024`.
- File analysis: temperature `0.2`, max tokens `512` to `1536`.

## 1. Smoke Tests

### Exact Reply

```text
Reply with exactly: LOCAL_MODEL_OK
```

Expected result:

```text
LOCAL_MODEL_OK
```

### Short Identity Check

```text
In one short sentence, say what kind of assistant you are.
```

### Instruction Following

```text
Return exactly three bullet points. Each bullet must be five words or fewer. Topic: local AI benefits.
```

## 2. Simple Coding Exercises

### Python Function

```text
Write a Python function called is_palindrome(text) that returns True if the input is a palindrome and False otherwise. Ignore casing, spaces, and punctuation. Include three simple tests.
```

### JavaScript Utility

```text
Write a JavaScript debounce function. Then show a short example of using it with an input event listener.
```

### Bash Script

```text
Write a Bash script that checks whether a URL returns HTTP 200. The script should accept the URL as the first argument and print either OK or FAILED.
```

### SQL Query

```text
Given a table named orders with columns id, customer_id, status, total, and created_at, write a SQL query that returns the top 5 customers by total completed order value in the last 30 days.
```

### Small Refactor

```text
Refactor this Python code to be clearer and safer:

def f(x):
    y=[]
    for i in x:
        if i != None:
            y.append(i*2)
    return y
```

## 3. Debugging Tests

### Explain A Bug

```text
Find the bug in this JavaScript code and explain the fix:

function average(numbers) {
  let total = 0;
  for (let i = 0; i <= numbers.length; i++) {
    total += numbers[i];
  }
  return total / numbers.length;
}
```

### Fix A Python Error

```text
This Python function crashes sometimes. Explain why and provide a fixed version:

def first_email(users):
    return users[0]["email"].lower()
```

### Review A Systemd Unit

```text
Review this systemd service and point out practical issues:

[Unit]
Description=My Python App

[Service]
ExecStart=python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

## 4. File Attachment Tests

Attach a text, Markdown, JSON, CSV, log, or source-code file in the portal, then use one of these prompts.

### Summarize A File

```text
Analyze the attached file. Give me a concise summary, the three most important details, and any risks or questions you notice.
```

### Extract Action Items

```text
Read the attached file and extract action items. Return a Markdown table with columns: Action, Owner, Due Date, Evidence.
```

### Review Source Code

```text
Review the attached source file. Focus on bugs, edge cases, readability, and missing tests. Give me the highest-priority findings first.
```

### Analyze Logs

```text
Analyze the attached log file. Tell me whether the system looks healthy, list any errors or warnings, and suggest the next three diagnostic commands.
```

### Summarize CSV Data

```text
Analyze the attached CSV. Identify the columns, summarize the dataset, and point out any obvious data-quality issues.
```

## 5. Reasoning And Math

### Step-By-Step Logic

```text
A server processes 18 requests per minute. Each request creates 4 log lines. How many log lines are created in 2 hours and 30 minutes? Show the calculation briefly.
```

### Compare Options

```text
Compare these two options for a local LLM app:

Option A: Browser talks directly to the model server.
Option B: Browser talks to a local backend, and the backend talks to the model server.

Give the pros, cons, and your recommendation.
```

### Constraint Planning

```text
I have a CPU-only local model that generates slowly. Suggest a practical plan for making a chat web app feel responsive without changing the model.
```

## 6. Structured Output

### JSON Only

```text
Return only valid JSON. Create an object with keys: status, summary, risks, next_steps. Topic: testing a local LLM web portal.
```

### Markdown Table

```text
Create a Markdown table comparing TXT, Markdown, JSON, CSV, PDF, and DOCX as file attachment formats for a local LLM chat app. Include columns: Format, Easy To Extract, Good First-Version Support, Notes.
```

### Checklist

```text
Create a concise launch checklist for a local ChatGPT-style web app. Group it into Setup, Testing, Security, and UX.
```

## 7. Local Ops And Tooling

### Health Check Triage

```text
The portal health endpoint returns 502 with endpoint http://127.0.0.1:8012. Give me likely causes and the first five things to check.
```

### Curl Command

```text
Write a curl command that sends a chat completion request to http://127.0.0.1:8012/v1/chat/completions asking the model to reply with exactly CURL_OK.
```

### LAN Safety

```text
My local model server is reachable on my LAN at <LAN_MODEL_HOST>:8012. Explain the security implications and give practical safety recommendations.
```

### Service Restart Guide

```text
Write a short troubleshooting guide for restarting a systemd user service named local-llm-qwen.service and checking its logs.
```

## 8. Writing And Editing

### Rewrite

```text
Rewrite this message to sound clearer and more professional:

hey the local model is working now but it is slow because cpu only so dont expect chatgpt speed
```

### Documentation Draft

```text
Draft a README section explaining how to start a local LLM web portal, configure LOCAL_LLM_BASE_URL, and run a smoke test.
```

### User-Facing Error

```text
Write a friendly error message for a chat app when the local model server is offline. Keep it under 40 words.
```

## 9. Harder Coding Prompts

### API Route Design

```text
Design a small HTTP API for a local LLM chat portal. Include endpoints for health, chat, and optional file upload. Keep it simple and explain each endpoint.
```

### Test Cases

```text
Write Node.js tests for a function that takes chat messages and file attachments, then appends the file content to the latest user message before sending it to a model.
```

### Streaming Plan

```text
Explain how to add streaming responses to a Node.js backend that proxies an OpenAI-compatible local model server. Include the frontend changes needed.
```

### Attachment Limits

```text
Suggest safe limits for file attachments in a CPU-only local LLM web app. Cover per-file size, total request size, supported file types, and user feedback.
```

## 10. Quality Checks

Use these prompts to see whether the model follows constraints.

### No Extra Text

```text
Return only the word PASS if you understand this instruction.
```

### Counted List

```text
Give exactly four numbered steps for testing a web app. Each step must be one sentence.
```

### Refuse Bad Format

```text
Summarize the benefits of local AI in exactly two sentences. Do not use bullet points.
```

### Mixed Constraint

```text
Explain what a reverse proxy is. Use exactly three bullets. Each bullet must start with a verb.
```
