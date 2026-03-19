import { test, expect } from '../coverage-fixture'

test.describe('Profile View', () => {
  test.beforeEach(async ({ window }) => {
    // Navigate to Profile view
    const profileBtn = window.locator('nav button').nth(0)
    await profileBtn.click()
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
  })

  test('should display personal info section', async ({ window }) => {
    await expect(window.locator('text=Personal Info')).toBeVisible()
    await expect(window.locator('text=Full Name')).toBeVisible()
    await expect(window.locator('text=Email')).toBeVisible()
    await expect(window.locator('text=Phone')).toBeVisible()
  })

  test('should auto-save profile changes', async ({ window }) => {
    const nameInput = window.locator('input[placeholder="John Doe"]')
    const originalValue = await nameInput.inputValue()
    const testValue = `AutoSave_${Date.now()}`

    await nameInput.fill(testValue)

    // Wait for debounce (500ms) + save to complete
    await window.waitForTimeout(1500)

    // Reload the page to verify persistence
    await window.reload()
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })

    const savedValue = await nameInput.inputValue()
    expect(savedValue).toBe(testValue)

    // Restore original value
    if (originalValue) {
      await nameInput.fill(originalValue)
      await window.waitForTimeout(1500)
    }
  })

  test('should fill personal info fields', async ({ window }) => {
    const nameInput = window.locator('input[placeholder="John Doe"]')
    const emailInput = window.locator('input[placeholder="john@example.com"]')
    const phoneInput = window.locator('input[placeholder="+1 (555) 000-0000"]')

    await nameInput.fill('Jane Smith')
    await expect(nameInput).toHaveValue('Jane Smith')

    await emailInput.fill('jane@example.com')
    await expect(emailInput).toHaveValue('jane@example.com')

    await phoneInput.fill('+1 (555) 123-4567')
    await expect(phoneInput).toHaveValue('+1 (555) 123-4567')
  })

  test('should show empty work experience state', async ({ window }) => {
    await expect(window.getByText('Work Experience', { exact: true })).toBeVisible()
    // If no work experience exists, show empty message
    const emptyMsg = window.locator('text=No work experience added yet.')
    const addBtn = window.locator('button', { hasText: 'Add Experience' })
    await expect(addBtn).toBeVisible()

    // Check for either empty state or existing entries
    const experienceEntries = window.locator('.border.rounded-lg').filter({
      has: window.locator('input[placeholder="Company Name"]')
    })
    const count = await experienceEntries.count()
    if (count === 0) {
      await expect(emptyMsg).toBeVisible()
    }
  })

  test('should add and fill work experience entry', async ({ window }) => {
    const addExpBtn = window.locator('button', { hasText: 'Add Experience' })
    await addExpBtn.click()

    // Wait for the new entry to appear
    const companyInput = window.locator('input[placeholder="Company Name"]').last()
    await expect(companyInput).toBeVisible({ timeout: 5000 })

    await companyInput.fill('Acme Corp')
    await expect(companyInput).toHaveValue('Acme Corp')

    const roleInput = window.locator('input[placeholder="Job Title"]').last()
    await roleInput.fill('Software Engineer')
    await expect(roleInput).toHaveValue('Software Engineer')

    const dateInput = window.locator('input[placeholder="e.g. Jan 2020 - Present"]').last()
    await dateInput.fill('Jan 2022 - Present')
    await expect(dateInput).toHaveValue('Jan 2022 - Present')
  })

  test('should remove work experience entry', async ({ window }) => {
    // Add an entry first
    const addExpBtn = window.locator('button', { hasText: 'Add Experience' })
    await addExpBtn.click()

    const companyInput = window.locator('input[placeholder="Company Name"]').last()
    await expect(companyInput).toBeVisible({ timeout: 5000 })

    // Count entries before removal
    const entriesBefore = await window.locator('input[placeholder="Company Name"]').count()

    // Click the last Remove button
    const removeBtn = window.locator('button', { hasText: 'Remove' }).last()
    await removeBtn.click()

    // Count entries after removal
    const entriesAfter = await window.locator('input[placeholder="Company Name"]').count()
    expect(entriesAfter).toBeLessThan(entriesBefore)
  })

  test('should show empty projects state', async ({ window }) => {
    await expect(window.getByText('Projects', { exact: true })).toBeVisible()
    const addBtn = window.locator('button', { hasText: 'Add Project' })
    await expect(addBtn).toBeVisible()

    const projectEntries = window.locator('.border.rounded-lg').filter({
      has: window.locator('input[placeholder="Project Name"]')
    })
    const count = await projectEntries.count()
    if (count === 0) {
      await expect(window.locator('text=No projects added yet.')).toBeVisible()
    }
  })

  test('should add and fill project entry', async ({ window }) => {
    const addProjBtn = window.locator('button', { hasText: 'Add Project' })
    await addProjBtn.click()

    const nameInput = window.locator('input[placeholder="Project Name"]').last()
    await expect(nameInput).toBeVisible({ timeout: 5000 })

    await nameInput.fill('My Project')
    await expect(nameInput).toHaveValue('My Project')

    const techInput = window.locator('input[placeholder="React, TypeScript, Node.js"]').last()
    await techInput.fill('React, Playwright')
    await expect(techInput).toHaveValue('React, Playwright')
  })

  test('should remove project entry', async ({ window }) => {
    const addProjBtn = window.locator('button', { hasText: 'Add Project' })
    await addProjBtn.click()

    const nameInput = window.locator('input[placeholder="Project Name"]').last()
    await expect(nameInput).toBeVisible({ timeout: 5000 })

    const entriesBefore = await window.locator('input[placeholder="Project Name"]').count()

    // Remove buttons for projects section - find ones near project inputs
    const removeBtn = window.locator('button', { hasText: 'Remove' }).last()
    await removeBtn.click()

    const entriesAfter = await window.locator('input[placeholder="Project Name"]').count()
    expect(entriesAfter).toBeLessThan(entriesBefore)
  })

  test('should persist profile data after auto-save', async ({ window }) => {
    const nameInput = window.locator('input[placeholder="John Doe"]')
    await nameInput.fill('E2E Persist Test')

    // Wait for debounce + save
    await window.waitForTimeout(1500)

    // Navigate away and back
    const resumesBtn = window.locator('nav button').nth(1)
    await resumesBtn.click()
    await window.waitForTimeout(500)

    const profileBtn = window.locator('nav button').nth(0)
    await profileBtn.click()
    await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })

    // Verify data persisted
    await expect(nameInput).toHaveValue('E2E Persist Test')
  })
})
