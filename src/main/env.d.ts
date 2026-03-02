/**
 * Build-time constant injected by electron-vite via `define` in electron.vite.config.ts.
 * Set to `true` when MAS_BUILD=1 environment variable is present during build.
 * Used to completely eliminate electron-updater code from Mac App Store builds.
 */
declare const __MAS_BUILD__: boolean
