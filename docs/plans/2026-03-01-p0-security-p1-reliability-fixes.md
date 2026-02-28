# P0 Security Fixes + P1 Reliability Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate path traversal and SSRF vectors in the Electron main process and improve reliability with timeouts and safer window opening; remove preload TS ignores.

**Architecture:** Apply narrowly-scoped fixes in main-process utilities/handlers using `path.resolve` + `path.relative` containment checks and explicit URL validation (`new URL(...)`) before external navigation. Align AI test request handling with existing chat timeout behavior.

**Tech Stack:** Electron, TypeScript, Node `path`, Fetch API, AbortController.

---

## Task 1: P0-1 Path traversal fixes in main fs helpers

**Files:**

- Modify: `src/main/fs.ts`

### Step 1: Update safe path containment checks

Implement `resolve(join(...))` then validate using `relative(root, safePath)` with:

- Reject if `rel.startsWith('..')` OR `isAbsolute(rel)`.

Update both:

- `getSafeFilePath(filename: string): string`
- `getWorkspaceFilePath(filename: string, workspaceDir?: string): string`

Also update `path` imports to include: `resolve`, `relative`, `isAbsolute`.

### Step 2: Fix workspace migration containment logic

In `precheckWorkspaceMigration`, replace string-prefix directory checks with symmetric `relative` checks:

- Compute `relTo = relative(normalFrom, normalTo)` and error if it is not outside.
- Compute `relFrom = relative(normalTo, normalFrom)` and error if it is not outside.

---

## Task 2: P0-1 handleShellOpenPath path containment fix

**Files:**

- Modify: `src/main/handlers.ts`

### Step 1: Use resolve+relative containment check

Update `handleShellOpenPath` to:

- `resolvedPath = resolve(requestedPath)`
- Allow only `home` exactly OR paths within default workspace dir.
- Use `relative(defaultWorkspace, resolvedPath)` and deny if `..` or absolute.

Update imports to include: `resolve`, `relative`, `isAbsolute`.

---

## Task 3: P0-2 SSRF baseUrl validation

**Files:**

- Modify: `src/main/handlers.ts`

### Step 1: Add validateBaseUrl helper

Add:

```ts
function validateBaseUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http and https protocols are allowed')
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error('Invalid base URL')
    }
    throw e
  }
}
```

### Step 2: Use validateBaseUrl in handleAiChat + handleAiTest

Before constructing endpoint URL:

```ts
const baseUrl =
  params.baseUrl ||
  (params.provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1')
validateBaseUrl(baseUrl)
```

Then construct endpoint from validated `baseUrl`.

---

## Task 4: P0-3 URL validation for shell.openExternal + P1-5 sandbox:true

**Files:**

- Modify: `src/main/index.ts`

### Step 1: Validate protocol for window.open handler

Wrap `new URL(details.url)` in try/catch; allow only http/https.
If invalid, log a warning.

### Step 2: Enable renderer sandbox

Change `sandbox: false` to `sandbox: true` in BrowserWindow webPreferences.

---

## Task 5: P1-4 AbortController timeout for handleAiTest

**Files:**

- Modify: `src/main/handlers.ts`

### Step 1: Add AbortController timeout around fetch

Use 30s timeout and clear it in finally, returning sanitized error on non-OK responses.

### Step 2: Handle AbortError in catch

Return a specific timeout error message when aborted.

---

## Task 6: P1-6 Remove @ts-ignore branch in preload

**Files:**

- Modify: `src/preload/index.ts`

### Step 1: Remove non-isolated else branch

Delete the `else` block that assigns `window.electron` and `window.api` with `@ts-ignore`.

---

## Verification

1. Run LSP diagnostics on changed files.
2. Run: `npm run typecheck`
3. Run: `npm test`

If tests fail, add/update tests to match new validation behavior, then re-run.
