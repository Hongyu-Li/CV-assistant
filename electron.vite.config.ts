import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    define: {
      // Build-time constant: set MAS_BUILD=1 env var during MAS builds to
      // completely eliminate electron-updater code (including import strings)
      __MAS_BUILD__: JSON.stringify(!!process.env.MAS_BUILD)
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react(), tailwindcss()],
    build: {
      sourcemap: true,
      minify: false
    }
  }
})
