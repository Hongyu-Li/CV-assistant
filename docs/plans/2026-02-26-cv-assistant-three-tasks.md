# CV Assistant — i18n Cleanup, OpenCode Fix, New Agent Types

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all remaining hardcoded/untranslated strings, fix OpenCode agent connection failure (missing `model` field), and add 3 new coding agent types (Aider, Cursor, Copilot) with config UI.

**Architecture:** Three sequential tasks, each with its own test gate. Task 1 is pure i18n string replacement. Task 2 adds `agentModel` to settings and includes it in the OpenCode fetch body. Task 3 adds 3 stub agent classes, expands the type union, and adds dropdown entries + config fields in Settings UI.

**Tech Stack:** React 19, TypeScript 5.9, Vitest 4, react-i18next 16, Electron 39, Tailwind CSS 4, Radix UI Select

**Constraints:**

- Do NOT add npm dependencies
- Do NOT modify `src/main/index.ts` or `src/preload/index.ts`
- New agents are stubs (no real CLI IPC)
- All data stored locally
- Test mock: `t(key) => key` — tests assert i18n KEY NAMES, not translated values

**Commands:**

- Test: `npm test` (runs `vitest run`)
- Typecheck: `npm run typecheck:web` (runs `tsc --noEmit -p tsconfig.web.json --composite false`)
- Full typecheck: `npm run typecheck` (node + web)
- Baseline: 15/15 tests passing

---

## Task 1: Fix Remaining Untranslated/Hardcoded Strings

**Files:**

- Modify: `src/renderer/src/components/Generator.tsx:42`
- Modify: `src/renderer/src/components/Resumes.tsx:42,59,62,66,71,80,93,96,111,117,125,137`
- Modify: `src/renderer/src/App.tsx:116,138,142`
- Modify: `src/renderer/src/locales/en.json` (add ~8 new keys)
- Modify: `src/renderer/src/locales/zh.json` (add ~8 new keys)
- Modify: `src/renderer/src/components/Resumes.test.tsx:37`

### Hardcoded String Inventory

#### Generator.tsx

| Line | Current Code                                  | Fix                                              |
| ---- | --------------------------------------------- | ------------------------------------------------ |
| 42   | `toast.success('CV Generated Successfully!')` | `toast.success(t('generator.generate_success'))` |

#### Resumes.tsx — `||` fallback patterns (redundant — keys exist)

| Line | Current Code                                                     | Fix                           |
| ---- | ---------------------------------------------------------------- | ----------------------------- |
| 42   | `t('resumes.load_error') \|\| 'Failed to load resumes'`          | `t('resumes.load_error')`     |
| 59   | `t('resumes.delete_success') \|\| 'Resume deleted successfully'` | `t('resumes.delete_success')` |
| 62   | `t('resumes.delete_error') \|\| 'Failed to delete resume'`       | `t('resumes.delete_error')`   |
| 66   | `t('resumes.delete_error') \|\| 'Failed to delete resume'`       | `t('resumes.delete_error')`   |
| 80   | `t('resumes.description') \|\| 'Manage your saved...'`           | `t('resumes.description')`    |
| 93   | `t('resumes.empty_title') \|\| 'No resumes found'`               | `t('resumes.empty_title')`    |
| 96   | `t('resumes.empty_desc') \|\| 'Create a new draft...'`           | `t('resumes.empty_desc')`     |
| 137  | `t('common.delete') \|\| 'Delete'`                               | `t('common.delete')`          |

#### Resumes.tsx — hardcoded strings (no i18n key exists)

| Line | Current Code                                    | New Key                      | EN Value             | ZH Value          |
| ---- | ----------------------------------------------- | ---------------------------- | -------------------- | ----------------- |
| 71   | `<div className="p-6">Loading resumes...</div>` | `resumes.loading`            | `Loading resumes...` | `正在加载简历...` |
| 111  | `resume.jobTitle \|\| 'Untitled Resume'`        | `resumes.untitled`           | `Untitled Resume`    | `未命名简历`      |
| 117  | `'Unknown date'`                                | `resumes.unknown_date`       | `Unknown date`       | `未知日期`        |
| 125  | `{resume.experienceLevel} level`                | `resumes.experience_display` | `{{level}} level`    | `{{level}}级`     |

