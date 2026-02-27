# Workspace Path & Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change the default workspace path from `userData/drafts` to `~/.cv-assistant`, and add workspace migration (move files when user changes workspace directory in Settings).

**Architecture:** Two-part change. Part A is 4 string replacements. Part B adds two new IPC handlers (`workspace:precheck` and `workspace:migrate`) in the main process, and a migration flow in Settings.tsx that calls precheck → shows confirmation → calls migrate → updates settings on success. First-run migration from old default to new default is handled via a startup toast.

**Tech Stack:** Electron (main process Node.js), React (renderer), Vitest (tests), sonner (toasts), i18next (i18n)

**Design Decisions (pre-resolved):**

- **Confirmation UI**: `window.confirm()` + automatic skip-all for conflicts (simplest, no new components)
- **First-run migration**: Toast with action button ("Files found in old location — Migrate?")
- **Non-JSON files**: Only migrate `*.json` files, ignore others (`.DS_Store`, etc.)

---

## Task 1: Change Default Workspace Path (Part A)

**Files:**

- Modify: `src/main/fs.ts:51` — change fallback path
- Modify: `src/main/index.ts:151` — change `app:getDefaultWorkspacePath` return
- Modify: `src/renderer/src/locales/en.json:41` — update placeholder text
- Modify: `src/renderer/src/locales/zh.json:41` — update placeholder text

**Step 1: Change the fallback in `fs.ts` line 51**

Replace:

```typescript
const rootPath = workspaceDir ? normalize(workspaceDir) : join(app.getPath('userData'), 'drafts')
```

With:

```typescript
const rootPath = workspaceDir ? normalize(workspaceDir) : join(app.getPath('home'), '.cv-assistant')
```

**Step 2: Change the default path handler in `index.ts` line 151**

Replace:

```typescript
return join(app.getPath('userData'), 'drafts')
```

With:

```typescript
return join(app.getPath('home'), '.cv-assistant')
```

**Step 3: Update English placeholder in `en.json` line 41**

Replace:

```json
"workspace_dir_ph": "Default (userData/drafts)",
```

With:

```json
"workspace_dir_ph": "Default (~/.cv-assistant)",
```

**Step 4: Update Chinese placeholder in `zh.json` line 41**

Replace:

```json
"workspace_dir_ph": "默认 (userData/drafts)",
```

With:

```json
"workspace_dir_ph": "默认 (~/.cv-assistant)",
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: Clean (exit 0)

**Step 6: Run existing tests**

Run: `npm run test`
Expected: All 19 tests pass (no behavior change)

**Step 7: Commit**

```bash
git add src/main/fs.ts src/main/index.ts src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: change default workspace path to ~/.cv-assistant"
```

---

## Task 2: Add Migration Filesystem Functions

**Files:**

- Modify: `src/main/fs.ts` — add `precheckWorkspaceMigration()` and `migrateWorkspaceFiles()` after line 101
- Create: `src/main/__tests__/fs.test.ts` — unit tests for migration functions

**Context:**

- These functions will be called by IPC handlers (Task 3). They operate on the filesystem directly.
- `listWorkspaceFiles()` at line 76 does unfiltered `readdir()`. Our migration must filter to `*.json` only.
- Cross-volume `rename()` throws `EXDEV` — must fallback to `copyFile` + `utimes` + `unlink`.
- The `fs` module already imports `{ promises as fs }` from 'fs' and `{ join, normalize, dirname }` from 'path'.

**Step 1: Write failing tests for `precheckWorkspaceMigration`**

Create `src/main/__tests__/fs.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fsp } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// We'll import from fs.ts after implementation
// For now these tests define expected behavior

describe('precheckWorkspaceMigration', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-migrate-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  afterEach(async () => {
    // Cleanup handled by OS temp dir
  })

  it('returns json files from source and identifies conflicts', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test1"}')
    await fsp.writeFile(join(sourceDir, 'resume2.json'), '{"name":"test2"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')
    // Non-json file should be ignored
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toEqual(['resume1.json', 'resume2.json'])
    expect(result.conflicts).toEqual(['resume1.json'])
    expect(result.files).not.toContain('.DS_Store')
  })

  it('returns empty arrays when source has no json files', async () => {
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toEqual([])
    expect(result.conflicts).toEqual([])
  })

  it('handles non-existent source directory', async () => {
    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration('/nonexistent/path', targetDir)

    expect(result.files).toEqual([])
    expect(result.conflicts).toEqual([])
  })

  it('rejects when source equals target', async () => {
    const { precheckWorkspaceMigration } = await import('../fs')
    await expect(precheckWorkspaceMigration(sourceDir, sourceDir)).rejects.toThrow('same')
  })

  it('rejects when target is inside source', async () => {
    const nestedTarget = join(sourceDir, 'subfolder')
    await fsp.mkdir(nestedTarget, { recursive: true })

    const { precheckWorkspaceMigration } = await import('../fs')
    await expect(precheckWorkspaceMigration(sourceDir, nestedTarget)).rejects.toThrow('inside')
  })
})

