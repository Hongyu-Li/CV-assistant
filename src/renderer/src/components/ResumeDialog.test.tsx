import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { generateCV, extractKeywordsFromJD } from '../lib/provider'
import { ResumeDialog, CV } from './ResumeDialog'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock provider module
vi.mock('../lib/provider', () => ({
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
vi.mock('../context/SettingsContext', () => ({
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
vi.mock('./MarkdownEditor', () => ({
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

// Mock jspdf — must use function() for new jsPDF() constructor
const mockSave = vi.fn()
const mockAddImage = vi.fn()
const mockAddPage = vi.fn()
vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(function (this: Record<string, unknown>): void {
    this.internal = {
      pageSize: {
        getWidth: function (): number {
          return 210
        },
        getHeight: function (): number {
          return 297
        }
      }
    }
    this.addImage = mockAddImage
    this.addPage = mockAddPage
    this.save = mockSave
  })
}))

// Mock html2canvas-pro (dynamically imported in component)
vi.mock('html2canvas-pro', () => ({
  default: vi.fn().mockResolvedValue({
    width: 800,
    height: 400,
    toDataURL: vi.fn((): string => 'data:image/png;base64,test'),
    getContext: vi.fn((): object => ({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage: vi.fn()
    }))
  })
}))

// Mock electron ipcRenderer
const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

// Mock clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn() },
  writable: true
})

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
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
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

    // Generated CV section is collapsed when CV exists, need to expand it
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

    // Fill in the job title (required for save)
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

  it('shows empty_jd toast when generating with empty job description', async () => {
    renderDialog()

    const generateButton = screen.getByText('resumes.generate_cv')
    fireEvent.click(generateButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.empty_jd')
    })
  })

  it('calls profile:load then generateCV on successful generate', async () => {
    const profileData = {
      personalInfo: { name: 'John', email: 'john@test.com' },
      workExperience: [],
      projects: []
    }
    mockInvoke.mockResolvedValue(profileData)
    vi.mocked(generateCV).mockResolvedValue('# Generated Resume')
    vi.mocked(extractKeywordsFromJD).mockResolvedValue(['React', 'TypeScript', 'Node.js'])

    renderDialog()

    // Fill in job description
    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Build web apps' } })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith('profile:load', '/test/workspace')
      expect(generateCV).toHaveBeenCalledWith(
        expect.objectContaining({
          jobDescription: 'Build web apps',
          provider: 'openai',
          apiKey: 'sk-test',
          model: 'gpt-5.2',
          baseUrl: '',
          language: 'en'
        })
      )
      expect(toast.success).toHaveBeenCalledWith('resumes.generate_success')
    })
  })

  it('includes phone, work experience, and projects in profile text for generation', async (): Promise<void> => {
    const profileData = {
      personalInfo: { name: 'John', email: 'john@test.com', phone: '+1234567890' },
      workExperience: [
        {
          role: 'Dev',
          company: 'Co',
          date: '2020-2024',
          description: 'Built things'
        }
      ],
      projects: [{ name: 'Proj', techStack: 'React', description: 'A cool project' }]
    }
    mockInvoke.mockResolvedValue(profileData)
    vi.mocked(generateCV).mockResolvedValue('# Generated Resume')

    renderDialog()

    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Build web apps' } })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(generateCV).toHaveBeenCalled()
    })

    const firstCall = vi.mocked(generateCV).mock.calls[0]
    expect(firstCall).toBeDefined()
    const [args] = firstCall!

    expect(args.profile).toContain('Phone:')
    expect(args.profile).toContain('+1234567890')
    expect(args.profile).toContain('Work Experience:')
    expect(args.profile).toContain('Dev at Co')
    expect(args.profile).toContain('Built things')
    expect(args.profile).toContain('Projects:')
    expect(args.profile).toContain('Proj [React]')
    expect(args.profile).toContain('A cool project')
  })

  it('shows error toast when generation fails', async () => {
    mockInvoke.mockResolvedValue({})
    vi.mocked(generateCV).mockRejectedValue(new Error('API error'))

    renderDialog()

    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Build web apps' } })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.generate_error\nAPI error')
    })
  })

  it('copies generated CV to clipboard and shows success toast', async () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# My Resume Content'
    }
    renderDialog({ resume })

    const copyButton = screen.getByTitle('resumes.copy')
    fireEvent.click(copyButton)

    await waitFor((): void => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# My Resume Content')
      expect(toast.success).toHaveBeenCalledWith('resumes.copied')
    })
  })

  it('shows error toast when clipboard copy fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard denied'))

    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# My Resume'
    }
    renderDialog({ resume })

    const copyButton = screen.getByTitle('resumes.copy')
    fireEvent.click(copyButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.copy_error')
    })
  })

  it('exports generated CV as markdown file and shows success toast', () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      jobTitle: 'Engineer',
      generatedCV: '# Resume markdown'
    }
    renderDialog({ resume })

    const mockCreateObjectURL = vi.fn((): string => 'blob:test-url')
    const mockRevokeObjectURL = vi.fn()
    global.URL.createObjectURL = mockCreateObjectURL
    global.URL.revokeObjectURL = mockRevokeObjectURL

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation((): void => {})
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node: Node): Node => node)
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node: Node): Node => node)

    // Open the download dropdown first, then click the markdown export item
    const downloadButton = screen.getByTitle('common.download')
    fireEvent.click(downloadButton)
    const exportMdButton = screen.getByText('resumes.export_md')
    fireEvent.click(exportMdButton)

    expect(mockCreateObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url')
    expect(toast.success).toHaveBeenCalledWith('resumes.exported')

    clickSpy.mockRestore()
    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('shows generated CV section when generatedCV is set via edit mode', async () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# Existing Resume'
    }
    renderDialog({ resume })

    const generatedCvElements = screen.getAllByText('resumes.generated_cv')
    expect(generatedCvElements[0]).toBeInTheDocument()
    fireEvent.click(generatedCvElements[0])
    await waitFor(() => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })
  })

  it('opens download dropdown showing export options on click', () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# Resume'
    }
    renderDialog({ resume })

    const downloadButton = screen.getByTitle('common.download')
    fireEvent.click(downloadButton)

    expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
  })

  it('closes download dropdown on outside mousedown', () => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# Resume'
    }
    renderDialog({ resume })

    const downloadButton = screen.getByTitle('common.download')
    fireEvent.click(downloadButton)
    expect(screen.getByText('resumes.export_md')).toBeInTheDocument()

    fireEvent.mouseDown(document)

    expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
  })

  it('exports PDF via jsPDF and shows success toast', async (): Promise<void> => {
    const resume: CV = {
      id: '1',
      filename: 'test.json',
      jobTitle: 'Engineer',
      generatedCV: '# Resume'
    }

    renderDialog({ resume })

    // Spy after render so Radix portal is already in the DOM
    const originalAppendChild = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => originalAppendChild(node))
    const originalRemoveChild = document.body.removeChild.bind(document.body)
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(<T extends Node>(node: T): T => originalRemoveChild(node))

    const downloadButton = screen.getByTitle('common.download')
    fireEvent.click(downloadButton)
    const exportPdfButton = screen.getByText('resumes.export_pdf')
    fireEvent.click(exportPdfButton)

    await waitFor((): void => {
      expect(mockSave).toHaveBeenCalledWith('Engineer.pdf')
      expect(toast.success).toHaveBeenCalledWith('resumes.exported')
    })

    appendChildSpy.mockRestore()
    removeChildSpy.mockRestore()
  })

  it('shows error toast when PDF export fails', async (): Promise<void> => {
    const html2canvasMod = await import('html2canvas-pro')
    vi.mocked(html2canvasMod.default).mockRejectedValueOnce(new Error('canvas error'))

    const resume: CV = {
      id: '1',
      filename: 'test.json',
      generatedCV: '# Resume'
    }

    renderDialog({ resume })

    const originalAppendChild = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => originalAppendChild(node))

    const downloadButton = screen.getByTitle('common.download')
    fireEvent.click(downloadButton)
    const exportPdfButton = screen.getByText('resumes.export_pdf')
    fireEvent.click(exportPdfButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.export_error')
    })

    appendChildSpy.mockRestore()
  })

  it('export markdown does nothing when no CV exists', () => {
    renderDialog()

    const mockCreateObjectURL = vi.fn((): string => 'blob:test-url')
    global.URL.createObjectURL = mockCreateObjectURL

    expect(screen.queryByTitle('common.download')).not.toBeInTheDocument()
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('export PDF does nothing when no CV exists', async (): Promise<void> => {
    renderDialog()

    expect(screen.queryByTitle('common.download')).not.toBeInTheDocument()
    expect(mockSave).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
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

    // Expand the rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    // Click Add Round
    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      // Edit Round Dialog should be open
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
      // Check for form fields
      expect(screen.getByText('resumes.round')).toBeInTheDocument()
      expect(screen.getByText('resumes.result')).toBeInTheDocument()
      expect(screen.getByText('resumes.date')).toBeInTheDocument()
      expect(screen.getByText('resumes.interview_notes')).toBeInTheDocument()
      // MarkdownEditor is mocked as textarea
      const editors = screen.getAllByTestId('markdown-editor')
      expect(editors.length).toBeGreaterThanOrEqual(1)
      // Save and cancel buttons in the edit round dialog
      const saveButtons = screen.getAllByText('common.save')
      expect(saveButtons.length).toBeGreaterThanOrEqual(1)
      const cancelButtons = screen.getAllByText('common.cancel')
      expect(cancelButtons.length).toBeGreaterThanOrEqual(1)
    })
  })

  it('saves a new round and shows it in timeline', async (): Promise<void> => {
    renderDialog()

    // Expand rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    // Click Add Round
    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    // Click save in the Edit Round Dialog (there are multiple save buttons — the edit dialog one is from common.save)
    const saveButtons = screen.getAllByText('common.save')
    // The edit dialog save button is the last common.save button
    fireEvent.click(saveButtons[saveButtons.length - 1])

    // After saving, the Edit Dialog should close and the round should appear in the timeline
    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      // The round name should appear (default is 'first')
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
      // The result badge should appear
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

    // Expand rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    // Click edit button (Edit2 icon button)
    const editButtons = document.querySelectorAll('button')
    const editButton = Array.from(editButtons).find((btn): boolean => {
      const svg = btn.querySelector('.lucide-edit-2, .lucide-edit2')
      return svg !== null
    })

    // If the edit icon approach doesn't work, find by size class
    if (!editButton) {
      // The edit and delete buttons are h-7 w-7 ghost icon buttons
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

    // Expand rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    // Find all icon buttons (h-7 w-7) within the round card — edit is first, delete is second
    const roundCard = screen.getByText('resumes.round_first').closest('.bg-muted\\/30')
    expect(roundCard).not.toBeNull()
    const iconButtons = roundCard!.querySelectorAll('button')
    // The last icon button in the card is the delete button
    const deleteButton = iconButtons[iconButtons.length - 1]
    fireEvent.click(deleteButton)

    await waitFor((): void => {
      // Round should be removed — empty state should show
      expect(screen.getByText('resumes.no_rounds')).toBeInTheDocument()
      expect(screen.queryByText('resumes.round_first')).not.toBeInTheDocument()
    })
  })

  it('cancels Edit Round Dialog without adding a round', async (): Promise<void> => {
    renderDialog()

    // Expand rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })

    // Click Add Round
    fireEvent.click(screen.getByText('resumes.add_round'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    // Click cancel in the Edit Round Dialog
    const cancelButtons = screen.getAllByText('common.cancel')
    // The cancel button inside the edit dialog
    fireEvent.click(cancelButtons[cancelButtons.length - 1])

    await waitFor((): void => {
      // Edit dialog should close
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      // No round should have been added — empty state still shown
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

    // Click main save button
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

  it('includes education data in profile text when generating CV', async (): Promise<void> => {
    const profileData = {
      personalInfo: { name: 'Alice' },
      education: [
        {
          degree: 'BSc Computer Science',
          school: 'MIT',
          date: '2018-2022',
          description: 'Magna cum laude'
        }
      ],
      workExperience: [],
      projects: []
    }
    mockInvoke.mockResolvedValue(profileData)
    vi.mocked(generateCV).mockResolvedValue('# Resume')
    vi.mocked(extractKeywordsFromJD).mockResolvedValue([])

    renderDialog()

    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Build things' } })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(generateCV).toHaveBeenCalled()
    })

    const firstCall = vi.mocked(generateCV).mock.calls[0]
    expect(firstCall).toBeDefined()
    const [args] = firstCall!
    expect(args.profile).toContain('Education:')
    expect(args.profile).toContain('BSc Computer Science at MIT')
    expect(args.profile).toContain('Magna cum laude')
  })

  it('shows generic error toast when generation fails with non-Error object', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({})
    vi.mocked(generateCV).mockRejectedValue('string error without message')

    renderDialog()

    const jdTextarea = screen.getByPlaceholderText('resumes.jd_placeholder')
    fireEvent.change(jdTextarea, { target: { value: 'Build web apps' } })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.generate_error')
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

  it('toggles CV section via keyboard Enter and Space keys', async (): Promise<void> => {
    const resume: CV = {
      id: 'kb-1',
      filename: 'kb-1.json',
      generatedCV: '# Keyboard Test'
    }
    renderDialog({ resume })

    // The Generated CV section header is a role="button" element
    const cvHeader = screen.getByText('resumes.generated_cv').closest('[role="button"]')
    expect(cvHeader).not.toBeNull()

    // Initially collapsed — expand via Enter key
    fireEvent.keyDown(cvHeader!, { key: 'Enter' })
    await waitFor((): void => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })

    // Collapse via Space key
    fireEvent.keyDown(cvHeader!, { key: ' ' })
    await waitFor((): void => {
      expect(screen.queryByTestId('markdown-editor')).not.toBeInTheDocument()
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

    // Expand rounds section
    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    // Click edit button on the existing round
    const roundCard = screen.getByText('resumes.round_first').closest('.bg-muted\\/30')
    expect(roundCard).not.toBeNull()
    const iconButtons = roundCard!.querySelectorAll('button')
    // First icon button is edit
    fireEvent.click(iconButtons[0])

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    // Change the date field
    const dateInput = screen.getByDisplayValue('2026-01-15')
    fireEvent.change(dateInput, { target: { value: '2026-02-20' } })

    // Change the notes via markdown editor
    const editors = screen.getAllByTestId('markdown-editor')
    const notesEditor = editors[editors.length - 1]
    fireEvent.change(notesEditor, { target: { value: 'Updated notes' } })

    // Save the edited round
    const saveButtons = screen.getAllByText('common.save')
    fireEvent.click(saveButtons[saveButtons.length - 1])

    // Dialog should close, round should still be visible
    await waitFor((): void => {
      expect(screen.queryByText('resumes.edit_round')).not.toBeInTheDocument()
      expect(screen.getByText('resumes.round_first')).toBeInTheDocument()
    })

    // Now save the main form and verify the updated round is persisted
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

    // Expand rounds, add a round
    fireEvent.click(screen.getByText('resumes.interview_rounds'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.add_round')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.add_round'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_round')).toBeInTheDocument()
    })

    // The round select trigger — find by its current displayed value
    // Default round is 'first', so the select trigger shows 'resumes.round_first'
    const roundTriggers = screen.getAllByRole('combobox')
    // First combobox in the edit dialog is the round select
    fireEvent.click(roundTriggers[roundTriggers.length - 2])

    // Select 'second' option
    await waitFor((): void => {
      const secondOption = screen.getByText('resumes.round_second')
      fireEvent.click(secondOption)
    })

    // Now change result select
    fireEvent.click(roundTriggers[roundTriggers.length - 1])
    await waitFor((): void => {
      const passedOption = screen.getByText('resumes.result_passed')
      fireEvent.click(passedOption)
    })

    // Save and verify the round was created with updated values
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

  it('renders keyword chips when resume has keywords', async (): Promise<void> => {
    const resume = {
      id: 'resume-kw',
      filename: 'kw.json',
      title: 'KW Resume',
      keywords: ['React', 'TypeScript', 'Node.js']
    }
    renderDialog({ resume })

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('resumes.keywords')).toBeInTheDocument()
  })

  it('changes interview status via select dropdown', async (): Promise<void> => {
    renderDialog()

    const statusTrigger = screen.getByText('resumes.status_resume_sent')
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
    const resume = {
      id: 'resume-sort',
      filename: 'sort.json',
      title: 'Sort Resume',
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

  it('shows notes textarea and language select inside expanded CV when generatedCV exists', async (): Promise<void> => {
    const resume = {
      id: 'resume-cv',
      filename: 'cv.json',
      title: 'CV Resume',
      generatedCV: '# My Generated CV\n\nSome content',
      cvLanguage: 'en',
      notes: 'Existing notes'
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      const notesTextareas = screen.getAllByPlaceholderText('resumes.notes_ph')
      expect(notesTextareas.length).toBeGreaterThan(0)
    })

    const notesTextareas = screen.getAllByPlaceholderText('resumes.notes_ph')
    const cvNotesTextarea = notesTextareas[notesTextareas.length - 1]
    fireEvent.change(cvNotesTextarea, { target: { value: 'Updated CV notes' } })
    expect(cvNotesTextarea).toHaveValue('Updated CV notes')

    const languageLabels = screen.getAllByText('resumes.cv_language')
    expect(languageLabels.length).toBeGreaterThan(0)
  })

  it('shows generate button inside expanded CV section when no generatedCV', async (): Promise<void> => {
    renderDialog()

    // In create mode (no resume), CV section starts expanded (setCvExpanded(true))
    await waitFor((): void => {
      expect(screen.getByText('resumes.generated_cv_desc')).toBeInTheDocument()
    })

    const generateButtons = screen.getAllByText('resumes.generate_cv')
    expect(generateButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('clicks export Markdown and PDF buttons in export menu', async (): Promise<void> => {
    const resume = {
      id: 'resume-export',
      filename: 'export.json',
      title: 'Export Resume',
      generatedCV: '# Test CV'
    }
    mockInvoke.mockResolvedValue(undefined)
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByTitle('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('common.download'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
      expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.export_md'))

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('common.download'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.export_pdf'))

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_pdf')).not.toBeInTheDocument()
    })
  })

  it('does not collapse CV section when clicking action buttons area', async (): Promise<void> => {
    const resume = {
      id: 'resume-stop',
      filename: 'stop.json',
      title: 'StopProp Resume',
      generatedCV: '# CV Content'
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByTitle('resumes.copy')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('resumes.copy'))

    await waitFor((): void => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })
  })

  it('deletes an interview round via the trash button', async (): Promise<void> => {
    const resume = {
      id: 'resume-del',
      filename: 'del.json',
      title: 'Del Resume',
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

  it('closes export menu when clicking outside', async (): Promise<void> => {
    const resume = {
      id: 'resume-outside',
      filename: 'outside.json',
      title: 'Outside Resume',
      generatedCV: '# Outside CV'
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByTitle('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('common.download'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    })

    fireEvent.mouseDown(document.body)

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })
  })

  it('changes CV language via select when no generatedCV exists', async (): Promise<void> => {
    renderDialog()

    const langTrigger = screen.getByText('resumes.lang_en')
    fireEvent.click(langTrigger)

    await waitFor((): void => {
      const zhOption = screen.getByText('resumes.lang_zh')
      fireEvent.click(zhOption)
    })

    await waitFor((): void => {
      expect(screen.getByText('resumes.lang_zh')).toBeInTheDocument()
    })
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

  it('toggles export menu open and closed via download button', async (): Promise<void> => {
    const resume = {
      id: 'resume-toggle',
      filename: 'toggle.json',
      title: 'Toggle Resume',
      generatedCV: '# Toggle CV'
    }
    renderDialog({ resume })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByTitle('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('common.download'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTitle('common.download'))
    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })
  })

  it('shows regenerate button when CV exists and clicks it', async (): Promise<void> => {
    const resume = {
      id: 'resume-regen',
      filename: 'regen.json',
      title: 'Regen Resume',
      jobDescription: 'Need React developer',
      generatedCV: '# Existing CV'
    }
    mockInvoke.mockResolvedValue({
      personalInfo: { name: 'Test' },
      content: '# Profile',
      markdown: '# Profile MD'
    })
    vi.mocked(generateCV).mockResolvedValue('# Regenerated CV')
    renderDialog({ resume })

    const regenButton = screen.getByTitle('resumes.generate_cv')
    expect(regenButton).toBeInTheDocument()

    fireEvent.click(regenButton)

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith('profile:load', '/test/workspace')
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
