# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.26](https://github.com/tc9011/CV-assistant/compare/v1.0.25...v1.0.26) (2026-03-19)

### Features

- Merge export buttons into single download dropdown with PDF and Markdown options
- Direct PDF export replacing in-app PDF preview
- Comprehensive E2E tests for full user flow, profile, and resume management
- Unit and E2E tests for export dropdown, PDF export, and auto-save
- Set up release-please for automated changelog and version management

### Bug Fixes

- Resolve resume generation timeout and implement profile auto-save
- Improve markdown-to-HTML converter, multi-page PDF slicing, and dropdown styling
- Prevent download dropdown from being clipped when Generated CV section is collapsed
- Replace nested button with div role=button in Generated CV collapsible header
- Move Interview Status outside Interview Rounds and render notes as proper HTML
- Add missing DialogDescription to Edit Round dialog to resolve Radix a11y warning
- Repair 3 failing e2e profile tests
- Fix act() warnings in Settings and App test suites

### Miscellaneous

- Improve coverage for provider, ResumeDialog, and Resumes

## [1.0.25] - 2026-03-18

### Added

- Interview status tracking for job applications
- Interview round tracking with statistics and vertical timeline
- Auto-extract keywords from JD and redesign interview tracking
- Tabs filter and search for applications
- Redesign application cards with company-first layout and keywords
- Proper markdown preview with toggle for resume display
- Enhanced CV display, interview notes, and PDF preview

### Fixed

- Strip markdown code block fences from CV output
- Use standard MarkdownEditor like Profile for resume editing
- Add explicit max-height and overflow to Select viewport
- Fix select dropdown scroll issue

### Changed

- Merge Configuration section into Generated CV section

## [1.0.24] - 2026-03-18

### Changed

- Increase PDF import timeout to 3 minutes

## [1.0.23] - 2026-03-17

### Added

- PDF import with AI-powered data extraction for profile
- Education section with AI PDF extraction
- Zod runtime validation for extracted profile data
- Harden parseJsonFromAiResponse with jsonrepair 6-strategy cascade
- max_tokens support for OpenAI-compatible providers
- Spinner to PDF import button during loading

### Fixed

- Add missing education_description_ph placeholder to both locales

### Changed

- Reorder education before work experience in UI and text assembly

## [1.0.22] - 2026-03-09

### Changed

- Frontend quality audit and normalize theme tokens

## [1.0.21] - 2026-03-06

### Fixed

- Add Show Main Window menu item to pass Mac App Store Guideline 4 review

## [1.0.20] - 2026-03-02

### Changed

- Run Electron e2e tests in headless mode to avoid window popups

## [1.0.19] - 2026-03-02

### Fixed

- Remove electron-updater from MAS build to pass App Store review

### Changed

- Replace auto-update UI with version display in settings

## [1.0.18] - 2026-03-02

### Fixed

- Add singleArchFiles to fix universal binary merge failure for MAS

## [1.0.17] - 2026-03-02

### Fixed

- Eliminate all electron-updater traces from Mac App Store build

## [1.0.16] - 2026-03-01

### Added

- Mac App Store promotional screenshot suite (5 frames x 2 locales)
- Comprehensive E2E tests with coverage reporting and pre-push integration

## [1.0.15] - 2026-02-28

### Added

- Null-guard tests for auto-update IPC handlers (static import)

## [1.0.14] - 2026-02-28

### Fixed

- Use static import for electron-updater to resolve production loading failure

## [1.0.13] - 2026-02-28

### Fixed

- Handle auto-update check failure gracefully with UI feedback and tests

## [1.0.12] - 2026-02-28

### Fixed

- Revert sandbox: true that caused blank screen on launch

### Security

- Validate URL protocol in shell.openExternal and enable renderer sandbox
- Fix path traversal via startsWith bypass and add SSRF baseUrl validation

### Changed

- Improve code quality with shared AI request builder, debug logging, and safer error handling
- Remove @ts-ignore workaround in preload
- Add App Store promotional screenshots and generation script

## [1.0.11] - 2026-02-28

### Security

- Harden BrowserWindow, CSP, and add API error sanitization

### Fixed

- Add error handling for IPC calls in renderer

### Changed

- Remove unused Versions component
- Improve test coverage for MarkdownEditor, Resumes, ResumeDialog, and Settings
- Update dependencies (patch and minor bumps)

## [1.0.10] - 2026-02-28

### Added

- Mac App Store build config with autoUpdater guard
- Asset Catalog for MAS and fix codesign timestamp error on .pak files
- App Store submission materials (privacy policy, listing, screenshot script)

### Fixed

