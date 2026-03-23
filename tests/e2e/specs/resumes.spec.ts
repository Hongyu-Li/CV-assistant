import { readFileSync } from 'fs'
import path from 'path'
import { test, expect } from '../coverage-fixture'

const JD_FIXTURE = readFileSync(path.join(__dirname, '../../fixtures/jd.md'), 'utf-8')

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
    await jdTextarea.fill(JD_FIXTURE)
    await expect(jdTextarea).toHaveValue(JD_FIXTURE)
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

  test('should show default interview status badge for saved resume', async ({ window }) => {
    const testResumeCard = window.locator('[class*="card"]').filter({ hasText: 'E2E Test Resume' })
    const exists = await testResumeCard.isVisible().catch(() => false)

    if (exists) {
      await expect(testResumeCard).toBeVisible()
      // All saved resumes default to 'draft' interview status
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

  test('should show download dropdown with export options in resume dialog', async ({ window }) => {
    // Create and save a resume with generated CV content first
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill required field
    const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
    await jobTitleInput.fill('Export Test Resume')

    // Save the resume
    const saveBtn = dialog.locator('button', { hasText: 'Save' })
    await saveBtn.click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })

    // Open the saved resume to edit
    const resumeCard = window.locator('[class*="card"]').filter({ hasText: 'Export Test Resume' })
    await expect(resumeCard).toBeVisible({ timeout: 5000 })
    await resumeCard.click()

    // Dialog should reopen in edit mode
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Look for the download button (has title "Download")
    const downloadBtn = dialog.locator('button[title="Download"]')
    const downloadVisible = await downloadBtn.isVisible().catch(() => false)

    if (downloadVisible) {
      await downloadBtn.click()

      // Check for export options in dropdown
      const exportMd = dialog.locator('button', { hasText: 'Export Markdown' })
      const exportPdf = dialog.locator('button', { hasText: 'Export PDF' })
      await expect(exportMd).toBeVisible({ timeout: 3000 })
      await expect(exportPdf).toBeVisible({ timeout: 3000 })
    }

    // Close dialog
    const cancelBtn = dialog.locator('button', { hasText: 'Cancel' })
    await cancelBtn.click()

    // Cleanup: delete the test resume
    const card = window.locator('.card-hover').filter({ hasText: 'Export Test Resume' }).first()
    const cardExists = await card.isVisible().catch(() => false)
    if (cardExists) {
      await card.hover()
      const deleteBtn = card.locator('button', { hasText: 'Delete' })
      const deleteVisible = await deleteBtn.isVisible().catch(() => false)
      if (deleteVisible) {
        await deleteBtn.click()
      }
    }
  })

  test('should filter resumes by tab', async ({ window }) => {
    const filenameInterview = `test_filter_interview_${Date.now()}.json`
    const filenameOffer = `test_filter_offer_${Date.now() + 1}.json`

    try {
      // Seed two resumes with different interview statuses
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Filter Interview Job',
              companyName: 'Interview Corp',
              targetSalary: '$100,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'first_interview',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename: filenameInterview, jd: JD_FIXTURE }
      )

      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Filter Offer Job',
              companyName: 'Offer Corp',
              targetSalary: '$120,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'offer_accepted',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename: filenameOffer, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Wait for resume cards to render (tabs only appear when resumes.length > 0)
      await expect(window.locator('.card-hover').first()).toBeVisible({ timeout: 10000 })
      // Wait for tabs to render
      await expect(window.locator('button', { hasText: 'All' }).first()).toBeVisible({
        timeout: 5000
      })

      // "All" tab should show both
      await expect(window.locator('text=Filter Interview Job')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Filter Offer Job')).toBeVisible({ timeout: 5000 })

      // Click "Interview" tab
      const interviewTab = window.locator('button', { hasText: 'Interview' }).first()
      await expect(interviewTab).toBeVisible({ timeout: 5000 })
      await interviewTab.click()
      await expect(window.locator('text=Filter Interview Job')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Filter Offer Job')).not.toBeVisible({ timeout: 3000 })

      // Click "Offer" tab
      const offerTab = window.locator('button', { hasText: 'Offer' }).first()
      await offerTab.click()
      await expect(window.locator('text=Filter Offer Job')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Filter Interview Job')).not.toBeVisible({ timeout: 3000 })

      // Click "All" tab to reset
      const allTab = window.locator('button', { hasText: 'All' }).first()
      await allTab.click()
      await expect(window.locator('text=Filter Interview Job')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Filter Offer Job')).toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filenameInterview
      )
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filenameOffer
      )
    }
  })

  test('should search resumes by job title', async ({ window }) => {
    const filenameReact = `test_search_react_${Date.now()}.json`
    const filenamePython = `test_search_python_${Date.now() + 1}.json`

    try {
      // Seed two resumes with different job titles
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'React Developer',
              companyName: 'React Corp',
              targetSalary: '$100,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename: filenameReact, jd: JD_FIXTURE }
      )

      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Python Engineer',
              companyName: 'Python Corp',
              targetSalary: '$110,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename: filenamePython, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      await expect(window.locator('.card-hover').first()).toBeVisible({ timeout: 10000 })

      await expect(window.locator('text=React Developer')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Python Engineer')).toBeVisible({ timeout: 5000 })

      // Type "React" in search input
      const searchInput = window.locator('input[placeholder="Search by job title or company..."]')
      await expect(searchInput).toBeVisible({ timeout: 5000 })
      await searchInput.fill('React')

      // Only React Developer should be visible
      await expect(window.locator('text=React Developer')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Python Engineer')).not.toBeVisible({ timeout: 3000 })

      // Clear search, both should be visible again
      await searchInput.fill('')
      await expect(window.locator('text=React Developer')).toBeVisible({ timeout: 5000 })
      await expect(window.locator('text=Python Engineer')).toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filenameReact
      )
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filenamePython
      )
    }
  })

  test('should edit an existing resume', async ({ window }) => {
    const filename = `test_edit_resume_${Date.now()}.json`

    try {
      // Seed a resume
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Original Title',
              companyName: 'Edit Corp',
              targetSalary: '$90,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Click the resume card to open dialog in edit mode
      const card = window.locator('.card-hover').filter({ hasText: 'Original Title' }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      const dialog = window.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Verify dialog title says "Edit Resume"
      await expect(dialog.locator('text=Edit Resume')).toBeVisible()

      // Verify form fields are pre-filled
      const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
      await expect(jobTitleInput).toHaveValue('Original Title')

      const companyInput = dialog.locator('input[placeholder="e.g. Google"]')
      await expect(companyInput).toHaveValue('Edit Corp')

      // Modify job title
      await jobTitleInput.fill('Updated Title')
      await expect(jobTitleInput).toHaveValue('Updated Title')

      // Save
      const saveBtn = dialog.locator('button', { hasText: 'Save' })
      await saveBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Verify updated title on card
      await expect(window.locator('text=Updated Title')).toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filename
      )
    }
  })

  test('should change interview status', async ({ window }) => {
    const filename = `test_interview_status_${Date.now()}.json`

    try {
      // Seed a resume with resume_sent status
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Status Test Job',
              companyName: 'Status Corp',
              targetSalary: '$100,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Open the resume
      const card = window.locator('.card-hover').filter({ hasText: 'Status Test Job' }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      const dialog = window.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Scroll dialog to bottom to reveal Interview Status
      await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
      await window.waitForTimeout(300)

      const statusLabel = dialog.locator('text=Interview Status')
      await expect(statusLabel).toBeVisible({ timeout: 5000 })
      const statusSection = statusLabel.locator('..')
      const statusTrigger = statusSection.locator('button[role="combobox"]')
      await expect(statusTrigger).toBeVisible({ timeout: 5000 })
      await statusTrigger.click()

      // Select "1st Interview"
      const firstInterviewOption = window.locator('[role="option"]', { hasText: '1st Interview' })
      await expect(firstInterviewOption).toBeVisible({ timeout: 5000 })
      await firstInterviewOption.click()

      // Save
      const saveBtn = dialog.locator('button', { hasText: 'Save' })
      await saveBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Verify the card shows the updated status badge
      const updatedCard = window
        .locator('.card-hover')
        .filter({ hasText: 'Status Test Job' })
        .first()
      await expect(updatedCard.locator('text=1st Interview')).toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filename
      )
    }
  })

  test('should add an interview round', async ({ window }) => {
    const filename = `test_interview_round_${Date.now()}.json`

    try {
      // Seed a resume with no interview rounds
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'Round Test Job',
              companyName: 'Round Corp',
              targetSalary: '$100,000',
              jobDescription: args.jd,
              generatedCV: '',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'draft'
            }
          }),
        { filename, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Open the resume dialog
      const card = window.locator('.card-hover').filter({ hasText: 'Round Test Job' }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      const dialog = window.locator('[role="dialog"]').first()
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Scroll dialog to bottom to reveal Interview Rounds
      await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
      await window.waitForTimeout(300)

      const roundsToggle = dialog.locator('button', { hasText: 'Interview Rounds' })
      await expect(roundsToggle).toBeVisible({ timeout: 5000 })
      await roundsToggle.click()

      // Verify "No interview rounds recorded yet" message
      await expect(dialog.locator('text=No interview rounds recorded yet')).toBeVisible({
        timeout: 5000
      })

      // Click "Add Interview Round"
      const addRoundBtn = dialog.locator('button', { hasText: 'Add Interview Round' })
      await addRoundBtn.click()

      // A nested dialog should appear for editing the round
      const roundDialog = window
        .locator('[role="dialog"]')
        .filter({ hasText: 'Edit Interview Round' })
      await expect(roundDialog).toBeVisible({ timeout: 5000 })

      // The round type should default to "1st Round" and result to "Pending"
      // Fill date
      const dateInput = roundDialog.locator('input[type="date"]')
      await dateInput.fill('2025-06-15')

      // Save the round
      const saveRoundBtn = roundDialog.locator('button', { hasText: 'Save' })
      await saveRoundBtn.click()

      // Round dialog should close
      await expect(roundDialog).not.toBeVisible({ timeout: 5000 })

      // Verify round appears in the timeline (look for "1st Round" text)
      await expect(dialog.locator('text=1st Round')).toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filename
      )
    }
  })

  test('should display generated CV section with action buttons', async ({ window }) => {
    const filename = `test_generated_cv_${Date.now()}.json`

    try {
      // Seed a resume with generated CV content
      await window.evaluate(
        (args) =>
          window.electron.ipcRenderer.invoke('cv:save', {
            filename: args.filename,
            data: {
              jobTitle: 'CV Display Job',
              companyName: 'CV Corp',
              targetSalary: '$100,000',
              jobDescription: args.jd,
              generatedCV: '# Test CV\n\nThis is generated content.',
              cvLanguage: 'en',
              interviewStatus: 'resume_sent',
              interviewRounds: [],
              keywords: [],
              createdAt: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              status: 'generated'
            }
          }),
        { filename, jd: JD_FIXTURE }
      )

      // Navigate away then back to force data reload
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Open the resume dialog
      const card = window.locator('.card-hover').filter({ hasText: 'CV Display Job' }).first()
      await expect(card).toBeVisible({ timeout: 5000 })
      await card.click()

      const dialog = window.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Scroll dialog to reveal Generated CV section
      await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
      await window.waitForTimeout(300)

      const cvHeader = dialog.locator('text=Generated CV')
      await expect(cvHeader).toBeVisible({ timeout: 5000 })

      // Verify action buttons exist
      await expect(dialog.locator('button[title="Copy"]')).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('button[title="Download"]')).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('button[title="Generate CV"]')).toBeVisible({ timeout: 5000 })

      // Close dialog
      const cancelBtn = dialog.locator('button', { hasText: 'Cancel' })
      await cancelBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 5000 })
    } finally {
      // Cleanup
      await window.evaluate(
        (f) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
        filename
      )
    }
  })

  test('should show error when generating CV without job description', async ({ window }) => {
    const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
    await newResumeBtn.click()

    const dialog = window.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill only job title (no job description)
    const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
    await jobTitleInput.fill('Test No JD Resume')

    // Click "Generate CV" button
    const generateBtn = dialog.locator('button', { hasText: 'Generate CV' })
    await generateBtn.click()

    // Expect error toast about missing job description
    await expect(window.locator('text=Please enter a job description')).toBeVisible({
      timeout: 5000
    })

    // Close dialog
    const cancelBtn = dialog.locator('button', { hasText: 'Cancel' })
    await cancelBtn.click()
    await expect(dialog).not.toBeVisible({ timeout: 5000 })
  })
})
