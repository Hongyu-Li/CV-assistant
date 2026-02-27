# 简历助手 (CV Assistant)

AI-powered resume/CV assistant desktop app — generate tailored resumes from your profile using multiple AI providers.

[![Electron](https://img.shields.io/badge/Electron-39.0.0-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-blue.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- AI-powered CV generation from personal profile + job description
- 12 AI provider support (OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama, OpenRouter, Groq, Mistral, Qwen, Zhipu, Kimi, Custom)
- Rich Markdown editor (Tiptap-based, Typora-like live rendering)
- Profile management with Markdown description support
- Multi-language CV generation (English, Chinese, Japanese, Korean, French, German, Spanish)
- i18n interface (English / 中文)
- Light/Dark/System theme support
- Configurable local workspace directory with data migration
- 100% local data storage — no server uploads
- Cross-platform (Windows, macOS, Linux)

## Screenshots

<!-- screenshots here -->

## Tech Stack

| Layer    | Technology                                                   |
| :------- | :----------------------------------------------------------- |
| Frontend | React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui, Radix UI |
| Editor   | Tiptap 3 (ProseMirror-based)                                 |
| Desktop  | Electron 39, electron-vite 5                                 |
| i18n     | i18next, react-i18next                                       |
| Testing  | Vitest, Testing Library, Playwright                          |
| Linting  | ESLint 9, Prettier                                           |
| CI/DX    | Husky, lint-staged                                           |

## Prerequisites

Node.js >= 18, npm

## Getting Started

```bash
git clone https://github.com/user/cv-assistant.git
cd cv-assistant
npm install
npm run dev
```

## Available Scripts

| Command               | Description                    |
| :-------------------- | :----------------------------- |
| npm run dev           | Start development with HMR     |
| npm run build         | Typecheck + build              |
| npm run build:mac     | Build for macOS                |
| npm run build:win     | Build for Windows              |
| npm run build:linux   | Build for Linux                |
| npm test              | Run unit tests                 |
| npm run test:coverage | Run tests with coverage report |
| npm run e2e           | Run Playwright e2e tests       |
| npm run lint          | Run ESLint                     |
| npm run format        | Format with Prettier           |
| npm run typecheck     | Run TypeScript type checks     |

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

To contribute, please fork the repository and create a new branch. Commit your changes and submit a pull request for review. The project uses pre-commit hooks to run lint-staged (ESLint and Prettier) and pre-push hooks to run tests with coverage reporting.

## License

MIT
