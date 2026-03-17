# Resume Extraction Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden the existing AI-powered resume extraction with `jsonrepair` for malformed LLM output, Zod runtime validation, `max_tokens` for all providers, optional `response_format` passthrough, and explicit empty response handling.

**Architecture:** Layer hardening onto the existing `parseJsonFromAiResponse()` -> `extractProfileFromPdf()` pipeline in the renderer, and the `handleAiChat()` handler in the main process. No new features—just robustness. Each change is independently testable and committable.

**Tech Stack:** TypeScript, Vitest, jsonrepair, Zod v4 (already installed as v4.3.6), Electron IPC.

---

## Task 1: Install jsonrepair dependency

**Files:**

- Modify: `package.json`

### Step 1: Install jsonrepair

Run: `npm install jsonrepair`
Expected: Package added to dependencies in package.json.

### Step 2: Verify installation

Run: `node -e "const { jsonrepair } = require('jsonrepair'); console.log(jsonrepair('{a: 1}'))"`
Expected output: `{"a":1}`

### Step 3: Commit

`git add package.json package-lock.json && git commit -m "chore: install jsonrepair for robust LLM JSON parsing"`

---

## Task 2: Export and harden parseJsonFromAiResponse with jsonrepair

**Files:**

- Modify: `src/renderer/src/lib/provider.ts:190-205`
- Modify: `src/renderer/src/lib/provider.test.ts`

### Step 1: Write 11 failing tests for parseJsonFromAiResponse (direct parse, code blocks, embedded JSON, trailing commas, unquoted keys, truncated JSON, repair-inside-code-block, repair-extracted-text, non-JSON throws, empty throws)

### Step 2: Run tests to verify they fail

### Step 3: Add `import { jsonrepair } from 'jsonrepair'`, export function with 6-strategy cascade (direct parse -> code block extract -> code block + repair -> brace extract -> brace extract + repair -> full text repair -> throw)

### Step 4: Run tests to verify they pass

### Step 5: Commit

---

## Task 3: Add Zod validation to extractProfileFromPdf

**Files:**

- Modify: `src/renderer/src/lib/provider.ts:162-296`
- Modify: `src/renderer/src/lib/provider.test.ts`

### Step 1: Write 3 failing tests (coerces numeric to string, rejects invalid structure, strips unknown fields) + update existing "missing personalInfo" test assertion

### Step 2: Run tests to verify they fail

### Step 3: Add `import { z } from 'zod/v4'`, add ExtractedProfileDataSchema with coerceString helper, replace `as` cast + manual normalization with `safeParse()`

### Step 4: Run tests to verify they pass

### Step 5: Commit

---

## Task 4: Add max_tokens for OpenAI-compatible providers

**Files:**

- Modify: `src/main/handlers.ts:579-580`
- Modify: `src/main/__tests__/handlers.test.ts`

### Step 1: Write 1 failing test (openai includes max_tokens)

### Step 2: Run test to verify it fails

### Step 3: Add `max_tokens: 4096` to non-Anthropic body

### Step 4: Update existing exact-match body assertion to include max_tokens

### Step 5: Run tests to verify they pass

### Step 6: Commit

---

## Task 5: Add optional response_format passthrough

**Files:**

- Modify: `src/main/handlers.ts:559-581`
- Modify: `src/main/__tests__/handlers.test.ts`

### Step 1: Write 3 failing tests (openai passes response_format, openai omits when not provided, anthropic ignores)

### Step 2: Run tests to verify they fail

### Step 3: Add `responseFormat?: { type: string }` param, conditional spread into non-Anthropic body

### Step 4: Run tests to verify they pass

### Step 5: Commit

---

## Task 6: Handle empty AI responses explicitly

**Files:**

- Modify: `src/main/handlers.ts:602-609`
- Modify: `src/main/__tests__/handlers.test.ts`

### Step 1: Write 5 failing tests (empty content string, empty choices array, no choices field, empty anthropic content array, empty anthropic text)

### Step 2: Run tests to verify they fail

### Step 3: Replace response extraction with unified content variable + empty check returning `{ success: false, error: 'AI returned an empty response' }`

### Step 4: Run tests to verify they pass

### Step 5: Commit

---

## Task 7: Final integration verification

### Step 1: `npm test` — all tests pass

### Step 2: `npm run typecheck` — no TypeScript errors

### Step 3: `npm run lint` — no lint errors

### Step 4: `git log --oneline -6` — verify 6 commits
