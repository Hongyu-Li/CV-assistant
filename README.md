# CV Assistant

English | [中文](./README.zh-CN.md)

AI-powered resume/CV assistant desktop app — generate tailored resumes from your profile using multiple AI providers.

[![Electron](https://img.shields.io/badge/Electron-39.0.0-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-blue.svg)](https://tailwindcss.com/)
[![Coverage](https://img.shields.io/badge/Coverage-95%25-brightgreen.svg)](https://github.com/tc9011/CV-assistant)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[Download Latest Release](https://github.com/tc9011/CV-assistant/releases)**

## Features

### AI-Powered CV Generation

- Generate tailored resumes from personal profile + job description
- 12 AI provider support (OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, OpenRouter, Groq, Mistral, Qwen, Zhipu, Kimi, Custom)
- Multi-language CV generation (English, Chinese, Japanese, Korean, French, German, Spanish)
- Auto-extract keywords from job description alongside CV generation

### Profile Management

- Rich Markdown editor (Tiptap-based, Typora-like live rendering)
- Import profile from existing PDF resume (AI-powered extraction)
- Auto-save with 500ms debounce — no save button needed

### Job Application Tracker

- Track company name, job title, experience level, target salary, and notes per application
- 10-state interview status (Resume Sent → 1st–5th Interview → HR Interview → Offer Accepted/Rejected/Failed)
- Interview round tracking with vertical timeline — log date, result, and Markdown notes per round
- Filter applications by interview stage with live count tabs
- Search applications by company name or job title

### Export & Share

- Export generated CV as PDF (styled, multi-page)
- Export generated CV as Markdown
- Copy generated CV to clipboard with one click

### Settings & Configuration

- AI connection test button to verify provider setup
- API key show/hide toggle
- Configurable local workspace directory with data migration
- Open workspace folder in Finder/Explorer from Settings
- Auto-update with on/off toggle (disabled on Mac App Store builds)

### General

- i18n interface (English / 中文) with localized macOS native menu
- Light/Dark/System theme support
- 100% local data storage — no server uploads
- Security hardened (CSP, API key redaction, rate-limit detection, request timeouts)
- Code-signed, notarized, and available on Mac App Store
- Cross-platform (Windows, macOS, Linux)

## Screenshots

<!-- screenshots here -->

## macOS Installation Note

The app is available on the **Mac App Store**. You can also download it directly from [GitHub Releases](https://github.com/tc9011/CV-assistant/releases).

The direct download version is code-signed and notarized for macOS. If you still see a security warning, open Terminal and run:

```bash
xattr -cr /Applications/CV-Assistant.app
```

Then try opening the app again.

## Tech Stack

| Layer    | Technology                                                   |
| :------- | :----------------------------------------------------------- |
| Frontend | React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, Radix UI |
| Editor   | Tiptap 3 (ProseMirror-based)                                 |
| Desktop  | Electron 39, electron-vite 5                                 |
| i18n     | i18next, react-i18next                                       |
| Testing  | Vitest, Testing Library, Playwright                          |
| Linting  | ESLint 9, Prettier                                           |
| CI/DX    | Husky, lint-staged, GitHub Actions, release-please           |

## Prerequisites

Node.js >= 18, npm

## Getting Started

```bash
git clone https://github.com/tc9011/CV-assistant.git
cd CV-assistant
npm install
npm run dev
```

## Available Scripts

| Command               | Description                        |
| :-------------------- | :--------------------------------- |
| npm run dev           | Start development with HMR         |
| npm run build         | Typecheck + build                  |
| npm run build:mac     | Build for macOS                    |
| npm run build:win     | Build for Windows                  |
| npm run build:linux   | Build for Linux                    |
| npm run build:mas     | Build for Mac App Store            |
| npm run build:mas-dev | Build MAS with development signing |
| npm test              | Run unit tests                     |
| npm run test:coverage | Run tests with coverage report     |
| npm run e2e           | Run Playwright e2e tests           |
| npm run lint          | Run ESLint                         |
| npm run format        | Format with Prettier               |
| npm run typecheck     | Run TypeScript type checks         |

## Project Structure

```
src/
├── main/           # Electron main process (IPC handlers, file system)
│   ├── index.ts    # App entry, window creation, IPC registration
│   └── fs.ts       # File system operations (workspace CRUD, migration)
├── preload/        # Preload scripts (context bridge)
│   ├── index.ts
│   └── index.d.ts
└── renderer/       # React frontend
    └── src/
        ├── components/   # UI components (Profile, Resumes, Settings, etc.)
        ├── context/      # React contexts (Settings, Theme)
        ├── lib/          # Utilities (AI provider configs, CV generation)
        ├── locales/      # i18n translations (en.json, zh.json)
        └── assets/       # Styles (Tailwind CSS v4)
```

## AI Providers

| Provider        | Default Model               | Local |
| :-------------- | :-------------------------- | :---- |
| OpenAI          | gpt-5.2                     | No    |
| Anthropic       | claude-sonnet-4-6           | No    |
| Google Gemini   | gemini-3-flash-preview      | No    |
| DeepSeek        | deepseek-chat               | No    |
| Ollama          | llama3.2                    | Yes   |
| OpenRouter      | anthropic/claude-sonnet-4-6 | No    |
| Groq            | llama-3.3-70b-versatile     | No    |
| Mistral         | mistral-large-latest        | No    |
| Qwen (Alibaba)  | qwen-plus                   | No    |
| Zhipu (GLM)     | glm-5                       | No    |
| Kimi (Moonshot) | kimi-k2.5                   | No    |
| Custom          | —                           | —     |

## Contributing

This project uses [Conventional Commits](https://www.conventionalcommits.org/) and [release-please](https://github.com/googleapis/release-please) for automated releases.

1. Fork the repository and create a new branch
2. Commit with conventional format: `feat: ...`, `fix: ...`, `docs: ...`
3. Submit a Pull Request for review
4. On merge to master, release-please automatically creates a Release PR that bumps version and updates CHANGELOG
5. When the Release PR is merged, cross-platform builds are triggered automatically

Pre-commit hooks run lint-staged (ESLint + Prettier). Pre-push hooks run tests with coverage.

## License

MIT License - Copyright © 2025-2026 [Cheng Tang](https://github.com/tc9011)
