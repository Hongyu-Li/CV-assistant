# Data Architecture Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign all data storage to use workspace directory (`~/.cv-assistant/`) with markdown files for profile descriptions and generated CVs, JSON index files for metadata, and a Typora-style WYSIWYG markdown editor using Tiptap.

**Architecture:** Move profile from Electron userData to workspace `profile/` subdirectory with `index.json` + individual `.md` files. Move settings from localStorage to workspace `settings.json` via IPC. Restructure CVs to store content as separate `.md` files with JSON metadata referencing the `.md` filename. Add reusable `MarkdownEditor` component using Tiptap for inline WYSIWYG editing. Fix the hardcoded 'Mock Profile Data' bug in ResumeDialog.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/markdown`), React, TypeScript, Electron IPC, Vitest/Testing Library

---

## Constraints

- Do NOT modify `src/preload/index.ts`, `src/preload/index.d.ts`, `src/renderer/index.html`
- The preload layer is generic (`window.electron.ipcRenderer.invoke(channel, ...args)`) — new IPC channels work automatically
- All data stored locally via IPC (no server)
- External AI calls go through IPC (main process)
- Follow existing shadcn/Radix component patterns in `src/renderer/src/components/ui/`
- Follow existing i18n key naming patterns
- Follow existing test mock patterns (window.electron mock via Object.defineProperty or direct assignment)
- ESLint enforces `@typescript-eslint/explicit-function-return-type` — ALL functions need explicit return type annotations
- Markdown editing must be Typora-style inline WYSIWYG (NOT split-pane, NOT toggle-preview)
- `writeWorkspaceFile` already supports subdirectories (calls `mkdir(dirname, { recursive: true })`)
- `listWorkspaceFiles` does flat `readdir` only — needs updating for subdirectory support

## Existing Code Reference

**Profile IPC** (src/main/index.ts:64-82): Uses `readUserDataFile('profile.json')` / `writeUserDataFile('profile.json', ...)` — stores in Electron userData, NOT workspace.

**Settings** (src/renderer/src/context/SettingsContext.tsx:42-66): Uses `localStorage` mock with comments saying "In the future, replace with IPC". Interface `AppSettings` has: provider, apiKey, model, baseUrl, theme, language, workspacePath.

**CV IPC** (src/main/index.ts:85-142): `cv:list` reads flat workspace dir. `cv:save` stores all data including `generatedCV` content inline in JSON. `cv:read` returns full JSON. `cv:delete` removes file.

**CV interface** (src/renderer/src/components/ResumeDialog.tsx:20-35):

```typescript
export interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  companyName?: string
  targetSalary?: string
  notes?: string
  jobDescription?: string
  generatedCV?: string
  cvLanguage?: string
  createdAt?: string
  lastModified?: string
  status?: string
  [key: string]: unknown
}
```

**BUG** (src/renderer/src/components/ResumeDialog.tsx:97): `const profile = 'Mock Profile Data'` — real profile never loaded for AI generation.

**FS helpers** (src/main/fs.ts):

- `readWorkspaceFile(filename, workspaceDir?)` — reads from workspace
- `writeWorkspaceFile(filename, content, workspaceDir?)` — writes with auto-mkdir
- `listWorkspaceFiles(workspaceDir?)` — flat readdir ONLY
- `deleteWorkspaceFile(filename, workspaceDir?)` — unlinks file
- `getWorkspaceLastModified(filename, workspaceDir?)` — returns mtime
- `precheckWorkspaceMigration(from, to)` — filters `.json` only, needs `.md` support
- `migrateWorkspaceFiles(from, to, overwrite)` — filters `.json` only, needs `.md` support

**Test mock pattern** (from Resumes.test.tsx):

```typescript
const mockInvoke = vi.fn()
Object.defineProperty(window, 'electron', {
  value: { ipcRenderer: { invoke: mockInvoke, on: vi.fn(), removeListener: vi.fn() } },
  writable: true
})
```

**Profile test mock pattern** (from Profile.test.tsx — uses direct assignment):

```typescript
window.electron = {
  ipcRenderer: {
    invoke: vi.fn().mockImplementation(async (channel) => { ... }),
    send: vi.fn(), on: vi.fn(), once: vi.fn(), removeAllListeners: vi.fn()
  }
} as unknown as Window['electron']
```

## New Directory Structure

```
~/.cv-assistant/
├── settings.json              # App settings (moved from localStorage)
├── profile/
│   ├── index.json             # Profile metadata + refs to .md files
│   ├── summary.md             # Personal summary markdown
│   ├── work-exp-{id}.md       # Work experience description markdown
│   └── project-{id}.md        # Project description markdown
├── resumes/
│   ├── {slug}_{timestamp}.json  # Resume metadata (mdFile ref, NO generatedCV content)
│   └── {slug}_{timestamp}.md    # Generated CV content in markdown
```

## Tiptap Configuration

**Packages:** `@tiptap/react @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/markdown`

**API:**

```typescript
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

