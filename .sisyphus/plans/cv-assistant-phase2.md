# CV Assistant Phase 2: i18n Fixes, OpenCode Connection Fix, More Agent Types

## TL;DR

> **Quick Summary**: Fix all remaining hardcoded/untranslated strings across 4 files (~18 strings), fix the OpenCode agent connection failure (missing `model` field + improved error handling), and add 3 new coding agent types (Aider, Cursor, GitHub Copilot) as stubs with full Settings UI integration.
>
> **Deliverables**:
>
> - All user-visible strings internationalized (zero hardcoded English in components)
> - OpenCode agent successfully connects to `opencode serve` endpoint
> - 3 new agent types selectable in Settings with appropriate config fields
> - All existing tests passing + new tests for added agents
> - Both `en.json` and `zh.json` locale files updated with all new keys
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (i18n keys) → Task 2-5 (parallel components + agents) → Task 6-7 (tests + verification)

---

## Context

### Original Request

User requested three tasks:

1. "我的简历里面还有没有翻译的字段" — Find and fix remaining untranslated fields
2. "为什么opencode的支持为什么连不上" — Debug why OpenCode connection fails
3. "增加其他agent的支持" — Add support for more coding agents

### Interview Summary

**Key Discussions**:

- Explore agents found ~18 hardcoded English strings across Generator.tsx (2), Resumes.tsx (10), Settings.tsx (5), and App.tsx (3)
- OpenCode connection failure root causes identified: missing `model` field in request body, potential CORS from renderer, no error details exposed
- Librarian researched 7 agents: Aider, Cursor, Copilot are feasible; Cline is preview-only; Continue has no API
- All CLI agents require IPC spawning which is out of scope — stubs only

**Research Findings**:

- OpenCode API requires `model` field (e.g., `anthropic/claude-sonnet-4`), supports optional Basic auth, needs `--cors` flag for browser access
- Aider CLI: `aider --message "prompt" --model X --yes --stream --no-pretty`
- Cursor: CLI `agent --mode=agent "prompt"` or Cloud API (beta)
- Copilot: CLI `copilot run "prompt" --auto-approve`, requires GitHub auth

### Gap Analysis (Self-Performed — Metis timed out)

**Identified Gaps** (addressed):

- Dashboard is inline in App.tsx, not a separate component — audited and found 3 additional hardcoded strings (lines 116, 138, 142)
- Language option labels ("English", "中文") are conventionally kept as-is in i18n apps (native language names) — will keep them untranslated as this is standard practice
- Agent labels ("OpenCode", "Aider") are proper nouns/brand names — will keep them untranslated, but add i18n keys for any descriptive text
- OpenCode `model` field needs a sensible default and user-configurable option — will add `agentModel` field to AppSettings

---

## Work Objectives

### Core Objective

Eliminate all hardcoded English strings, fix the OpenCode connection, and expand the agent type system to support Aider, Cursor, and GitHub Copilot.

### Concrete Deliverables

- Updated `en.json` and `zh.json` with ~12 new i18n keys
- Updated `Generator.tsx`, `Resumes.tsx`, `App.tsx` with t() calls replacing hardcoded strings
- Updated `agent.ts` with `model` field in OpenCode request, 3 new agent stub classes, improved error handling
- Updated `SettingsContext.tsx` with expanded `agentType` union and new `agentModel` field
- Updated `Settings.tsx` with new agent SelectItems and model input for OpenCode
- All 15+ tests passing

### Definition of Done

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] `npx vitest run` passes all tests
- [ ] Zero hardcoded English strings in user-visible component text (verified by grep)
- [ ] OpenCode agent sends `model` field in request body
- [ ] Settings UI shows 6 agent types: OpenCode, Claude Code, Aider, Cursor, Copilot, Custom CLI

### Must Have

- All user-visible hardcoded strings replaced with t() calls
- OpenCode request body includes `model` field
- New agent types: Aider, Cursor, GitHub Copilot (as stubs)
- Settings UI updated with new agent options and config fields
- Both locale files (en.json, zh.json) in sync with identical key sets
- Existing tests still pass

### Must NOT Have (Guardrails)

- Do NOT add any npm dependencies
- Do NOT modify `src/main/index.ts` or `src/preload/index.ts` (IPC layer unchanged)
- Do NOT implement real CLI spawning for any agent — stubs only for CLI-based agents
- Do NOT translate brand/product names (OpenCode, Aider, Cursor, Claude Code, Copilot) — keep as-is
- Do NOT translate language option labels ("English", "中文") — native names are standard practice
- Do NOT over-abstract the agent system — keep it simple with one class per agent
- Do NOT add authentication UI for OpenCode (auth is optional and can come later)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: YES (vitest + @testing-library/react)
- **Automated tests**: YES (tests-after — update existing tests to cover new agents)
- **Framework**: vitest

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use grep and vitest to verify i18n integration
- **Agent logic**: Use vitest for unit tests
- **Build verification**: Use `npx tsc --noEmit` and `npx vitest run`

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: Add all new i18n keys to en.json and zh.json [quick]

