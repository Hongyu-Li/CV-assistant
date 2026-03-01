/**
 * Mac App Store Screenshot Suite (v2)
 *
 * Captures professional screenshots of the CV Assistant Electron app for both
 * English and Chinese locales, suitable for Mac App Store submission.
 *
 * Target viewport: 1440×900 (standard MacBook resolution).
 * Device scale factor: 2 → 2880×1800 physical pixels (Apple Retina).
 *
 * Output structure:
 *   screenshots/raw/en-US/
 *     01_hero_resumes.png
 *     02_profile.png
 *     03_editor.png
 *     04_settings_ai.png
 *     05_settings_theme.png
 *   screenshots/raw/zh-CN/
 *     (same 5 frames)
 */

import { test, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RAW_DIR = path.join('tests', 'screenshots', 'raw')
const VIEWPORT = { width: 1440, height: 900 }
const DEVICE_SCALE_FACTOR = 2

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForAppReady(window: Page): Promise<void> {
  await window.waitForLoadState('domcontentloaded')
  await window.waitForSelector('nav button', { state: 'visible', timeout: 15000 })
  await window.waitForTimeout(600)
}

/**
 * Sidebar order (matches App.tsx):
 *   0 – Profile
 *   1 – Resumes
 *   2 – Settings
 */
async function navigateTo(window: Page, buttonIndex: number): Promise<void> {
  const navButtons = window.locator('nav button')
  await navButtons.nth(buttonIndex).click()
  await window.waitForTimeout(500)
}

async function capture(window: Page, locale: string, filename: string): Promise<void> {
  const dir = path.join(RAW_DIR, locale)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  await window.screenshot({
    path: path.join(dir, filename),
    fullPage: false
  })
}

/**
 * Switch app language via the Settings page language Select.
 *
 * The select always shows two options: "English" and "中文".
 * We click the trigger, then click the desired option.
 */
async function switchLanguage(window: Page, targetLang: 'en' | 'zh'): Promise<void> {
  // Navigate to Settings
  await navigateTo(window, 2)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })

  // Scroll to top to ensure General Settings card is visible
  await window.evaluate((): void => {
    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  })
  await window.waitForTimeout(300)

  // The language select is the last combobox in the General Settings card.
  // There are multiple comboboxes: workspace, theme, language.
  // Language is typically the last one in the General card.
  const comboboxes = window.locator('button[role="combobox"]')
  const count = await comboboxes.count()

  // Find the combobox that currently shows either "English" or "中文"
  let langCombobox: ReturnType<typeof comboboxes.nth> | null = null
  for (let i = 0; i < count; i++) {
    const text = await comboboxes.nth(i).textContent()
    if (text && (/English/i.test(text) || /中文/.test(text))) {
      langCombobox = comboboxes.nth(i)
      break
    }
  }

  if (!langCombobox) {
    throw new Error('Could not find language combobox')
  }

  await langCombobox.click()
  await window.waitForTimeout(300)

  // Click the target option
  const targetText = targetLang === 'zh' ? '中文' : 'English'
  const option = window.locator('[role="option"]').filter({ hasText: targetText }).first()
  await option.click()
  await window.waitForTimeout(1000) // Wait for i18n to fully re-render
}

// ---------------------------------------------------------------------------
// Capture all 5 frames for a given locale
// ---------------------------------------------------------------------------

async function captureAllFrames(window: Page, locale: string): Promise<void> {
  // 01 – Resumes (hero)
  await navigateTo(window, 1)
  await window.waitForSelector('[class*="grid"] [class*="card"], [class*="border-dashed"]', {
    timeout: 8000
  })
  await capture(window, locale, '01_hero_resumes.png')

  // 02 – Profile
  await navigateTo(window, 0)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })
  await capture(window, locale, '02_profile.png')

  // 03 – Resume editor dialog
  await navigateTo(window, 1)
  const newResumeButton = window
    .locator('button')
    .filter({ hasText: /new resume|新建简历/i })
    .first()
  await newResumeButton.waitFor({ state: 'visible', timeout: 8000 })
  await newResumeButton.click()
  await window.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 6000 })
  await window.waitForTimeout(400)
  await capture(window, locale, '03_editor.png')

  // Close dialog
  const cancelButton = window
    .locator('[role="dialog"] button')
    .filter({ hasText: /cancel|取消/i })
    .first()
  await cancelButton.click()
  await window.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 })

  // 04 – Settings: AI provider
  await navigateTo(window, 2)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })
  await window.evaluate((): void => {
    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  })
  await window.waitForTimeout(300)
  await capture(window, locale, '04_settings_ai.png')

  // 05 – Settings: Theme & language
  await navigateTo(window, 2)
  await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })
  await window.evaluate((): void => {
    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.scrollTop = 80
    }
  })
  await window.waitForTimeout(300)
  await capture(window, locale, '05_settings_theme.png')
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('App Store Screenshots (Bilingual)', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['.', `--force-device-scale-factor=${DEVICE_SCALE_FACTOR}`]
    })
    window = await electronApp.firstWindow()
    await window.setViewportSize({
      width: VIEWPORT.width,
      height: VIEWPORT.height
    })
    await waitForAppReady(window)
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('Capture English screenshots', async () => {
    // Ensure English is active first
    await switchLanguage(window, 'en')
    await captureAllFrames(window, 'en-US')
  })

  test('Capture Chinese screenshots', async () => {
    await switchLanguage(window, 'zh')
    await captureAllFrames(window, 'zh-CN')
  })
})