const editor = useEditor({
  extensions: [StarterKit, Markdown],
  content: markdownString, // initial content
  contentType: 'markdown', // parse as markdown
  immediatelyRender: false, // CRITICAL for Electron/SSR
  onUpdate: ({ editor }) => {
    const md = editor.getMarkdown() // extract markdown string
    onChange(md)
  }
})

// To update content programmatically:
editor.commands.setContent(newMarkdown, { contentType: 'markdown' })
```

---

### Task 1: Install Tiptap Dependencies

**Files:**

- Modify: `package.json` (via npm install)

**Step 1: Install tiptap packages**

Run: `npm install @tiptap/react @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/markdown`

Expected: Packages added to `dependencies` in package.json, `node_modules` updated, no errors.

**Step 2: Verify install**

Run: `npm ls @tiptap/react @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/markdown`

Expected: All 5 packages listed without errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install tiptap markdown editor dependencies"
```

---

### Task 2: Create Reusable MarkdownEditor Component

**Files:**

- Create: `src/renderer/src/components/MarkdownEditor.tsx`
- Create: `src/renderer/src/components/MarkdownEditor.test.tsx`

**Step 1: Write the test file**

Create `src/renderer/src/components/MarkdownEditor.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

// Mock tiptap modules since jsdom doesn't support contenteditable well
vi.mock('@tiptap/react', () => {
  const mockEditor = {
    getMarkdown: vi.fn(() => '# Hello'),
    commands: { setContent: vi.fn() },
    isDestroyed: false,
    on: vi.fn(),
    off: vi.fn()
  }
  return {
    useEditor: vi.fn(() => mockEditor),
    EditorContent: vi.fn(({ editor }) => (
      <div data-testid="editor-content">{editor ? 'Editor loaded' : 'No editor'}</div>
    ))
  }
})

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn() }
}))

vi.mock('@tiptap/markdown', () => ({
  Markdown: { configure: vi.fn() }
}))

describe('MarkdownEditor Component', () => {
  it('renders the editor', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('renders with a label when provided', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Summary" />)
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('renders with placeholder when provided', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} placeholder="Enter text..." />)
    // Placeholder is handled by tiptap extension, just verify no crash
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownEditor value="" onChange={vi.fn()} className="custom-class" />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/renderer/src/components/MarkdownEditor.test.tsx`

Expected: FAIL — module `./MarkdownEditor` not found.

**Step 3: Create the MarkdownEditor component**

Create `src/renderer/src/components/MarkdownEditor.tsx`:

```typescript
import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (markdown: string) => void
  label?: string
  placeholder?: string
  className?: string
  minHeight?: string
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  className,
  minHeight = '100px'
}: MarkdownEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
    ],
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getMarkdown())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        ...(placeholder ? { 'data-placeholder': placeholder } : {})
      }
    }
  })

  // Sync external value changes into the editor
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentMarkdown = editor.getMarkdown()
      if (value !== currentMarkdown) {
        editor.commands.setContent(value || '', { contentType: 'markdown' })
      }
    }
  }, [value, editor])

  return (
    <div className={className}>
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      <div
        className="rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/renderer/src/components/MarkdownEditor.test.tsx`

Expected: PASS — all 4 tests green.

**Step 5: Run typecheck**

Run: `npm run typecheck:web`

Expected: No errors.

**Step 6: Commit**

```bash
git add src/renderer/src/components/MarkdownEditor.tsx src/renderer/src/components/MarkdownEditor.test.tsx
git commit -m "feat: add reusable MarkdownEditor component with Tiptap"
```

---

### Task 3: Add Subdirectory-Aware FS Helpers and Update Migration

**Files:**

- Modify: `src/main/fs.ts`
- Modify: `src/main/__tests__/fs.test.ts`

**Step 1: Write tests for new FS helpers**

Add to `src/main/__tests__/fs.test.ts` (at the end of the file, after existing describe blocks):

```typescript
describe('listWorkspaceSubdirFiles', () => {
  let workspaceDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-subdir-test-'))
    workspaceDir = base
  })

  it('lists files in a subdirectory', async () => {
    const subdir = join(workspaceDir, 'resumes')
    await fsp.mkdir(subdir, { recursive: true })
    await fsp.writeFile(join(subdir, 'cv1.json'), '{}')
    await fsp.writeFile(join(subdir, 'cv1.md'), '# CV')

    const { listWorkspaceSubdirFiles } = await import('../fs')
    const files = await listWorkspaceSubdirFiles('resumes', workspaceDir)

    expect(files).toContain('cv1.json')
    expect(files).toContain('cv1.md')
    expect(files).toHaveLength(2)
  })

  it('returns empty array when subdirectory does not exist', async () => {
    const { listWorkspaceSubdirFiles } = await import('../fs')
    const files = await listWorkspaceSubdirFiles('nonexistent', workspaceDir)
    expect(files).toEqual([])
  })
})

describe('deleteWorkspaceSubdirFile', () => {
  let workspaceDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-delete-subdir-test-'))
    workspaceDir = base
  })

  it('deletes a file in a subdirectory', async () => {
    const subdir = join(workspaceDir, 'resumes')
    await fsp.mkdir(subdir, { recursive: true })
    await fsp.writeFile(join(subdir, 'cv1.md'), '# CV')

    const { deleteWorkspaceFile } = await import('../fs')
    await deleteWorkspaceFile('resumes/cv1.md', workspaceDir)

    const files = await fsp.readdir(subdir)
    expect(files).not.toContain('cv1.md')
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/main/__tests__/fs.test.ts`

