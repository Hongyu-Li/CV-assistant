# CV Assistant (Electron App)

## TL;DR

> **Quick Summary**: A local, privacy-first desktop application built with Electron, React, and Tailwind CSS to manage resumes and generate tailored CVs from Job Descriptions using multiple AI providers (OpenAI, Claude, DeepSeek, Ollama).
>
> **Deliverables**:
>
> - Scaffolding of an Electron-Vite-React app
> - UI for managing markdown-based CV sections
> - Settings UI for API keys (OpenAI, Claude, DeepSeek) and Ollama connection
> - JD to CV generation engine with context injection
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Scaffolding → Core IPC/File System → AI Integration → UI & Generation

---

## Context

### Original Request

Develop a local Electron application for managing resumes/CVs and generating tailored CVs by parsing Job Descriptions (JDs) using customizable AI providers.

### Interview Summary

**Key Discussions**:

- Frontend Framework: React
- UI Framework: Tailwind CSS + shadcn/ui
- Storage: 100% Local (Markdown files for data, JSON for settings)
- AI Integration: All major platforms (OpenAI, Claude, DeepSeek, Ollama)
- Test Strategy: TDD using Vitest/Testing-Library

### Metis Review (Simulated)

**Identified Gaps** (addressed):

- **Security**: ContextBridge must be used strictly; no Node.js APIs in the renderer.
- **Export Format**: Added a mechanism to at least preview/copy the generated markdown CV.
- **File System Location**: Defaulting to OS-specific user data folders (`app.getPath('userData')`) to avoid permission issues.
- **AI Timeout**: Large models (especially local Ollama) might take time. Added timeout/loading state guardrails.

---

## Work Objectives

### Core Objective

Build a completely local and customizable CV tailoring assistant desktop app.

### Concrete Deliverables

- Electron app with functional IPC bridge
- File manager module (Markdown parsing/writing)
- Settings module for AI keys
- Markdown Editor UI for personal data
- JD Input & CV Generation UI

### Definition of Done

- [ ] App launches locally without errors
- [ ] User can CRUD Markdown files in a designated local directory via UI
- [ ] User can configure at least one AI provider and successfully generate a new CV from a JD
- [ ] All automated tests pass

### Must Have

- TDD approach for all modules
- Strict Electron IPC (contextBridge)
- Absolute local storage for personal data

### Must NOT Have (Guardrails)

- NO server-side uploads or telemetry
- NO direct Node.js modules `fs`/`path` exposed in React
- NO hardcoded AI prompts (must allow some level of template abstraction or use a robust default)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision

- **Infrastructure exists**: NO
- **Automated tests**: TDD
- **Framework**: Vitest + React Testing Library + Playwright (for E2E)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal impl) → REFACTOR

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright to assert DOM, screenshot
- **Electron API**: Unit tests with vitest
- **Library/Module**: Use Node to test filesystem abstractions

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — scaffolding + config):
├── Task 1: Scaffolding Electron + React + Tailwind + Vite [quick]
├── Task 2: Setup Testing Infrastructure (Vitest & Playwright) [quick]
└── Task 3: Setup UI Components (shadcn/ui base) [quick]

Wave 2 (After Wave 1 — core modules, MAX PARALLEL):
├── Task 4: Local Storage IPC & Main Process (File System for MD/JSON) [deep]
├── Task 5: AI Provider Abstraction (LangChain/Vercel AI/Fetch wrappers) [deep]
└── Task 6: Settings Data Context & State Management [quick]

Wave 3 (After Wave 2 — integration + UI):
├── Task 7: Profile Management UI (CRUD for Markdown info) [visual-engineering]
├── Task 8: Settings UI (API Keys & Preferences) [visual-engineering]
└── Task 9: CV Generation UI & Orchestration [visual-engineering]

Wave 4 (After Wave 3 — verification):
├── Task 10: E2E Testing with Playwright [deep]
└── Task 11: Export & Polish [quick]

