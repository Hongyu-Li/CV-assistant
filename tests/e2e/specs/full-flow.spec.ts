import { test, expect } from '../coverage-fixture'

test.describe('Full User Flow', () => {
  test('should complete full workflow: profile → resume → interview → CV', async ({ window }) => {
    // ──────────────────────────────────────────────────────────────
    // Phase 0: Save original profile & clean stale test data
    // ──────────────────────────────────────────────────────────────
    const originalProfile = await window.evaluate(() =>
      window.electron.ipcRenderer.invoke('profile:load')
    )

    // Use a unique job title to avoid collisions with leftover data
    const uniqueJobTitle = `Full Flow Test Engineer ${Date.now()}`

    // Clean up any leftover resumes from previous failed runs
    const staleResumes = await window.evaluate(() => window.electron.ipcRenderer.invoke('cv:list'))
    if (Array.isArray(staleResumes)) {
      for (const r of staleResumes) {
        if ((r as { jobTitle?: string }).jobTitle?.startsWith('Full Flow Test Engineer')) {
          await window.evaluate(
            (f: string) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
            (r as { filename: string }).filename
          )
        }
      }
    }

    // Track resume filename for IPC-based cleanup
    let resumeFilename = ''

    try {
      // ──────────────────────────────────────────────────────────────
      // Phase 1: Profile Setup (seed via IPC, verify UI, add entries via UI)
      // ──────────────────────────────────────────────────────────────

      // Seed profile via IPC to avoid auto-save race conditions
      const seededProfile = {
        ...originalProfile,
        personalInfo: {
          ...(originalProfile?.personalInfo ?? {}),
          name: 'Full Flow Tester',
          email: 'fullflow@e2e.test',
          phone: '+1 (555) 999-0000'
        }
      }
      await window.evaluate(
        (data: Record<string, unknown>) => window.electron.ipcRenderer.invoke('profile:save', data),
        seededProfile
      )

      // Navigate to Profile and verify seeded values loaded
      const profileBtn = window.locator('nav button').nth(0)
      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })

      await expect(window.locator('input[placeholder="John Doe"]')).toHaveValue(
        'Full Flow Tester',
        { timeout: 10000 }
      )
      await expect(window.locator('input[placeholder="john@example.com"]')).toHaveValue(
        'fullflow@e2e.test',
        { timeout: 5000 }
      )
      await expect(window.locator('input[placeholder="+1 (555) 000-0000"]')).toHaveValue(
        '+1 (555) 999-0000',
        { timeout: 5000 }
      )

      // Add a work experience entry via UI
      const addExpBtn = window.locator('button', { hasText: 'Add Experience' })
      await addExpBtn.click()

      const companyInput = window.locator('input[placeholder="Company Name"]').last()
      await expect(companyInput).toBeVisible({ timeout: 5000 })
      await companyInput.fill('FlowTest Inc')
      await expect(companyInput).toHaveValue('FlowTest Inc')

      const roleInput = window.locator('input[placeholder="Job Title"]').last()
      await roleInput.fill('Lead Engineer')
      await expect(roleInput).toHaveValue('Lead Engineer')

      const workDateInput = window.locator('input[placeholder="e.g. Jan 2020 - Present"]').last()
      await workDateInput.fill('Mar 2023 - Present')
      await expect(workDateInput).toHaveValue('Mar 2023 - Present')

      // MarkdownEditor uses Tiptap ProseMirror (contenteditable div), not textarea
      const workDescEditor = window.locator('.ProseMirror').last()
      await workDescEditor.click()
      await workDescEditor.type('Led cross-functional engineering team of 8')
      await expect(workDescEditor).toContainText('Led cross-functional engineering team of 8')

      // Add an education entry via UI
      const addEduBtn = window.locator('button', { hasText: 'Add Education' })
      await addEduBtn.click()

      const schoolInput = window
        .locator('input[placeholder="University or institution name"]')
        .last()
      await expect(schoolInput).toBeVisible({ timeout: 5000 })
      await schoolInput.fill('E2E University')
      await expect(schoolInput).toHaveValue('E2E University')

      const degreeInput = window.locator('input[placeholder="e.g. B.S. Computer Science"]').last()
      await degreeInput.fill('M.S. Software Engineering')
      await expect(degreeInput).toHaveValue('M.S. Software Engineering')

      const eduDateInput = window.locator('input[placeholder="e.g. Jan 2020 - Present"]').last()
      await eduDateInput.fill('Sep 2019 - Jun 2021')
      await expect(eduDateInput).toHaveValue('Sep 2019 - Jun 2021')

      const eduDescEditor = window.locator('.ProseMirror').last()
      await eduDescEditor.click()
      await eduDescEditor.type('Specialized in distributed systems and software architecture')
      await expect(eduDescEditor).toContainText(
        'Specialized in distributed systems and software architecture'
      )

      // Add a project entry via UI
      const addProjBtn = window.locator('button', { hasText: 'Add Project' })
      await addProjBtn.click()

      const projNameInput = window.locator('input[placeholder="Project Name"]').last()
      await expect(projNameInput).toBeVisible({ timeout: 5000 })
      await projNameInput.fill('E2E Dashboard')
      await expect(projNameInput).toHaveValue('E2E Dashboard')

      const techInput = window.locator('input[placeholder="React, TypeScript, Node.js"]').last()
      await techInput.fill('Playwright, Electron, React')
      await expect(techInput).toHaveValue('Playwright, Electron, React')

      const projDescEditor = window.locator('.ProseMirror').last()
      await projDescEditor.click()
      await projDescEditor.type('Built an automated testing dashboard for CI/CD pipelines')
      await expect(projDescEditor).toContainText(
        'Built an automated testing dashboard for CI/CD pipelines'
      )

      // Wait for auto-save debounce
      await window.waitForTimeout(1500)

      // Verify persistence: navigate away then back
      const resumesBtn = window.locator('nav button').nth(1)
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      await profileBtn.click()
      await expect(window.locator('h2', { hasText: 'Profile' })).toBeVisible({ timeout: 10000 })

      await expect(window.locator('input[placeholder="John Doe"]')).toHaveValue(
        'Full Flow Tester',
        { timeout: 10000 }
      )
      await expect(window.locator('input[placeholder="john@example.com"]')).toHaveValue(
        'fullflow@e2e.test',
        { timeout: 5000 }
      )

      // ──────────────────────────────────────────────────────────────
      // Phase 2: Create and Save Resume
      // ──────────────────────────────────────────────────────────────
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      const newResumeBtn = window.locator('button', { hasText: 'New Resume' })
      await newResumeBtn.click()

      const dialog = window.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('text=Create Resume')).toBeVisible()

      // Fill all form fields
      const jobTitleInput = dialog.locator('input[placeholder="e.g. Software Engineer"]')
      await jobTitleInput.fill(uniqueJobTitle)
      await expect(jobTitleInput).toHaveValue(uniqueJobTitle)

      const resumeCompanyInput = dialog.locator('input[placeholder="e.g. Google"]')
      await resumeCompanyInput.fill('FlowTest Corp')
      await expect(resumeCompanyInput).toHaveValue('FlowTest Corp')

      const salaryInput = dialog.locator('input[placeholder="e.g. $150,000"]')
      await salaryInput.fill('$180,000')
      await expect(salaryInput).toHaveValue('$180,000')

      const notesTextarea = dialog.locator('textarea[placeholder="Any additional notes..."]')
      await notesTextarea.fill('Full flow e2e test notes')
      await expect(notesTextarea).toHaveValue('Full flow e2e test notes')

      const jdTextarea = dialog.locator('textarea[placeholder="Paste the job description here..."]')
      await jdTextarea.fill('We need a test engineer to verify full user flows end-to-end.')
      await expect(jdTextarea).toHaveValue(
        'We need a test engineer to verify full user flows end-to-end.'
      )

      // Click Save (NOT Generate CV)
      const saveBtn = dialog.locator('button', { hasText: 'Save' })
      await saveBtn.click()

      // Dialog should close
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Success toast
      await expect(window.locator('text=Resume saved successfully')).toBeVisible({
        timeout: 5000
      })

      const resumeCard = window.locator('.card-hover').filter({ hasText: uniqueJobTitle }).first()
      await expect(resumeCard).toBeVisible({ timeout: 5000 })

      const resumeList = await window.evaluate(() => window.electron.ipcRenderer.invoke('cv:list'))
      const ourResume = resumeList.find((r: { jobTitle: string }) => r.jobTitle === uniqueJobTitle)
      resumeFilename = ourResume?.filename ?? ''
      expect(resumeFilename).toBeTruthy()

      // ──────────────────────────────────────────────────────────────
      // Phase 3: Edit Resume and Manage Interview
      // ──────────────────────────────────────────────────────────────

      // Click resume card to reopen dialog in edit mode
      await resumeCard.click()
      await expect(dialog).toBeVisible({ timeout: 5000 })
      await expect(dialog.locator('text=Edit Resume')).toBeVisible()

      // Verify form fields are pre-filled
      await expect(dialog.locator('input[placeholder="e.g. Software Engineer"]')).toHaveValue(
        uniqueJobTitle,
        { timeout: 5000 }
      )
      await expect(dialog.locator('input[placeholder="e.g. Google"]')).toHaveValue(
        'FlowTest Corp',
        { timeout: 5000 }
      )
      await expect(dialog.locator('input[placeholder="e.g. $150,000"]')).toHaveValue('$180,000', {
        timeout: 5000
      })

      // Scroll dialog to bottom to reveal Interview Status section
      await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
      await window.waitForTimeout(300)

      const statusLabel = dialog.locator('text=Interview Status')
      await expect(statusLabel).toBeVisible({ timeout: 5000 })
      const statusSection = statusLabel.locator('..')
      const statusTrigger = statusSection.locator('button[role="combobox"]')
      await expect(statusTrigger).toBeVisible({ timeout: 5000 })
      await statusTrigger.click()

      // Radix Select portals options to body — scope to window, not dialog
      const firstInterviewOption = window.locator('[role="option"]', {
        hasText: '1st Interview'
      })
      await expect(firstInterviewOption).toBeVisible({ timeout: 5000 })
      await firstInterviewOption.click()

      // Scroll dialog to reveal Interview Rounds
      await dialog.evaluate((el) => (el.scrollTop = el.scrollHeight))
      await window.waitForTimeout(300)

      const roundsToggle = dialog.locator('button', { hasText: 'Interview Rounds' })
      await expect(roundsToggle).toBeVisible({ timeout: 5000 })
      await roundsToggle.click()

      // Add an interview round
      const addRoundBtn = dialog.locator('button', { hasText: 'Add Interview Round' })
      await expect(addRoundBtn).toBeVisible({ timeout: 5000 })
      await addRoundBtn.click()

      // Round dialog appears (nested, filtered by text)
      const roundDialog = window
        .locator('[role="dialog"]')
        .filter({ hasText: 'Edit Interview Round' })
      await expect(roundDialog).toBeVisible({ timeout: 5000 })

      // Fill date
      const roundDateInput = roundDialog.locator('input[type="date"]')
      await roundDateInput.fill('2025-07-01')

      // Fill notes (MarkdownEditor uses Tiptap/ProseMirror, not textarea)
      const roundNotesEditor = roundDialog.locator('.ProseMirror').last()
      await roundNotesEditor.scrollIntoViewIfNeeded()
      await roundNotesEditor.click()
      await roundNotesEditor.type('First round technical interview')

      // Save the round
      const saveRoundBtn = roundDialog.locator('button', { hasText: 'Save' })
      await saveRoundBtn.click()
      await expect(roundDialog).not.toBeVisible({ timeout: 5000 })

      // Verify round appears in timeline
      await expect(dialog.locator('text=1st Round')).toBeVisible({ timeout: 5000 })

      // Save the resume
      const editSaveBtn = dialog.locator('button', { hasText: 'Save' })
      await editSaveBtn.click()
      await expect(dialog).not.toBeVisible({ timeout: 5000 })

      // Verify card shows "1st Interview" badge
      const updatedCard = window.locator('.card-hover').filter({ hasText: uniqueJobTitle }).first()
      await expect(updatedCard.locator('text=1st Interview')).toBeVisible({ timeout: 5000 })

      // ──────────────────────────────────────────────────────────────
      // Phase 4: Verify Generated CV Section (IPC-seeded)
      // ──────────────────────────────────────────────────────────────

      // Seed generatedCV via IPC (no real AI call)
      if (resumeFilename) {
        await window.evaluate(
          (f: string) =>
            window.electron.ipcRenderer
              .invoke('cv:read', { filename: f })
              .then((result: { success: boolean; data: Record<string, unknown> }) =>
                window.electron.ipcRenderer.invoke('cv:save', {
                  filename: f,
                  data: {
                    ...result.data,
                    generatedCV: '# Full Flow Test CV\n\nGenerated content for e2e testing.',
                    status: 'generated'
                  }
                })
              ),
          resumeFilename
        )
      }

      // Re-navigate to Resumes to refresh list
      await resumesBtn.click()
      await expect(window.locator('h2', { hasText: 'Resumes' })).toBeVisible({ timeout: 10000 })

      // Click the card again
      const cvCard = window.locator('.card-hover').filter({ hasText: uniqueJobTitle }).first()
      await expect(cvCard).toBeVisible({ timeout: 5000 })
      await cvCard.click()

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
      // ──────────────────────────────────────────────────────────────
      // Phase 5: Cleanup (always runs, even on test failure)
      // ──────────────────────────────────────────────────────────────

      if (resumeFilename) {
        await window.evaluate(
          (f: string) => window.electron.ipcRenderer.invoke('cv:delete', { filename: f }),
          resumeFilename
        )
      }

      // Restore original profile via IPC
      if (originalProfile) {
        await window.evaluate(
          (data: Record<string, unknown>) =>
            window.electron.ipcRenderer.invoke('profile:save', data),
          originalProfile
        )
      }
    }
  })
})