Wave 2 (After Wave 1 — parallel implementation, MAX PARALLEL):
├── Task 2: Fix hardcoded strings in Resumes.tsx (depends: 1) [quick]
├── Task 3: Fix hardcoded strings in Generator.tsx + App.tsx (depends: 1) [quick]
├── Task 4: Fix OpenCode agent connection in agent.ts (depends: none) [quick]
├── Task 5: Add new agent types + update Settings UI (depends: 1) [unspecified-high]

Wave 3 (After Wave 2 — verification):
├── Task 6: Update tests for new agents and i18n changes (depends: 4, 5) [quick]
├── Task 7: Final verification — tsc, vitest, grep audit (depends: 2, 3, 4, 5, 6) [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Scope fidelity check [deep]

Critical Path: Task 1 → Task 5 → Task 6 → Task 7 → F1-F3
Parallel Speedup: ~50% faster than sequential
Max Concurrent: 4 (Wave 2)
```

### Dependency Matrix

| Task  | Depends On    | Blocks  |
| ----- | ------------- | ------- |
| 1     | —             | 2, 3, 5 |
| 2     | 1             | 7       |
| 3     | 1             | 7       |
| 4     | —             | 6, 7    |
| 5     | 1             | 6, 7    |
| 6     | 4, 5          | 7       |
| 7     | 2, 3, 4, 5, 6 | F1-F3   |
| F1-F3 | 7             | —       |

### Agent Dispatch Summary

- **Wave 1**: 1 task → `quick`
- **Wave 2**: 4 tasks → T2 `quick`, T3 `quick`, T4 `quick`, T5 `unspecified-high`
- **Wave 3**: 2 tasks → T6 `quick`, T7 `quick`
- **FINAL**: 3 tasks → F1 `oracle`, F2 `unspecified-high`, F3 `deep`

---

## TODOs

- [ ] 1. Add all new i18n keys to both locale files

  **What to do**:
  - Add the following new keys to `src/renderer/src/locales/en.json`:
    ```json
    "generator.generate_success": "CV Generated Successfully!",
    "generator.export_filename": "generated-cv.md",
    "resumes.loading": "Loading resumes...",
    "resumes.untitled": "Untitled Resume",
    "resumes.unknown_date": "Unknown date",
    "resumes.experience_level": "{{level}} level",
    "dashboard.save_draft_error": "Failed to save draft",
    "dashboard.save_draft_error_detail": "Failed to save draft: {{error}}",
    "settings.agent_model": "Model",
    "settings.agent_model_ph": "e.g. anthropic/claude-sonnet-4",
    "settings.agent_model_desc": "The model name to use with the agent"
    ```
  - Add corresponding Chinese translations to `src/renderer/src/locales/zh.json`:
    ```json
    "generator.generate_success": "简历生成成功！",
    "generator.export_filename": "生成的简历.md",
    "resumes.loading": "加载简历中...",
    "resumes.untitled": "未命名简历",
    "resumes.unknown_date": "未知日期",
    "resumes.experience_level": "{{level}}级",
    "dashboard.save_draft_error": "保存草稿失败",
    "dashboard.save_draft_error_detail": "保存草稿失败：{{error}}",
    "settings.agent_model": "模型",
    "settings.agent_model_ph": "例如 anthropic/claude-sonnet-4",
    "settings.agent_model_desc": "要使用的模型名称"
    ```
  - Remove the `|| 'fallback'` patterns from these existing keys that already exist in locale files (the fallbacks are unnecessary and create untranslated strings):
    - `resumes.load_error`, `resumes.delete_success`, `resumes.delete_error`
    - `resumes.description`, `resumes.empty_title`, `resumes.empty_desc`
    - `common.delete`
    - `dashboard.validation_error`
  - Verify both files have identical key structure after changes

  **Must NOT do**:
  - Do NOT translate brand names (OpenCode, Aider, etc.)
  - Do NOT change existing key values — only ADD new keys
  - Do NOT restructure the JSON — add keys in their appropriate nested sections

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple JSON key additions to two files
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-design`: Not a design task

  **Parallelization**:
  - **Can Run In Parallel**: NO (foundation task)
  - **Parallel Group**: Wave 1 (solo)
  - **Blocks**: Tasks 2, 3, 5
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/renderer/src/locales/en.json` — Current locale file structure with nested keys like `generator.*`, `resumes.*`, `dashboard.*`, `settings.*`
  - `src/renderer/src/locales/zh.json` — Must mirror en.json key structure exactly

  **API/Type References**:
  - i18next interpolation syntax: `{{variable}}` for parameterized translations (used in `resumes.experience_level`)

  **WHY Each Reference Matters**:
  - en.json/zh.json: Need to see existing key structure to add new keys in the right nested sections
  - i18next interpolation: The `resumes.experience_level` key uses `{{level}}` interpolation — must use correct syntax

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All new keys exist in en.json
    Tool: Bash (grep)
    Preconditions: en.json exists at src/renderer/src/locales/en.json
    Steps:
      1. Run: grep -c "generate_success\|export_filename\|resumes.loading\|resumes.untitled\|unknown_date\|experience_level\|save_draft_error\|agent_model" src/renderer/src/locales/en.json
      2. Assert: count >= 8 (all new keys present)
    Expected Result: All 11 new keys found in en.json
    Failure Indicators: grep returns 0 or count < 8
    Evidence: .sisyphus/evidence/task-1-en-keys.txt

  Scenario: All new keys exist in zh.json with Chinese values
    Tool: Bash (grep)
    Preconditions: zh.json exists
    Steps:
      1. Run: grep -c "简历生成成功\|加载简历中\|未命名简历\|未知日期\|保存草稿失败\|模型" src/renderer/src/locales/zh.json
      2. Assert: count >= 6
    Expected Result: All Chinese translations present
    Failure Indicators: grep returns 0 or missing Chinese characters
    Evidence: .sisyphus/evidence/task-1-zh-keys.txt

  Scenario: Both locale files parse as valid JSON
    Tool: Bash (node)
    Preconditions: Both locale files exist
    Steps:
      1. Run: node -e "JSON.parse(require('fs').readFileSync('src/renderer/src/locales/en.json','utf8')); console.log('en.json OK')"
      2. Run: node -e "JSON.parse(require('fs').readFileSync('src/renderer/src/locales/zh.json','utf8')); console.log('zh.json OK')"
    Expected Result: Both print "OK" without errors
    Failure Indicators: JSON.parse throws SyntaxError
    Evidence: .sisyphus/evidence/task-1-json-valid.txt
  ```

  **Commit**: YES (group with Tasks 2, 3)
  - Message: `fix(i18n): add missing translation keys for resumes, generator, dashboard, and settings`
  - Files: `src/renderer/src/locales/en.json`, `src/renderer/src/locales/zh.json`
  - Pre-commit: `node -e "JSON.parse(require('fs').readFileSync('src/renderer/src/locales/en.json','utf8'))"`

- [ ] 2. Fix hardcoded strings in Resumes.tsx

  **What to do**:
  - Import `useTranslation` if not already imported (it likely already is)
  - Replace the following hardcoded strings with t() calls:
    - Line 71: `"Loading resumes..."` → `t('resumes.loading')`
    - Line 111: `resume.jobTitle || 'Untitled Resume'` → `resume.jobTitle || t('resumes.untitled')`
    - Line 117: `'Unknown date'` → `t('resumes.unknown_date')`
    - Line 125: `` `${resume.experienceLevel} level` `` → `t('resumes.experience_level', { level: resume.experienceLevel })`
  - Remove hardcoded fallback strings after `||` operators on these lines (the t() keys already exist in locale files, fallbacks are unnecessary):
    - Line 42: `t('resumes.load_error') || 'Failed to load resumes'` → `t('resumes.load_error')`
    - Line 59: `t('resumes.delete_success') || 'Resume deleted successfully'` → `t('resumes.delete_success')`
    - Lines 62/66: `t('resumes.delete_error') || 'Failed to delete resume'` → `t('resumes.delete_error')`
    - Line 80: `t('resumes.description') || 'Manage your saved...'` → `t('resumes.description')`
    - Line 93: `t('resumes.empty_title') || 'No resumes found'` → `t('resumes.empty_title')`
    - Line 96: `t('resumes.empty_desc') || 'Create a new draft...'` → `t('resumes.empty_desc')`
    - Line 137: `t('common.delete') || 'Delete'` → `t('common.delete')`

  **Must NOT do**:
  - Do NOT change component logic or layout
  - Do NOT modify any non-string-related code
  - Do NOT add new component props or state

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacements in one file
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/renderer/src/components/Resumes.tsx` — Full file, every hardcoded string location listed above with exact line numbers
  - `src/renderer/src/components/Profile.tsx` — Reference for how t() with interpolation is used (e.g., `t('key', { param: value })`)

  **WHY Each Reference Matters**:
  - Resumes.tsx: Contains every string to replace — line numbers are from the current committed version
  - Profile.tsx: Shows the established pattern for t() usage with parameters in this codebase

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No hardcoded English fallback strings remain in Resumes.tsx
    Tool: Bash (grep)
    Preconditions: Resumes.tsx has been updated
    Steps:
      1. Run: grep -n "|| '" src/renderer/src/components/Resumes.tsx
      2. Assert: zero matches (no fallback patterns)
      3. Run: grep -n "'Loading resumes'" src/renderer/src/components/Resumes.tsx
      4. Assert: zero matches
      5. Run: grep -n "'Untitled Resume'" src/renderer/src/components/Resumes.tsx
      6. Assert: zero matches
      7. Run: grep -n "'Unknown date'" src/renderer/src/components/Resumes.tsx
      8. Assert: zero matches
    Expected Result: All greps return 0 matches — no hardcoded English strings remain
    Failure Indicators: Any grep returns a match
    Evidence: .sisyphus/evidence/task-2-no-hardcoded.txt

  Scenario: t() calls with correct keys are present
    Tool: Bash (grep)
    Preconditions: Resumes.tsx updated
    Steps:
      1. Run: grep -c "t('resumes\.\|t('common\." src/renderer/src/components/Resumes.tsx
      2. Assert: count >= 10 (all t() calls present)
    Expected Result: At least 10 t() calls for resumes.* and common.* keys
    Failure Indicators: count < 10
    Evidence: .sisyphus/evidence/task-2-t-calls.txt
  ```

  **Commit**: YES (group with Tasks 1, 3)
  - Message: `fix(i18n): add missing translation keys for resumes, generator, dashboard, and settings`
  - Files: `src/renderer/src/components/Resumes.tsx`

- [ ] 3. Fix hardcoded strings in Generator.tsx and App.tsx

  **What to do**:
  - In `src/renderer/src/components/Generator.tsx`:
    - Line 42: `toast.success('CV Generated Successfully!')` → `toast.success(t('generator.generate_success'))`
    - Line 64: `a.download = 'generated-cv.md'` → `a.download = t('generator.export_filename')`
  - In `src/renderer/src/App.tsx`:
    - Line 116: `t('dashboard.validation_error') || 'Please fill in all fields'` → `t('dashboard.validation_error')`
    - Line 138: `toast.error('Failed to save draft: ' + result.error)` → `toast.error(t('dashboard.save_draft_error_detail', { error: result.error }))`
    - Line 142: `toast.error('Failed to create draft')` → `toast.error(t('dashboard.save_draft_error'))`
  - Ensure `useTranslation` is imported in both files (Generator.tsx likely already has it; App.tsx likely already has it via the `t` function visible in existing code)

  **Must NOT do**:
  - Do NOT change component logic
  - Do NOT modify layout or styling
  - Do NOT touch any other strings that are already using t()

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple string replacements in two files
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4, 5)
  - **Blocks**: Task 7
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/renderer/src/components/Generator.tsx:42,64` — Toast success message and download filename
  - `src/renderer/src/App.tsx:116,138,142` — Dashboard validation error, save draft errors

  **API/Type References**:
  - i18next interpolation: `t('key', { param: value })` for `dashboard.save_draft_error_detail` which uses `{{error}}`

  **WHY Each Reference Matters**:
  - Generator.tsx: Lines 42 and 64 are the exact locations of hardcoded strings
  - App.tsx: Lines 116, 138, 142 contain the dashboard-related hardcoded strings found during audit

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: No hardcoded English strings in Generator.tsx
    Tool: Bash (grep)
    Preconditions: Generator.tsx updated
    Steps:
      1. Run: grep -n "'CV Generated Successfully'" src/renderer/src/components/Generator.tsx
      2. Assert: zero matches
      3. Run: grep -n "'generated-cv.md'" src/renderer/src/components/Generator.tsx
      4. Assert: zero matches
    Expected Result: Both greps return 0 matches
    Failure Indicators: Either grep returns a match
    Evidence: .sisyphus/evidence/task-3-generator-clean.txt

  Scenario: No hardcoded English strings in App.tsx dashboard section
    Tool: Bash (grep)
    Preconditions: App.tsx updated
    Steps:
      1. Run: grep -n "'Failed to save draft'" src/renderer/src/App.tsx
      2. Assert: zero matches
      3. Run: grep -n "'Failed to create draft'" src/renderer/src/App.tsx
      4. Assert: zero matches
      5. Run: grep -n "|| 'Please fill" src/renderer/src/App.tsx
      6. Assert: zero matches
    Expected Result: All greps return 0 matches
    Failure Indicators: Any grep returns a match
    Evidence: .sisyphus/evidence/task-3-app-clean.txt
  ```

  **Commit**: YES (group with Tasks 1, 2)
  - Message: `fix(i18n): add missing translation keys for resumes, generator, dashboard, and settings`
  - Files: `src/renderer/src/components/Generator.tsx`, `src/renderer/src/App.tsx`

