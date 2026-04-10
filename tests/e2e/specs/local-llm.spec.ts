import { test, expect } from '../coverage-fixture'

test.describe('Local LLM Settings', () => {
  test.beforeEach(async ({ window }) => {
    const settingsBtn = window.locator('nav button').nth(2)
    await settingsBtn.click()
    await expect(window.locator('h2', { hasText: 'Settings' })).toBeVisible({ timeout: 10000 })
  })

  test('should show Local LLM option in provider dropdown', async ({ window }) => {
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()

    await expect(window.locator('[role="option"]', { hasText: 'Local LLM' })).toBeVisible({
      timeout: 3000
    })

    await window.keyboard.press('Escape')
  })

  test('should show local model settings when Local LLM is selected', async ({ window }) => {
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'Local LLM' }).click()
    await window.waitForTimeout(500)

    await expect(window.locator('text=Local Model').first()).toBeVisible({ timeout: 5000 })
  })

  test('should hide API key field for Local LLM provider', async ({ window }) => {
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'Local LLM' }).click()
    await window.waitForTimeout(500)

    const apiKeyInput = window.locator('input[placeholder="Paste your API key"]')
    await expect(apiKeyInput).not.toBeVisible()
  })
})
