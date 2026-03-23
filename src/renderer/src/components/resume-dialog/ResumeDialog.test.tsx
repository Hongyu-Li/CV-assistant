import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { ResumeDialog } from './ResumeDialog'
import type { CV } from './types'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock provider module
vi.mock('../../lib/provider', () => ({
  generateCV: vi.fn(),
  extractKeywordsFromJD: vi.fn(),
  PROVIDER_CONFIGS: {
    openai: {
      label: 'OpenAI',
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5.2',
      requiresApiKey: true
    }
  }
}))

// Mock SettingsContext
vi.mock('../../context/SettingsContext', () => ({
  useSettings: vi.fn((): { settings: Record<string, unknown> } => ({
    settings: {
      provider: 'openai' as const,
      apiKeys: { openai: 'sk-test' },
      model: 'gpt-5.2',
      baseUrl: '',
      theme: 'system' as const,
      language: 'en',
      workspacePath: '/test/workspace'
    }
  }))
}))

// Mock MarkdownEditor as a simple textarea
vi.mock('../MarkdownEditor', () => ({
  MarkdownEditor: ({
    value,
    onChange
  }: {
    value: string
    onChange: (v: string) => void
  }): React.ReactElement => (
    <textarea
      data-testid="markdown-editor"
      value={value}
      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>): void => onChange(e.target.value)}
    />
  )
}))

// Mock electron ipcRenderer
const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSaved: vi.fn()
}

function renderDialog(
  props?: Partial<{
    open: boolean
    onOpenChange: () => void
    onSaved: () => void
    resume: CV | null
  }>
): ReturnType<typeof render> {
  return render(<ResumeDialog {...defaultProps} {...props} />)
}

