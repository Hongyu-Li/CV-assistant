
## Tailwind CSS v4 Setup in Electron-Vite
- Tailwind CSS v4 uses the `@tailwindcss/vite` plugin instead of PostCSS.
- The plugin is added to the `renderer` section of `electron.vite.config.ts`.
- The main CSS file (`src/renderer/src/assets/main.css`) requires `@import "tailwindcss";` at the top.
