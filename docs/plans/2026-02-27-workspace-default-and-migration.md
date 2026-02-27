# Default Workspace Path + Migration Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change the default workspace directory from `userData/drafts` to `~/.cv-assistant`, and add automatic file migration when users change their workspace directory in Settings.

**Architecture:** Two new IPC handlers (`workspace:precheck`, `workspace:migrate`) in the main process handle file scanning and migration. The renderer's Settings component orchestrates the flow: folder picker → precheck → confirmation dialog → migrate → update settings. A first-run check detects files at the old default location and prompts migration via toast.

**Tech Stack:** Electron (main process Node.js fs), React (renderer), i18n (en/zh JSON), Vitest (tests), Sonner (toasts)

**Constraints:**

- Do NOT modify `src/preload/index.ts`, `src/preload/index.d.ts`, `src/renderer/index.html`, or `src/renderer/src/App.tsx`
- Do NOT add npm dependencies
- All external HTTP calls go through IPC (not relevant to this feature, but don't break existing ones)

---

## Design Decisions (User-Confirmed)

| Decision                              | Choice                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------ |
| Move vs Copy                          | Move (copy + delete original)                                            |
| Conflict handling                     | `window.confirm()` — user chooses skip all / overwrite all (no per-file) |
| Confirmation before migration         | Yes — show file count, ask before proceeding                             |
| First-run migration (old→new default) | Toast prompt on first launch                                             |
| File scope                            | Migrate ALL files in directory (not just .json)                          |
| Partial failure                       | Continue on error, report all failures, don't update settings path       |
| Cancellability                        | Not needed (files are small, migration is near-instant)                  |

---

### Task 1: Change Default Workspace Path (Part A)

**Files:**

- Modify: `src/main/index.ts:149-152`
- Modify: `src/main/fs.ts:50-51`
- Modify: `src/renderer/src/locales/en.json:41`
- Modify: `src/renderer/src/locales/zh.json:41`

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

**Step 3: Update `src/renderer/src/locales/en.json`**

Change line 41 from:

```json
    "workspace_dir_ph": "Default (userData/drafts)",
```

to:

```json
    "workspace_dir_ph": "Default (~/.cv-assistant)",
```

**Step 4: Update `src/renderer/src/locales/zh.json`**

Change line 41 from:

```json
    "workspace_dir_ph": "默认 (userData/drafts)",
```

to:

```json
    "workspace_dir_ph": "默认 (~/.cv-assistant)",
```

**Step 5: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

**Step 6: Commit**

```bash
git add src/main/index.ts src/main/fs.ts src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: change default workspace directory to ~/.cv-assistant"
```

---

### Task 2: Add i18n Strings for Migration UI

**Files:**

- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh.json`

**Step 1: Add migration keys to `en.json`**

Add these keys inside the `"settings"` object, after the `"connection_failed"` line (line 71):

```json
    "migration_confirm": "Found {{count}} file(s) in the current workspace. Move them to the new location?",
    "migration_conflict": "{{count}} file(s) already exist in the target directory. Overwrite them?",
    "migration_success": "Successfully migrated {{count}} file(s) to the new workspace.",
    "migration_partial": "Migration partially completed. {{migrated}} moved, {{failed}} failed. Workspace path was not changed.",
    "migration_error": "Migration failed: {{error}}",
    "migration_same_dir": "Selected directory is the same as the current workspace.",
    "migration_first_run": "Found CV files at the old default location. Click here to migrate them to the new workspace.",
    "migration_in_progress": "Migrating files..."
```

**Step 2: Add migration keys to `zh.json`**

Add the same keys inside the `"settings"` object, after the `"connection_failed"` line (line 71):

```json
    "migration_confirm": "当前工作目录中有 {{count}} 个文件。是否将它们迁移到新位置？",
    "migration_conflict": "目标目录中已存在 {{count}} 个同名文件。是否覆盖？",
    "migration_success": "成功迁移 {{count}} 个文件到新工作目录。",
    "migration_partial": "迁移部分完成。{{migrated}} 个已迁移，{{failed}} 个失败。工作目录路径未更改。",
    "migration_error": "迁移失败：{{error}}",
    "migration_same_dir": "所选目录与当前工作目录相同。",
    "migration_first_run": "在旧的默认位置发现了简历文件。点击此处将它们迁移到新的工作目录。",
    "migration_in_progress": "正在迁移文件..."
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 3: Add Migration Functions to `src/main/fs.ts`

**Files:**

- Modify: `src/main/fs.ts` (add new exported functions at end of file)

**Step 1: Write the migration precheck function**

Add at the end of `src/main/fs.ts`:

```typescript
export interface MigrationPrecheck {
  fileCount: number
  files: string[]
  conflicts: string[]
}

export async function precheckWorkspaceMigration(
  from: string,
  to: string
): Promise<MigrationPrecheck> {
  const normalFrom = normalize(from)
  const normalTo = normalize(to)

  // Same directory check
  if (normalFrom === normalTo) {
    return { fileCount: 0, files: [], conflicts: [] }
  }

  // Path containment check — reject if one is parent of the other
  if (normalTo.startsWith(normalFrom + '/') || normalTo.startsWith(normalFrom + '\\')) {
    throw new Error('Target directory cannot be inside the source directory')
  }
  if (normalFrom.startsWith(normalTo + '/') || normalFrom.startsWith(normalTo + '\\')) {
    throw new Error('Source directory cannot be inside the target directory')
  }

  // List files in source
  let sourceFiles: string[]
  try {
    sourceFiles = await fs.readdir(normalFrom)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { fileCount: 0, files: [], conflicts: [] }
    }
    throw error
  }

  if (sourceFiles.length === 0) {
    return { fileCount: 0, files: [], conflicts: [] }
  }

  // Filter out directories — only migrate files
  const files: string[] = []
  for (const file of sourceFiles) {
    const stat = await fs.stat(join(normalFrom, file))
    if (stat.isFile()) {
      files.push(file)
    }
  }

  // Check for conflicts in target
  const conflicts: string[] = []
  try {
    const targetFiles = await fs.readdir(normalTo)
    const targetSet = new Set(targetFiles)
    for (const file of files) {
      if (targetSet.has(file)) {
        conflicts.push(file)
      }
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
    // Target doesn't exist yet — no conflicts
  }

  return { fileCount: files.length, files, conflicts }
}
```

**Step 2: Write the migration execution function**

Add below the precheck function:

```typescript
export interface MigrationResult {
  success: boolean
  migrated: string[]
  skipped: string[]
  errors: Array<{ file: string; error: string }>
}

// Guard against concurrent migrations
let migrationInProgress = false

export async function migrateWorkspaceFiles(
  from: string,
  to: string,
  overwriteConflicts: boolean
): Promise<MigrationResult> {
  if (migrationInProgress) {
    throw new Error('A migration is already in progress')
  }
  migrationInProgress = true

  try {
    const normalFrom = normalize(from)
    const normalTo = normalize(to)

    // Ensure target directory exists
    await fs.mkdir(normalTo, { recursive: true })

    // Re-check files at execution time (don't trust precheck state)
    const precheck = await precheckWorkspaceMigration(normalFrom, normalTo)
    if (precheck.fileCount === 0) {
      return { success: true, migrated: [], skipped: [], errors: [] }
    }

    const conflictSet = new Set(precheck.conflicts)
    const migrated: string[] = []
    const skipped: string[] = []
    const errors: Array<{ file: string; error: string }> = []

    for (const file of precheck.files) {
      const sourcePath = join(normalFrom, file)
      const targetPath = join(normalTo, file)

      // Handle conflicts
      if (conflictSet.has(file)) {
        if (!overwriteConflicts) {
          skipped.push(file)
          continue
        }
      }

      try {
        // Try atomic rename first (only works on same volume)
        await fs.rename(sourcePath, targetPath)
        migrated.push(file)
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code === 'EXDEV') {
          // Cross-volume: copy + preserve timestamps + delete original
          try {
            const stat = await fs.stat(sourcePath)
            await fs.copyFile(sourcePath, targetPath)
            await fs.utimes(targetPath, stat.atime, stat.mtime)
            await fs.unlink(sourcePath)
            migrated.push(file)
          } catch (copyError) {
            errors.push({ file, error: (copyError as Error).message })
          }
        } else {
          errors.push({ file, error: (renameError as Error).message })
        }
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      skipped,
      errors
    }
  } finally {
    migrationInProgress = false
  }
}
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 4: Register Migration IPC Handlers

**Files:**

- Modify: `src/main/index.ts` (add new IPC handlers, update imports)

**Step 1: Update imports**

Change line 5-13 from:

```typescript
import {
  readUserDataFile,
  writeUserDataFile,
  listWorkspaceFiles,
  readWorkspaceFile,
  getWorkspaceLastModified,
  writeWorkspaceFile,
  deleteWorkspaceFile
} from './fs'
```

to:

```typescript
import {
  readUserDataFile,
  writeUserDataFile,
  listWorkspaceFiles,
  readWorkspaceFile,
  getWorkspaceLastModified,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  precheckWorkspaceMigration,
  migrateWorkspaceFiles
} from './fs'
```

**Step 2: Add `workspace:precheck` handler**

Add after the `app:getDefaultWorkspacePath` handler (after line 152), before the `ai:chat` handler:

```typescript
// Workspace migration IPC
ipcMain.handle('workspace:precheck', async (_, { from, to }: { from: string; to: string }) => {
  try {
    const result = await precheckWorkspaceMigration(from, to)
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
})

ipcMain.handle(
  'workspace:migrate',
  async (
    _,
    { from, to, overwriteConflicts }: { from: string; to: string; overwriteConflicts: boolean }
  ) => {
    try {
      const result = await migrateWorkspaceFiles(from, to, overwriteConflicts)
      return result
    } catch (error) {
      return {
        success: false,
        migrated: [],
        skipped: [],
        errors: [{ file: '', error: (error as Error).message }]
      }
    }
  }
)
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 5: Add First-Run Migration Check

**Files:**

- Modify: `src/main/index.ts` (add startup check after `createWindow()`)

**Step 1: Add first-run migration check function**

Add this after the `createWindow()` call (after line 279) but BEFORE the `app.on('activate', ...)` block:

```typescript
// First-run migration check: detect files at old default location
const oldDefaultPath = join(app.getPath('userData'), 'drafts')
const newDefaultPath = join(app.getPath('home'), '.cv-assistant')
try {
  const oldFiles = await listWorkspaceFiles(oldDefaultPath)
  if (oldFiles.length > 0) {
    // Check if new default has any files
    const newFiles = await listWorkspaceFiles(newDefaultPath)
    if (newFiles.length === 0) {
      // Old location has files, new doesn't — notify renderer
      const mainWindow = BrowserWindow.getAllWindows()[0]
      if (mainWindow) {
        mainWindow.webContents.once('did-finish-load', () => {
          mainWindow.webContents.send('workspace:first-run-migration', {
            oldPath: oldDefaultPath,
            fileCount: oldFiles.length
          })
        })
      }
    }
  }
} catch {
  // Silently ignore — not critical
}
```

**Step 2: Handle first-run event in renderer**

In `src/renderer/src/components/Settings.tsx`, add an effect to listen for the first-run migration event. Add these imports and the effect inside the component:

Add at the top of the `Settings` component (after line 14, the `const { t } = useTranslation()` line):

```typescript
const [isMigrating, setIsMigrating] = React.useState(false)

// Listen for first-run migration prompt from main process
React.useEffect(() => {
  const handler = (_event: unknown, data: { oldPath: string; fileCount: number }): void => {
    toast.info(t('settings.migration_first_run'), {
      duration: 10000,
      action: {
        label: t('settings.change_dir'),
        onClick: async () => {
          await handleMigration(data.oldPath, '')
        }
      }
    })
  }
  window.electron.ipcRenderer.on('workspace:first-run-migration', handler)
  return () => {
    window.electron.ipcRenderer.removeListener('workspace:first-run-migration', handler)
  }
}, [])
```

Note: The `handleMigration` function is defined in Task 6 below. Both changes go into Settings.tsx and should be implemented together.

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 6: Update Settings.tsx Migration Flow

**Files:**

- Modify: `src/renderer/src/components/Settings.tsx`

This is the core UI change. Replace the simple "Change..." button handler with the full migration flow.

**Step 1: Add the migration handler function**

Add this function inside the `Settings` component, after the `handleLanguageChange` function (after line 31):

```typescript
const handleMigration = async (currentPath: string, newDir: string): Promise<void> => {
  // Determine actual source path
  const fromPath =
    currentPath || (await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath'))

  // If newDir not yet selected, open directory picker
  let toPath = newDir
  if (!toPath) {
    toPath = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
    if (!toPath) return // User cancelled
  }

  // Same directory check
  if (fromPath === toPath) {
    toast.info(t('settings.migration_same_dir'))
    return
  }

  setIsMigrating(true)
  try {
    // Step 1: Precheck
    const precheck = await window.electron.ipcRenderer.invoke('workspace:precheck', {
      from: fromPath,
      to: toPath
    })

    if (!precheck.success) {
      toast.error(t('settings.migration_error', { error: precheck.error }))
      return
    }

    // No files to migrate — just update path
    if (precheck.fileCount === 0) {
      updateSettings({ workspacePath: toPath })
      return
    }

    // Step 2: Confirmation dialog
    const confirmed = window.confirm(t('settings.migration_confirm', { count: precheck.fileCount }))
    if (!confirmed) return

    // Step 3: Handle conflicts
    let overwriteConflicts = false
    if (precheck.conflicts.length > 0) {
      overwriteConflicts = window.confirm(
        t('settings.migration_conflict', { count: precheck.conflicts.length })
      )
    }

    // Step 4: Execute migration
    const result = await window.electron.ipcRenderer.invoke('workspace:migrate', {
      from: fromPath,
      to: toPath,
      overwriteConflicts
    })

    if (result.success) {
      // All files migrated successfully — update path
      updateSettings({ workspacePath: toPath })
      toast.success(t('settings.migration_success', { count: result.migrated.length }))
    } else if (result.migrated.length > 0) {
      // Partial failure — don't update path
      toast.error(
        t('settings.migration_partial', {
          migrated: result.migrated.length,
          failed: result.errors.length
        })
      )
    } else {
      // Total failure
      const errorMsg = result.errors[0]?.error || 'Unknown error'
      toast.error(t('settings.migration_error', { error: errorMsg }))
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(t('settings.migration_error', { error: msg }))
  } finally {
    setIsMigrating(false)
  }
}
```

**Step 2: Update the "Change..." button handler**

Replace lines 60-67 (the current "Change..." button):

```tsx
<Button
  variant="outline"
  onClick={async (): Promise<void> => {
    const dir = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
    if (dir) {
      updateSettings({ workspacePath: dir })
    }
  }}
>
  {t('settings.change_dir')}
</Button>
```

with:

```tsx
<Button
  variant="outline"
  disabled={isMigrating}
  onClick={async (): Promise<void> => {
    const dir = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
    if (dir) {
      await handleMigration(settings.workspacePath || '', dir)
    }
  }}
>
  {isMigrating ? t('settings.migration_in_progress') : t('settings.change_dir')}
</Button>
```

**Step 3: Verify**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 7: Write Tests

**Files:**

- Modify: `src/renderer/src/components/Settings.test.tsx` (add migration-related tests)

**Step 1: Add migration UI tests to Settings.test.tsx**

Add after the last `it()` block (before the closing `})` of the `describe` block):

```typescript
  it('shows change directory button', () => {
    render(<Settings />)
    expect(screen.getByText('settings.change_dir')).toBeInTheDocument()
  })

  it('shows workspace directory input', () => {
    render(<Settings />)
    expect(screen.getByText('settings.workspace_dir')).toBeInTheDocument()
  })

  it('shows current workspace path in input', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, workspacePath: '/custom/path' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByDisplayValue('/custom/path')).toBeInTheDocument()
  })
```

**Step 2: Run tests**

Run: `npm run test`
Expected: All tests pass (19 existing + 3 new = 22)

**Step 3: Verify TypeScript**

Run: `npm run typecheck`
Expected: Exit code 0

---

### Task 8: Final Verification and Commit

**Step 1: Run full verification**

```bash
npm run typecheck
npm run test
npm run lint
```

Expected: All three exit code 0

**Step 2: Commit Part B**

```bash
git add src/main/index.ts src/main/fs.ts src/renderer/src/components/Settings.tsx src/renderer/src/components/Settings.test.tsx src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: add workspace migration with conflict resolution when changing directory"
```

---

## Execution Order

| Wave | Tasks                                                       | Parallel?             |
| ---- | ----------------------------------------------------------- | --------------------- |
| 1    | Task 1 (default path), Task 2 (i18n), Task 3 (fs functions) | Yes — no dependencies |
| 2    | Task 4 (IPC handlers)                                       | Depends on Task 3     |
| 3    | Task 5 (first-run check), Task 6 (Settings.tsx)             | Depends on Tasks 3, 4 |
| 4    | Task 7 (tests), Task 8 (verify + commit)                    | Sequential            |

## Key Technical Details

- **Cross-volume support**: `fs.rename` → catch `EXDEV` → `fs.copyFile` + `fs.utimes` + `fs.unlink`
- **Concurrent migration guard**: Boolean flag `migrationInProgress` in main process
- **Path containment check**: Reject if source is parent of target or vice versa
- **Re-validate at execution**: Migration handler re-checks files at execution time, doesn't trust precheck
- **Migrate first, update path second**: Prevents race with Resumes component auto-reload
- **`listWorkspaceFiles`** returns all files (no filter) — migration moves everything, precheck filters out directories