#### App.tsx — hardcoded strings

| Line | Current Code                                                       | New Key                        | EN Value                          | ZH Value                  |
| ---- | ------------------------------------------------------------------ | ------------------------------ | --------------------------------- | ------------------------- |
| 116  | `t('dashboard.validation_error') \|\| 'Please fill in all fields'` | `dashboard.validation_error`   | `Please fill in all fields`       | `请填写所有字段`          |
| 138  | `toast.error('Failed to save draft: ' + result.error)`             | `dashboard.save_draft_error`   | `Failed to save draft: {{error}}` | `保存草稿失败：{{error}}` |
| 142  | `toast.error('Failed to create draft')`                            | `dashboard.create_draft_error` | `Failed to create draft`          | `创建草稿失败`            |

#### Test assertion that will break

| File             | Line | Current Assertion                                                    | Fix                                                               |
| ---------------- | ---- | -------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Resumes.test.tsx | 37   | `expect(screen.getByText('Loading resumes...')).toBeInTheDocument()` | `expect(screen.getByText('resumes.loading')).toBeInTheDocument()` |

### Step 1: Add new i18n keys to en.json

Add these keys to `src/renderer/src/locales/en.json`:

In the `"dashboard"` section (after `"notes_saved": "Notes saved!"`):

```json
"validation_error": "Please fill in all fields",
"save_draft_error": "Failed to save draft: {{error}}",
"create_draft_error": "Failed to create draft"
```

In the `"generator"` section (after `"copied_text": "Copied"`):

```json
"generate_success": "CV Generated Successfully!"
```

In the `"resumes"` section (after `"delete_error": "Failed to delete resume"`):

```json
"loading": "Loading resumes...",
"untitled": "Untitled Resume",
"unknown_date": "Unknown date",
"experience_display": "{{level}} level"
```

### Step 2: Add new i18n keys to zh.json

Add these keys to `src/renderer/src/locales/zh.json`:

In the `"dashboard"` section (after `"notes_saved": "笔记已保存！"`):

```json
"validation_error": "请填写所有字段",
"save_draft_error": "保存草稿失败：{{error}}",
"create_draft_error": "创建草稿失败"
```

In the `"generator"` section (after `"copied_text": "已复制"`):

```json
"generate_success": "简历生成成功！"
```

In the `"resumes"` section (after `"delete_error": "删除简历失败"`):

```json
"loading": "正在加载简历...",
"untitled": "未命名简历",
"unknown_date": "未知日期",
"experience_display": "{{level}}级"
```

### Step 3: Fix Generator.tsx hardcoded string

File: `src/renderer/src/components/Generator.tsx`

Line 42 — change:

```tsx
toast.success('CV Generated Successfully!')
```

to:

```tsx
toast.success(t('generator.generate_success'))
```

### Step 4: Fix Resumes.tsx — remove redundant `||` fallbacks and replace hardcoded strings

File: `src/renderer/src/components/Resumes.tsx`

**Remove `||` fallbacks** (keys already exist in both locale files):

Line 42: `t('resumes.load_error') || 'Failed to load resumes'` → `t('resumes.load_error')`
Line 59: `t('resumes.delete_success') || 'Resume deleted successfully'` → `t('resumes.delete_success')`
Line 62: `t('resumes.delete_error') || 'Failed to delete resume'` → `t('resumes.delete_error')`
Line 66: `t('resumes.delete_error') || 'Failed to delete resume'` → `t('resumes.delete_error')`
Line 80: `t('resumes.description') || 'Manage your saved CV drafts and generated resumes.'` → `t('resumes.description')`
Line 93: `t('resumes.empty_title') || 'No resumes found'` → `t('resumes.empty_title')`
Line 96: `t('resumes.empty_desc') || 'Create a new draft from the dashboard to get started.'` → `t('resumes.empty_desc')`
Line 137: `t('common.delete') || 'Delete'` → `t('common.delete')`

**Replace hardcoded strings with t() calls:**

Line 71: `<div className="p-6">Loading resumes...</div>` → `<div className="p-6">{t('resumes.loading')}</div>`

Line 111: `resume.jobTitle || 'Untitled Resume'` → `resume.jobTitle || t('resumes.untitled')`

