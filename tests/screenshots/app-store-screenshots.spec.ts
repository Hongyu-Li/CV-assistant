/**
 * Mac App Store Screenshot Suite
 *
 * Captures professional screenshots of the CV Assistant Electron app suitable
 * for submission to the Mac App Store.
 *
 * Target viewport: 1440×900 (standard MacBook resolution).
 * Output directory: tests/screenshots/app-store/
 *
 * Apple-required sizes (the screenshots are taken at 1440×900 and can be
 * scaled up to 2880×1800 Retina by the submission tool, or captured with a
 * deviceScaleFactor of 2 which doubles the physical pixel dimensions):
 *   - 1280 × 800
 *   - 1440 × 900  ← primary capture size used here
 *   - 2560 × 1600 (Retina)
 *   - 2880 × 1800 (Retina) ← achieved via deviceScaleFactor: 2
 *
 * Screenshots captured:
 *   01-resumes.png       — My Resumes list (default landing view)
 *   02-profile.png       — Profile page with markdown editor
 *   03-editor.png        — Resume editor dialog (create/edit resume)
 *   04-settings-ai.png   — Settings page – AI provider configuration
 *   05-settings-theme.png — Settings page – scrolled to show theme/language
 */

import { test, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import path from 'path'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Output directory for App Store screenshots. */
const SCREENSHOT_DIR = path.join('tests', 'screenshots', 'app-store')

/** Viewport dimensions matching Apple's 1440×900 requirement. */
const VIEWPORT = { width: 1440, height: 900 }

/**
 * Device scale factor applied to the Electron browser context.
 * A value of 2 causes screenshots to be rendered at physical pixel
 * dimensions of 2880×1800 – matching Apple's Retina requirement.
 */
const DEVICE_SCALE_FACTOR = 2

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Waits for the Electron window to finish loading and for the React app to
 * mount.  The sidebar navigation (3 buttons) is used as the "ready" signal
 * because it is always visible after hydration regardless of which route is
 * active.
 */
async function waitForAppReady(window: Page): Promise<void> {
  await window.waitForLoadState('domcontentloaded')
  // Wait until at least one nav button is visible – signals React has mounted.
  await window.waitForSelector('nav button', { state: 'visible', timeout: 15000 })
  // Extra breathing room for animations / data fetches to settle.
  await window.waitForTimeout(600)
}

/**
 * Clicks the sidebar button at the given zero-based index and waits for the
 * view to animate in before returning.
 *
 * Sidebar order (matches App.tsx):
 *   0 – Profile (个人资料)
 *   1 – Resumes (我的简历)
 *   2 – Settings (设置)
 */
async function navigateTo(window: Page, buttonIndex: number): Promise<void> {
  const navButtons = window.locator('nav button')
  await navButtons.nth(buttonIndex).click()
  // Allow the page-enter animation to complete.
  await window.waitForTimeout(500)
}

/**
 * Takes a full-page screenshot and saves it to the App Store output folder.
 *
 * @param window   - The Playwright page object for the Electron window.
 * @param filename - File name (e.g. "01-resumes.png").
 */
async function capture(window: Page, filename: string): Promise<void> {
  await window.screenshot({
    path: path.join(SCREENSHOT_DIR, filename),
    fullPage: false // App Store screenshots must match the exact viewport.
  })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

test.describe('App Store Screenshots', () => {
  let electronApp: ElectronApplication
  let window: Page

  test.beforeAll(async () => {
    // Launch the Electron app with a high DPI scale factor so that
    // screenshots are captured at Retina resolution (2880×1800 physical pixels).
    electronApp = await electron.launch({
      args: ['.', `--force-device-scale-factor=${DEVICE_SCALE_FACTOR}`]
    })

    window = await electronApp.firstWindow()

    // Set the CSS viewport to 1440×900. Combined with deviceScaleFactor=2
    // the resulting screenshot images will be 2880×1800 physical pixels.
    await window.setViewportSize({
      width: VIEWPORT.width,
      height: VIEWPORT.height
    })

    // Wait for the app to be fully ready before taking any screenshots.
    await waitForAppReady(window)
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  // -------------------------------------------------------------------------
  // Screenshot 01 – My Resumes list
  // -------------------------------------------------------------------------
  test('01 – My Resumes (resume list view)', async () => {
    // The resumes view is the default landing page (index 1 in the sidebar).
    await navigateTo(window, 1)

    // Wait for either the resume cards grid or the empty-state card to appear.
    await window.waitForSelector('[class*="grid"] [class*="card"], [class*="border-dashed"]', {
      timeout: 8000
    })

    /**
     * Screenshot: My Resumes page.
     * Shows the resume list grid with cards (or the empty state prompt) and
     * the "New Resume" action button in the top-right corner.
     */
    await capture(window, '01-resumes.png')
  })

  // -------------------------------------------------------------------------
  // Screenshot 02 – Profile page
  // -------------------------------------------------------------------------
  test('02 – Profile (profile editor with markdown fields)', async () => {
    // Profile tab is index 0 in the sidebar.
    await navigateTo(window, 0)

    // Wait for the personal info card to render.
    await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })

    /**
     * Screenshot: Profile page.
     * Displays the personal information form (name, email, phone), the
     * markdown-powered summary editor, work experience, and projects sections.
     */
    await capture(window, '02-profile.png')
  })

  // -------------------------------------------------------------------------
  // Screenshot 03 – Resume editor dialog
  // -------------------------------------------------------------------------
  test('03 – Resume editor (create resume dialog)', async () => {
    // Navigate to the Resumes view first.
    await navigateTo(window, 1)

    // Wait for the "New Resume" button to be visible.
    const newResumeButton = window
      .locator('button')
      .filter({ hasText: /new resume|新建简历/i })
      .first()
    await newResumeButton.waitFor({ state: 'visible', timeout: 8000 })
    await newResumeButton.click()

    // Wait for the dialog to open and the job title input to be present.
    await window.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 6000 })
    await window.waitForTimeout(400)

    /**
     * Screenshot: Resume editor dialog.
     * Shows the full-featured editor with job title, experience level,
     * company name, target salary, CV language selector, job description
     * textarea, and the "Generate CV" action button.
     */
    await capture(window, '03-editor.png')

    // Close the dialog so subsequent tests start from a clean state.
    const cancelButton = window
      .locator('[role="dialog"] button')
      .filter({ hasText: /cancel|取消/i })
      .first()
    await cancelButton.click()
    await window.waitForSelector('[role="dialog"]', { state: 'detached', timeout: 5000 })
  })

  // -------------------------------------------------------------------------
  // Screenshot 04 – Settings: AI provider configuration
  // -------------------------------------------------------------------------
  test('04 – Settings (AI provider configuration)', async () => {
    // Settings tab is index 2 in the sidebar.
    await navigateTo(window, 2)

    // Wait for the settings heading to be visible.
    await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })

    // Scroll to the top of the main content area to show the AI provider card.
    await window.evaluate((): void => {
      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
    })
    await window.waitForTimeout(300)

    /**
     * Screenshot: Settings – AI provider section.
     * Highlights the AI provider dropdown, API key field, model name input,
     * base URL, and the "Test Connection" button.
     */
    await capture(window, '04-settings-ai.png')
  })

  // -------------------------------------------------------------------------
  // Screenshot 05 – Settings: Theme & language preferences
  // -------------------------------------------------------------------------
  test('05 – Settings (theme and language preferences)', async () => {
    // Already on the Settings view from the previous test; navigate again to
    // ensure a clean scroll position.
    await navigateTo(window, 2)

    // Wait for the settings heading.
    await window.waitForSelector('main h2', { state: 'visible', timeout: 8000 })

    // Scroll down slightly so the General Settings card (theme + language) is
    // prominently visible in the viewport.
    await window.evaluate((): void => {
      const mainEl = document.querySelector('main')
      if (mainEl) {
        // Scroll down past the page header to bring the General card into focus.
        mainEl.scrollTop = 80
      }
    })
    await window.waitForTimeout(300)

    /**
     * Screenshot: Settings – General section (theme & language).
     * Shows the workspace directory picker, the theme selector
     * (Light / Dark / System), and the language selector (English / 中文).
     */
    await capture(window, '05-settings-theme.png')
  })
})
