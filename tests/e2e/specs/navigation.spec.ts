import { test, expect } from '../coverage-fixture'

test.describe('Navigation', () => {
  test('should show sidebar with three navigation buttons', async ({ window }) => {
    const navButtons = window.locator('nav button')
    await expect(navButtons).toHaveCount(3, { timeout: 10000 })
  })

  test('should default to Resumes view', async ({ window }) => {
    const resumesBtn = window.locator('nav button').nth(1)
    await expect(resumesBtn).toHaveClass(/border-primary/, { timeout: 5000 })
    // Resumes heading should be visible
    await expect(window.locator('h2', { hasText: 'CVs' })).toBeVisible()
  })

  test('should navigate to Profile view', async ({ window }) => {
    const profileBtn = window.locator('nav button').nth(0)
    await profileBtn.click()
    await expect(profileBtn).toHaveClass(/border-primary/, { timeout: 3000 })
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible()
  })

  test('should navigate to Settings view', async ({ window }) => {
    const settingsBtn = window.locator('nav button').nth(2)
    await settingsBtn.click()
    await expect(settingsBtn).toHaveClass(/border-primary/, { timeout: 3000 })
    await expect(window.locator('h2', { hasText: 'Settings' })).toBeVisible()
  })

  test('should navigate between all views sequentially', async ({ window }) => {
    const profileBtn = window.locator('nav button').nth(0)
    const resumesBtn = window.locator('nav button').nth(1)
    const settingsBtn = window.locator('nav button').nth(2)

    // Profile
    await profileBtn.click()
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible()

    // Settings
    await settingsBtn.click()
    await expect(window.locator('h2', { hasText: 'Settings' })).toBeVisible()

    // Resumes
    await resumesBtn.click()
    await expect(window.locator('h2', { hasText: 'CVs' })).toBeVisible()

    // Back to Profile
    await profileBtn.click()
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible()
  })

  test('should display app title in sidebar', async ({ window }) => {
    await expect(window.locator('aside span', { hasText: 'CV Assistant' })).toBeVisible()
  })
})