Line 117: `'Unknown date'` → `t('resumes.unknown_date')`

Line 125: `{resume.experienceLevel} level` → `{t('resumes.experience_display', { level: resume.experienceLevel })}`
(Change `<span className="capitalize">{resume.experienceLevel} level</span>` to `<span className="capitalize">{t('resumes.experience_display', { level: resume.experienceLevel })}</span>`)

### Step 5: Fix App.tsx hardcoded strings

File: `src/renderer/src/App.tsx`

Line 116: `toast.error(t('dashboard.validation_error') || 'Please fill in all fields')` → `toast.error(t('dashboard.validation_error'))`
(Remove the `||` fallback — we added the key in Step 1)

Line 138: `toast.error('Failed to save draft: ' + result.error)` → `toast.error(t('dashboard.save_draft_error', { error: result.error }))`

Line 142: `toast.error('Failed to create draft')` → `toast.error(t('dashboard.create_draft_error'))`

### Step 6: Fix Resumes.test.tsx assertion

File: `src/renderer/src/components/Resumes.test.tsx`

Line 37: Change:

```tsx
expect(screen.getByText('Loading resumes...')).toBeInTheDocument()
```

to:

```tsx
expect(screen.getByText('resumes.loading')).toBeInTheDocument()
```

(The test mock `t(key) => key` returns the key name, so after the i18n change `t('resumes.loading')` will render as `"resumes.loading"` in tests.)

### Step 7: Run tests

```bash
npm test
```

Expected: 15/15 pass.

### Step 8: Run typecheck

```bash
npm run typecheck:web
```

Expected: No errors.

### Step 9: Commit

```bash
git add src/renderer/src/components/Generator.tsx src/renderer/src/components/Resumes.tsx src/renderer/src/App.tsx src/renderer/src/locales/en.json src/renderer/src/locales/zh.json src/renderer/src/components/Resumes.test.tsx
git commit -m "fix(i18n): replace all hardcoded strings with t() calls and add missing keys"
```

---

## Task 2: Fix OpenCode Agent Connection (Missing `model` Field)

**Files:**

- Modify: `src/renderer/src/context/SettingsContext.tsx:3-14,23-31` (add `agentModel` field)
- Modify: `src/renderer/src/lib/agent.ts:35-40,49-52,117-127` (accept and use `agentModel`)
- Modify: `src/renderer/src/components/Settings.tsx:133-148` (add model input in OpenCode section)
- Modify: `src/renderer/src/locales/en.json` (add agent_model keys)
- Modify: `src/renderer/src/locales/zh.json` (add agent_model keys)
- Modify: `src/renderer/src/components/Settings.test.tsx:20-28` (add `agentModel` to mock settings)

### Step 1: Add `agentModel` to AppSettings type

File: `src/renderer/src/context/SettingsContext.tsx`

Add after line 6 (`agentEndpoint: string`):

```tsx
agentModel: string
```

So the AppSettings interface becomes:

```tsx
export interface AppSettings {
  // Agent settings
  agentType: 'opencode' | 'claude-code' | 'custom-cli'
  agentEndpoint: string
  agentModel: string
  agentCommand: string
  agentArgs: string

  // App settings
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'
  workspacePath?: string
}
```

### Step 2: Add default value for `agentModel`

File: `src/renderer/src/context/SettingsContext.tsx`

In the `defaultSettings` object, add after `agentEndpoint`:

```tsx
agentModel: 'anthropic/claude-sonnet-4',
```

So it becomes:

```tsx
const defaultSettings: AppSettings = {
  agentType: 'opencode',
  agentEndpoint: 'http://localhost:4096',
  agentModel: 'anthropic/claude-sonnet-4',
  agentCommand: '',
  agentArgs: '',
  theme: 'system',
  language: 'en',
  workspacePath: ''
}
```

### Step 3: Update OpenCodeAgent to accept and use model

File: `src/renderer/src/lib/agent.ts`

Change the OpenCodeAgent constructor to also accept `model`:

```tsx
export class OpenCodeAgent implements CodingAgent {
  private endpoint: string
  private model: string

  constructor(endpoint: string, model: string) {
    this.endpoint = endpoint
    this.model = model
  }
```

Then in the fetch body (line 49-52), add `model`:

