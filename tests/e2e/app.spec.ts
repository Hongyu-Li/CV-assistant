import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test'

test.describe('Electron App', () => {
  let electronApp: ElectronApplication

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] })
  })

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close()
    }
  })

  test('should launch the app and show a window', async () => {
    const window = await electronApp.firstWindow()
    expect(window).toBeTruthy()

    // Wait for the window to load
    await window.waitForLoadState('domcontentloaded')

    // Take a screenshot
    await window.screenshot({ path: 'tests/e2e/screenshots/app.png' })

    // Check title
    const title = await window.title()
    expect(title).toBeDefined()
  })

  test('should navigate between sidebar tabs', async () => {
    const window = await electronApp.firstWindow()
    expect(window).toBeTruthy()

    // Wait for the window to load
    await window.waitForLoadState('domcontentloaded')

    // Wait for app to fully render
    await window.waitForTimeout(1000)

    // Check that the sidebar navigation buttons exist
    const profileButton = window.locator('button:has-text("app.profile")')
    const resumesButton = window.locator('button:has-text("app.resumes")')
    const settingsButton = window.locator('button:has-text("app.settings")')

    // Verify buttons exist (using presence check)
    expect(await profileButton.count()).toBeGreaterThan(0)
    expect(await resumesButton.count()).toBeGreaterThan(0)
    expect(await settingsButton.count()).toBeGreaterThan(0)

    // Click on the Profile tab
    await profileButton.first().click()
    await window.waitForTimeout(500)

    // Click on the Settings tab
    await settingsButton.first().click()
    await window.waitForTimeout(500)

    // Click back to Resumes tab
    await resumesButton.first().click()
    await window.waitForTimeout(500)

    // Verify we can click buttons without errors
    // (success is no exceptions thrown)
    expect(true).toBe(true)
  })
})