- [ ] 4. Fix OpenCode agent connection in agent.ts

  **What to do**:
  - In `src/renderer/src/lib/agent.ts`, modify the `OpenCodeAgent` class:
    1. Add a `model` parameter to the constructor: `constructor(endpoint: string, model: string)`
    2. Store model as private field: `private model: string`
    3. Add `model` field to the request body in `generateCV()`:
       ```typescript
       body: JSON.stringify({
         model: this.model,
         messages: [{ role: 'user', content: prompt }],
         stream: true
       })
       ```
    4. Improve the error catch block to include the actual error message:
       ```typescript
       } catch (error) {
         const errMsg = error instanceof Error ? error.message : String(error)
         yield `Failed to connect to OpenCode server at ${this.endpoint}. Error: ${errMsg}\n`
         yield 'Make sure OpenCode is running with `opencode serve`.\n\n'
         yield 'Falling back to mock generation...\n\n'
         yield* new MockAgent().generateCV(options)
       }
       ```
  - Update `getAgent()` factory to pass model:
    ```typescript
    case 'opencode':
      return new OpenCodeAgent(settings.agentEndpoint, settings.agentModel || 'anthropic/claude-sonnet-4')
    ```
  - In `src/renderer/src/context/SettingsContext.tsx`:
    1. Add `agentModel: string` to the `AppSettings` interface
    2. Add `agentModel: ''` to `defaultSettings`

  **Must NOT do**:
  - Do NOT add authentication headers (out of scope for now)
  - Do NOT route fetch through IPC (would require modifying main/preload)
  - Do NOT change the SSE parsing logic — it works correctly
  - Do NOT modify MockAgent, ClaudeCodeAgent, or CustomCLIAgent

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small targeted changes to agent constructor and factory
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 5)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/renderer/src/lib/agent.ts:44-95` — OpenCodeAgent class, constructor at line 44, generateCV at line 49, request body at lines 55-58, catch block at lines 90-95
  - `src/renderer/src/lib/agent.ts:109-120` — getAgent factory function
  - `src/renderer/src/context/SettingsContext.tsx:3-15` — AppSettings interface definition

  **External References**:
  - OpenCode API format: POST to `/v1/chat/completions` with `{ model: "anthropic/claude-sonnet-4", messages: [...], stream: true }` — standard OpenAI-compatible format

  **WHY Each Reference Matters**:
  - agent.ts:44-95: The OpenCodeAgent class is where all changes happen — constructor needs model param, request body needs model field, catch block needs error details
  - agent.ts:109-120: getAgent factory must pass the new model setting to OpenCodeAgent constructor
  - SettingsContext.tsx: AppSettings type must be extended with agentModel field

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: OpenCode request body includes model field
    Tool: Bash (grep)
    Preconditions: agent.ts updated
    Steps:
      1. Run: grep -A5 "JSON.stringify" src/renderer/src/lib/agent.ts
      2. Assert: output contains "model:" or "model :" field in the JSON.stringify call
    Expected Result: model field is present in the request body
    Failure Indicators: No "model" field found near JSON.stringify
    Evidence: .sisyphus/evidence/task-4-model-field.txt

  Scenario: getAgent passes model to OpenCodeAgent
    Tool: Bash (grep)
    Preconditions: agent.ts updated
    Steps:
      1. Run: grep "new OpenCodeAgent" src/renderer/src/lib/agent.ts
      2. Assert: constructor call includes two arguments (endpoint AND model)
    Expected Result: OpenCodeAgent constructed with endpoint and model
    Failure Indicators: Only one argument passed to constructor
    Evidence: .sisyphus/evidence/task-4-factory.txt

  Scenario: AppSettings includes agentModel field
    Tool: Bash (grep)
    Preconditions: SettingsContext.tsx updated
    Steps:
      1. Run: grep "agentModel" src/renderer/src/context/SettingsContext.tsx
      2. Assert: at least 2 matches (interface + default)
    Expected Result: agentModel in AppSettings interface and defaultSettings
    Failure Indicators: grep returns 0 or 1 match
    Evidence: .sisyphus/evidence/task-4-settings-type.txt

  Scenario: Error catch includes error message
    Tool: Bash (grep)
    Preconditions: agent.ts updated
    Steps:
      1. Run: grep -A3 "catch" src/renderer/src/lib/agent.ts | head -20
      2. Assert: catch block references error variable (not empty catch)
    Expected Result: Catch block uses error message in yield output
    Failure Indicators: Empty catch or error not referenced
    Evidence: .sisyphus/evidence/task-4-error-handling.txt
  ```

  **Commit**: YES
  - Message: `fix(agent): add model field to OpenCode request and improve error handling`
  - Files: `src/renderer/src/lib/agent.ts`, `src/renderer/src/context/SettingsContext.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 5. Add new agent types (Aider, Cursor, Copilot) + update Settings UI

  **What to do**:

  **Part A — Update types** (`src/renderer/src/context/SettingsContext.tsx`):
  - Expand `agentType` union to: `'opencode' | 'claude-code' | 'aider' | 'cursor' | 'copilot' | 'custom-cli'`
  - No new fields needed beyond what Task 4 adds (`agentModel`) — all CLI agents use the existing `agentCommand` and `agentArgs` fields

  **Part B — Add agent classes** (`src/renderer/src/lib/agent.ts`):
  - Add `AiderAgent` class (stub, same pattern as ClaudeCodeAgent):
    ```typescript
    export class AiderAgent implements CodingAgent {
      async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
        yield 'Aider agent integration requires IPC support (coming soon).\n'
        yield 'Aider uses: aider --message "prompt" --model X --yes --stream\n\n'
        yield 'Falling back to mock generation...\n\n'
        yield* new MockAgent().generateCV(_options)
      }
    }
    ```
  - Add `CursorAgent` class (stub):
    ```typescript
    export class CursorAgent implements CodingAgent {
      async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
        yield 'Cursor agent integration requires IPC support (coming soon).\n'
        yield 'Cursor uses: cursor-agent --mode=agent "prompt"\n\n'
        yield 'Falling back to mock generation...\n\n'
        yield* new MockAgent().generateCV(_options)
      }
    }
    ```
  - Add `CopilotAgent` class (stub):
    ```typescript
    export class CopilotAgent implements CodingAgent {
      async *generateCV(_options: AgentOptions): AsyncGenerator<string, void, unknown> {
        yield 'GitHub Copilot agent integration requires IPC support (coming soon).\n'
        yield 'Copilot uses: copilot run "prompt" --auto-approve\n\n'
        yield 'Falling back to mock generation...\n\n'
        yield* new MockAgent().generateCV(_options)
      }
    }
    ```
  - Update `getAgent()` factory with new cases:
    ```typescript
    case 'aider':
      return new AiderAgent()
    case 'cursor':
      return new CursorAgent()
    case 'copilot':
      return new CopilotAgent()
    ```

  **Part C — Update Settings UI** (`src/renderer/src/components/Settings.tsx`):
  - Add new `<SelectItem>` entries in the agent type dropdown:
    ```tsx
    <SelectItem value="aider">Aider</SelectItem>
    <SelectItem value="cursor">Cursor</SelectItem>
    <SelectItem value="copilot">GitHub Copilot</SelectItem>
    ```
  - Add a model input field for OpenCode (shown when agentType === 'opencode'):
    ```tsx
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
    ```
  - Add conditional config sections for new CLI agents (aider, cursor, copilot) showing `agentCommand` and `agentArgs` inputs — follow the same pattern as the existing `claude-code` section. Can use a shared condition:
    ```tsx
    {['claude-code', 'aider', 'cursor', 'copilot'].includes(settings.agentType) && (
      // Show command + args inputs (same as current claude-code block)
    )}
    ```
    Or keep individual blocks per agent type for clarity.

  **Must NOT do**:
  - Do NOT implement real CLI spawning — all new agents are stubs
  - Do NOT add agent-specific configuration beyond command/args (keep it simple)
  - Do NOT change the Test Connection button behavior for CLI agents

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Touches 3 files, needs careful type alignment across AppSettings, agent.ts, and Settings UI
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 6, 7
  - **Blocked By**: Task 1 (needs i18n keys for settings.agent_model\*)

  **References**:

  **Pattern References**:
  - `src/renderer/src/lib/agent.ts:97-107` — ClaudeCodeAgent and CustomCLIAgent stub pattern (copy this pattern for new agents)
  - `src/renderer/src/lib/agent.ts:109-120` — getAgent factory switch statement (add new cases)
  - `src/renderer/src/components/Settings.tsx:120-127` — Agent type Select dropdown (add new SelectItems)
  - `src/renderer/src/components/Settings.tsx:131-176` — Conditional config sections by agent type (add new sections or consolidate)
  - `src/renderer/src/context/SettingsContext.tsx:6` — agentType union type (extend with new values)

  **WHY Each Reference Matters**:
  - agent.ts:97-107: ClaudeCodeAgent is the exact pattern to follow for new stub agents — copy structure
  - agent.ts:109-120: getAgent factory is where new agent cases are added
  - Settings.tsx:120-127: The Select dropdown where new agent options appear
  - Settings.tsx:131-176: The conditional rendering pattern for agent-specific config inputs
  - SettingsContext.tsx:6: The union type that gates everything — must be extended first

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All 6 agent types are in the AppSettings union
    Tool: Bash (grep)
    Preconditions: SettingsContext.tsx updated
    Steps:
      1. Run: grep "agentType:" src/renderer/src/context/SettingsContext.tsx
      2. Assert: line contains 'opencode', 'claude-code', 'aider', 'cursor', 'copilot', 'custom-cli'
    Expected Result: All 6 agent type strings present in the union type
    Failure Indicators: Any agent type missing from union
    Evidence: .sisyphus/evidence/task-5-union-type.txt

  Scenario: All 3 new agent classes exist in agent.ts
    Tool: Bash (grep)
    Preconditions: agent.ts updated
    Steps:
      1. Run: grep "class.*Agent implements CodingAgent" src/renderer/src/lib/agent.ts
      2. Assert: 6 matches (MockAgent, OpenCodeAgent, ClaudeCodeAgent, CustomCLIAgent, AiderAgent, CursorAgent, CopilotAgent)
    Expected Result: 7 agent classes total (including MockAgent)
    Failure Indicators: Fewer than 7 classes found
    Evidence: .sisyphus/evidence/task-5-agent-classes.txt

  Scenario: getAgent handles all 6 types
    Tool: Bash (grep)
    Preconditions: agent.ts updated
    Steps:
      1. Run: grep "case '" src/renderer/src/lib/agent.ts
      2. Assert: 6 case statements (opencode, claude-code, aider, cursor, copilot, custom-cli)
    Expected Result: All 6 agent types have case statements
    Failure Indicators: Fewer than 6 case statements
    Evidence: .sisyphus/evidence/task-5-getAgent-cases.txt

  Scenario: Settings UI shows all 6 agent options
    Tool: Bash (grep)
    Preconditions: Settings.tsx updated
    Steps:
      1. Run: grep "SelectItem.*value=" src/renderer/src/components/Settings.tsx | grep -c "opencode\|claude-code\|aider\|cursor\|copilot\|custom-cli"
      2. Assert: count = 6
    Expected Result: 6 SelectItem entries for all agent types
    Failure Indicators: count < 6
    Evidence: .sisyphus/evidence/task-5-select-items.txt

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: All files updated
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
    Expected Result: No type errors
    Failure Indicators: Non-zero exit code or error output
    Evidence: .sisyphus/evidence/task-5-tsc.txt
  ```

  **Commit**: YES
  - Message: `feat(agent): add Aider, Cursor, and GitHub Copilot agent types`
  - Files: `src/renderer/src/lib/agent.ts`, `src/renderer/src/context/SettingsContext.tsx`, `src/renderer/src/components/Settings.tsx`
  - Pre-commit: `npx tsc --noEmit`