```tsx
body: JSON.stringify({
  model: this.model,
  messages: [{ role: 'user', content: prompt }],
  stream: true
})
```

Also improve the error message (lines 91-94) to mention CORS:

```tsx
} catch {
  yield `Failed to connect to OpenCode server at ${this.endpoint}. `
  yield 'Make sure OpenCode is running with `opencode serve --cors`.\n'
  yield 'If running in dev mode, the --cors flag is required for CORS headers.\n\n'
  yield 'Falling back to mock generation...\n\n'
  yield* new MockAgent().generateCV(options)
}
```

### Step 4: Update getAgent factory to pass model

File: `src/renderer/src/lib/agent.ts`

Change line 120:

```tsx
case 'opencode':
  return new OpenCodeAgent(settings.agentEndpoint)
```

to:

```tsx
case 'opencode':
  return new OpenCodeAgent(settings.agentEndpoint, settings.agentModel)
```

### Step 5: Add i18n keys for model field

File: `src/renderer/src/locales/en.json`, in `"settings"` section, add after `"agent_endpoint_desc"`:

```json
"agent_model": "Model",
"agent_model_ph": "anthropic/claude-sonnet-4",
"agent_model_desc": "The model identifier for the OpenCode API (e.g. anthropic/claude-sonnet-4)."
```

File: `src/renderer/src/locales/zh.json`, in `"settings"` section, add after `"agent_endpoint_desc"`:

```json
"agent_model": "模型",
"agent_model_ph": "anthropic/claude-sonnet-4",
"agent_model_desc": "OpenCode API 使用的模型标识符（例如 anthropic/claude-sonnet-4）。"
```

### Step 6: Add model input to Settings UI

File: `src/renderer/src/components/Settings.tsx`

In the `settings.agentType === 'opencode'` conditional block (line 133-148), add a model input AFTER the endpoint input. The block becomes:

```tsx
{
  settings.agentType === 'opencode' && (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.agent_endpoint')}</label>
        <Input
          type="text"
          placeholder={t('settings.agent_endpoint_ph')}
          value={settings.agentEndpoint}
          onChange={(e) => updateSettings({ agentEndpoint: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.agent_endpoint_desc')}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.agent_model')}</label>
        <Input
          type="text"
          placeholder={t('settings.agent_model_ph')}
          value={settings.agentModel}
          onChange={(e) => updateSettings({ agentModel: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.agent_model_desc')}</p>
      </div>
    </div>
  )
}
```

Note: The outer div changes from `<div className="space-y-2">` to `<div className="space-y-4">` to wrap both inputs, matching the pattern used by claude-code and custom-cli sections.

### Step 7: Update Settings.test.tsx mock settings

File: `src/renderer/src/components/Settings.test.tsx`

Add `agentModel` to the `defaultSettings` object (after line 22):

```tsx
const defaultSettings = {
  agentType: 'opencode',
  agentEndpoint: 'http://localhost:4096',
  agentModel: 'anthropic/claude-sonnet-4',
  agentCommand: '',
  agentArgs: '',
  theme: 'system',
  language: 'en',
  workspacePath: ''
}
```

### Step 8: Run tests

```bash
npm test
```

Expected: 15/15 pass.

### Step 9: Run typecheck

```bash
npm run typecheck:web
```

Expected: No errors.

### Step 10: Commit

```bash
git add src/renderer/src/context/SettingsContext.tsx src/renderer/src/lib/agent.ts src/renderer/src/components/Settings.tsx src/renderer/src/locales/en.json src/renderer/src/locales/zh.json src/renderer/src/components/Settings.test.tsx
git commit -m "fix(agent): add model field to OpenCode fetch and settings UI"
```

---

## Task 3: Add New Agent Types (Aider, Cursor, Copilot)

**Files:**

- Modify: `src/renderer/src/context/SettingsContext.tsx:5` (expand agentType union)
- Modify: `src/renderer/src/lib/agent.ts` (add 3 stub classes + factory cases)
- Modify: `src/renderer/src/components/Settings.tsx:124-129,132-212` (add SelectItems + config sections)
- Modify: `src/renderer/src/locales/en.json` (add agent label + config keys)
- Modify: `src/renderer/src/locales/zh.json` (add agent label + config keys)
- Modify: `src/renderer/src/components/Settings.test.tsx` (add tests for new agent types)