Expected: FAIL — `listWorkspaceSubdirFiles` not exported.

**Step 3: Add `listWorkspaceSubdirFiles` to fs.ts**

Add to `src/main/fs.ts` after the existing `listWorkspaceFiles` function (after line 89):

```typescript
export async function listWorkspaceSubdirFiles(
  subdir: string,
  workspaceDir?: string
): Promise<string[]> {
  const dirPath = getWorkspaceFilePath(subdir, workspaceDir)
  try {
    const entries = await fs.readdir(dirPath)
    return entries
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}
```

**Step 4: Update `precheckWorkspaceMigration` to include `.md` files**

In `src/main/fs.ts`, find line 149 (`if (!file.endsWith('.json')) continue`) and change it to:

```typescript
if (!file.endsWith('.json') && !file.endsWith('.md')) continue
```

**Step 5: Update `migrateWorkspaceFiles` filter in precheck call**

The `migrateWorkspaceFiles` function calls `precheckWorkspaceMigration` which now includes `.md` files, so no additional changes needed there. The migration will now handle both `.json` and `.md` files.

**Step 6: Run tests to verify they pass**

Run: `npx vitest run src/main/__tests__/fs.test.ts`

Expected: ALL tests PASS (existing + new).

**Step 7: Commit**

```bash
git add src/main/fs.ts src/main/__tests__/fs.test.ts
git commit -m "feat: add subdirectory file listing and include .md in migrations"
```

---

### Task 4: Add Settings IPC Handlers (Move from localStorage to Workspace)

**Files:**

- Modify: `src/main/index.ts` (add `settings:load` and `settings:save` IPC handlers)
- Modify: `src/renderer/src/context/SettingsContext.tsx` (replace localStorage mock with IPC)
- Modify: `src/renderer/src/components/Settings.test.tsx` (update mocks)

**Step 1: Read existing Settings.test.tsx to understand current test structure**

The Settings test file path is `src/renderer/src/components/Settings.test.tsx`. Read it to understand mock structure before modifying.

**Step 2: Add IPC handlers to main/index.ts**

In `src/main/index.ts`, after the profile IPC handlers (after line 82), add:

```typescript
// Settings Management IPC
ipcMain.handle('settings:load', async () => {
  try {
    const data = await readWorkspaceFile('settings.json')
    return JSON.parse(data)
  } catch (error) {
    // Settings file doesn't exist yet — return empty object (use defaults)
    console.warn('Failed to load settings (may not exist yet):', error)
    return {}
  }
})

ipcMain.handle('settings:save', async (_, data) => {
  try {
    // Settings always saved to default workspace first
    // If workspacePath is set and different, also consider that
    await writeWorkspaceFile('settings.json', JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Failed to save settings:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 3: Replace localStorage mock in SettingsContext.tsx with IPC**

Replace the entire `SettingsContext.tsx` file. The key changes:

- Remove `mockLoadSettings` and `mockSaveSettings` functions
- Replace with `window.electron.ipcRenderer.invoke('settings:load')` and `window.electron.ipcRenderer.invoke('settings:save', updated)`
- Keep the `defaultSettings`, interfaces, theme/language effects, and provider pattern exactly the same

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface AppSettings {
  provider:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'deepseek'
    | 'ollama'
    | 'openrouter'
    | 'groq'
    | 'mistral'
    | 'custom'
  apiKey: string
  model: string
  baseUrl: string
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'
  workspacePath?: string
}

export interface SettingsContextType {
  settings: AppSettings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
  isLoading: boolean
  error: string | null
}

const defaultSettings: AppSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  baseUrl: '',
  theme: 'system',
  language: 'en',
  workspacePath: ''
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInitialSettings = async (): Promise<void> => {
      try {
        setIsLoading(true)
        const loaded = await window.electron.ipcRenderer.invoke('settings:load')
        if (loaded && Object.keys(loaded).length > 0) {
          setSettings({ ...defaultSettings, ...loaded })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialSettings()
  }, [])

  // Effect to apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(settings.theme)
    }
  }, [settings.theme])

  // Effect to apply language
  useEffect(() => {
    import('../i18n').then(({ default: i18n }) => {
      i18n.changeLanguage(settings.language)
    })
  }, [settings.language])

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updated = { ...settings, ...newSettings }
      // Optimistic update
      setSettings(updated)
      await window.electron.ipcRenderer.invoke('settings:save', updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
```