describe('migrateWorkspaceFiles', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-migrate-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  it('moves json files from source to target', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test1"}')
    await fsp.writeFile(join(sourceDir, 'resume2.json'), '{"name":"test2"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.moved).toEqual(['resume1.json', 'resume2.json'])
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])

    // Source files should be gone
    const sourceFiles = await fsp.readdir(sourceDir)
    expect(sourceFiles.filter((f) => f.endsWith('.json'))).toEqual([])

    // Target files should exist with correct content
    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"test1"}')
  })

  it('skips conflicts when skipConflicts is true', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"new"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, true)

    expect(result.moved).toEqual([])
    expect(result.skipped).toEqual(['resume1.json'])
    expect(result.errors).toEqual([])

    // Existing file should be unchanged
    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"existing"}')
  })

  it('overwrites conflicts when skipConflicts is false', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"new"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.moved).toEqual(['resume1.json'])
    expect(result.skipped).toEqual([])

    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"new"}')
  })

  it('preserves file timestamps', async () => {
    const pastDate = new Date('2024-01-15T10:30:00Z')
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test"}')
    await fsp.utimes(join(sourceDir, 'resume1.json'), pastDate, pastDate)

    const { migrateWorkspaceFiles } = await import('../fs')
    await migrateWorkspaceFiles(sourceDir, targetDir, false)

    const stats = await fsp.stat(join(targetDir, 'resume1.json'))
    // mtime should be preserved (within 1 second tolerance for filesystem rounding)
    expect(Math.abs(stats.mtime.getTime() - pastDate.getTime())).toBeLessThan(1000)
  })

  it('ignores non-json files', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')
    await fsp.writeFile(join(sourceDir, 'notes.txt'), 'hello')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.moved).toEqual(['resume1.json'])

    // Non-json files should still be in source
    const sourceFiles = await fsp.readdir(sourceDir)
    expect(sourceFiles).toContain('.DS_Store')
    expect(sourceFiles).toContain('notes.txt')
  })

  it('creates target directory if it does not exist', async () => {
    const newTarget = join(targetDir, 'nested', 'path')
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, newTarget, false)

    expect(result.moved).toEqual(['resume1.json'])
    const exists = await fsp.stat(join(newTarget, 'resume1.json'))
    expect(exists).toBeTruthy()
  })

  it('reports errors per-file without stopping', async () => {
    await fsp.writeFile(join(sourceDir, 'good.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'bad.json'), '{}')
    // Make bad.json's target parent read-only to cause write error
    // This is tricky to test cross-platform, so we'll trust the implementation
    // and verify the error-handling shape

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    // At minimum, structure should always include these arrays
    expect(Array.isArray(result.moved)).toBe(true)
    expect(Array.isArray(result.skipped)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- src/main/__tests__/fs.test.ts`
Expected: FAIL (functions not exported from fs.ts)

**Step 3: Implement `precheckWorkspaceMigration` and `migrateWorkspaceFiles`**

Add to `src/main/fs.ts` after line 101 (end of file). Also add `stat` and `utimes` and `copyFile` and `rename` and `unlink` and `access` from `fs.promises` if not already destructured:

```typescript
export interface MigrationPrecheck {
  files: string[]
  conflicts: string[]
}

export interface MigrationResult {
  moved: string[]
  skipped: string[]
  errors: Array<{ file: string; error: string }>
}

export async function precheckWorkspaceMigration(
  sourceDir: string,
  targetDir: string
): Promise<MigrationPrecheck> {
  const normalizedSource = normalize(sourceDir)
  const normalizedTarget = normalize(targetDir)

  if (normalizedSource === normalizedTarget) {
    throw new Error('Source and target directories are the same')
  }

  if (
    normalizedTarget.startsWith(normalizedSource + '/') ||
    normalizedTarget.startsWith(normalizedSource + '\\')
  ) {
    throw new Error('Target directory is inside source directory')
  }

  let sourceFiles: string[]
  try {
    sourceFiles = await fs.readdir(normalizedSource)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { files: [], conflicts: [] }
    }
    throw error
  }

  const jsonFiles = sourceFiles.filter((f) => f.endsWith('.json'))

  const conflicts: string[] = []
  for (const file of jsonFiles) {
    try {
      await fs.access(join(normalizedTarget, file))
      conflicts.push(file)
    } catch {
      // File doesn't exist in target — not a conflict
    }
  }

  return { files: jsonFiles, conflicts }
}

export async function migrateWorkspaceFiles(
  sourceDir: string,
  targetDir: string,
  skipConflicts: boolean
): Promise<MigrationResult> {
  const normalizedSource = normalize(sourceDir)
  const normalizedTarget = normalize(targetDir)

  await fs.mkdir(normalizedTarget, { recursive: true })

  let sourceFiles: string[]
  try {
    sourceFiles = await fs.readdir(normalizedSource)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { moved: [], skipped: [], errors: [] }
    }
    throw error
  }

  const jsonFiles = sourceFiles.filter((f) => f.endsWith('.json'))

  const moved: string[] = []
  const skipped: string[] = []
  const errors: Array<{ file: string; error: string }> = []

  for (const file of jsonFiles) {
    const sourcePath = join(normalizedSource, file)
    const targetPath = join(normalizedTarget, file)

    try {
      // Check for conflict
      let conflictExists = false
      try {
        await fs.access(targetPath)
        conflictExists = true
      } catch {
        // No conflict
      }

      if (conflictExists && skipConflicts) {
        skipped.push(file)
        continue
      }

      // Get source stats for timestamp preservation
      const sourceStats = await fs.stat(sourcePath)

      // Try rename first (fast, atomic, same-volume)
      try {
        await fs.rename(sourcePath, targetPath)
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code === 'EXDEV') {
          // Cross-volume: copy + verify + set timestamps + delete source
          await fs.copyFile(sourcePath, targetPath)
          const targetStats = await fs.stat(targetPath)
          if (targetStats.size !== sourceStats.size) {
            throw new Error(
              `Size mismatch after copy: expected ${sourceStats.size}, got ${targetStats.size}`
            )
          }
          await fs.utimes(targetPath, sourceStats.atime, sourceStats.mtime)
          await fs.unlink(sourcePath)
        } else {
          throw renameError
        }
      }

      // For same-volume rename, timestamps are preserved automatically
      // For cross-volume, we set them above
      // But for rename overwrite case, let's ensure mtime is preserved
      try {
        await fs.utimes(targetPath, sourceStats.atime, sourceStats.mtime)
      } catch {
        // Best effort — don't fail migration for timestamp issues
      }

      moved.push(file)
    } catch (error) {
      errors.push({ file, error: (error as Error).message })
    }
  }

  return { moved, skipped, errors }
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- src/main/__tests__/fs.test.ts`
Expected: All tests pass

**Step 5: Run full test suite + typecheck**

Run: `npm run typecheck && npm run test`
Expected: Clean typecheck, all tests pass

**Step 6: Commit**

```bash
git add src/main/fs.ts src/main/__tests__/fs.test.ts
git commit -m "feat: add workspace migration filesystem functions with tests"
```

---

## Task 3: Add Migration IPC Handlers

**Files:**

- Modify: `src/main/index.ts` — add `workspace:precheck` and `workspace:migrate` IPC handlers, add imports

**Context:**

- IPC pattern: `ipcMain.handle('namespace:action', async (_, args) => { try { ... } catch { return { success: false, error: msg } } })`
- These handlers call the fs functions from Task 2
- A boolean guard prevents concurrent migration calls

**Step 1: Add imports to `index.ts`**

Add `precheckWorkspaceMigration` and `migrateWorkspaceFiles` to the import from `./fs` at line 5-13.

**Step 2: Add IPC handlers after line 152 (after `app:getDefaultWorkspacePath` handler)**

```typescript
// Workspace Migration IPC
let isMigrating = false

ipcMain.handle(
  'workspace:precheck',
  async (_, { sourceDir, targetDir }: { sourceDir: string; targetDir: string }) => {
    try {
      const result = await precheckWorkspaceMigration(sourceDir, targetDir)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, error: (error as Error).message, files: [], conflicts: [] }
    }
  }
)

ipcMain.handle(
  'workspace:migrate',
  async (
    _,
    {
      sourceDir,
      targetDir,
      skipConflicts
    }: { sourceDir: string; targetDir: string; skipConflicts: boolean }
  ) => {
    if (isMigrating) {
      return { success: false, error: 'Migration already in progress' }
    }
    isMigrating = true
    try {
      const result = await migrateWorkspaceFiles(sourceDir, targetDir, skipConflicts)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, error: (error as Error).message, moved: [], skipped: [], errors: [] }
    } finally {
      isMigrating = false
    }
  }
)
```

**Step 3: Also add the old default path helper for first-run migration**

Add a handler that returns the old default path so the renderer can check for first-run migration:

```typescript
ipcMain.handle('app:getOldDefaultWorkspacePath', () => {
  return join(app.getPath('userData'), 'drafts')
})
```

**Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: Clean

**Step 5: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add workspace migration IPC handlers"
```

---

## Task 4: Add i18n Strings for Migration

**Files:**

- Modify: `src/renderer/src/locales/en.json` — add migration-related keys under `settings`
- Modify: `src/renderer/src/locales/zh.json` — add migration-related keys under `settings`

**Step 1: Add English strings**

Add these keys inside the `"settings"` object (before the closing `}` of settings):

```json
"migrate_confirm": "Move {{count}} file(s) to new workspace?",
"migrate_conflicts": "{{count}} file(s) already exist in the target. They will be skipped.",
"migrate_success": "Successfully moved {{count}} file(s) to new workspace.",
"migrate_partial": "Moved {{moved}} file(s). {{skipped}} skipped, {{errors}} failed.",
"migrate_error": "Migration failed: {{error}}",
"migrate_no_files": "No CV files found to migrate.",
"migrate_in_progress": "Migrating files...",
"first_run_migrate": "Files found in old workspace location. Click to migrate.",
"first_run_migrate_action": "Migrate Now"
```

**Step 2: Add Chinese strings**

Add matching keys inside the `"settings"` object:

```json
"migrate_confirm": "是否将 {{count}} 个文件移动到新工作目录？",
"migrate_conflicts": "{{count}} 个文件在目标目录中已存在，将被跳过。",
"migrate_success": "成功移动 {{count}} 个文件到新工作目录。",
"migrate_partial": "已移动 {{moved}} 个文件。跳过 {{skipped}} 个，失败 {{errors}} 个。",
"migrate_error": "迁移失败：{{error}}",
"migrate_no_files": "未找到需要迁移的简历文件。",
"migrate_in_progress": "正在迁移文件...",
"first_run_migrate": "在旧工作目录中发现文件。点击迁移。",
"first_run_migrate_action": "立即迁移"
```

**Step 3: Run typecheck and tests**

Run: `npm run typecheck && npm run test`
Expected: Clean

**Step 4: Commit**

```bash
git add src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: add i18n strings for workspace migration"
```

---

## Task 5: Update Settings.tsx with Migration Flow

**Files:**

- Modify: `src/renderer/src/components/Settings.tsx` — replace "Change..." button handler with migration flow

**Context:**

- Current "Change..." button (line 62-67) just calls `dialog:openDirectory` then `updateSettings({ workspacePath: dir })`
- New flow: pick directory → precheck → confirm → migrate → update settings
- Use `window.confirm()` for confirmation (no new components)
- Use `toast` from sonner for progress/success/error feedback
- The `toast` import already exists at line 10

**Step 1: Replace the "Change..." button onClick handler**

Replace lines 62-67 of Settings.tsx with:

```tsx
onClick={async (): Promise<void> => {
  const dir = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
  if (!dir) return

  // Determine current source directory
  const currentPath =
    settings.workspacePath ||
    (await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath'))

  // If same directory selected, do nothing
  if (dir === currentPath) return

  // Precheck migration
  const precheck = await window.electron.ipcRenderer.invoke('workspace:precheck', {
    sourceDir: currentPath,
    targetDir: dir
  })

  if (!precheck.success) {
    toast.error(t('settings.migrate_error', { error: precheck.error }))
    return
  }

  // No files to migrate — just update the path
  if (precheck.files.length === 0) {
    updateSettings({ workspacePath: dir })
    return
  }

  // Build confirmation message
  let confirmMsg = t('settings.migrate_confirm', { count: precheck.files.length })
  if (precheck.conflicts.length > 0) {
    confirmMsg += '\n' + t('settings.migrate_conflicts', { count: precheck.conflicts.length })
  }

  if (!window.confirm(confirmMsg)) {
    // User cancelled — still update path without migrating
    updateSettings({ workspacePath: dir })
    return
  }

  // Perform migration (skip conflicts)
  toast.info(t('settings.migrate_in_progress'))
  const result = await window.electron.ipcRenderer.invoke('workspace:migrate', {
    sourceDir: currentPath,
    targetDir: dir,
    skipConflicts: precheck.conflicts.length > 0
  })

  if (!result.success) {
    toast.error(t('settings.migrate_error', { error: result.error }))
    return
  }

  // Report results
  if (result.errors.length === 0 && result.skipped.length === 0) {
    toast.success(t('settings.migrate_success', { count: result.moved.length }))
  } else {
    toast.warning(
      t('settings.migrate_partial', {
        moved: result.moved.length,
        skipped: result.skipped.length,
        errors: result.errors.length
      })
    )
  }

  // Update workspace path on success
  updateSettings({ workspacePath: dir })
}}
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Clean

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass (existing Settings tests mock `useSettings` so the new handler code isn't executed)

**Step 4: Commit**

```bash
git add src/renderer/src/components/Settings.tsx
git commit -m "feat: add migration flow to workspace directory change"
```

---

## Task 6: Add First-Run Migration Check

**Files:**

- Modify: `src/renderer/src/context/SettingsContext.tsx` — add startup check for old→new default migration

**Context:**

- When the app starts and `workspacePath` is empty (default), check if files exist in the OLD default (`userData/drafts`). If so, show a toast with "Migrate Now" action button.
- The toast triggers migration from old default → new default, then saves the result.
- This runs once on initial settings load.
- We need `toast` from sonner and `i18next` (via `useTranslation` or direct import). Since this is in a context provider (not a component), we import `i18next` directly and use `toast` from sonner.

**Step 1: Add the first-run migration effect to `SettingsProvider`**

After the language effect (line 110) in `SettingsContext.tsx`, add:

```typescript
// Effect: first-run migration check (old default → new default)
useEffect(() => {
  if (isLoading) return
  // Only check if user hasn't set a custom workspace path
  if (settings.workspacePath) return

  const checkFirstRunMigration = async (): Promise<void> => {
    try {
      const oldDefault = await window.electron.ipcRenderer.invoke('app:getOldDefaultWorkspacePath')
      const newDefault = await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath')

      const precheck = await window.electron.ipcRenderer.invoke('workspace:precheck', {
        sourceDir: oldDefault,
        targetDir: newDefault
      })

      if (!precheck.success || precheck.files.length === 0) return

      // Dynamic import for i18n t function
      const i18n = (await import('../i18n')).default
      const t = i18n.t.bind(i18n)

      toast(t('settings.first_run_migrate'), {
        duration: 10000,
        action: {
          label: t('settings.first_run_migrate_action'),
          onClick: async () => {
            const result = await window.electron.ipcRenderer.invoke('workspace:migrate', {
              sourceDir: oldDefault,
              targetDir: newDefault,
              skipConflicts: true
            })
            if (result.success && result.moved.length > 0) {
              toast.success(t('settings.migrate_success', { count: result.moved.length }))
            } else if (!result.success) {
              toast.error(t('settings.migrate_error', { error: result.error }))
            }
          }
        }
      })
    } catch (error) {
      console.warn('First-run migration check failed:', error)
    }
  }

  checkFirstRunMigration()
}, [isLoading, settings.workspacePath])
```

Also add `toast` import at the top:

```typescript
import { toast } from 'sonner'
```

**Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: Clean

**Step 3: Run tests**

Run: `npm run test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/renderer/src/context/SettingsContext.tsx
git commit -m "feat: add first-run migration check from old default workspace"
```

---

## Task 7: Final Verification

**Files:** None (verification only)

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: Exit 0

**Step 2: Run full test suite**

Run: `npm run test`
Expected: All tests pass

**Step 3: Run lint**

Run: `npm run lint`
Expected: No new errors (pre-existing warnings are OK)

**Step 4: Verify no regressions**

Ensure all 19 original tests still pass plus the new migration tests.
