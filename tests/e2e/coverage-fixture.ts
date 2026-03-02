import {
  test as baseTest,
  _electron as electron,
  ElectronApplication,
  Page
} from '@playwright/test'
import MCR from 'monocart-coverage-reports'
import coverageOptions from './coverage-options'

// Extend base test with Electron app + coverage collection
export const test = baseTest.extend<{
  electronApp: ElectronApplication
  window: Page
}>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use): Promise<void> => {
    const app = await electron.launch({ args: ['.'], env: { ...process.env, E2E_HEADLESS: '1' } })
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(app)
    await app.close()
  },
  window: async ({ electronApp }, use): Promise<void> => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // Force English locale for consistent test selectors.
    // The app may load in Chinese if stored settings have language:'zh'.
    // We use page.evaluate to call i18next.changeLanguage directly
    // since i18next is a singleton already loaded in the renderer bundle.
    await page.evaluate(async () => {
      // Access i18next through the global i18next store
      // i18next exposes itself on the i18next.default or through the module
      // In production builds, we need to find it via the React component tree
      // or by triggering a settings change through the existing UI mechanism.
      // The simplest approach: dispatch a custom event or manipulate localStorage.

      // Actually, i18next keeps a reference accessible in the bundle.
      // We can trigger language change by calling the IPC to save settings with language:'en'
      // then reload the page.
      try {
        await window.electron.ipcRenderer.invoke('settings:save', {
          language: 'en',
          theme: 'system',
          provider: 'openai',
          apiKeys: {},
          model: 'gpt-5.2',
          baseUrl: '',
          autoUpdate: true
        })
      } catch {
        // Settings save may fail in test environment, continue anyway
      }
    })

    // Reload the page so settings take effect
    await page.reload()
    await page.waitForLoadState('domcontentloaded')

    // Wait for i18n and React to fully initialize
    await page.waitForSelector('nav button', { timeout: 10000 })

    // Start V8 coverage via CDP session
    let client: Awaited<ReturnType<typeof MCR.CDPClient>> | null = null
    try {
      const session = await page.context().newCDPSession(page)
      const cdpClient = await MCR.CDPClient({ session })
      if (cdpClient) {
        await cdpClient.startCoverage()
        client = cdpClient
      }
    } catch (err) {
      console.warn('Could not start CDP coverage:', err)
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page)

    // Stop and collect coverage
    if (client) {
      try {
        const coverageData = await client.stopCoverage()
        const mcr = MCR(coverageOptions)
        await mcr.add(coverageData)
        await client.close()
      } catch (err) {
        console.warn('Could not collect coverage:', err)
      }
    }
  }
})

export { expect } from '@playwright/test'
