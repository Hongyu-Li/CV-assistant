# Dashboard → Resumes Merge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate the app from 5 tabs (Dashboard, Profile, Generator, Resumes, Settings) to 3 tabs (Profile, Resumes, Settings) by merging Dashboard's create-CV form and Generator's AI generation into a unified dialog in Resumes.

**Architecture:** Delete Dashboard (inline in App.tsx) and Generator (separate component). Create a new `ResumeDialog` component that combines form fields + JD input + AI generation + save into a single dialog. Resumes becomes a full CRUD view with card grid + "新增" button. Dialog opens for both create and edit flows.

**Tech Stack:** React, TypeScript, Radix Dialog, Tailwind CSS, i18next, Vitest/Testing Library

---

## Constraints

- No new npm dependencies EXCEPT `@radix-ui/react-dialog` (needed for shadcn Dialog pattern)
- All data stored locally via IPC (no server)
- External AI calls go through IPC (main process)
- Do NOT modify `src/preload/index.ts`, `src/preload/index.d.ts`, `src/renderer/index.html`
- Follow existing shadcn/Radix component patterns in `src/renderer/src/components/ui/`
- Follow existing i18n key naming patterns
- Follow existing test mock patterns (window.electron mock via Object.defineProperty)

## Existing Code Reference

**CV interface** (current, in Resumes.tsx):

```typescript
interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  lastModified?: string
  [key: string]: unknown
}
```

**IPC handlers** (src/main/index.ts): `cv:list`, `cv:save`, `cv:delete` — need to add `cv:read`

**FS helpers** (src/main/fs.ts): `readWorkspaceFile(filename, workspaceDir)` already exists

**AI generation** (src/renderer/src/lib/provider.ts): `generateCV({ profile, jobDescription, provider, apiKey, model, baseUrl })` returns Promise<string>

**Settings** (src/renderer/src/context/SettingsContext.tsx): `useSettings()` provides `settings.provider`, `settings.apiKey`, `settings.model`, `settings.baseUrl`, `settings.workspacePath`

**Test mock pattern** (from Settings.test.tsx):

```typescript
Object.defineProperty(window, 'electron', {
  value: { ipcRenderer: { on: vi.fn(), removeListener: vi.fn(), invoke: vi.fn() } },
  writable: true
})
```

---

### Task 1: Install @radix-ui/react-dialog and Create Dialog UI Component

**Files:**

- Create: `src/renderer/src/components/ui/dialog.tsx`
- Modify: `package.json` (via npm install)

**Step 1: Install the Radix Dialog package**

Run: `npm install @radix-ui/react-dialog`

**Step 2: Create the shadcn Dialog component**

Create `src/renderer/src/components/ui/dialog.tsx` following the exact same pattern as the existing shadcn components in `src/renderer/src/components/ui/select.tsx` (which uses Radix). The Dialog component should export:

- `Dialog` (root)
- `DialogTrigger`
- `DialogContent`
- `DialogHeader`
- `DialogFooter`
- `DialogTitle`
- `DialogDescription`
- `DialogClose`

Use the standard shadcn Dialog implementation with Tailwind classes. The DialogContent should include:

- Portal + Overlay
- Fixed center positioning
- Close button (X) in top-right
- Max height with scrollable content (for our tall form dialog)
- `max-w-2xl` width (we need wide dialog for form + JD + generated content)

Reference the official shadcn/ui Dialog source: it wraps `@radix-ui/react-dialog` with `cn()` utility and Tailwind classes.

```typescript
import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: Clean (0 errors)

**Step 4: Commit**

```bash
git add package.json package-lock.json src/renderer/src/components/ui/dialog.tsx
git commit -m "feat: add shadcn Dialog UI component with @radix-ui/react-dialog"
```

---

### Task 2: Add cv:read IPC Handler

**Files:**

- Modify: `src/main/index.ts` (add handler after cv:save block, around line 132)

**Step 1: Add the cv:read IPC handler**

Add after the `cv:delete` handler block (after line 132 in index.ts):

```typescript
ipcMain.handle('cv:read', async (_, { filename, workspacePath }) => {
  try {
    const content = await readWorkspaceFile(filename, workspacePath)
    return { success: true, data: JSON.parse(content) }
  } catch (error) {
    console.error('Failed to read CV:', error)
    return { success: false, error: (error as Error).message }
  }
})
```

This follows the exact same pattern as the existing cv:save and cv:delete handlers (try/catch, destructure args, return `{success, data/error}`).

**Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.node.json --composite false`
Expected: Clean (0 errors)

