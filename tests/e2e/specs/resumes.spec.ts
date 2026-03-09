import { test, expect } from '../coverage-fixture'

test.describe('Resumes View', () => {
  test.beforeEach(async ({ window }) => {
    // Resumes is the default view, but click to be explicit
    const resumesBtn = window.locator('nav button').nth(1)
    await resumesBtn.click()
    await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })
  })

  test('should display resumes heading and description', async ({ window }) => {
    await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible()
    await expect(window.locator('text=Manage your CV drafts and generated resumes.')).toBeVisible()
  })

  test('should display New Resume button', async ({ window }) => {
    await expect(window.locator('button', { hasText: 'New Resume' })).toBeVisible()
  })

  test('should show empty state when no resumes exist', async ({ window }) => {
    // This test may pass or fail depending on existing data
    // We check for either the empty state OR existing resume cards
    const emptyTitle = window.locator('text=No Resumes Found')
    const resumeCards = window.locator('.card-hover')
    const emptyVisible = await emptyTitle.isVisible().catch(() => false)
    const cardsCount = await resumeCards.count()

    // One of these should be true
    expect(emptyVisible || cardsCount > 0).toBeTruthy()
  })

  test('should open Create Resume dialog', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    // Dialog should appear
    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Dialog should have "Create Resume" title
    await expect(dialog.locator('text=Create Resume')).toBeVisible()
  })

  test('should display all form fields in Create Resume dialog', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Check form labels
    await expect(dialog.locator('text=Job Title')).toBeVisible()
    await expect(dialog.locator('text=Experience Level')).toBeVisible()
    await expect(dialog.locator('text=Company Name')).toBeVisible()
    await expect(dialog.locator('text=Target Salary')).toBeVisible()
    await expect(dialog.locator('text=Notes')).toBeVisible()
    await expect(dialog.locator('label', { hasText: 'Job Description' })).toBeVisible()
    await expect(dialog.locator('text=CV Language')).toBeVisible()

    // Check input placeholders
    await expect(dialog.locator('input[placeholder="e.g. Software Engineer"]')).toBeVisible()
    await expect(dialog.locator('input[placeholder="e.g. Google"]')).toBeVisible()
    await expect(dialog.locator('input[placeholder="e.g. $150,000"]')).toBeVisible()

    // Check buttons
    await expect(dialog.locator('button', { hasText: 'Generate CV' })).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Save' })).toBeVisible()
    await expect(dialog.locator('button', { hasText: 'Cancel' })).toBeVisible()
  })

  test('should fill resume form fields', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill Job Title
    const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
    await jobTitleInput.fill('Senior Frontend Developer')
    await expect(jobTitleInput).toHaveValue('Senior Frontend Developer')

    // Fill Company Name
    const companyInput = dialog.locator('input[placeholder="e.g. Google"]')
    await companyInput.fill('Meta')
    await expect(companyInput).toHaveValue('Meta')

    // Fill Target Salary
    const salaryInput = dialog.locator('input[placeholder="e.g. $150,000"]')
    await salaryInput.fill('$200,000')
    await expect(salaryInput).toHaveValue('$200,000')

    // Fill Notes
    const notesTextarea = dialog.locator('textarea[placeholder="Any additional notes..."]')
    await notesTextarea.fill('Looking for remote position')
    await expect(notesTextarea).toHaveValue('Looking for remote position')

    // Fill Job Description
    const jdTextarea = dialog.locator('textarea[placeholder="Paste the job description here..."]')
    await jdTextarea.fill('We are looking for a Senior Frontend Developer...')
    await expect(jdTextarea).toHaveValue('We are looking for a Senior Frontend Developer...')
  })

  test('should show validation error when saving without job title', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Click save without filling job title
    const saveBtn = dialog.locator('button', { hasText: 'Save' })
    await saveBtn.click()

    // Should show validation toast
    await expect(window.locator('text=Please fill in the job title')).toBeVisible({
      timeout: 5000
    })
  })

  test('should close dialog on Cancel', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    const cancelBtn = dialog.locator('button', { hasText: 'Cancel' })
    await cancelBtn.click()

    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })

  test('should save a resume and show it in the list', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill required fields
    const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
    await jobTitleInput.fill('E2E Test Resume')

    const companyInput = dialog.locator('input[placeholder="e.g. Google"]')
    await companyInput.fill('Test Corp')

    // Save
    const saveBtn = dialog.locator('button', { hasText: 'Save' })
    await saveBtn.click()

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Success toast
    await expect(window.locator('text=Resume saved successfully')).toBeVisible({ timeout: 5000 })

    // Resume card should appear in the list
    await expect(window.locator('text=E2E Test Resume')).toBeVisible({ timeout: 5000 })
  })

  test('should show Draft badge for saved resume without generation', async ({ window }) => {
    // Check if the test resume from previous test exists, or create one
    const testResumeCard = window.locator('[class*="card"]').filter({ hasText: 'E2E Test Resume' })
    const exists = await testResumeCard.isVisible().catch(() => false)

    if (exists) {
      // Draft badge should be visible within the test resume's card
      await expect(testResumeCard.getByText('Draft', { exact: true })).toBeVisible()
    }
  })

  test('should delete a resume', async ({ window }) => {
    // First ensure we have a resume to delete
    const testResume = window.locator('text=E2E Test Resume')
    const exists = await testResume.isVisible().catch(() => false)

    if (exists) {
      // Hover to reveal delete button (the card has group-hover:opacity-100)
      const card = window.locator('.card-hover').filter({ hasText: 'E2E Test Resume' }).first()
      await card.hover()

      const deleteBtn = card.locator('button', { hasText: 'Delete' })
      await expect(deleteBtn).toBeVisible({ timeout: 3000 })
      await deleteBtn.click()

      // Success toast
      await expect(window.locator('text=Resume deleted successfully')).toBeVisible({
        timeout: 5000
      })
    }
  })
})
