# AGENTS

## Project Overview

- Name: 简历助手 (CV Assistant)
- Desktop app: Electron + React + TypeScript
- Purpose: AI powered resume and CV generation from personal profile using multiple AI providers.
- All data stored locally in `~/.cv-assistant/`, no server uploads.
- Cross-platform: Windows, macOS, Linux.

## Setup

```bash
npm install
npm run dev          # Start dev with HMR
npm run build        # Typecheck + production build
npm test             # Run unit tests (Vitest)
npm run test:coverage # Tests with coverage report
npm run e2e          # Playwright e2e tests
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # TypeScript type checks
```

## Architecture

Three process Electron architecture:

- **Main process** (`src/main/`): Electron app lifecycle, BrowserWindow creation, IPC handlers, file system operations. Entry: `src/main/index.ts`. File operations: `src/main/fs.ts`.
- **Preload** (`src/preload/`): Context bridge exposing safe IPC APIs to renderer. Do not modify `src/preload/index.ts` or `src/preload/index.d.ts` without updating both.
- **Renderer** (`src/renderer/src/`): React SPA. Components in `components/`, contexts in `context/`, utilities in `lib/`, i18n in `locales/`.

IPC Pattern: All external API calls must go through IPC. Renderer invokes via `window.electron.ipcRenderer.invoke()`, main process handles the HTTP call. Never make HTTP requests from the renderer process.

## Code Style

- TypeScript strict mode
- ESLint 9 with `@electron-toolkit/eslint-config-ts` and Prettier.
- **CRITICAL**: `@typescript-eslint/explicit-function-return-type` is enforced. All functions must have explicit return type annotations.
- **CRITICAL**: `@typescript-eslint/no-require-imports` is enforced. No `require()` imports, use ES modules only.
- React 19 with JSX transform.
- Tailwind CSS v4 syntax: `@import 'tailwindcss'`, `@theme {}`, `@plugin`, `@custom-variant`. Do not use v3 `@tailwind` directives.
- UI components follow shadcn/ui and Radix UI patterns in `src/renderer/src/components/ui/`.
- Path alias: `@renderer/*` maps to `src/renderer/src/*`.

## Testing

- **Unit tests**: Vitest with jsdom environment, `@testing-library/react`.
- Test files: colocated as `*.test.tsx` or `*.test.ts` next to source.
- Main process tests: `src/main/__tests__/`.
- Setup file: `src/renderer/src/test/setup.ts`.
- Coverage: ~91% statements, tracked on pre-push.
- Mock patterns: Mock `window.electron.ipcRenderer.invoke` for IPC calls, use `vi.mock` for context providers.
- **E2E tests**: Playwright, config in `playwright.config.ts`, tests in `tests/`.
- Pre-commit: lint-staged (ESLint --fix and Prettier).
- Pre-push: `npm run test:coverage`.

## i18n

- i18next and react-i18next.
- Translation files: `src/renderer/src/locales/en.json`, `src/renderer/src/locales/zh.json`.
- Access via `useTranslation()` hook.
- When adding new UI text, add keys to both en.json and zh.json.
- Key naming: dot separated, grouped by feature.

## Data Storage

- Default workspace: `~/.cv-assistant/`.
- User data (settings): Electron's `app.getPath('userData')` to `settings.json`.
- Workspace files:
  - `profile.json` and `profile.md` for user profile data and Markdown description.
  - `resumes/` for generated resumes, each as `{id}.json` and `{id}.md`.
- Workspace directory is configurable; changing it triggers full data migration.

## Key Constraints

- All data local, never upload to any server.
- All AI API calls go through main process IPC.
- Never suppress TypeScript errors with `as any`, `@ts-ignore`, or `@ts-expect-error`.
- Never use empty catch blocks.
- When modifying code, add or update relevant tests.
- Follow existing component patterns in `src/renderer/src/components/`.
- Follow existing context patterns in `src/renderer/src/context/`.

## File Modification Warnings

- `src/preload/index.ts` and `src/preload/index.d.ts` are paired files, modify together.
- `src/renderer/index.html`: avoid modifying unless absolutely necessary.
- `src/renderer/src/locales/*.json`: always update both en.json and zh.json together.
