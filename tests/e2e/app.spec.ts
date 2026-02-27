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

    // The sidebar nav contains 3 buttons. Use nav > button selector for resilience.
    // Default language is English: Profile, Resumes, Settings.
    const navButtons = window.locator('nav button')
    await expect(navButtons).toHaveCount(3, { timeout: 5000 })

    // Click each sidebar button and verify active state changes.
    // The active button gets a 'bg-primary/10' class via Tailwind.
    const profileBtn = navButtons.nth(0)
    const resumesBtn = navButtons.nth(1)
    const settingsBtn = navButtons.nth(2)

    // Click Profile tab
    await profileBtn.click()
    await expect(profileBtn).toHaveClass(/border-primary/, { timeout: 2000 })

    // Click Settings tab
    await settingsBtn.click()
    await expect(settingsBtn).toHaveClass(/border-primary/, { timeout: 2000 })

    // Click Resumes tab
    await resumesBtn.click()
    await expect(resumesBtn).toHaveClass(/border-primary/, { timeout: 2000 })
  })
})