- [ ] 6. Update tests for new agents and i18n changes

  **What to do**:
  - Update `src/renderer/src/components/Settings.test.tsx`:
    - Add test that verifies all 6 agent types appear in the dropdown
    - Add test that selecting 'aider', 'cursor', 'copilot' shows command/args inputs
    - Add test for the new model input when OpenCode is selected
  - Update `src/renderer/src/lib/agent.ts` tests (or create if not existing):
    - Test that `getAgent()` returns correct agent class for each of the 6 types
    - Test that `AiderAgent`, `CursorAgent`, `CopilotAgent` generators yield fallback messages and then mock content
    - Test that `OpenCodeAgent` constructor accepts model parameter
  - Verify existing tests in `Generator.test.tsx`, `Resumes.test.tsx`, `App.test.tsx` still pass (i18n changes should be transparent since tests mock i18n)

  **Must NOT do**:
  - Do NOT write integration tests requiring a running OpenCode server
  - Do NOT test real CLI agent execution
  - Do NOT modify test infrastructure or vitest config

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Adding test cases following existing patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential after Wave 2)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - `src/renderer/src/components/Settings.test.tsx` — Existing test patterns for Settings component (how agent type selection is tested, how mock settings work)
  - `src/renderer/src/components/Generator.test.tsx` — How agent mocking is done in tests
  - `src/renderer/src/App.test.tsx` — Top-level component test patterns

  **Test References**:
  - `src/renderer/src/components/Settings.test.tsx` — The primary test file to extend with new agent type tests

  **WHY Each Reference Matters**:
  - Settings.test.tsx: Need to understand existing test setup (mock providers, render patterns) to add new test cases consistently
  - Generator.test.tsx: Shows how the agent system is mocked in component tests
  - App.test.tsx: May need minor updates if Dashboard test assertions reference hardcoded strings

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All tests pass
    Tool: Bash
    Preconditions: All code changes from Tasks 1-5 complete
    Steps:
      1. Run: npx vitest run
      2. Assert: exit code 0, all tests pass
    Expected Result: 15+ tests pass, 0 failures
    Failure Indicators: Non-zero exit code or test failures
    Evidence: .sisyphus/evidence/task-6-vitest.txt

  Scenario: New agent tests exist
    Tool: Bash (grep)
    Preconditions: Test files updated
    Steps:
      1. Run: grep -rn "aider\|cursor\|copilot" src/renderer/src/components/Settings.test.tsx
      2. Assert: matches found for new agent types in test file
    Expected Result: Test cases for new agent types exist
    Failure Indicators: No matches found
    Evidence: .sisyphus/evidence/task-6-new-tests.txt
  ```

  **Commit**: YES (group with Task 4 or 5)
  - Message: `test: add tests for new agent types and model field`
  - Files: `src/renderer/src/components/Settings.test.tsx`

- [ ] 7. Final verification — tsc, vitest, grep audit

  **What to do**:
  - Run full TypeScript compilation check: `npx tsc --noEmit`
  - Run full test suite: `npx vitest run`
  - Run hardcoded string audit across all component files:
    ```bash
    grep -rn "|| '" src/renderer/src/components/ src/renderer/src/App.tsx
    ```
    Should return zero matches for user-visible fallback strings
  - Verify locale file key parity:
    ```bash
    node -e "
      const en = Object.keys(JSON.parse(require('fs').readFileSync('src/renderer/src/locales/en.json','utf8')));
      const zh = Object.keys(JSON.parse(require('fs').readFileSync('src/renderer/src/locales/zh.json','utf8')));
      const missing = en.filter(k => !zh.includes(k));
      const extra = zh.filter(k => !en.includes(k));
      console.log('Missing from zh:', missing.length ? missing : 'none');
      console.log('Extra in zh:', extra.length ? extra : 'none');
    "
    ```

  **Must NOT do**:
  - Do NOT make code changes in this task — only verify
  - If issues found, report them for fixing, do NOT auto-fix

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Running verification commands only
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (final gate)
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: F1-F3
  - **Blocked By**: Tasks 2, 3, 4, 5, 6

  **References**:

  **Pattern References**:
  - All files changed in Tasks 1-6

  **WHY Each Reference Matters**:
  - Verification needs to check the output of all previous tasks

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full build verification
    Tool: Bash
    Preconditions: All tasks 1-6 complete
    Steps:
      1. Run: npx tsc --noEmit
      2. Assert: exit code 0
      3. Run: npx vitest run
      4. Assert: exit code 0, all tests pass
    Expected Result: Clean build and all tests pass
    Failure Indicators: Any non-zero exit code
    Evidence: .sisyphus/evidence/task-7-build.txt

  Scenario: Zero hardcoded fallback strings remain
    Tool: Bash (grep)
    Preconditions: All i18n tasks complete
    Steps:
      1. Run: grep -rn "|| '" src/renderer/src/components/ src/renderer/src/App.tsx | grep -v "node_modules" | grep -v ".test."
      2. Assert: zero matches or only non-user-visible technical strings
    Expected Result: No hardcoded English fallback strings in any component
    Failure Indicators: Any user-visible fallback string found
    Evidence: .sisyphus/evidence/task-7-audit.txt

  Scenario: Locale files are in sync
    Tool: Bash (node)
    Preconditions: Both locale files updated
    Steps:
      1. Run the node script from "What to do" section
      2. Assert: "Missing from zh: none" and "Extra in zh: none"
    Expected Result: Both locale files have identical key sets
    Failure Indicators: Any missing or extra keys reported
    Evidence: .sisyphus/evidence/task-7-locale-sync.txt
  ```

  **Commit**: NO (verification only)

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 3 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
      Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, grep for expected patterns). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
      Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
      Run `npx tsc --noEmit` + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names. Verify no npm dependencies were added (check package.json diff).
      Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Scope Fidelity Check** — `deep`
      For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
      Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Order | Message                                                                                   | Files                                                           |
