# Update Google Gemini Default Model

## TL;DR

> **Quick Summary**: Change Google Gemini default model from `gemini-2.5-flash` to `gemini-3-flash-preview`
>
> **Deliverables**: Updated default model in provider config
> **Estimated Effort**: Quick (< 1 minute)
> **Parallel Execution**: NO — single task

---

## Context

User wants to use the latest Gemini preview model instead of the stable release.

---

## Work Objectives

### Core Objective

Update Google Gemini's default model ID from `gemini-2.5-flash` to `gemini-3-flash-preview`.

### Must NOT Have

- Do NOT change any other provider configs
- Do NOT modify test mocks (tests don't mock Google's specific model)

---

## TODOs

- [ ] 1. Update Gemini default model to `gemini-3-flash-preview`

  **What to do**:
  - In `src/renderer/src/lib/provider.ts`, line 38: change `defaultModel: 'gemini-2.5-flash'` → `defaultModel: 'gemini-3-flash-preview'`

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **References**:
  - `src/renderer/src/lib/provider.ts:38` — the line to change

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` passes
  - [ ] `npx vitest run` — 59 tests pass

  **Commit**: YES
  - Message: `fix: update Gemini default model to gemini-3-flash-preview`
  - Files: `src/renderer/src/lib/provider.ts`

---

## Success Criteria

### Verification Commands

```bash
npx tsc --noEmit        # Expected: no errors
npx vitest run           # Expected: 59 passed
```