**Step 4: Update Settings.test.tsx mock**

The test file must now mock `window.electron.ipcRenderer.invoke` for channels `settings:load` and `settings:save` instead of relying on localStorage. Update the mock to handle these channels.

**Step 5: Run all tests**

Run: `npx vitest run`

Expected: ALL tests pass.

**Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: No errors.

**Step 7: Commit**

```bash
git add src/main/index.ts src/renderer/src/context/SettingsContext.tsx src/renderer/src/components/Settings.test.tsx
git commit -m "feat: move settings from localStorage to workspace via IPC"
```

---

### Task 5: Redesign Profile Storage (Workspace + Markdown Files + JSON Index)

**Files:**

- Modify: `src/main/index.ts` (rewrite `profile:load` and `profile:save` handlers)
- Modify: `src/renderer/src/components/Profile.tsx` (update interfaces, integrate MarkdownEditor)
- Modify: `src/renderer/src/components/Profile.test.tsx` (update mocks for new IPC structure)
- Modify: `src/renderer/src/locales/en.json` (add i18n keys if needed)
- Modify: `src/renderer/src/locales/zh.json` (add i18n keys if needed)

**New profile storage format:**

`profile/index.json`:

```json
{
  "personalInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "summaryFile": "summary.md"
  },
  "workExperience": [
    {
      "id": "1709000000000",
      "company": "Acme Corp",
      "role": "Senior Developer",
      "date": "2020-2024",
      "descriptionFile": "work-exp-1709000000000.md"
    }
  ],
  "projects": [
    {
      "id": "1709000000001",
      "name": "MyProject",
      "techStack": "React, TypeScript",
      "descriptionFile": "project-1709000000001.md"
    }
  ]
}
```

Each `*.md` file contains the markdown content for that field (summary, work experience description, project description).

**Step 1: Rewrite `profile:load` IPC handler**

In `src/main/index.ts`, replace the `profile:load` handler (lines 64-72) with:

```typescript
ipcMain.handle('profile:load', async (_, workspacePath?: string) => {
  try {
    // Read index file
    const indexRaw = await readWorkspaceFile('profile/index.json', workspacePath)
    const index = JSON.parse(indexRaw)

    // Read summary markdown
    let summary = ''
    if (index.personalInfo?.summaryFile) {
      try {
        summary = await readWorkspaceFile(
          `profile/${index.personalInfo.summaryFile}`,
          workspacePath
        )
      } catch {
        /* file may not exist */
      }
    }

    // Read work experience descriptions
    const workExperience = await Promise.all(
      (index.workExperience || []).map(
        async (exp: {
          id: string
          company: string
          role: string
          date: string
          descriptionFile?: string
        }) => {
          let description = ''
          if (exp.descriptionFile) {
            try {
              description = await readWorkspaceFile(`profile/${exp.descriptionFile}`, workspacePath)
            } catch {
              /* file may not exist */
            }
          }
          return {
            id: exp.id,
            company: exp.company,
            role: exp.role,
            date: exp.date,
            description
          }
        }
      )
    )

    // Read project descriptions
    const projects = await Promise.all(
      (index.projects || []).map(
        async (proj: { id: string; name: string; techStack: string; descriptionFile?: string }) => {
          let description = ''
          if (proj.descriptionFile) {
            try {
              description = await readWorkspaceFile(
                `profile/${proj.descriptionFile}`,
                workspacePath
              )
            } catch {
              /* file may not exist */
            }
          }
          return {
            id: proj.id,
            name: proj.name,
            techStack: proj.techStack,
            description
          }
        }
      )
    )

    return {
      personalInfo: {
        name: index.personalInfo?.name || '',
        email: index.personalInfo?.email || '',
        phone: index.personalInfo?.phone || '',
        summary
      },
      workExperience,
      projects
    }
  } catch (error) {
    console.warn('Failed to load profile (may not exist yet):', error)
    return {}
  }
})
```

**Step 2: Rewrite `profile:save` IPC handler**

Replace the `profile:save` handler (lines 74-82) with:

