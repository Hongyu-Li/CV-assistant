
## Tailwind CSS v4 Setup in Electron-Vite
- Tailwind CSS v4 uses the `@tailwindcss/vite` plugin instead of PostCSS.
- The plugin is added to the `renderer` section of `electron.vite.config.ts`.
- The main CSS file (`src/renderer/src/assets/main.css`) requires `@import "tailwindcss";` at the top.

## Testing Setup
- Vitest is configured with `jsdom` for the renderer environment.
- The `window.electron` object needs to be mocked in tests, specifically `window.electron.ipcRenderer` and `window.electron.process.versions` to prevent crashes when rendering components that rely on electron APIs.
