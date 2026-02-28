# AGENTS

## Project Overview

- Name: 简历助手 (CV Assistant)
- Desktop app: Electron + React + TypeScript
- Purpose: AI powered resume and CV generation from personal profile using multiple AI providers.
- All data stored locally in Electron `app.getPath('userData')/workspace`, no server uploads.
- Legacy path `~/.cv-assistant/` is auto-migrated on first launch.
- Cross-platform: Windows, macOS, Linux.

## Setup

```bash
npm install
npm run dev          # Start dev with HMR
npm run build        # Typecheck + production build
npm run build:mac    # Build macOS (direct distribution)
npm run build:mas    # Build Mac App Store version
npm run build:mas-dev # Build MAS with development signing
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

### Security (enforced since v1.0.10)

- BrowserWindow: `nodeIntegration: false`, `contextIsolation: true`.
- CSP: strict Content-Security-Policy in `src/renderer/index.html` (no localhost wildcards, explicit font-src).
- API error sanitization: `sanitizeApiError()` in `handlers.ts` redacts API keys from error messages before sending to renderer.
- Request timeouts: AbortController with 30s timeout on all AI API requests.
- Rate limiting: 429 status detection with `Retry-After` header parsing.
- Global error handlers: `unhandledRejection` and `uncaughtException` in main process.

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

- Default workspace: Electron's `app.getPath('userData')/workspace`.
- Legacy locations `~/.cv-assistant/` and `userData/drafts` are auto-migrated on first launch.
- User data (settings): `app.getPath('userData')/settings.json`.
- Workspace files:
  - `profile.json` and `profile.md` for user profile data and Markdown description.
  - `resumes/` for generated resumes, each as `{id}.json` and `{id}.md`.
- Workspace directory is configurable; changing it triggers full data migration.
- MAS (Mac App Store) builds run inside App Sandbox; the `userData/workspace` path was chosen for sandbox compatibility.

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
- `src/renderer/index.html`: contains CSP header, avoid modifying unless absolutely necessary. If modifying CSP, test both dev and production builds.
- `src/renderer/src/locales/*.json`: always update both en.json and zh.json together.
- `src/main/handlers.ts`: contains `sanitizeApiError()` — any new IPC handlers that return errors from AI APIs must use this function.
- `electron-builder.mas.yml`: MAS-specific build config; do not merge into main `electron-builder.yml`.
- `build/entitlements.mas.plist` and `build/entitlements.mas.inherit.plist`: MAS sandbox entitlements.

## Mac App Store (MAS) Build

- Config: `electron-builder.mas.yml` (separate from standard `electron-builder.yml`).
- Scripts: `npm run build:mas` (production), `npm run build:mas-dev` (development signing).
- Auto-updater is guarded with `process.mas` check — `electron-updater` is not available in MAS builds.
- Provisioning profiles, certificates, and private keys (`*.provisionprofile`, `*.p12`, `*.cer`, `*.pem`, `*.key`, `*.pfx`) are gitignored.
- App Store submission materials are in `docs/`: `app-store-listing.md` (bilingual listing text, keywords, copyright), `privacy-policy.html` (bilingual, hosted on GitHub Pages).
- Promotional screenshots (2880×1800) are in `tests/screenshots/app-store/` with a Playwright-based generator script at `tests/screenshots/generate-promotional.mjs`.

## License

MIT License - Copyright © 2025-2026 Cheng Tang.