```typescript
ipcMain.handle('profile:save', async (_, data, workspacePath?: string) => {
  try {
    // Write summary markdown
    const summaryFile = 'summary.md'
    await writeWorkspaceFile(
      `profile/${summaryFile}`,
      data.personalInfo?.summary || '',
      workspacePath
    )

    // Write work experience descriptions
    const workExperience = await Promise.all(
      (data.workExperience || []).map(
        async (exp: {
          id: string
          company: string
          role: string
          date: string
          description: string
        }) => {
          const descFile = `work-exp-${exp.id}.md`
          await writeWorkspaceFile(`profile/${descFile}`, exp.description || '', workspacePath)
          return {
            id: exp.id,
            company: exp.company,
            role: exp.role,
            date: exp.date,
            descriptionFile: descFile
          }
        }
      )
    )

    // Write project descriptions
    const projects = await Promise.all(
      (data.projects || []).map(
        async (proj: { id: string; name: string; techStack: string; description: string }) => {
          const descFile = `project-${proj.id}.md`
          await writeWorkspaceFile(`profile/${descFile}`, proj.description || '', workspacePath)
          return {
            id: proj.id,
            name: proj.name,
            techStack: proj.techStack,
            descriptionFile: descFile
          }
        }
      )
    )

    // Write index
    const index = {
      personalInfo: {
        name: data.personalInfo?.name || '',
        email: data.personalInfo?.email || '',
        phone: data.personalInfo?.phone || '',
        summaryFile
      },
      workExperience,
      projects
    }
    await writeWorkspaceFile('profile/index.json', JSON.stringify(index, null, 2), workspacePath)

    return { success: true }
  } catch (error) {
    console.error('Failed to save profile:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 3: Update Profile.tsx to pass workspacePath and use MarkdownEditor**

In `src/renderer/src/components/Profile.tsx`:

1. Import `MarkdownEditor` and `useSettings`:

```typescript
import { MarkdownEditor } from './MarkdownEditor'
import { useSettings } from '../context/SettingsContext'
```

2. Add settings hook inside the component:

```typescript
const { settings } = useSettings()
```

3. Update `loadProfile` to pass workspacePath:

```typescript
const data = await window.electron.ipcRenderer.invoke('profile:load', settings.workspacePath)
```

4. Update `handleSave` to pass workspacePath:

```typescript
const result = await window.electron.ipcRenderer.invoke(
  'profile:save',
  profile,
  settings.workspacePath
)
```

5. Replace all `<Textarea>` elements for description fields with `<MarkdownEditor>`:

For personal summary (replace the Textarea around line 185-191):

```typescript
<MarkdownEditor
  value={profile.personalInfo.summary}
  onChange={(val) => updatePersonalInfo('summary', val)}
  placeholder={t('profile.summary_ph')}
  minHeight="100px"
/>
```

For work experience description (replace the Textarea around line 245-251):

```typescript
<MarkdownEditor
  value={exp.description}
  onChange={(val) => updateWorkExperience(exp.id, 'description', val)}
  placeholder={t('profile.description_ph')}
  minHeight="80px"
/>
```

For project description (replace the Textarea around line 304-309):

```typescript
<MarkdownEditor
  value={proj.description}
  onChange={(val) => updateProject(proj.id, 'description', val)}
  placeholder={t('profile.project_description_ph')}
  minHeight="80px"
