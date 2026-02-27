# Draft: Default Workspace Path + Migration Feature

## Requirements (confirmed)

- Change default workspace path from `userData/drafts` to `~/.cv-assistant`
- When user changes workspace directory in Settings, migrate existing files to the new location

## Technical Findings

### Current Workspace File Architecture

- **File format**: `.json` files only (CV drafts)
- **Directory structure**: FLAT — all `.json` files in workspace root, no subdirectories
- **Naming pattern**: `{name}.json` — filenames are derived from `filename` field; system appends `.json` if missing
- **Settings storage**: `workspacePath` is in `localStorage` (via `mockSaveSettings`), NOT in the workspace directory itself
- **Profile data**: stored in `userData/profile.json` — SEPARATE from workspace, NOT affected by migration

### IPC Channels for Workspace Files

| Channel     | Operation    | Files Touched                        |
| ----------- | ------------ | ------------------------------------ |
| `cv:list`   | List all CVs | Reads all `.json` files in workspace |
| `cv:save`   | Save a CV    | Writes `{name}.json` to workspace    |
| `cv:delete` | Delete a CV  | Deletes `{name}.json` from workspace |

### Current "Change Directory" Flow

1. User clicks "Change..." button → `dialog:openDirectory` IPC → OS folder picker
2. If user selects a folder → `updateSettings({ workspacePath: dir })`
3. Settings saved to `localStorage` immediately (optimistic update)
4. **NO migration happens** — old files stay in old location, user loses access to them

### Files Needing Changes (from previous task)

- `src/main/index.ts:149-152` — default path
- `src/main/fs.ts:50-51` — fallback path
- `src/renderer/src/locales/en.json:41` — placeholder text
- `src/renderer/src/locales/zh.json:41` — placeholder text

### New: Migration Feature Design

**Where to implement**: New IPC handler `workspace:migrate` in `src/main/index.ts`

**Flow**:

1. User clicks "Change..." → folder picker → gets `newDir`
2. Before saving settings, call `workspace:migrate` IPC with `{ oldDir, newDir }`
3. Main process: list files in `oldDir`, copy each to `newDir`, verify, then optionally delete from `oldDir`
4. On success → save `workspacePath` to settings
5. On failure → show error toast, don't change workspace path

**Edge cases to handle**:

- Old dir is empty (nothing to migrate) — just update path
- New dir already has files — merge? overwrite? skip?
- Permission errors — report to user
- Same directory selected — no-op

## Open Questions

1. When files already exist in new directory, should we overwrite, skip, or ask?
2. Should we delete files from old location after migration (move) or keep copies (copy)?
3. Should there be a confirmation dialog before migration?
4. Should migration handle the case where old dir = default path (app was never configured) and it may not exist yet?

## Scope Boundaries

- INCLUDE: Migrate workspace files when user changes directory
- INCLUDE: Change default path to ~/.cv-assistant
- EXCLUDE: Profile data migration (stored in userData, separate concern)
- EXCLUDE: Settings migration (stored in localStorage)