- Workaround electron-builder #9507 MAS signing bug with identity null/empty-string trick
- Move tailwindcss to devDependencies and exclude oxide modules from MAS build

### Changed

- Migrate workspace path from ~/.cv-assistant to userData/workspace for MAS sandbox compatibility

## [1.0.9] - 2026-02-28

### Added

- i18n macOS application menu and About panel based on language setting
- Dynamically update window title based on i18n language

### Fixed

- Change window title from Electron to CV Assistant

## [1.0.8] - 2026-02-28

### Fixed

- Harden main process startup to prevent production loading failures

## [1.0.7] - 2026-02-27

### Fixed

- Publish GitHub releases directly instead of as drafts

## [1.0.6] - 2026-02-27

### Added

- Replace app icon with new teal CV design and fix About dialog icon

### Fixed

- Set CFBundleName to show CV-Assistant in menu bar instead of Electron

## [1.0.5] - 2026-02-27

### Added

- Extract IPC handlers into testable functions with 48 unit tests
- Versions.tsx tests and expanded e2e coverage

### Fixed

- Use boolean for mac.notarize in electron-builder config
- Replace remaining hardcoded strings with translation keys

### Changed

- Standardize ai:chat IPC handler to return structured responses
- Consolidate window.electron mock into shared setup.ts

## [1.0.4] - 2026-02-27

### Added

- macOS code signing and notarization

## [1.0.3] - 2026-02-27

### Added

- Auto-update with toggle in settings

## [1.0.2] - 2026-02-27

### Fixed

- Correct repo name in documentation

## [1.0.1] - 2026-02-27

### Added

- Initial public release
- AI-powered CV generation from personal profile + job description
- 12 AI provider support (OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, OpenRouter, Groq, Mistral, Qwen, Zhipu, Kimi, Custom)
- Rich Markdown editor (Tiptap-based)
- Profile management with Markdown description
- Multi-language CV generation
- i18n interface (English / Chinese)
- Light/Dark/System theme support
- Configurable local workspace directory with data migration
- 100% local data storage
- Resumes CRUD management
- Playwright E2E test setup
- GitHub Actions CI/CD for cross-platform builds

[1.0.26]: https://github.com/tc9011/CV-assistant/compare/v1.0.25...v1.0.26
[1.0.25]: https://github.com/tc9011/CV-assistant/compare/v1.0.24...v1.0.25
[1.0.24]: https://github.com/tc9011/CV-assistant/compare/v1.0.23...v1.0.24
[1.0.23]: https://github.com/tc9011/CV-assistant/compare/v1.0.22...v1.0.23
[1.0.22]: https://github.com/tc9011/CV-assistant/compare/v1.0.21...v1.0.22
[1.0.21]: https://github.com/tc9011/CV-assistant/compare/v1.0.20...v1.0.21
[1.0.20]: https://github.com/tc9011/CV-assistant/compare/v1.0.19...v1.0.20
[1.0.19]: https://github.com/tc9011/CV-assistant/compare/v1.0.18...v1.0.19
[1.0.18]: https://github.com/tc9011/CV-assistant/compare/v1.0.17...v1.0.18
[1.0.17]: https://github.com/tc9011/CV-assistant/compare/v1.0.16...v1.0.17
[1.0.16]: https://github.com/tc9011/CV-assistant/compare/v1.0.15...v1.0.16
[1.0.15]: https://github.com/tc9011/CV-assistant/compare/v1.0.14...v1.0.15
[1.0.14]: https://github.com/tc9011/CV-assistant/compare/v1.0.13...v1.0.14
[1.0.13]: https://github.com/tc9011/CV-assistant/compare/v1.0.12...v1.0.13
[1.0.12]: https://github.com/tc9011/CV-assistant/compare/v1.0.11...v1.0.12
[1.0.11]: https://github.com/tc9011/CV-assistant/compare/v1.0.10...v1.0.11
[1.0.10]: https://github.com/tc9011/CV-assistant/compare/v1.0.9...v1.0.10
[1.0.9]: https://github.com/tc9011/CV-assistant/compare/v1.0.8...v1.0.9
[1.0.8]: https://github.com/tc9011/CV-assistant/compare/v1.0.7...v1.0.8
[1.0.7]: https://github.com/tc9011/CV-assistant/compare/v1.0.6...v1.0.7
[1.0.6]: https://github.com/tc9011/CV-assistant/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/tc9011/CV-assistant/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/tc9011/CV-assistant/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/tc9011/CV-assistant/compare/v1.0.2...v1.0.3
[1.0.2]: https://github.com/tc9011/CV-assistant/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/tc9011/CV-assistant/releases/tag/v1.0.1