Wave FINAL:
├── Task F1: Plan compliance audit
├── Task F2: Code quality review
├── Task F3: Real manual QA
└── Task F4: Scope fidelity check
```

## TODOs

- [x] 1. Scaffolding Electron + React + Tailwind + Vite

  **What to do**:
  - Initialize `electron-vite` project with React + TypeScript
  - Install and configure Tailwind CSS v4 / postcss
  - Ensure `dev` and `build` commands work

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 2, 3, 4, 5, 6
  - **Blocked By**: None

  **References**:
  - Official docs for electron-vite: `https://electron-vite.org/`

  **Acceptance Criteria**:
  - [x] App starts via `npm run dev` or `bun dev`

  **QA Scenarios**:

  ```
  Scenario: App Boot
    Tool: interactive_bash
    Preconditions: Project installed
    Steps:
      1. Run `npm run dev`
      2. Wait for electron process to start
    Expected Result: Process runs without crashing
    Evidence: .sisyphus/evidence/task-1-boot.log
  ```

- [x] 2. Setup Testing Infrastructure

  **What to do**:
  - Install vitest, @testing-library/react, jsdom
  - Configure vitest for testing both main (Node) and renderer (jsdom) environments
  - Create a dummy test to verify setup

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `javascript-testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 4, 5
  - **Blocked By**: 1

  **References**:
  - vitest docs

  **Acceptance Criteria**:
  - [x] `npm run test` executes successfully

  **QA Scenarios**:

  ```
  Scenario: Test Runner
    Tool: Bash
    Preconditions: vitest configured
    Steps:
      1. Run `npm run test`
    Expected Result: Dummy test passes
    Evidence: .sisyphus/evidence/task-2-test.log
  ```

- [x] 3. Setup UI Components (shadcn/ui base)

  **What to do**:
  - Initialize shadcn/ui
  - Install Button, Input, Textarea, Card, Select, Toast components
  - Setup basic layout wrapper (Sidebar + Content area)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 7, 8, 9
  - **Blocked By**: 1

  **References**:
  - shadcn/ui docs

  **Acceptance Criteria**:
  - [x] Components installed in `src/renderer/src/components/ui/`

  **QA Scenarios**:

  ```
  Scenario: Component Layout
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Launch app
      2. Assert sidebar exists
    Expected Result: Layout renders properly
    Evidence: .sisyphus/evidence/task-3-layout.png
  ```

- [x] 4. Local Storage IPC & Main Process

  **What to do**:
  - Create `fs` helper in main process to read/write Markdown files in `app.getPath('userData')`
  - Expose API via `contextBridge` in `preload`
  - Write unit tests for the main process handler

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `javascript-testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 7, 8
  - **Blocked By**: 2

  **Acceptance Criteria**:
  - [x] Can successfully read and write a `.md` file from renderer via `window.api`

  **QA Scenarios**:

  ```
  Scenario: IPC File Write
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Trigger write function in console / dummy button
      2. Read file from disk via Node to confirm
    Expected Result: File exists and content matches
    Evidence: .sisyphus/evidence/task-4-fs.log
  ```

