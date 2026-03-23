import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
  }
}

/**
 * Augment Playwright's Page with `electron` to handle variable shadowing
 * in evaluate() callbacks where the fixture parameter `window` (Page)
 * shadows the browser's global `window` (Window).
 */
declare module '@playwright/test' {
  interface Page {
    electron: ElectronAPI
  }
}