/>
```

**Step 4: Update Profile.test.tsx**

Update the mock to handle new IPC signature (workspacePath parameter):

```typescript
invoke: vi.fn().mockImplementation(async (channel, ...args) => {
  if (channel === 'profile:load') {
    return {
      personalInfo: {
        name: 'Test Name',
        email: 'test@example.com',
        phone: '1234567890',
        summary: 'A test summary'
      },
      workExperience: [],
      projects: []
    }
  }
  if (channel === 'profile:save') {
    return { success: true }
  }
  if (channel === 'settings:load') {
    return { workspacePath: '' }
  }
  return undefined
}),
```

Also wrap Profile in `<SettingsProvider>` since it now uses `useSettings`.

**Step 5: Run all tests**

Run: `npx vitest run`

Expected: ALL pass.

**Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: No errors.

**Step 7: Commit**

```bash
git add src/main/index.ts src/renderer/src/components/Profile.tsx src/renderer/src/components/Profile.test.tsx
git commit -m "feat: move profile storage to workspace with markdown files and JSON index"
```

---

### Task 6: Redesign CV Storage (Separate .md Files + JSON Metadata)

**Files:**

- Modify: `src/main/index.ts` (rewrite `cv:save`, `cv:read`, `cv:list`, `cv:delete` handlers)
- Modify: `src/main/index.ts` (add import of `listWorkspaceSubdirFiles` from `./fs`)
- Modify: `src/renderer/src/components/ResumeDialog.tsx` (update to use `mdFile`, add MarkdownEditor for generated CV)
- Modify: `src/renderer/src/components/Resumes.tsx` (minor: pass workspacePath)
- Modify: `src/renderer/src/components/Resumes.test.tsx` (update mocks for new structure)

**New CV JSON format** (stored as `resumes/{slug}_{timestamp}.json`):

```json
{
  "jobTitle": "Developer",
  "experienceLevel": "senior",
  "companyName": "Acme Corp",
  "targetSalary": "$150k",
  "notes": "...",
  "jobDescription": "...",
  "mdFile": "dev_1709000000000.md",
  "cvLanguage": "en",
  "createdAt": "2025-01-01T00:00:00Z",
  "lastModified": "2025-01-01T00:00:00Z",
  "status": "generated"
}
```

The companion `.md` file (`resumes/dev_1709000000000.md`) contains the generated CV markdown.

**Step 1: Update `cv:list` handler to read from `resumes/` subdirectory**

Update the import at the top of `src/main/index.ts` to include `listWorkspaceSubdirFiles`:

```typescript
import {
  readUserDataFile,
  writeUserDataFile,
  listWorkspaceFiles,
  listWorkspaceSubdirFiles,
  readWorkspaceFile,
  getWorkspaceLastModified,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  precheckWorkspaceMigration,
  migrateWorkspaceFiles
} from './fs'
```

Replace the `cv:list` handler (lines 85-111):

```typescript
ipcMain.handle('cv:list', async (_, workspacePath?: string) => {
  try {
    const files = await listWorkspaceSubdirFiles('resumes', workspacePath)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const drafts = await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const content = await readWorkspaceFile(`resumes/${file}`, workspacePath)
          const data = JSON.parse(content)
          const modified = await getWorkspaceLastModified(`resumes/${file}`, workspacePath)
          return {
            ...data,
            id: file.replace('.json', ''),
            filename: file,
            lastModified: modified.toISOString()
          }
        } catch (e) {
          console.warn(`Skipping invalid CV file: ${file}`, e)
          return null
        }
      })
    )
    return drafts.filter(Boolean)
  } catch (error) {
    console.warn('Failed to list CVs:', error)
    return []
  }
})
```

**Step 2: Update `cv:save` handler**

Replace the `cv:save` handler (lines 113-122):

```typescript
ipcMain.handle('cv:save', async (_, { filename, data, workspacePath }) => {
  try {
    const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`
    const baseName = safeFilename.replace('.json', '')

    // If there's generated CV content, save it as a separate .md file
    let mdFile: string | undefined = data.mdFile
    if (data.generatedCV) {
      mdFile = `${baseName}.md`
      await writeWorkspaceFile(`resumes/${mdFile}`, data.generatedCV, workspacePath)
    }

    // Save JSON metadata WITHOUT generatedCV content — use mdFile reference instead
    const { generatedCV: _removed, ...metadata } = data
    const jsonData = { ...metadata, mdFile }
    await writeWorkspaceFile(
      `resumes/${safeFilename}`,
      JSON.stringify(jsonData, null, 2),
      workspacePath
    )
    return { success: true }
  } catch (error) {
    console.error('Failed to save CV:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 3: Update `cv:delete` handler**

Replace the `cv:delete` handler (lines 124-132):

```typescript
ipcMain.handle('cv:delete', async (_, { filename, workspacePath }) => {
  try {
    // Delete JSON file
    await deleteWorkspaceFile(`resumes/${filename}`, workspacePath)
    // Also delete companion .md file if it exists
    const mdFilename = filename.replace('.json', '.md')
    try {
      await deleteWorkspaceFile(`resumes/${mdFilename}`, workspacePath)
    } catch {
      // .md file may not exist — that's fine
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to delete CV:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 4: Update `cv:read` handler**

Replace the `cv:read` handler (lines 134-142):

```typescript
ipcMain.handle('cv:read', async (_, { filename, workspacePath }) => {
  try {
    const content = await readWorkspaceFile(`resumes/${filename}`, workspacePath)
    const data = JSON.parse(content)

    // If there's a mdFile reference, read the .md content and return as generatedCV
    if (data.mdFile) {
      try {
        const mdContent = await readWorkspaceFile(`resumes/${data.mdFile}`, workspacePath)
        data.generatedCV = mdContent
      } catch {
        // .md file may not exist
        data.generatedCV = ''
      }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Failed to read CV:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

**Step 5: Update ResumeDialog.tsx — add MarkdownEditor for generated CV display/edit**

In `src/renderer/src/components/ResumeDialog.tsx`:

1. Import `MarkdownEditor`:

```typescript
import { MarkdownEditor } from './MarkdownEditor'
```

2. Replace the generated CV display section (the `<div className="max-h-[200px]...">` block around lines 303-306) with MarkdownEditor:

```typescript
{generatedCV && (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-sm font-medium">{t('resumes.generated_cv')}</label>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={handleCopy} title={t('resumes.copy')}>
          {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={handleExport} title={t('resumes.export_md')}>
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <MarkdownEditor
      value={generatedCV}
      onChange={setGeneratedCV}
      minHeight="200px"
      className="max-h-[400px] overflow-y-auto"
    />
  </div>
)}
```

**Step 6: Update Resumes.test.tsx mocks**

Update mocks to handle the new `resumes/` subdirectory path format. The `cv:list`, `cv:save`, `cv:read`, `cv:delete` IPC calls still use the same channel names, but the data structure may include `mdFile` instead of `generatedCV`. The existing tests primarily test listing/rendering/deleting, which should still work since the handler returns the same shape (with `generatedCV` populated from .md file on read).

No major changes needed to existing tests — just verify they pass since the IPC interface is the same from the renderer's perspective.

**Step 7: Run all tests**

Run: `npx vitest run`

Expected: ALL pass.

**Step 8: Run typecheck**

Run: `npm run typecheck`

Expected: No errors.

**Step 9: Commit**

```bash
git add src/main/index.ts src/renderer/src/components/ResumeDialog.tsx src/renderer/src/components/Resumes.tsx src/renderer/src/components/Resumes.test.tsx
git commit -m "feat: restructure CV storage with separate .md files and JSON metadata"
```

---

### Task 7: Fix 'Mock Profile Data' Bug — Load Real Profile for AI Generation

**Files:**

- Modify: `src/renderer/src/components/ResumeDialog.tsx` (load real profile, pass to generateCV)
- Modify: `src/renderer/src/lib/provider.ts` (minor: profile is now structured data, not string)

**Step 1: Update ResumeDialog to load real profile**

In `src/renderer/src/components/ResumeDialog.tsx`:

1. Replace line 97 (`const profile = 'Mock Profile Data'`) with actual profile loading:

```typescript
const handleGenerate = async (): Promise<void> => {
  if (!jobDescription.trim()) {
    toast.error(t('resumes.empty_jd'))
    return
  }
  setIsGenerating(true)
  try {
    // Load real profile data
    const profileData = await window.electron.ipcRenderer.invoke(
      'profile:load',
      settings.workspacePath
    )

    // Format profile as readable text for the AI prompt
    let profileText = ''
    if (profileData?.personalInfo) {
      const pi = profileData.personalInfo
      if (pi.name) profileText += `Name: ${pi.name}\n`
      if (pi.email) profileText += `Email: ${pi.email}\n`
      if (pi.phone) profileText += `Phone: ${pi.phone}\n`
      if (pi.summary) profileText += `\nSummary:\n${pi.summary}\n`
    }
    if (profileData?.workExperience?.length > 0) {
      profileText += '\nWork Experience:\n'
      for (const exp of profileData.workExperience) {
        profileText += `- ${exp.role} at ${exp.company} (${exp.date})\n`
        if (exp.description) profileText += `  ${exp.description}\n`
      }
    }
    if (profileData?.projects?.length > 0) {
      profileText += '\nProjects:\n'
      for (const proj of profileData.projects) {
        profileText += `- ${proj.name} [${proj.techStack}]\n`
        if (proj.description) profileText += `  ${proj.description}\n`
      }
    }

    if (!profileText.trim()) {
      profileText = 'No profile data available. Generate a generic professional CV.'
    }

    const result = await generateCV({
      profile: profileText,
      jobDescription,
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      baseUrl: settings.baseUrl,
      language: cvLanguage
    })
    setGeneratedCV(result)
    toast.success(t('resumes.generate_success'))
  } catch (error) {
    console.error('Generation failed:', error)
    toast.error(t('resumes.generate_error'))
  } finally {
    setIsGenerating(false)
  }
}
```

**Step 2: Run tests**

Run: `npx vitest run`

Expected: ALL pass.

**Step 3: Commit**

```bash
git add src/renderer/src/components/ResumeDialog.tsx
git commit -m "fix: load real profile data for AI CV generation instead of mock data"
```

---

### Task 8: Data Migration (Old Format → New Format)

**Files:**

- Modify: `src/main/index.ts` (add migration logic at app startup)

**Step 1: Add migration logic after app startup**

In `src/main/index.ts`, after the existing first-run migration check (around line 323-346), add migration logic to handle:

1. **Profile migration**: If `profile.json` exists in userData but `profile/index.json` doesn't exist in workspace, migrate old profile to new format.
2. **CV migration**: If `.json` files exist at workspace root (not in `resumes/` subdir), move them to `resumes/` subdir and extract `generatedCV` into separate `.md` files.

```typescript
// Data format migration: old flat workspace → new subdirectory structure
try {
  const workspaceDir = join(app.getPath('home'), '.cv-assistant')

  // 1. Migrate profile from userData to workspace
  try {
    const oldProfile = await readUserDataFile('profile.json')
    // Check if new profile exists
    try {
      await readWorkspaceFile('profile/index.json')
      // New profile exists — skip migration
    } catch {
      // New profile doesn't exist — migrate
      const data = JSON.parse(oldProfile)
      if (data.personalInfo) {
        const summaryFile = 'summary.md'
        await writeWorkspaceFile(`profile/${summaryFile}`, data.personalInfo.summary || '')

        const workExperience = (data.workExperience || []).map(
          (exp: {
            id: string
            company: string
            role: string
            date: string
            description: string
          }) => {
            const descFile = `work-exp-${exp.id}.md`
            return { ...exp, descriptionFile: descFile }
          }
        )

        for (const exp of data.workExperience || []) {
          await writeWorkspaceFile(`profile/work-exp-${exp.id}.md`, exp.description || '')
        }

        const projects = (data.projects || []).map(
          (proj: { id: string; name: string; techStack: string; description: string }) => {
            const descFile = `project-${proj.id}.md`
            return { ...proj, descriptionFile: descFile }
          }
        )

        for (const proj of data.projects || []) {
          await writeWorkspaceFile(`profile/project-${proj.id}.md`, proj.description || '')
        }

        const index = {
          personalInfo: {
            name: data.personalInfo.name || '',
            email: data.personalInfo.email || '',
            phone: data.personalInfo.phone || '',
            summaryFile
          },
          workExperience: workExperience.map(({ description: _, ...rest }) => rest),
          projects: projects.map(({ description: _, ...rest }) => rest)
        }
        await writeWorkspaceFile('profile/index.json', JSON.stringify(index, null, 2))
        console.log('Profile migrated from userData to workspace')
      }
    }
  } catch {
    // Old profile doesn't exist — nothing to migrate
  }

  // 2. Migrate CVs from workspace root to resumes/ subdirectory
  try {
    const rootFiles = await listWorkspaceFiles(workspaceDir)
    const rootJsonFiles = rootFiles.filter((f) => f.endsWith('.json') && f !== 'settings.json')

    for (const file of rootJsonFiles) {
      try {
        const content = await readWorkspaceFile(file, workspaceDir)
        const data = JSON.parse(content)

        // Check if this looks like a CV file (has jobTitle or jobDescription)
        if (data.jobTitle || data.jobDescription) {
          const baseName = file.replace('.json', '')

          // Extract generatedCV to .md file if present
          let mdFile: string | undefined
          if (data.generatedCV) {
            mdFile = `${baseName}.md`
            await writeWorkspaceFile(`resumes/${mdFile}`, data.generatedCV, workspaceDir)
          }

          // Write metadata to resumes/ subdir
          const { generatedCV: _removed, ...metadata } = data
          await writeWorkspaceFile(
            `resumes/${file}`,
            JSON.stringify({ ...metadata, mdFile }, null, 2),
            workspaceDir
          )

          // Delete old root file
          await deleteWorkspaceFile(file, workspaceDir)
          console.log(`CV migrated: ${file} → resumes/${file}`)
        }
      } catch {
        // Skip files that fail to parse
      }
    }
  } catch {
    // No files to migrate
  }
} catch {
  // Migration is best-effort, don't block app startup
}
```

**Step 2: Run all tests**

Run: `npx vitest run`

Expected: ALL pass (migration logic only runs in main process at startup, doesn't affect renderer tests).

**Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: No errors.

**Step 4: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add data migration from old format to new subdirectory structure"
```

---

### Task 9: Update i18n Keys and Final Cleanup

**Files:**

- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh.json`

**Step 1: Check for any missing i18n keys**

Review all components for new translatable strings. The MarkdownEditor component doesn't use i18n directly. Profile and ResumeDialog use existing keys. Check if any new toast messages or labels were added.

**Step 2: Add any missing keys**

If new keys are needed (e.g., for profile loading with workspace), add them to both `en.json` and `zh.json`.

**Step 3: Run lint**

Run: `npm run lint`

Expected: No errors.

**Step 4: Run full test suite**

Run: `npx vitest run`

Expected: ALL tests pass (should be 41+ tests).

**Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: No errors.

**Step 6: Commit**

```bash
git add src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "chore: update i18n keys for data redesign"
```

---

### Task 10: Remove Dead Code and Final Verification

**Files:**

- Modify: `src/main/index.ts` (remove `readUserDataFile`, `writeUserDataFile` imports if no longer used after migration)
- Verify: All files pass lint, typecheck, and tests

**Step 1: Check if `readUserDataFile` and `writeUserDataFile` are still used**

After migration logic is in place, these functions are still needed for the migration path (reading old profile from userData). Keep them imported but verify.

**Step 2: Run full verification**

```bash
npm run lint && npm run typecheck && npm run test
```

Expected: ALL pass with zero errors.

**Step 3: Final commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup after data architecture redesign"
```

---

## Summary of Changes

| Area             | Before                                | After                                            |
| ---------------- | ------------------------------------- | ------------------------------------------------ |
| Profile storage  | `userData/profile.json` (single file) | `workspace/profile/index.json` + `*.md` files    |
| Settings storage | `localStorage` (mock)                 | `workspace/settings.json` via IPC                |
| CV content       | Inline in JSON `generatedCV` field    | Separate `.md` file, JSON has `mdFile` reference |
| CV location      | Workspace root flat files             | `workspace/resumes/` subdirectory                |
| Profile editing  | Plain `<Textarea>`                    | Tiptap WYSIWYG `<MarkdownEditor>`                |
| CV editing       | Plain `<div>` display                 | Tiptap WYSIWYG `<MarkdownEditor>`                |
| AI profile data  | Hardcoded `'Mock Profile Data'`       | Real profile loaded via IPC                      |
| Migration        | `.json` only                          | `.json` + `.md` files                            |

## Test Impact

- **New tests:** MarkdownEditor component tests, listWorkspaceSubdirFiles tests
- **Modified tests:** Profile.test.tsx (new IPC format + SettingsProvider wrapper), Settings.test.tsx (IPC instead of localStorage), Resumes.test.tsx (minor mock updates)
- **Unchanged tests:** fs.test.ts existing migration tests, App.test.tsx