**Step 3: Commit**

```bash
git add src/main/index.ts
git commit -m "feat: add cv:read IPC handler for loading individual CV files"
```

---

### Task 3: Add i18n Keys

**Files:**

- Modify: `src/renderer/src/locales/en.json`
- Modify: `src/renderer/src/locales/zh.json`

**Step 1: Add new keys to en.json**

Add these keys under the `"resumes"` section (replacing old content where needed):

```json
{
  "resumes": {
    "description": "Manage your CV drafts and generated resumes.",
    "empty_title": "No Resumes Found",
    "empty_desc": "Click 'New Resume' to create your first resume.",
    "load_error": "Failed to load resumes",
    "delete_success": "Resume deleted successfully",
    "delete_error": "Failed to delete resume",
    "loading": "Loading resumes...",
    "untitled": "Untitled Resume",
    "unknown_date": "Unknown date",
    "experience_display": "{{level}} level",
    "new_resume": "New Resume",
    "edit_resume": "Edit Resume",
    "create_resume": "Create Resume",
    "save": "Save",
    "cancel": "Cancel",
    "job_title": "Job Title",
    "job_title_ph": "e.g. Software Engineer",
    "exp_level": "Experience Level",
    "exp_level_ph": "Select level",
    "level_junior": "Junior",
    "level_mid": "Mid-Level",
    "level_senior": "Senior",
    "company_name": "Company Name",
    "company_name_ph": "e.g. Google",
    "target_salary": "Target Salary",
    "target_salary_ph": "e.g. $150,000",
    "notes": "Notes",
    "notes_ph": "Any additional notes...",
    "job_description": "Job Description (JD)",
    "jd_placeholder": "Paste the job description here...",
    "generate_cv": "Generate CV",
    "generating": "Generating...",
    "generated_cv": "Generated CV",
    "generated_cv_desc": "Your AI-tailored CV will appear here.",
    "waiting_generation": "Waiting for generation...",
    "generate_success": "CV Generated Successfully!",
    "generate_error": "Failed to generate CV. Please check your AI settings.",
    "empty_jd": "Please enter a job description",
    "copy": "Copy",
    "copied": "Copied to clipboard!",
    "export_md": "Export Markdown",
    "exported": "CV exported successfully!",
    "save_success": "Resume saved successfully",
    "save_error": "Failed to save resume",
    "validation_error": "Please fill in the job title",
    "company": "Company",
    "status_draft": "Draft",
    "status_generated": "Generated"
  }
}
```

Also keep the `"dashboard"` section keys because they're referenced via `dashboard.level_junior` etc. in the experience display — actually, we should move those to `resumes.level_*` instead. UPDATE the resumes section with level keys and remove the dashboard section entirely.

Remove these sections from en.json:

- `"app.dashboard"` key
- `"app.generator"` key
- `"dashboard"` section (entire object)
- `"generator"` section (entire object)

Add to `"common"` section:

```json
"common": {
  "delete": "Delete",
  "cancel": "Cancel",
  "save": "Save"
}
```

**Step 2: Add same keys to zh.json**

Same structure, Chinese translations:

```json
{
  "resumes": {
    "description": "管理您的简历草稿和已生成的简历。",
    "empty_title": "未找到简历",
    "empty_desc": "点击"新建简历"创建您的第一份简历。",
    "load_error": "加载简历失败",
    "delete_success": "简历删除成功",
    "delete_error": "删除简历失败",
    "loading": "正在加载简历...",
    "untitled": "未命名简历",
    "unknown_date": "未知日期",
    "experience_display": "{{level}}",
    "new_resume": "新建简历",
    "edit_resume": "编辑简历",
    "create_resume": "创建简历",
    "save": "保存",
    "cancel": "取消",
    "job_title": "应聘职位",
    "job_title_ph": "例如：软件工程师",
    "exp_level": "经验水平",
    "exp_level_ph": "选择经验水平",
    "level_junior": "初级",
    "level_mid": "中级",
    "level_senior": "高级",
    "company_name": "公司名称",
    "company_name_ph": "例如：谷歌",
    "target_salary": "目标薪资",
    "target_salary_ph": "例如：30k",
    "notes": "备注",
    "notes_ph": "其他备注信息...",
    "job_description": "职位描述 (JD)",
    "jd_placeholder": "请将应聘公司的职位描述粘贴到此处...",
    "generate_cv": "生成简历",
    "generating": "生成中...",
    "generated_cv": "生成的简历",
    "generated_cv_desc": "您的AI定制简历将显示在此处。",
    "waiting_generation": "等待生成...",
    "generate_success": "简历生成成功！",
    "generate_error": "生成简历失败。请检查您的AI设置。",
    "empty_jd": "请输入职位描述",
    "copy": "复制",
    "copied": "已复制到剪贴板！",
    "export_md": "导出 Markdown",
    "exported": "简历导出成功！",
    "save_success": "简历保存成功",
    "save_error": "保存简历失败",
    "validation_error": "请填写应聘职位",
    "company": "公司",
    "status_draft": "草稿",
    "status_generated": "已生成"
  }
}
```

Remove same sections from zh.json: `app.dashboard`, `app.generator`, `dashboard`, `generator`.

Add to `"common"`:

```json
"common": {
  "delete": "删除",
  "cancel": "取消",
  "save": "保存"
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: Clean

**Step 4: Commit**

```bash
git add src/renderer/src/locales/en.json src/renderer/src/locales/zh.json
git commit -m "feat: update i18n keys for dashboard-to-resumes merge"
```

---

### Task 4: Create ResumeDialog Component

**Files:**

- Create: `src/renderer/src/components/ResumeDialog.tsx`

**Dependencies:** Task 1 (Dialog UI), Task 3 (i18n keys)

**Step 1: Create ResumeDialog.tsx**

This component encapsulates:

1. Form fields: jobTitle, experienceLevel, companyName, targetSalary, notes
2. JD textarea
3. AI generate button + loading state
4. Generated CV display with copy/export actions
5. Save button

Props interface:

```typescript
interface ResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume?: CV | null // null/undefined = create mode, CV = edit mode
  onSaved: () => void // callback to refresh list after save
}
```

The component should:

- Use `useSettings()` for AI provider config and workspacePath
- Use `useTranslation()` for all strings
- Use `generateCV()` from `../lib/provider` for AI generation
- Use `window.electron.ipcRenderer.invoke('cv:save', ...)` to save
- Pre-fill form when `resume` prop is provided (edit mode)
- Generate filename on create: `${jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`
- On edit: use existing `resume.filename`
- Save JSON with fields: `{ jobTitle, experienceLevel, companyName, targetSalary, notes, jobDescription, generatedCV, createdAt, lastModified, status }`
- After successful save: call `onSaved()`, close dialog
- Generated CV section scrollable, monospace font
- Copy + Export Markdown buttons only visible when generatedCV exists

The Dialog layout (top to bottom):

1. DialogHeader: "Create Resume" or "Edit Resume"
2. Form grid (2 columns): jobTitle, experienceLevel, companyName, targetSalary
3. Notes textarea (full width)
4. JD textarea (full width, taller)
5. Generate CV button
6. Generated CV output area (if content exists)
7. Copy + Export buttons (if generated)
8. DialogFooter: Cancel + Save buttons

Use existing UI components: Input, Textarea, Button, Select (SelectTrigger, SelectContent, SelectItem, SelectValue).

**Step 2: Verify**

Run: `npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: Clean (may have warnings about unused — those are expected until Task 5 integrates it)

**Step 3: Commit**

```bash
git add src/renderer/src/components/ResumeDialog.tsx
git commit -m "feat: create ResumeDialog component with form, JD input, AI generation, and save"
```

---

### Task 5: Rewrite Resumes.tsx with CRUD

**Files:**

- Modify: `src/renderer/src/components/Resumes.tsx`

**Dependencies:** Task 1 (Dialog), Task 4 (ResumeDialog)

**Step 1: Update the CV interface**

```typescript
interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  companyName?: string
  targetSalary?: string
  notes?: string
  jobDescription?: string
  generatedCV?: string
  createdAt?: string
  lastModified?: string
  status?: string
}
```

**Step 2: Add state for dialog**

```typescript
const [dialogOpen, setDialogOpen] = useState(false)
const [editingResume, setEditingResume] = useState<CV | null>(null)
```

**Step 3: Add "新增" button**

In the header section next to the title:

```tsx
<Button
  onClick={() => {
    setEditingResume(null)
    setDialogOpen(true)
  }}
>
  <Plus className="h-4 w-4 mr-2" />
  {t('resumes.new_resume')}
</Button>
```

Import `Plus` from `lucide-react`.

**Step 4: Add card click → edit**

On each Card, add `onClick` handler:

```tsx
onClick={() => handleEdit(resume)}
```

Where `handleEdit` loads the full CV data via `cv:read` IPC and opens dialog:

```typescript
const handleEdit = async (resume: CV): Promise<void> => {
  try {
    const result = await window.electron.ipcRenderer.invoke('cv:read', {
      filename: resume.filename,
      workspacePath: settings.workspacePath
    })
    if (result.success) {
      setEditingResume({ ...result.data, id: resume.id, filename: resume.filename })
      setDialogOpen(true)
    } else {
      toast.error(t('resumes.load_error'))
    }
  } catch {
    toast.error(t('resumes.load_error'))
  }
}
```

**Step 5: Add card visual improvements for new fields**

Show companyName on card if present, show status badge (Draft/Generated).

**Step 6: Integrate ResumeDialog**

At the bottom of the component, render:

```tsx
<ResumeDialog
  open={dialogOpen}
  onOpenChange={setDialogOpen}
  resume={editingResume}
  onSaved={loadResumes}
/>
```

Import ResumeDialog from `./ResumeDialog`.

**Step 7: Add cursor pointer to cards**

```tsx
className = 'group relative overflow-hidden transition-all hover:border-primary/50 cursor-pointer'
```

**Step 8: Verify**

Run: `npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: Clean

**Step 9: Commit**

```bash
git add src/renderer/src/components/Resumes.tsx
git commit -m "feat: rewrite Resumes component with full CRUD and dialog integration"
```

---

### Task 6: Update App.tsx

**Files:**

- Modify: `src/renderer/src/App.tsx`

**Step 1: Remove imports**

Remove these imports:

- `import { Generator } from './components/Generator'` (line 18)
- Remove unused imports: `Input`, `Textarea`, `Card*`, `Select*`, `toast` — ONLY if they're not used elsewhere in App.tsx after removing the dashboard JSX. Check carefully.

After removing dashboard JSX and Generator, the only remaining view renderers are Profile, Resumes, Settings — all separate components. App.tsx will only need: `Button`, `Toaster`, `useTranslation`, `useSettings`, `useState`, and the three component imports.

**Step 2: Update currentView type and default**

Change:

```typescript
const [currentView, setCurrentView] = useState<
  'dashboard' | 'profile' | 'settings' | 'generator' | 'resumes'
>('dashboard')
```

To:

```typescript
const [currentView, setCurrentView] = useState<'profile' | 'settings' | 'resumes'>('resumes')
```

**Step 3: Remove jobTitle and experienceLevel state**

Delete:

```typescript
const [jobTitle, setJobTitle] = useState('')
const [experienceLevel, setExperienceLevel] = useState('')
```

And remove `const { settings } = useSettings()` if no longer used in App.tsx.

**Step 4: Remove Dashboard sidebar button**

Remove the Dashboard `<Button>` block (lines 37-43).

**Step 5: Remove Generator sidebar button**

Remove the Generator `<Button>` block (lines 51-57).

**Step 6: Remove Dashboard inline JSX**

Remove the entire block `{currentView === 'dashboard' && (...)}` (lines 81-165).

**Step 7: Remove Generator render**

Remove `{currentView === 'generator' && <Generator />}` (line 79).

**Step 8: Clean up unused imports**

After all removals, clean up any imports that are no longer used. The file should only import:

- `Toaster` from `./components/ui/sonner`
- `Button` from `./components/ui/button`
- `useState` from `react`
- `Profile` from `./components/Profile`
- `Settings` from `./components/Settings`
- `Resumes` from `./components/Resumes`
- `useTranslation` from `react-i18next`

**Step 9: Verify**

Run: `npx tsc --noEmit -p tsconfig.web.json --composite false`
Expected: Clean

Run: `npx eslint --cache .`
Expected: Clean (no unused imports, no unused variables)

**Step 10: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: remove Dashboard and Generator tabs, set Resumes as default view"
```

---

### Task 7: Delete Generator.tsx

**Files:**

- Delete: `src/renderer/src/components/Generator.tsx`

**Step 1: Delete the file**

```bash
rm src/renderer/src/components/Generator.tsx
```

**Step 2: Verify no remaining imports**

Run: `grep -r "Generator" src/renderer/src/ --include="*.tsx" --include="*.ts"`

Should return nothing (all references removed in Task 6).

**Step 3: Commit**

```bash
git add -u
git commit -m "chore: delete Generator component (merged into ResumeDialog)"
```

---

### Task 8: Rewrite Resumes.test.tsx

**Files:**

- Modify: `src/renderer/src/components/Resumes.test.tsx`

**Step 1: Update mocks**

The test file needs to mock:

- `sonner` (toast)
- `window.electron.ipcRenderer` (invoke, on, removeListener)
- `../lib/provider` (generateCV)
- `@radix-ui/react-dialog` (or let it render naturally — prefer natural rendering if possible)

Mock pattern:

```typescript
const mockInvoke = vi.fn()
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: mockInvoke,
      on: vi.fn(),
      removeListener: vi.fn()
    }
  },
  writable: true
})
```

Mock provider:

```typescript
vi.mock('../lib/provider', () => ({
  generateCV: vi.fn().mockResolvedValue('Generated CV Content'),
  PROVIDER_CONFIGS: {
    openai: { label: 'OpenAI', defaultBaseUrl: '', defaultModel: 'gpt-4o', requiresApiKey: true }
  }
}))
```

**Step 2: Write tests**

Test cases:

1. `renders loading state initially` — existing, keep as-is
2. `renders empty state when no resumes` — update: check for new empty_desc text
3. `renders list of resumes` — existing, keep with minor updates for new fields
4. `shows "New Resume" button` — new test
5. `opens create dialog when clicking New Resume` — new test
6. `opens edit dialog when clicking a resume card` — new: mock cv:read, click card, verify dialog opens
7. `calls delete when trash button is clicked` — existing, keep
8. `displays company name on card when present` — new test

**Step 3: Run tests**

Run: `npx vitest run src/renderer/src/components/Resumes.test.tsx`
Expected: All pass

**Step 4: Commit**

```bash
git add src/renderer/src/components/Resumes.test.tsx
git commit -m "test: rewrite Resumes tests for CRUD operations and dialog integration"
```

---

### Task 9: Delete Generator.test.tsx

**Files:**

- Delete: `src/renderer/src/components/Generator.test.tsx`

**Step 1: Delete the file**

```bash
rm src/renderer/src/components/Generator.test.tsx
```

**Step 2: Commit**

```bash
git add -u
git commit -m "chore: delete Generator tests (component removed)"
```

---

### Task 10: Final Verification

**Step 1: TypeScript check**

Run: `npm run typecheck`
Expected: Clean

**Step 2: Lint**

Run: `npm run lint`
Expected: Clean (0 warnings, 0 errors)

**Step 3: Test**

Run: `npm run test`
Expected: All tests pass

**Step 4: Fix any issues found**

If any step fails, fix and re-verify.

---

### Task 11: Final Commit (Squash)

If there were fix-up commits during Task 10, consider squashing. Otherwise the individual task commits are fine.

Final state should be:

- 3 tabs: Profile, Resumes, Settings
- Resumes has "New Resume" button → dialog with full form + JD + AI generation
- Click card → edit dialog pre-filled
- Delete works via trash button
- All i18n keys in both en.json and zh.json
- All tests passing
- No lint errors
- No type errors