### Step 1: Expand agentType union in AppSettings

File: `src/renderer/src/context/SettingsContext.tsx`

Change line 5:

```tsx
agentType: 'opencode' | 'claude-code' | 'custom-cli'
```

to:

```tsx
agentType: 'opencode' | 'claude-code' | 'aider' | 'cursor' | 'copilot' | 'custom-cli'
```

### Step 2: Add 3 stub agent classes

File: `src/renderer/src/lib/agent.ts`

Add AFTER the `CustomCLIAgent` class (after line 115) and BEFORE `getAgent`:

```tsx
export class AiderAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    throw new Error('Aider agent is not yet implemented. Please select a different agent type.')
  }
}

export class CursorAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    throw new Error('Cursor agent is not yet implemented. Please select a different agent type.')
  }
}

export class CopilotAgent implements CodingAgent {
  async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
    throw new Error('Copilot agent is not yet implemented. Please select a different agent type.')
  }
}
```

### Step 3: Add factory cases in getAgent

File: `src/renderer/src/lib/agent.ts`

In the `getAgent` switch statement, add 3 cases BEFORE `default`:

```tsx
export function getAgent(settings: AppSettings): CodingAgent {
  switch (settings.agentType) {
    case 'opencode':
      return new OpenCodeAgent(settings.agentEndpoint, settings.agentModel)
    case 'claude-code':
      return new ClaudeCodeAgent()
    case 'aider':
      return new AiderAgent()
    case 'cursor':
      return new CursorAgent()
    case 'copilot':
      return new CopilotAgent()
    case 'custom-cli':
      return new CustomCLIAgent()
    default:
      return new MockAgent()
  }
}
```

### Step 4: Add i18n keys for new agent types

File: `src/renderer/src/locales/en.json`, in `"settings"` section, add after `"agent_model_desc"`:

```json
"agent_aider": "Aider",
"agent_cursor": "Cursor",
"agent_copilot": "Copilot",
"aider_model": "Aider Model",
"aider_model_ph": "sonnet",
"aider_model_desc": "Model name to pass to Aider (e.g. sonnet, opus).",
"cursor_model": "Cursor Model",
"cursor_model_ph": "claude-sonnet-4",
"cursor_model_desc": "Model to use with Cursor agent mode.",
"copilot_model": "Copilot Model",
"copilot_model_ph": "gpt-4o",
"copilot_model_desc": "Model to use with GitHub Copilot."
```

File: `src/renderer/src/locales/zh.json`, in `"settings"` section, add after `"agent_model_desc"`:

```json
"agent_aider": "Aider",
"agent_cursor": "Cursor",
"agent_copilot": "Copilot",
"aider_model": "Aider 模型",
"aider_model_ph": "sonnet",
"aider_model_desc": "传递给 Aider 的模型名称（例如 sonnet、opus）。",
"cursor_model": "Cursor 模型",
"cursor_model_ph": "claude-sonnet-4",
"cursor_model_desc": "Cursor 代理模式使用的模型。",
"copilot_model": "Copilot 模型",
"copilot_model_ph": "gpt-4o",
"copilot_model_desc": "GitHub Copilot 使用的模型。"
```

### Step 5: Add SelectItems for new agent types in Settings dropdown

File: `src/renderer/src/components/Settings.tsx`

In the agent type `<SelectContent>` (around lines 124-128), add 3 new items:

```tsx
<SelectContent>
  <SelectItem value="opencode">OpenCode</SelectItem>
  <SelectItem value="claude-code">Claude Code</SelectItem>
  <SelectItem value="aider">{t('settings.agent_aider')}</SelectItem>
  <SelectItem value="cursor">{t('settings.agent_cursor')}</SelectItem>
  <SelectItem value="copilot">{t('settings.agent_copilot')}</SelectItem>
  <SelectItem value="custom-cli">Custom CLI</SelectItem>
</SelectContent>
```

### Step 6: Add config sections for new agent types

File: `src/renderer/src/components/Settings.tsx`

Add these conditional sections in the `<div className="pt-4 border-t">` block, AFTER the `custom-cli` section (after its closing `)}`) and BEFORE the closing `</div>` of the border-t div:

