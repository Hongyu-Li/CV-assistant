# Draft: 仪表盘功能迁移到我的简历 + 简历生成器整合

## Requirements (confirmed)

### Decision 1: 删除仪表盘Tab

- Remove Dashboard tab entirely from sidebar
- Remove Dashboard inline JSX from App.tsx
- Remove Quick Notes (user didn't mention keeping it)
- Remove `dashboard` from currentView union type
- Default view changes to 'resumes' (or 'profile'?)

### Decision 2: 简历生成器也合并到我的简历

- Generator tab also gets removed from sidebar
- Generator functionality (JD input → AI generate) moves INTO the Resumes dialog
- Full workflow in one dialog: fill info → paste JD → generate → save

### Decision 3: 扩展表单字段

- jobTitle (保留)
- experienceLevel (保留: junior/mid/senior)
- companyName (新增) — 公司名称
- targetSalary (新增) — 目标薪资
- notes (新增) — 备注
- JD textarea (从Generator搬过来)
- Generated CV output (从Generator搬过来)

### Decision 4: 创建后留在列表

- After creating resume, close dialog, refresh list
- New entry appears in card grid

### Decision 5: 增删改查 (CRUD)

- **Create**: "新增" button → opens dialog → fill form → save
- **Read**: Card grid displays list (already exists)
- **Update/Edit**: Click card → opens dialog pre-filled → edit + regenerate
- **Delete**: Trash button on card (already exists)

## Current State Analysis

- **Dashboard**: Inline in App.tsx (lines 81-165), NOT a separate component
  - Form: jobTitle (Input) + experienceLevel (Select)
  - Quick Notes card (separate feature)
  - On submit → saves JSON via cv:save IPC → redirects to Generator
- **Generator.tsx**: Separate component
  - JD textarea → AI generateCV() → displays result
  - Uses settings (provider, apiKey, model, baseUrl) from SettingsContext
  - Copy to clipboard + Download as markdown
- **Resumes.tsx**: Card grid, loads via cv:list, delete via cv:delete
  - No create, no edit
  - CV interface: { id, filename, jobTitle?, experienceLevel?, lastModified? }
- **Available UI**: Button, Card, Input, Select, Textarea, Sonner — NO Dialog component
- **IPC handlers**: cv:list, cv:save, cv:delete — NO cv:read or cv:update

## Technical Decisions

- Need to add shadcn Dialog component (doesn't exist yet)
- Dashboard view + Generator component both get removed/merged into Resumes
- Resumes.tsx becomes significantly larger — may need sub-components
- cv:save IPC already exists — reuse for create + update
- Need new cv:read IPC for editing (load single file)
- generateCV() from lib/provider.ts can be called from Resumes dialog
- App.tsx sidebar: remove Dashboard + Generator tabs
- App.tsx: remove inline dashboard JSX, remove Generator import
- Default view: 'resumes' (since dashboard is gone)

## Open Questions

- After user fills form + pastes JD, does the dialog show the generated CV inline?
  Or does it save the raw data first, then user can click "Generate" from list?
- Should generated CV content be saved to the JSON file?
- Dialog layout: how to fit form fields + JD textarea + generated output in one dialog?
  Perhaps multi-step wizard? Or tall scrollable dialog?
- What about copy/download actions for generated CV? Keep in dialog?

## Scope Boundaries

- INCLUDE: Delete Dashboard tab, delete Generator tab, merge all into Resumes with dialog CRUD
- INCLUDE: New form fields (companyName, targetSalary, notes)
- INCLUDE: i18n for all new keys
- INCLUDE: Tests for new CRUD operations
- EXCLUDE: Quick Notes feature (dropped with Dashboard)
- EXCLUDE: Changes to AI provider logic (keep as-is)