| ----- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1     | `fix(i18n): add missing translation keys for resumes, generator, dashboard, and settings` | `en.json`, `zh.json`, `Resumes.tsx`, `Generator.tsx`, `App.tsx` |
| 2     | `fix(agent): add model field to OpenCode request and improve error handling`              | `agent.ts`, `SettingsContext.tsx`                               |
| 3     | `feat(agent): add Aider, Cursor, and GitHub Copilot agent types`                          | `agent.ts`, `SettingsContext.tsx`, `Settings.tsx`               |
| 4     | `test: add tests for new agent types and model field`                                     | `Settings.test.tsx`                                             |

---

## Success Criteria

### Verification Commands

```bash
npx tsc --noEmit                    # Expected: exit code 0
npx vitest run                      # Expected: all tests pass
grep -rn "|| '" src/renderer/src/components/ src/renderer/src/App.tsx  # Expected: 0 user-visible matches
grep "agentType:" src/renderer/src/context/SettingsContext.tsx         # Expected: contains all 6 types
grep "class.*Agent" src/renderer/src/lib/agent.ts                     # Expected: 7 agent classes
```

### Final Checklist

- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Zero hardcoded English strings in components
- [ ] 6 agent types in Settings dropdown
- [ ] OpenCode sends model field in requests
- [ ] Both locale files in sync