```tsx
{
  settings.agentType === 'aider' && (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.agent_command')}</label>
        <Input
          type="text"
          placeholder="aider"
          value={settings.agentCommand}
          onChange={(e) => updateSettings({ agentCommand: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.agent_command_desc')}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.aider_model')}</label>
        <Input
          type="text"
          placeholder={t('settings.aider_model_ph')}
          value={settings.agentArgs}
          onChange={(e) => updateSettings({ agentArgs: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.aider_model_desc')}</p>
      </div>
    </div>
  )
}

{
  settings.agentType === 'cursor' && (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.agent_command')}</label>
        <Input
          type="text"
          placeholder="cursor"
          value={settings.agentCommand}
          onChange={(e) => updateSettings({ agentCommand: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.agent_command_desc')}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.cursor_model')}</label>
        <Input
          type="text"
          placeholder={t('settings.cursor_model_ph')}
          value={settings.agentArgs}
          onChange={(e) => updateSettings({ agentArgs: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.cursor_model_desc')}</p>
      </div>
    </div>
  )
}

{
  settings.agentType === 'copilot' && (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.agent_command')}</label>
        <Input
          type="text"
          placeholder="copilot"
          value={settings.agentCommand}
          onChange={(e) => updateSettings({ agentCommand: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.agent_command_desc')}</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium leading-none">{t('settings.copilot_model')}</label>
        <Input
          type="text"
          placeholder={t('settings.copilot_model_ph')}
          value={settings.agentArgs}
          onChange={(e) => updateSettings({ agentArgs: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">{t('settings.copilot_model_desc')}</p>
      </div>
    </div>
  )
}
```

### Step 7: Add tests for new agent types in Settings.test.tsx

File: `src/renderer/src/components/Settings.test.tsx`

Add 3 new test cases AFTER the existing `'calls updateSettings when endpoint is changed'` test:

```tsx
it('shows command and model fields when Aider is selected', () => {
  ;(useSettings as Mock).mockReturnValue({
    settings: { ...defaultSettings, agentType: 'aider' },
    updateSettings: mockUpdateSettings,
    isLoading: false,
    error: null
  })
  render(<Settings />)
  expect(screen.getByText('settings.agent_command')).toBeInTheDocument()
  expect(screen.getByText('settings.aider_model')).toBeInTheDocument()
})

it('shows command and model fields when Cursor is selected', () => {
  ;(useSettings as Mock).mockReturnValue({
    settings: { ...defaultSettings, agentType: 'cursor' },
    updateSettings: mockUpdateSettings,
    isLoading: false,
    error: null
  })
  render(<Settings />)
  expect(screen.getByText('settings.agent_command')).toBeInTheDocument()
  expect(screen.getByText('settings.cursor_model')).toBeInTheDocument()
})

it('shows command and model fields when Copilot is selected', () => {
  ;(useSettings as Mock).mockReturnValue({
    settings: { ...defaultSettings, agentType: 'copilot' },
    updateSettings: mockUpdateSettings,
    isLoading: false,
    error: null
  })
  render(<Settings />)
  expect(screen.getByText('settings.agent_command')).toBeInTheDocument()
  expect(screen.getByText('settings.copilot_model')).toBeInTheDocument()
})
```

### Step 8: Run tests

```bash
npm test
```

Expected: 18/18 pass (15 original + 3 new).

### Step 9: Run typecheck

```bash
npm run typecheck:web
```

Expected: No errors.

### Step 10: Commit

```bash
git add src/renderer/src/context/SettingsContext.tsx src/renderer/src/lib/agent.ts src/renderer/src/components/Settings.tsx src/renderer/src/locales/en.json src/renderer/src/locales/zh.json src/renderer/src/components/Settings.test.tsx
git commit -m "feat(agent): add Aider, Cursor, and Copilot agent types with config UI"
```

---

## Post-Implementation Verification

After all 3 tasks are committed:

```bash
# Full test suite
npm test

# Full typecheck (node + web)
npm run typecheck

# Verify no hardcoded user-facing English strings remain
# (Run manually: grep for English strings in tsx files that aren't in comments or imports)
```

Expected: All tests pass, all typechecks pass, no hardcoded user strings remain.
