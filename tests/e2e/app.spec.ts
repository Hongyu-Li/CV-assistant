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
})