- [x] 5. AI Provider Abstraction

  **What to do**:
  - Implement utility class/functions to call OpenAI, Claude, DeepSeek APIs
  - Implement Ollama local fetch wrapper
  - Handle timeouts and streaming responses (optional but recommended)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `javascript-testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 9
  - **Blocked By**: 2

  **Acceptance Criteria**:
  - [x] Unit tests pass for mocked API calls for all 4 providers

  **QA Scenarios**:

  ```
  Scenario: AI API Call
    Tool: Bash
    Preconditions: Vitest tests exist
    Steps:
      1. Run `npm run test -- ai-provider`
    Expected Result: All provider tests pass
    Evidence: .sisyphus/evidence/task-5-ai.log
  ```

- [x] 6. Settings Data Context & State Management

  **What to do**:
  - Setup React Context or Zustand for app state
  - Load settings from JSON on boot (via IPC)
  - Save settings when updated

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 8
  - **Blocked By**: 1

  **Acceptance Criteria**:
  - [x] App state hydrates from local JSON store

  **QA Scenarios**:

  ```
  Scenario: State Hydration
    Tool: Playwright
    Preconditions: JSON settings file exists
    Steps:
      1. Boot app
    Expected Result: Settings correctly populated in UI state
    Evidence: .sisyphus/evidence/task-6-state.png
  ```

- [ ] 7. Profile Management UI

  **What to do**:
  - Create UI to add/edit/delete Personal Info, Work Experience, Projects
  - Fields map to Markdown headers/frontmatter
  - Save data via IPC file writer

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 10
  - **Blocked By**: 3, 4

  **Acceptance Criteria**:
  - [ ] User can edit profile info and see changes persist after app restart

  **QA Scenarios**:

  ```
  Scenario: Profile CRUD
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to Profile
      2. Edit Name to "Jane Doe"
      3. Save and Restart
    Expected Result: Name remains "Jane Doe"
    Evidence: .sisyphus/evidence/task-7-crud.png
  ```

- [x] 8. Settings UI

  **What to do**:
  - Build UI for inputting API Keys (OpenAI, Claude, DeepSeek)
  - Build UI for configuring Ollama local URL/Model

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 10
  - **Blocked By**: 3, 6

  **Acceptance Criteria**:
  - [ ] API keys are saved securely and masked in UI

  **QA Scenarios**:

  ```
  Scenario: Settings Update
    Tool: Playwright
    Preconditions: App running
    Steps:
      1. Navigate to Settings
      2. Input OpenAI key
    Expected Result: Key saved in local JSON
    Evidence: .sisyphus/evidence/task-8-settings.png
  ```

- [x] 9. CV Generation UI & Orchestration

  **What to do**:
  - Build Split-pane view: JD on left, generated CV on right
  - "Generate" button that reads Profile MD + JD text, feeds to selected AI provider
  - Display generation loading state / streaming output

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: 10
  - **Blocked By**: 3, 5

  **Acceptance Criteria**:
  - [ ] App can generate CV from mocked provider and display on screen

  **QA Scenarios**:

  ```
  Scenario: CV Generation Flow
    Tool: Playwright
    Preconditions: Profile data exists, Mock AI set
    Steps:
      1. Paste JD
      2. Click Generate
    Expected Result: CV markdown renders on right pane
    Evidence: .sisyphus/evidence/task-9-generation.png
  ```

- [ ] 10. E2E Testing with Playwright

  **What to do**:
  - Setup full flow tests from opening app -> entering data -> generating CV -> saving

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: `javascript-testing-patterns`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4
  - **Blocks**: 11
  - **Blocked By**: 7, 8, 9

  **Acceptance Criteria**:
  - [ ] Playwright suite passes

  **QA Scenarios**:

  ```
  Scenario: Full E2E
    Tool: Bash
    Preconditions: Complete build
    Steps:
      1. Run E2E script
    Expected Result: All E2E tests pass
    Evidence: .sisyphus/evidence/task-10-e2e.log
  ```

- [ ] 11. Export & Polish

  **What to do**:
  - Add "Copy to Clipboard" and "Export to Markdown" buttons for generated CV
  - Final UI polishing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `frontend-design`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: F1
  - **Blocked By**: 9

  **Acceptance Criteria**:
  - [ ] Can click export and save the file to arbitrary OS location

  **QA Scenarios**:

  ```
  Scenario: Export Action
    Tool: Playwright
    Preconditions: CV generated
    Steps:
      1. Click Export
    Expected Result: Save dialog opens (mocked)
    Evidence: .sisyphus/evidence/task-11-export.png
  ```

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
- [ ] F2. **Code Quality Review** — `unspecified-high`
- [ ] F3. **Real Manual QA** — `unspecified-high`
- [ ] F4. **Scope Fidelity Check** — `deep`

## Commit Strategy

- **1**: `build(scope): desc`
- **2**: `feat(scope): desc`

## Success Criteria

- [ ] All "Must Have" present
- [ ] All tests pass
