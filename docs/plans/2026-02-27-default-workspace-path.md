# Default Workspace Path Change Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change the default workspace directory from Electron's `userData/drafts` to `~/.cv-assistant` (a `.cv-assistant` folder in the user's home directory).

**Architecture:** Replace all references to `join(app.getPath('userData'), 'drafts')` with `join(app.getPath('home'), '.cv-assistant')` in the main process, and update i18n placeholder text to reflect the new default path.

**Tech Stack:** Electron (main process), i18n JSON files

---

### Task 1: Update main process default paths

**Files:**

- Modify: `src/main/index.ts:149-152` — IPC handler `app:getDefaultWorkspacePath`
- Modify: `src/main/fs.ts:50-51` — fallback path in `getWorkspaceFilePath()`

**Step 1: Update `src/main/index.ts`**

Change lines 149-152 from:

```typescript
// Get default workspace path (userData/drafts)
ipcMain.handle('app:getDefaultWorkspacePath', () => {
  return join(app.getPath('userData'), 'drafts')
})
```

to:

```typescript
// Get default workspace path (~/.cv-assistant)
ipcMain.handle('app:getDefaultWorkspacePath', () => {
  return join(app.getPath('home'), '.cv-assistant')
})
```

**Step 2: Update `src/main/fs.ts`**

Change line 51 from:

```typescript
const rootPath = workspaceDir ? normalize(workspaceDir) : join(app.getPath('userData'), 'drafts')
```

to:

```typescript
const rootPath = workspaceDir ? normalize(workspaceDir) : join(app.getPath('home'), '.cv-assistant')
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Exit code 0, no errors

---

### Task 2: Update i18n placeholder text

**Files:**

- Modify: `src/renderer/src/locales/en.json:41`
- Modify: `src/renderer/src/locales/zh.json:41`

**Step 1: Update `en.json`**

Change line 41 from:

```json
    "workspace_dir_ph": "Default (userData/drafts)",
```

to:

```json
    "workspace_dir_ph": "Default (~/.cv-assistant)",
```

**Step 2: Update `zh.json`**

Change line 41 from:

```json
    "workspace_dir_ph": "默认 (userData/drafts)",
```

to:

```json
    "workspace_dir_ph": "默认 (~/.cv-assistant)",
```

---

### Task 3: Verify and commit

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: Exit code 0

**Step 2: Run tests**

Run: `npx vitest run`
Expected: All 19 tests pass

**Step 3: Commit**

```bash
git add src/main/index.ts src/main/fs.ts src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: change default workspace directory to ~/.cv-assistant"
```
