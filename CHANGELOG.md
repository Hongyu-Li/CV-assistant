# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.0](https://github.com/tc9011/CV-assistant/compare/cv-assistant-v1.2.0...cv-assistant-v1.3.0) (2026-03-23)


### Features

* add confirmation dialogs for all delete buttons ([7d7378d](https://github.com/tc9011/CV-assistant/commit/7d7378d7763705b37d25f044d870f73a69a86fad))
* add draft tab filter and remove salary icon ([745f449](https://github.com/tc9011/CV-assistant/commit/745f44981f162ad0997be03769187e3d92b9224a))
* improve resume card UI layout and typography ([1b67216](https://github.com/tc9011/CV-assistant/commit/1b672160701ac5d4f1c6681c4bca740b6c20ba71))


### Bug Fixes

* add spacing to profile cards and red styling to interview delete button ([41dbd28](https://github.com/tc9011/CV-assistant/commit/41dbd2881eda6244629f443075a972922c92f6d7))
* remove opacity transition from delete button ([b48dfc4](https://github.com/tc9011/CV-assistant/commit/b48dfc4bac89d487b3c50d0ef546029563cef4a3))

## [1.2.0](https://github.com/tc9011/CV-assistant/compare/cv-assistant-v1.1.0...cv-assistant-v1.2.0) (2026-03-23)


### Features

* add draft as default interview status for new resumes ([b7a2d90](https://github.com/tc9011/CV-assistant/commit/b7a2d901384b76283335d81bc519d63a54969b7a))


### Bug Fixes

* revert sandbox:true (breaks preload) and suppress ENOENT log noise in migration ([6ba82ba](https://github.com/tc9011/CV-assistant/commit/6ba82ba1180cbe70ce3b4c8ef6dd879515a12582))

## [1.1.0](https://github.com/tc9011/CV-assistant/compare/cv-assistant-v1.0.26...cv-assistant-v1.1.0) (2026-03-20)


### Features

* add Asset Catalog for MAS and fix codesign timestamp error on .pak files ([98b3b1c](https://github.com/tc9011/CV-assistant/commit/98b3b1c503ee4cceb47faea73ea43c15cb6c3a8e))
* add auto-update with toggle in settings ([025b6a6](https://github.com/tc9011/CV-assistant/commit/025b6a6a550732366554aab3d3d9dd1f26054b8e))
* add Chinese AI provider support (Qwen, Zhipu, Kimi) ([f0eebd2](https://github.com/tc9011/CV-assistant/commit/f0eebd210d45bfa6c4802b06e5c3046248d37dba))
* add CV language selector to resume generation ([2fab989](https://github.com/tc9011/CV-assistant/commit/2fab9891774fdbb6e625b5c61ea30efa6646bc7d))
* add cv:read IPC handler for loading individual CV files ([2e16533](https://github.com/tc9011/CV-assistant/commit/2e16533441226af450e9eb6013e2409151fdd9f4))
* add data migration from old format to new subdirectory structure ([28732b7](https://github.com/tc9011/CV-assistant/commit/28732b76260cdf31bded652c260ca45bd35ad63a))
* add i18n keys for CV language selector ([bf5fcc9](https://github.com/tc9011/CV-assistant/commit/bf5fcc9de64589bb8a6ca2ddf4f470650524e301))
* add i18n support and fix theme toggling ([bc3dacf](https://github.com/tc9011/CV-assistant/commit/bc3dacf657df23fad1bdc5eb3850bdebcd9e365a))
* add interview round tracking with statistics ([adeab87](https://github.com/tc9011/CV-assistant/commit/adeab871b1e570d709a1e36bd46cf5ebfb075703))
* add interview status tracking to job applications ([dfd1cf3](https://github.com/tc9011/CV-assistant/commit/dfd1cf3a1e8c1ba10c462731d11e94f748539b43))
* add Mac App Store build config with autoUpdater guard and gitignore for sensitive files ([ed47043](https://github.com/tc9011/CV-assistant/commit/ed4704395c0427e16da35a04ddb0a2188940355f))
* add Mac App Store promotional screenshot suite (5 frames × 2 locales) ([c826cba](https://github.com/tc9011/CV-assistant/commit/c826cbac16abf79a09f309354c4e0a2338b42ce7))
* add max_tokens for OpenAI-compatible providers ([5d85259](https://github.com/tc9011/CV-assistant/commit/5d85259853a49fef5c50e60fa54b127fe78db6e8))
* add optional response_format passthrough for OpenAI-compatible providers ([9ad5d4c](https://github.com/tc9011/CV-assistant/commit/9ad5d4c30eb6e3966eb275899bf0d71a43e1a7ca))
* add reusable MarkdownEditor component with Tiptap ([e8c7fd5](https://github.com/tc9011/CV-assistant/commit/e8c7fd5e1da423b459687f41a745d939ea8cae4e))
* add shadcn Dialog UI component with @radix-ui/react-dialog ([4d7c558](https://github.com/tc9011/CV-assistant/commit/4d7c5586817021b01bea6a19b88db13b569769ad))
* add subdirectory file listing and include .md in migrations ([19a6e6c](https://github.com/tc9011/CV-assistant/commit/19a6e6c494922b5a8bf2780a206482f562b133b1))
* add tabs filter and search for applications ([ff02edf](https://github.com/tc9011/CV-assistant/commit/ff02edf68331b6cf1b24306782b802e6544a7cb3))
* add workspace migration with conflict resolution when changing directory ([beb3cbc](https://github.com/tc9011/CV-assistant/commit/beb3cbcb23abb71a3f61de2930cb976cb47f0bef))
* add Zod runtime validation for extracted profile data ([4846d18](https://github.com/tc9011/CV-assistant/commit/4846d18cf623710524d4be21163bdaf2b2f7d0d1))
* **agent:** add Aider, Cursor, and Copilot agent types with config UI ([fd28dea](https://github.com/tc9011/CV-assistant/commit/fd28deabd6793ce3a3c4e24fa8d561ec3c3d591b))
* auto-extract keywords from JD and redesign interview tracking ([102bd7a](https://github.com/tc9011/CV-assistant/commit/102bd7a1b40b863c35b640c9521f8bf698d0dd1f))
* change default workspace path to ~/.cv-assistant ([bf46266](https://github.com/tc9011/CV-assistant/commit/bf46266cc0ef7d2919a0a5c44d9ceb7e00c6f432))
* complete Resumes Management UI and file system integration ([8ef95ec](https://github.com/tc9011/CV-assistant/commit/8ef95ecd7369ab00b296ada183aacb0e7b93aac9))
* consolidate Dashboard/Generator into Resumes with CRUD ([118896f](https://github.com/tc9011/CV-assistant/commit/118896f0622c860936eaba35dc5f9ebeda1ec371))
* **core:** implement local storage IPC, AI provider abstraction, and settings context ([98a7275](https://github.com/tc9011/CV-assistant/commit/98a72751730f168ad35f4980c37aa739783c4bb5))
* create ResumeDialog component with form, JD input, AI generation, and save ([2e0ae60](https://github.com/tc9011/CV-assistant/commit/2e0ae600469dc9a12899f5073fa3d0dcfc9843b0))
* dynamically update window title based on i18n language ([f5debfe](https://github.com/tc9011/CV-assistant/commit/f5debfe10f3f359fee747d0bcf2f05edf8fed20a))
* harden parseJsonFromAiResponse with jsonrepair 6-strategy cascade ([0004ed4](https://github.com/tc9011/CV-assistant/commit/0004ed4bd53ddd59254f202a4cb22f4f9b874fe3))
* i18n macOS application menu and About panel based on language setting ([4650ca4](https://github.com/tc9011/CV-assistant/commit/4650ca41160c211e75a67fe84a81ed0f8f5e2f61))
* **i18n:** add complete translations for Profile, Generator, and Settings components ([95ebc98](https://github.com/tc9011/CV-assistant/commit/95ebc98528cb4ea8f2ca1a791332a21ce634bedb))
* **i18n:** add translations for Chinese providers and API key toggle ([8c5eed7](https://github.com/tc9011/CV-assistant/commit/8c5eed7d74536d8c1ef845a84d9a2b13e361a394))
* implement custom workspace directory support ([0a36c07](https://github.com/tc9011/CV-assistant/commit/0a36c07245a2e5bc24025660d867d16c3baad540))
* implement per-provider API key storage with show/hide toggle ([3b084f4](https://github.com/tc9011/CV-assistant/commit/3b084f4bec7f16b3e4f630d401a0b8374051f14b))
* increase PDF import timeout to 3 minutes ([96d7e6d](https://github.com/tc9011/CV-assistant/commit/96d7e6de850d6398b097624d6ad041fefb3ed142))
* increase PDF import timeout to 3 minutes ([6649f59](https://github.com/tc9011/CV-assistant/commit/6649f5964acc3591d7c7aa8e9b87815474befc44))
* merge export buttons into single download dropdown ([9542910](https://github.com/tc9011/CV-assistant/commit/9542910fd0f78396df6d82261cc469dcf419df96))
* move profile storage to workspace with markdown files and JSON index ([fcf4153](https://github.com/tc9011/CV-assistant/commit/fcf41533a190ea660753d4fb026548e6b91c0fc0))
* move settings from localStorage to workspace via IPC ([562d183](https://github.com/tc9011/CV-assistant/commit/562d1834e4e534a3f9f4daf0af0e84ac283bd24a))
* **profile:** add education section with AI PDF extraction ([45f6d57](https://github.com/tc9011/CV-assistant/commit/45f6d57262a6ff2327f5226642660317e7513bb5))
* **profile:** add PDF import with AI-powered data extraction ([57d4c13](https://github.com/tc9011/CV-assistant/commit/57d4c13abce3e8b8a94bc06dc7b8a8fc315bc9bd))
* **profile:** add spinner to PDF import button during loading ([5cb5ab8](https://github.com/tc9011/CV-assistant/commit/5cb5ab8344e7b1849bcdda3b5a7e040dda24def5))
* redesign application cards with company-first layout and keywords ([41198fb](https://github.com/tc9011/CV-assistant/commit/41198fb296129e67e00d4f1b2cd342950758faa5))
* redesign interview rounds with vertical timeline ([799555c](https://github.com/tc9011/CV-assistant/commit/799555c40e1846e45b784cbe2f5d93b8cfc65ffd))
* redesign UI with teal+orange palette, sidebar icons, and page animations ([16aa2d8](https://github.com/tc9011/CV-assistant/commit/16aa2d82271a9fad74a5429c3a1f077d091fff4b))
* replace AI providers with coding agent integrations ([1df6fef](https://github.com/tc9011/CV-assistant/commit/1df6fefcf0d86187b34af3204fd58e7fdc3612b4))
* replace app icon with new teal CV design and fix About dialog icon ([9731ee3](https://github.com/tc9011/CV-assistant/commit/9731ee32515acb47490a5a166fe8d0a184c46577))
* replace coding agent with multi-provider API key system ([eb9b4b3](https://github.com/tc9011/CV-assistant/commit/eb9b4b340ef9204affb7091a141c07409ff66b65))
* replace PDF preview with direct PDF export ([d95188c](https://github.com/tc9011/CV-assistant/commit/d95188c1a9ed8c952c4ade95742a82a014059f36))
* restructure CV storage with separate .md files and load real profile for AI generation ([ff03317](https://github.com/tc9011/CV-assistant/commit/ff033170c51dd0c825eebbf8464648a1c94e88f8))
* **resume:** add proper markdown preview with toggle ([38b2e99](https://github.com/tc9011/CV-assistant/commit/38b2e9959ee9b9087a09b5736a1b28d54cd23167))
* **resume:** enhance CV display, interview notes, and add PDF preview ([9b8de09](https://github.com/tc9011/CV-assistant/commit/9b8de0918b596d2d7914bcd73f6040a30a6e28de))
* **resume:** merge configuration, add PDF preview, and improve markdown rendering ([d9b4cff](https://github.com/tc9011/CV-assistant/commit/d9b4cff589ece93934cc5d319460dc1d3afc0dbf))
* **ui:** add export and copy functionality to Generator ([29ef000](https://github.com/tc9011/CV-assistant/commit/29ef000e1d5140129c2690eebab53b912710c1fc))
* **ui:** implement Settings UI and CV Generation UI ([84f6f71](https://github.com/tc9011/CV-assistant/commit/84f6f710912acff68cd7366ee04f3da8f7a7c68a))
* **ui:** setup shadcn/ui and basic layout ([792157e](https://github.com/tc9011/CV-assistant/commit/792157e5cc1c1d0427e96244c1fad7ed6c9264ea))
* update i18n keys for dashboard-to-resumes merge ([fbb6af2](https://github.com/tc9011/CV-assistant/commit/fbb6af2c800c413b0a4d6669f3fb3d7eed886143))


### Bug Fixes

* add error handling for IPC calls in renderer ([7fcf96f](https://github.com/tc9011/CV-assistant/commit/7fcf96f8ae04e04f67fdf0e83d093e19d1b3f169))
* add explicit max-height and overflow to Select viewport ([39e1738](https://github.com/tc9011/CV-assistant/commit/39e1738c6c971dcef6cebc9572314b7f2ab522d6))
* add missing DialogDescription to Edit Round dialog to resolve Radix a11y warning ([48a2a7d](https://github.com/tc9011/CV-assistant/commit/48a2a7dfd5c0bdb40ef37552e883a883b6728b79))
* address code review findings — security, error handling, and data integrity ([6b70844](https://github.com/tc9011/CV-assistant/commit/6b708441fe5048cc89449449b5d5341b78a78746))
* **agent:** add model field to OpenCode fetch and settings UI ([a3ded1d](https://github.com/tc9011/CV-assistant/commit/a3ded1df516ab920a7cbabd14f406b3d6cc4d715))
* **agent:** improve error handling and fix stub agents to use yield pattern ([d37df78](https://github.com/tc9011/CV-assistant/commit/d37df789f380988479e2f50fad895677a1362795))
* change window title from Electron to 简历助手 - CV Assistant ([632c998](https://github.com/tc9011/CV-assistant/commit/632c998789d4b4dd464e813fac3f4f243d192371))
* correct repo name to CV-assistant- (with trailing dash) ([123adc0](https://github.com/tc9011/CV-assistant/commit/123adc067f4cca1ca7ffe54e243afe5e51633fdc))
* **csp:** allow localhost connections for OpenCode agent ([9375432](https://github.com/tc9011/CV-assistant/commit/9375432db36a11d6e0636436510d8607bd927c0c))
* enable WYSIWYG markdown rendering in MarkdownEditor ([cf22c3c](https://github.com/tc9011/CV-assistant/commit/cf22c3c7d6e2c7f96a05b084a59d46d489544493))
* handle auto-update check failure gracefully with UI feedback and tests ([9282a4c](https://github.com/tc9011/CV-assistant/commit/9282a4c57b9946dba95f030a36eafcf6d54b2acd))
* harden main process startup to prevent production loading failures ([6893193](https://github.com/tc9011/CV-assistant/commit/689319331530c356743f41d9e35da7a5843df9fe))
* **i18n:** add missing education_description_ph placeholder to both locales ([1521726](https://github.com/tc9011/CV-assistant/commit/1521726b933da981650f9d36a237087c9895082d))
* **i18n:** replace all hardcoded strings with t() calls and add missing keys ([7814aef](https://github.com/tc9011/CV-assistant/commit/7814aef33f35e13b80cbb336c7816f953a70268b))
* **i18n:** replace remaining hardcoded strings with translation keys ([5a44697](https://github.com/tc9011/CV-assistant/commit/5a446975d6b00136d3c7590306411a19533e8fb7))
* improve markdown-to-HTML converter, multi-page PDF slicing, and dropdown styling ([ecdc569](https://github.com/tc9011/CV-assistant/commit/ecdc5696e999edcd742840a137644b9df8d0c118))
* **mac:** set CFBundleName to show CV-Assistant in menu bar instead of Electron ([a6787fa](https://github.com/tc9011/CV-assistant/commit/a6787fa210b316d272a08e11590df67600e4e6e5))
* make workspace migration recursive to include subdirectories (profile/, resumes/) ([bad2c72](https://github.com/tc9011/CV-assistant/commit/bad2c72e4240ef167184889b89eeff4691cce260))
* **mas:** add Show Main Window menu item to pass Guideline 4 review ([54cf884](https://github.com/tc9011/CV-assistant/commit/54cf8843413ababf9a53f194477893fbff3507fe))
* **mas:** add singleArchFiles to fix universal binary merge failure ([311882c](https://github.com/tc9011/CV-assistant/commit/311882c41f26e411e2cc566e3c0ef5184751468f))
* **mas:** eliminate all electron-updater traces from Mac App Store build ([f8ab44a](https://github.com/tc9011/CV-assistant/commit/f8ab44aab949facf4870ca35c9cc5c22f4fdf37e))
* **mas:** remove electron-updater from MAS build to pass App Store review ([6e9fc8e](https://github.com/tc9011/CV-assistant/commit/6e9fc8ea6d91952a320f24ff0162c95921f40d19))
* move Interview Status outside Interview Rounds and render notes as proper HTML ([f55eefe](https://github.com/tc9011/CV-assistant/commit/f55eefed7f6cdd9b17287eb0d271e9896cd3a957))
* move tailwindcss to devDependencies and exclude oxide modules from MAS build ([c102e1b](https://github.com/tc9011/CV-assistant/commit/c102e1b313fe771341032556ba99f093eaf9f6fb))
* prevent download dropdown from being clipped when Generated CV section is collapsed ([0190b5c](https://github.com/tc9011/CV-assistant/commit/0190b5c872fcc2e14f053e2120055c9e94d4cb43))
* **provider:** strip markdown code block fences from CV output ([dfe4596](https://github.com/tc9011/CV-assistant/commit/dfe4596ba6589f6af9965d8b494c949bef179fa0))
* publish GitHub releases directly instead of as drafts ([faa610c](https://github.com/tc9011/CV-assistant/commit/faa610cc9ef56993ea580c914c5dfabb3b27b5b5))
* **renderer:** add missing translations and fix Resumes test mock ([bcf8d0c](https://github.com/tc9011/CV-assistant/commit/bcf8d0cb7ef9e4385bea01282410e59f9f7dd442))
* **renderer:** resolve ReferenceError in Resumes component ([79c2fa4](https://github.com/tc9011/CV-assistant/commit/79c2fa433f5e87bc55adc956e9bf62b3cb9dd240))
* repair 3 failing e2e profile tests ([9524535](https://github.com/tc9011/CV-assistant/commit/9524535313062a5bb59f07678d2844dd5012fa95))
* replace nested button with div role=button in Generated CV collapsible header ([389d0f1](https://github.com/tc9011/CV-assistant/commit/389d0f131d0802bd0ea063da76b958b663b1c8f6))
* resolve resume generation timeout and implement profile auto-save ([1ebf72f](https://github.com/tc9011/CV-assistant/commit/1ebf72f66c6c81e85ffe885a7821e0780eb03797))
* **resume:** use standard MarkdownEditor like Profile ([8258ff5](https://github.com/tc9011/CV-assistant/commit/8258ff5d27770033c6a640088634637100e1c9d4))
* revert sandbox: true that caused blank screen on launch ([444c663](https://github.com/tc9011/CV-assistant/commit/444c663a0875bf301eb2ef37352b7b99d663443e))
* select dropdown scroll issue ([62239ee](https://github.com/tc9011/CV-assistant/commit/62239ee0289a8c321021f2d43cb4bcd5d5cc13de))
* set macOS menu bar app name to 简历助手 ([976ca23](https://github.com/tc9011/CV-assistant/commit/976ca23d18af4c03bacfb65f333b034816ab0a81))
* **test:** add missing vitest imports for beforeEach/afterEach in setup.ts ([4e0f538](https://github.com/tc9011/CV-assistant/commit/4e0f53810b682f6b57e47024e1d939db060a2aec))
* **test:** use resilient selectors in e2e navigation test ([ce10c60](https://github.com/tc9011/CV-assistant/commit/ce10c607851b763cfa698e11260878e3b43f54b8))
* **ui:** move Profile tab before Resumes in sidebar nav ([32da436](https://github.com/tc9011/CV-assistant/commit/32da43672e8f766850718e1b7cf62358f64c2ecb))
* **ui:** remove orange accent, white background, drop card-hover from Profile/Settings ([b2509d5](https://github.com/tc9011/CV-assistant/commit/b2509d577a2a9c417adcfdd56d7957f5916d01f1))
* update default models from official docs (OpenAI gpt-5.2, Zhipu glm-5, Kimi kimi-k2.5) ([2a3790d](https://github.com/tc9011/CV-assistant/commit/2a3790df1a0faf72facee40825d6910b6ba75c5f))
* update Gemini default model to gemini-3-flash-preview ([c84e5b2](https://github.com/tc9011/CV-assistant/commit/c84e5b2fe08f6b50eb615cb0169d6ddaf52346ac))
* update outdated AI provider default models ([e87cea3](https://github.com/tc9011/CV-assistant/commit/e87cea3aab0915a6c6aa5175d43fbb2d421de356))
* use boolean for mac.notarize in electron-builder config ([fd55c76](https://github.com/tc9011/CV-assistant/commit/fd55c769adbb67d8357a3d2ebccee8c5f2c205fa))
* use static import for electron-updater to resolve production loading failure ([afbe20a](https://github.com/tc9011/CV-assistant/commit/afbe20a212943661cfb6b3a82225ee796a69b621))
* workaround electron-builder [#9507](https://github.com/tc9011/CV-assistant/issues/9507) MAS signing bug with identity null/empty-string trick ([c32c601](https://github.com/tc9011/CV-assistant/commit/c32c601b79db98765f0406adcba80efd50192fd3))

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
