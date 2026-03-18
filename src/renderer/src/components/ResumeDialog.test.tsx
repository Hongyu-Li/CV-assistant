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
      expect(toast.error).toHaveBeenCalledWith('resumes.generate_error')
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

    const exportButton = screen.getByTitle('resumes.export_md')
    fireEvent.click(exportButton)

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

    expect(screen.getByText('resumes.generated_cv')).toBeInTheDocument()
    // CV section starts collapsed when there's a generated CV, need to expand it
    fireEvent.click(screen.getByText('resumes.generated_cv'))
    await waitFor(() => {
      // Default is preview mode, need to click Edit to see the editor
      expect(screen.getByText('Edit')).toBeInTheDocument()
    })
    // Click Edit to access the markdown editor
    fireEvent.click(screen.getByText('Edit'))
    await waitFor(() => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })
  })
})
