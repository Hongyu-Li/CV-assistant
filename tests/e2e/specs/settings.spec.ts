import { test, expect } from '../coverage-fixture'

test.describe('Settings View', () => {
  test.beforeEach(async ({ window }) => {
    const settingsBtn = window.locator('nav button').nth(2)
    await settingsBtn.click()
    await expect(window.locator('h2', { hasText: 'Settings' })).toBeVisible({ timeout: 10000 })
  })

  test('should display all settings sections', async ({ window }) => {
    await expect(window.locator('text=General').first()).toBeVisible()
    await expect(window.locator('text=AI Provider').first()).toBeVisible()
    await expect(window.locator('text=Version').first()).toBeVisible()
  })

  test('should display workspace directory with buttons', async ({ window }) => {
    await expect(window.locator('text=Workspace Directory')).toBeVisible()
    await expect(window.locator('button', { hasText: 'Change...' })).toBeVisible()
    await expect(window.locator('button', { hasText: 'Open Folder' })).toBeVisible()
  })

  test('should display theme selector with all options', async ({ window }) => {
    await expect(window.locator('text=Theme').first()).toBeVisible()

    // Click the theme select trigger
    const themeSelect = window
      .locator('label', { hasText: 'Theme' })
      .locator('..')
      .locator('button[role="combobox"]')
    await themeSelect.click()

    // Options should be visible
    await expect(window.locator('[role="option"]', { hasText: 'Light' })).toBeVisible({
      timeout: 3000
    })
    await expect(window.locator('[role="option"]', { hasText: 'Dark' })).toBeVisible()
    await expect(window.locator('[role="option"]', { hasText: 'System' })).toBeVisible()

    // Press Escape to close
    await window.keyboard.press('Escape')
  })

  test('should change theme', async ({ window }) => {
    // Open theme selector
    const themeSelect = window
      .locator('label', { hasText: 'Theme' })
      .locator('..')
      .locator('button[role="combobox"]')
    await themeSelect.click()

    // Select Dark
    await window.locator('[role="option"]', { hasText: 'Dark' }).click()

    // Verify document has dark class or data attribute
    // The theme change should persist
    await window.waitForTimeout(500)

    // Change back to System
    await themeSelect.click()
    await window.locator('[role="option"]', { hasText: 'System' }).click()
  })

  test('should display language selector', async ({ window }) => {
    await expect(window.locator('text=Language').first()).toBeVisible()

    const langSelect = window
      .locator('label', { hasText: 'Language' })
      .locator('..')
      .locator('button[role="combobox"]')
    await langSelect.click()

    await expect(window.locator('[role="option"]', { hasText: 'English' })).toBeVisible({
      timeout: 3000
    })
    await expect(window.locator('[role="option"]', { hasText: '中文' })).toBeVisible()

    await window.keyboard.press('Escape')
  })

  test('should switch language to Chinese and back', async ({ window }) => {
    const langSelect = window
      .locator('label', { hasText: 'Language' })
      .locator('..')
      .locator('button[role="combobox"]')
    await langSelect.click()

    // Switch to Chinese
    await window.locator('[role="option"]', { hasText: '中文' }).click()
    await window.waitForTimeout(500)

    // Verify some Chinese text appears (Settings title should change)
    // The settings title becomes "设置" in Chinese
    await expect(window.locator('h2', { hasText: '设置' })).toBeVisible({ timeout: 5000 })

    // Switch back to English
    // The language label is now in Chinese, but the select trigger should still work
    const langSelectChinese = window.locator('button[role="combobox"]').nth(1)
    await langSelectChinese.click()
    await window.locator('[role="option"]', { hasText: 'English' }).click()
    await window.waitForTimeout(500)

    await expect(window.locator('h2', { hasText: 'Settings' })).toBeVisible({ timeout: 5000 })
  })

  test('should display AI provider selector with all providers', async ({ window }) => {
    await expect(window.locator('text=Provider').first()).toBeVisible()

    // Find the provider select - it's in the AI Provider card
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()

    // Check some key providers are listed
    await expect(window.locator('[role="option"]', { hasText: 'OpenAI' })).toBeVisible({
      timeout: 3000
    })
    await expect(window.locator('[role="option"]', { hasText: 'Anthropic' })).toBeVisible()
    await expect(window.locator('[role="option"]', { hasText: 'DeepSeek' })).toBeVisible()
    await expect(window.locator('[role="option"]', { hasText: 'Ollama (Local)' })).toBeVisible()

    await window.keyboard.press('Escape')
  })

  test('should change AI provider and update model/baseUrl', async ({ window }) => {
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()

    // Select Anthropic
    await window.locator('[role="option"]', { hasText: 'Anthropic' }).click()
    await window.waitForTimeout(500)

    // Model should update to Anthropic's default
    const modelInput = window.locator('input[placeholder="Model name"]')
    const modelValue = await modelInput.inputValue()
    expect(modelValue).toContain('claude')

    // Switch back to OpenAI
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'OpenAI' }).click()
    await window.waitForTimeout(500)

    const updatedModel = await modelInput.inputValue()
    expect(updatedModel).toContain('gpt')
  })

  test('should show API key field for providers that require it', async ({ window }) => {
    // OpenAI requires an API key
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'OpenAI' }).click()
    await window.waitForTimeout(500)

    // API key field should be visible
    await expect(window.locator('text=API Key').first()).toBeVisible()
    const apiKeyInput = window.locator('input[placeholder="sk-..."]')
    await expect(apiKeyInput).toBeVisible()
    await expect(apiKeyInput).toHaveAttribute('type', 'password')
  })

  test('should toggle API key visibility', async ({ window }) => {
    // Ensure we're on a provider that requires API key
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'OpenAI' }).click()
    await window.waitForTimeout(500)

    const apiKeyInput = window.locator('input[placeholder="sk-..."]')

    // Initially password type
    await expect(apiKeyInput).toHaveAttribute('type', 'password')

    // Click the eye toggle button (it's next to the API key input)
    const toggleBtn = window
      .locator('input[placeholder="sk-..."]')
      .locator('..')
      .locator('..')
      .locator('button')
    await toggleBtn.click()

    // Should now be text type
    await expect(apiKeyInput).toHaveAttribute('type', 'text')

    // Click again to hide
    await toggleBtn.click()
    await expect(apiKeyInput).toHaveAttribute('type', 'password')
  })

  test('should hide API key field for Ollama (no key required)', async ({ window }) => {
    const providerSelect = window
      .locator('label', { hasText: /^Provider$/ })
      .locator('..')
      .locator('button[role="combobox"]')
    await providerSelect.click()
    await window.locator('[role="option"]', { hasText: 'Ollama (Local)' }).click()
    await window.waitForTimeout(500)

    // API key field should NOT be visible for Ollama
    const apiKeyInput = window.locator('input[placeholder="sk-..."]')
    await expect(apiKeyInput).not.toBeVisible()
  })

  test('should display model and base URL inputs', async ({ window }) => {
    await expect(window.locator('text=Model').first()).toBeVisible()
    await expect(window.locator('input[placeholder="Model name"]')).toBeVisible()

    await expect(window.locator('text=Base URL').first()).toBeVisible()
    await expect(window.locator('input[placeholder="https://api.openai.com/v1"]')).toBeVisible()
  })

  test('should edit model name', async ({ window }) => {
    const modelInput = window.locator('input[placeholder="Model name"]')
    await modelInput.fill('custom-model-v1')
    await expect(modelInput).toHaveValue('custom-model-v1')
  })

  test('should display Test Connection button', async ({ window }) => {
    await expect(window.locator('button', { hasText: 'Test Connection' })).toBeVisible()
  })

  test('should display version section', async ({ window }) => {
    await expect(window.locator('text=Version').first()).toBeVisible()
    await expect(window.locator('text=Current Version')).toBeVisible()
  })
})
