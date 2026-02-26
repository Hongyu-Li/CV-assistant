
## Tailwind CSS v4 Setup in Electron-Vite
- Tailwind CSS v4 uses the `@tailwindcss/vite` plugin instead of PostCSS.
- The plugin is added to the `renderer` section of `electron.vite.config.ts`.
- The main CSS file (`src/renderer/src/assets/main.css`) requires `@import "tailwindcss";` at the top.

## Testing Setup
- Vitest is configured with `jsdom` for the renderer environment.
- The `window.electron` object needs to be mocked in tests, specifically `window.electron.ipcRenderer` and `window.electron.process.versions` to prevent crashes when rendering components that rely on electron APIs.

### shadcn/ui Setup in electron-vite
- The `shadcn` CLI relies on `tsconfig.json` to resolve path aliases. Since `electron-vite` uses a referenced `tsconfig.web.json` for the renderer, you must temporarily or permanently add `compilerOptions.paths` to the root `tsconfig.json` so the CLI can correctly place components in `@renderer/components/ui`.
- The `toast` component in shadcn/ui is deprecated. Use `sonner` instead (`npx shadcn@latest add sonner`).