describe('ResumeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    vi.stubGlobal('crypto', { ...crypto, randomUUID: vi.fn((): string => 'test-uuid-123') })
  })

  it('renders create mode title when no resume prop', () => {
    renderDialog()
    expect(screen.getByText('resumes.create_resume')).toBeInTheDocument()
  })

  it('renders edit mode title with prefilled values when resume prop passed', async () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      jobTitle: 'Frontend Dev',
      experienceLevel: 'senior',
      companyName: 'Acme',
      targetSalary: '100k',
      notes: 'Some notes',
      jobDescription: 'Build things',
      generatedCV: '# Resume',
      cvLanguage: 'en'
    }
    renderDialog({ resume })

    expect(screen.getByText('resumes.edit_resume')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Frontend Dev')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Acme')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100k')).toBeInTheDocument()

    fireEvent.click(screen.getByText('resumes.generated_cv'))
    await waitFor(() => {
      expect(screen.getByDisplayValue('Some notes')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Build things')).toBeInTheDocument()
    })
  })

  it('renders all form field labels', () => {
    renderDialog()

    expect(screen.getByText('resumes.job_title')).toBeInTheDocument()
    expect(screen.getByText('resumes.exp_level')).toBeInTheDocument()
    expect(screen.getByText('resumes.company_name')).toBeInTheDocument()
    expect(screen.getByText('resumes.target_salary')).toBeInTheDocument()
    expect(screen.getByText('resumes.notes')).toBeInTheDocument()
    expect(screen.getByText('resumes.job_description')).toBeInTheDocument()
    expect(screen.getByText('resumes.cv_language')).toBeInTheDocument()
  })

  it('shows validation error toast when saving with empty job title', async () => {
    renderDialog()

    const saveButton = screen.getByText('resumes.save')
    fireEvent.click(saveButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.validation_error')
    })
  })

  it('calls IPC cv:save with correct data shape on save', async () => {
    mockInvoke.mockResolvedValue({ success: true })
    renderDialog()

    const jobTitleInput = screen.getByPlaceholderText('resumes.job_title_ph')
    fireEvent.change(jobTitleInput, { target: { value: 'Engineer' } })

    const saveButton = screen.getByText('resumes.save')
    fireEvent.click(saveButton)

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'cv:save',
        expect.objectContaining({
          filename: expect.any(String),
          data: expect.objectContaining({
            jobTitle: 'Engineer',
            experienceLevel: '',
            companyName: '',
            targetSalary: '',
            notes: '',
            jobDescription: '',
            generatedCV: '',
            cvLanguage: 'en',
            createdAt: expect.any(String),
            lastModified: expect.any(String),
            status: 'draft'
          }),
          workspacePath: '/test/workspace'
        })
      )
    })
  })

  it('triggers onSaved and closes dialog on successful save', async () => {
    mockInvoke.mockResolvedValue({ success: true })
    const onSaved = vi.fn()
    const onOpenChange = vi.fn()
    renderDialog({ onSaved, onOpenChange })

    const jobTitleInput = screen.getByPlaceholderText('resumes.job_title_ph')
    fireEvent.change(jobTitleInput, { target: { value: 'Engineer' } })

    fireEvent.click(screen.getByText('resumes.save'))

    await waitFor((): void => {
      expect(toast.success).toHaveBeenCalledWith('resumes.save_success')
      expect(onSaved).toHaveBeenCalled()
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows error toast on save failure', async () => {
    mockInvoke.mockResolvedValue({ success: false })
    renderDialog()

    const jobTitleInput = screen.getByPlaceholderText('resumes.job_title_ph')
    fireEvent.change(jobTitleInput, { target: { value: 'Engineer' } })

    fireEvent.click(screen.getByText('resumes.save'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.save_error')
    })
  })

  it('shows error toast when save throws exception', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'cv:save') return Promise.reject(new Error('save failed'))
      return Promise.resolve(undefined)
    })

    renderDialog()

    const jobTitleInput = screen.getByPlaceholderText('resumes.job_title_ph')
    fireEvent.change(jobTitleInput, { target: { value: 'Engineer' } })

    fireEvent.click(screen.getByText('resumes.save'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.save_error')
    })
  })

  it('renders interview notes as HTML via markdownToHtml, not raw markdown', async () => {
    const resume: CV = {
      id: 'notes-md',
      filename: 'notes-md.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'r1',
          round: 'first',
          date: '2026-03-19T10:00:00Z',
          notes: '* Item one\n* Item two\n* **Bold item**',
          result: 'passed'
        }
      ]
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor(() => {
      const notesContainer = document.querySelector('.prose') as HTMLElement
      expect(notesContainer).not.toBeNull()
      const html = notesContainer.innerHTML
      expect(html).toContain('<li')
      expect(html).toContain('Item one')
      expect(html).toContain('Item two')
      expect(html).toContain('<strong')
      expect(html).toContain('Bold item')
      expect(html).not.toContain('* Item one')
    })
  })

  it('renders interview notes with headings and code via markdownToHtml', async () => {
    const resume: CV = {
      id: 'notes-md2',
      filename: 'notes-md2.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'r2',
          round: 'first',
          date: '2026-03-19T10:00:00Z',
          notes: '## Questions\n\nDescribe `useState` hook.\n\n1. First answer\n2. Second answer',
          result: 'pending'
        }
      ]
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor(() => {
      const notesContainer = document.querySelector('.prose') as HTMLElement
      expect(notesContainer).not.toBeNull()
      const html = notesContainer.innerHTML
      expect(html).toContain('<h2')
      expect(html).toContain('Questions')
      expect(html).toContain('<code')
      expect(html).toContain('useState')
      expect(html).toContain('<li')
      expect(html).toContain('First answer')
      expect(html).toContain('Second answer')
    })
  })

  it('shows empty state when interview rounds section is expanded with no rounds', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })
  })

  it('opens Edit Round Dialog when Add Round button is clicked', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
      expect(screen.getByText('resumes.round')).toBeInTheDocument()
      expect(screen.getByText('resumes.result')).toBeInTheDocument()
      expect(screen.getByText('resumes.date')).toBeInTheDocument()
      expect(screen.getByText('resumes.interview_notes')).toBeInTheDocument()
      const editors = screen.getAllByTestId('markdown-editor')
      expect(editors.length).toBeGreaterThanOrEqual(1)
      const saveButtons = screen.getAllByText('common.save')
      expect(saveButtons.length).toBeGreaterThanOrEqual(1)
      const cancelButtons = screen.getAllByText('common.cancel')
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('saves a new round and shows it in timeline', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const saveButtons = screen.getAllByText('common.save')
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
      expect(screen.getByText('resumes.result_pending')).toBeInTheDocument()
    })
  })

  it('opens Edit Round Dialog with existing round data when edit button is clicked', async (): Promise<void> => {
    const resumeWithRounds: CV = {
      id: 'r1',
      filename: 'r1.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'round-1',
          round: 'first',
          date: '2026-01-15',
          notes: 'Good interview',
          result: 'passed'
        }
      ]
    }
    renderDialog({ resume: resumeWithRounds })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    const editButtons = document.querySelectorAll('button')
    const editButton = Array.from(editButtons).find((btn): boolean => {
      const svg = btn.querySelector('.lucide-edit-2, .lucide-edit2')
      return svg !== null
    })

    if (!editButton) {
      const ghostButtons = Array.from(document.querySelectorAll('button.h-7'))
      if (ghostButtons.length > 0) {
        fireEvent.click(ghostButtons[0])
      }
    } else {
      fireEvent.click(editButton)
    }

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })
  })

  it('deletes a round when trash button is clicked', async (): Promise<void> => {
    const resumeWithRounds: CV = {
      id: 'r1',
      filename: 'r1.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'round-1',
          round: 'first',
          date: '2026-01-15',
          notes: 'Good interview',
          result: 'passed'
        }
      ]
    }
    renderDialog({ resume: resumeWithRounds })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    const roundCard = screen.getByText('resumes.round_first').closest('.bg-muted\\/30')
    expect(roundCard).not.toBeNull()
    const iconButtons = roundCard!.querySelectorAll('button')
    const deleteButton = iconButtons[iconButtons.length - 1]
    fireEvent.click(deleteButton)

    await waitFor((): void => {
      expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
      expect(screen.queryByText('resumes.round_first')).not.toBeInTheDocument()
    })
  })

  it('cancels Edit Round Dialog without adding a round', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const cancelButtons = screen.getAllByText('common.cancel')
    fireEvent.click(cancelButtons[cancelButtons.length - 1])

    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
    })
  })

  it('calls onOpenChange with false when main cancel button is clicked', (): void => {
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })

    const cancelButton = screen.getByText('resumes.cancel')
    fireEvent.click(cancelButton)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('includes interviewRounds and interviewStatus in save IPC call', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: true })

    const resumeWithRounds: CV = {
      id: 'r1',
      filename: 'r1.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'round-1',
          round: 'first',
          date: '2026-01-15',
          notes: 'Good interview',
          result: 'passed'
        }
      ]
    }
    renderDialog({ resume: resumeWithRounds })

    const saveButton = screen.getByText('resumes.save')
    fireEvent.click(saveButton)

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'cv:save',
        expect.objectContaining({
          data: expect.objectContaining({
            interviewStatus: 'first_interview',
            interviewRounds: [
              expect.objectContaining({
                id: 'round-1',
                round: 'first',
                date: '2026-01-15',
                notes: 'Good interview',
                result: 'passed'
              })
            ]
          })
        })
      )
    })
  })

  it('auto-derives interview_failed status when saving with a failed round', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: true })

    const resumeWithFailedRound: CV = {
      id: 'fail-1',
      filename: 'fail-1.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'round-f1',
          round: 'second',
          date: '2026-02-01',
          notes: 'Did not pass',
          result: 'failed'
        },
        {
          id: 'round-f0',
          round: 'first',
          date: '2026-01-15',
          notes: 'OK',
          result: 'passed'
        }
      ]
    }
    renderDialog({ resume: resumeWithFailedRound })

    fireEvent.click(screen.getByText('resumes.save'))

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'cv:save',
        expect.objectContaining({
          data: expect.objectContaining({
            interviewStatus: 'first_interview'
          })
        })
      )
    })
  })

  it('updates existing round when editing and saving via Edit Round Dialog', async (): Promise<void> => {
    const resumeWithRound: CV = {
      id: 'edit-r1',
      filename: 'edit-r1.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'round-edit-1',
          round: 'first',
          date: '2026-01-15',
          notes: 'Initial notes',
          result: 'pending'
        }
      ]
    }
    mockInvoke.mockResolvedValue({ success: true })
    renderDialog({ resume: resumeWithRound })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    const roundCard = screen.getByText('resumes.round_first').closest('.bg-muted\\/30')
    expect(roundCard).not.toBeNull()
    const iconButtons = roundCard!.querySelectorAll('button')
    fireEvent.click(iconButtons[0])

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const dateInput = screen.getByDisplayValue('2026-01-15')
    fireEvent.change(dateInput, { target: { value: '2026-02-20' } })

    const editors = screen.getAllByTestId('markdown-editor')
    const notesEditor = editors[editors.length - 1]
    fireEvent.change(notesEditor, { target: { value: 'Updated notes' } })

    const saveButtons = screen.getAllByText('common.save')
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.save'))

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith(
        'cv:save',
        expect.objectContaining({
          data: expect.objectContaining({
            interviewRounds: [
              expect.objectContaining({
                id: 'round-edit-1',
                date: '2026-02-20',
                notes: 'Updated notes'
              })
            ]
          })
        })
      )
    })
  })

  it('renders links and horizontal rules via markdownToHtml', async (): Promise<void> => {
    const resume: CV = {
      id: 'md-extras',
      filename: 'md-extras.json',
      jobTitle: 'Engineer',
      interviewStatus: 'first_interview',
      interviewRounds: [
        {
          id: 'r-extras',
          round: 'first',
          date: '2026-03-19T10:00:00Z',
          notes: '[Click here](https://example.com)\n\n---\n\n***Bold italic***',
          result: 'pending'
        }
      ]
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      const notesContainer = document.querySelector('.prose') as HTMLElement
      expect(notesContainer).not.toBeNull()
      const html = notesContainer.innerHTML
      expect(html).toContain('<a href="https://example.com"')
      expect(html).toContain('Click here')
      expect(html).toContain('<hr')
      expect(html).toContain('<strong><em>Bold italic</em></strong>')
    })
  })

  it('changes round select value in Edit Round Dialog', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.add_round'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const roundTriggers = screen.getAllByRole('combobox')
    fireEvent.click(roundTriggers[roundTriggers.length - 2])

    await waitFor((): void => {
      const secondOption = screen.getByText('resumes.round_second')
      fireEvent.click(secondOption)
    })

    fireEvent.click(roundTriggers[roundTriggers.length - 1])
    await waitFor((): void => {
      const passedOption = screen.getByText('resumes.result_passed')
      fireEvent.click(passedOption)
    })

    const saveButtons = screen.getAllByText('common.save')
    fireEvent.click(saveButtons[saveButtons.length - 1])

    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      expect(screen.getByText('resumes.round_second')).toBeInTheDocument()
      expect(screen.getByText('resumes.result_passed')).toBeInTheDocument()
    })
  })

  it('updates companyName, targetSalary, jobDescription, and notes via onChange', async (): Promise<void> => {
    renderDialog()

    const companyInput = screen.getByPlaceholderText('resumes.company_name_ph')
    fireEvent.change(companyInput, { target: { value: 'Acme Corp' } })
    expect(companyInput).toHaveValue('Acme Corp')

    const salaryInput = screen.getByPlaceholderText('resumes.target_salary_ph')
    fireEvent.change(salaryInput, { target: { value: '150k' } })
    expect(salaryInput).toHaveValue('150k')

    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Senior engineer role' } })
    expect(jdTextarea).toHaveValue('Senior engineer role')

    const notesTextarea = screen.getByPlaceholderText('resumes.notes_ph')
    fireEvent.change(notesTextarea, { target: { value: 'Follow up next week' } })
    expect(notesTextarea).toHaveValue('Follow up next week')
  })

  it('changes interview status via select dropdown', async (): Promise<void> => {
    renderDialog()

    const statusTrigger = screen.getByText('resumes.status_draft')
    fireEvent.click(statusTrigger)

    await waitFor((): void => {
      const option = screen.getByText('resumes.status_offer_accepted')
      fireEvent.click(option)
    })

    await waitFor((): void => {
      expect(screen.getByText('resumes.status_offer_accepted')).toBeInTheDocument()
    })
  })

  it('sorts and renders multiple interview rounds in timeline', async (): Promise<void> => {
    const resume: CV = {
      id: 'resume-sort',
      filename: 'sort.json',
      interviewRounds: [
        {
          id: 'round-b',
          round: 'second' as const,
          date: '2026-03-20T10:00:00Z',
          notes: 'Second round notes',
          result: 'passed' as const
        },
        {
          id: 'round-a',
          round: 'first' as const,
          date: '2026-03-18T10:00:00Z',
          notes: 'First round notes',
          result: 'pending' as const
        },
        {
          id: 'round-c',
          round: 'third' as const,
          date: '2026-03-22T10:00:00Z',
          notes: '',
          result: 'failed' as const
        }
      ],
      interviewStatus: 'second_interview' as const
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
      expect(screen.getByText('resumes.round_second')).toBeInTheDocument()
      expect(screen.getByText('resumes.round_third')).toBeInTheDocument()
    })

    expect(screen.getByText('resumes.result_passed')).toBeInTheDocument()
    expect(screen.getByText('resumes.result_pending')).toBeInTheDocument()
    expect(screen.getByText('resumes.result_failed')).toBeInTheDocument()

    expect(screen.getByText('First round notes')).toBeInTheDocument()
    expect(screen.getByText('Second round notes')).toBeInTheDocument()
  })

  it('deletes an interview round via the trash button', async (): Promise<void> => {
    const resume: CV = {
      id: 'resume-del',
      filename: 'del.json',
      interviewRounds: [
        {
          id: 'round-del-1',
          round: 'first' as const,
          date: '2026-03-18T10:00:00Z',
          notes: 'Keep this round',
          result: 'passed' as const
        },
        {
          id: 'round-del-2',
          round: 'second' as const,
          date: '2026-03-19T10:00:00Z',
          notes: 'Delete this round',
          result: 'pending' as const
        }
      ],
      interviewStatus: 'second_interview' as const
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
      expect(screen.getByText('resumes.round_second')).toBeInTheDocument()
    })

    const trashButtons = screen
      .getAllByRole('button')
      .filter((btn): boolean => btn.querySelector('.lucide-trash-2') !== null)
    fireEvent.click(trashButtons[trashButtons.length - 1])

    await waitFor((): void => {
      expect(screen.queryByText('Delete this round')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Keep this round')).toBeInTheDocument()
  })

  it('changes experience level via select', async (): Promise<void> => {
    renderDialog()

    const expTriggers = screen.getAllByRole('combobox')
    fireEvent.click(expTriggers[0])

    await waitFor((): void => {
      const seniorOption = screen.getByText('resumes.level_senior')
      fireEvent.click(seniorOption)
    })

    await waitFor((): void => {
      expect(screen.getByText('resumes.level_senior')).toBeInTheDocument()
    })
  })

  it('changes date input in Edit Round Dialog', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.add_round'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const dateInputs = document.querySelectorAll('input[type="date"]')
    expect(dateInputs.length).toBeGreaterThan(0)
    const dateInput = dateInputs[dateInputs.length - 1] as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-04-15' } })
    expect(dateInput.value).toBe('2026-04-15')
  })

  it('changes notes in Edit Round Dialog via MarkdownEditor', async (): Promise<void> => {
    renderDialog()

    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.add_round'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    const editors = screen.getAllByTestId('markdown-editor')
    const roundNotesEditor = editors[editors.length - 1]
    fireEvent.change(roundNotesEditor, { target: { value: 'Updated round notes' } })
    expect(roundNotesEditor).toHaveValue('Updated round notes')
  })
})
