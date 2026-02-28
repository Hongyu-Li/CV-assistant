# 简历助手

[English](./README.md) | 中文

基于 AI 的简历生成桌面应用 — 通过个人档案和职位描述，一键生成定制化简历，支持多家 AI 服务商。

[![Electron](https://img.shields.io/badge/Electron-39.0.0-blue.svg)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-blue.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**[下载最新版本](https://github.com/tc9011/CV-assistant/releases)**

## 功能特性

- 基于 AI 的简历生成：输入个人资料 + 目标职位描述，自动生成匹配的简历
- 支持 12 家 AI 服务商（OpenAI、Anthropic、Google Gemini、DeepSeek、Ollama、OpenRouter、Groq、Mistral、通义千问、智谱、Kimi、自定义）
- 富文本 Markdown 编辑器（基于 Tiptap，类似 Typora 的所见即所得实时渲染）
- 个人资料管理，支持 Markdown 格式描述
- 多语言简历生成（英文、中文、日文、韩文、法文、德文、西班牙文）
- 双语界面（English / 中文）
- 亮色 / 暗色 / 跟随系统主题切换
- 可配置的本地工作目录，支持数据迁移
- 100% 本地存储，数据绝不上传服务器
- 安全加固（CSP、API 密钥脱敏、请求超时保护）
- 已代码签名、已公证，已上架 Mac App Store
- 跨平台支持（Windows、macOS、Linux）

## 截图

<!-- 截图占位 -->

## macOS 安装说明

本应用已上架 **Mac App Store**。您也可以从 [GitHub Releases](https://github.com/tc9011/CV-assistant/releases) 直接下载。

直接下载的版本已经过 macOS 代码签名和公证。如果仍然看到安全提示，请打开终端运行：

```bash
xattr -cr /Applications/CV-Assistant.app
```

然后重新打开应用即可。

## 技术栈

| 层级     | 技术                                                         |
| :------- | :----------------------------------------------------------- |
| 前端     | React 19、TypeScript 5、Tailwind CSS v4、shadcn/ui、Radix UI |
| 编辑器   | Tiptap 3（基于 ProseMirror）                                 |
| 桌面端   | Electron 39、electron-vite 5                                 |
| 国际化   | i18next、react-i18next                                       |
| 测试     | Vitest、Testing Library、Playwright                          |
| 代码规范 | ESLint 9、Prettier                                           |
| CI/DX    | Husky、lint-staged、GitHub Actions                           |

## 环境要求

Node.js >= 18，npm

## 快速开始

```bash
git clone https://github.com/tc9011/CV-assistant.git
cd CV-assistant
npm install
npm run dev
```

## 可用命令

| 命令                  | 说明                       |
| :-------------------- | :------------------------- |
| npm run dev           | 启动开发环境（支持热更新） |
| npm run build         | 类型检查 + 生产构建        |
| npm run build:mac     | 构建 macOS 版本            |
| npm run build:win     | 构建 Windows 版本          |
| npm run build:linux   | 构建 Linux 版本            |
| npm run build:mas     | 构建 Mac App Store 版本    |
| npm run build:mas-dev | 构建 MAS 开发签名版本      |
| npm test              | 运行单元测试               |
| npm run test:coverage | 运行测试并生成覆盖率报告   |
| npm run e2e           | 运行 Playwright 端到端测试 |
| npm run lint          | 运行 ESLint 检查           |
| npm run format        | 使用 Prettier 格式化代码   |
| npm run typecheck     | 运行 TypeScript 类型检查   |

## 项目结构

```
src/
├── main/           # Electron 主进程（IPC 处理、文件系统操作）
│   ├── index.ts    # 应用入口、窗口创建、IPC 注册
│   └── fs.ts       # 文件系统操作（工作目录 CRUD、数据迁移）
├── preload/        # 预加载脚本（上下文桥接）
│   ├── index.ts
│   └── index.d.ts
└── renderer/       # React 前端
    └── src/
        ├── components/   # UI 组件（个人资料、简历、设置等）
        ├── context/      # React 上下文（设置、主题）
        ├── lib/          # 工具函数（AI 服务商配置、简历生成）
        ├── locales/      # 国际化翻译文件（en.json、zh.json）
        └── assets/       # 样式文件（Tailwind CSS v4）
```

## AI 服务商

| 服务商        | 默认模型                    | 本地运行 |
| :------------ | :-------------------------- | :------- |
| OpenAI        | gpt-5.2                     | 否       |
| Anthropic     | claude-sonnet-4-6           | 否       |
| Google Gemini | gemini-3-flash-preview      | 否       |
| DeepSeek      | deepseek-chat               | 否       |
| Ollama        | llama3.2                    | 是       |
| OpenRouter    | anthropic/claude-sonnet-4-6 | 否       |
| Groq          | llama-3.3-70b-versatile     | 否       |
| Mistral       | mistral-large-latest        | 否       |
| 通义千问      | qwen-plus                   | 否       |
| 智谱          | glm-5                       | 否       |
| Kimi          | kimi-k2.5                   | 否       |
| 自定义        | —                           | —        |

## 参与贡献

欢迎贡献代码！请 fork 本仓库并创建新分支，提交更改后发起 Pull Request 进行审核。

本项目使用了以下 Git hooks：

- **pre-commit**：自动运行 lint-staged（ESLint 修复 + Prettier 格式化）
- **pre-push**：自动运行测试并输出覆盖率报告

## 开源协议

MIT 协议 - 版权所有 © 2025-2026 [Cheng Tang](https://github.com/tc9011)
