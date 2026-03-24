import React from 'react'
import { readFileSync } from 'fs'
import path from 'path'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { generateCV, extractKeywordsFromJD } from '../../lib/provider'
import { CvSection } from './CvSection'

const JD_FIXTURE = readFileSync(
  path.join(__dirname, '../../../../../tests/fixtures/jd.md'),
  'utf-8'
)

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
  jobTitle: '',
  jobDescription: '',
  generatedCV: '',
  onGeneratedCVChange: vi.fn(),
  cvLanguage: 'en',
  onCvLanguageChange: vi.fn(),
  notes: '',
  onNotesChange: vi.fn(),
  keywords: [] as string[],
  onKeywordsChange: vi.fn(),
  isGenerating: false,
  onIsGeneratingChange: vi.fn()
}

// Stateful wrapper for CvSection — controlled component needs a parent that manages state
// so that prop changes (notes, cvLanguage, etc.) cause re-renders with updated values.
function StatefulCvSection(props: typeof defaultProps): React.JSX.Element {
  const [notes, setNotes] = React.useState(props.notes)
  const [cvLanguage, setCvLanguage] = React.useState(props.cvLanguage)
  const [generatedCV, setGeneratedCV] = React.useState(props.generatedCV)
  const [keywords, setKeywords] = React.useState(props.keywords)
  const [isGenerating, setIsGenerating] = React.useState(props.isGenerating)

  return (
    <CvSection
      jobTitle={props.jobTitle}
      jobDescription={props.jobDescription}
      generatedCV={generatedCV}
      onGeneratedCVChange={(v: string): void => {
        setGeneratedCV(v)
        props.onGeneratedCVChange(v)
      }}
      cvLanguage={cvLanguage}
      onCvLanguageChange={(v: string): void => {
        setCvLanguage(v)
        props.onCvLanguageChange(v)
      }}
      notes={notes}
      onNotesChange={(v: string): void => {
        setNotes(v)
        props.onNotesChange(v)
      }}
      keywords={keywords}
      onKeywordsChange={(v: string[]): void => {
        setKeywords(v)
        props.onKeywordsChange(v)
      }}
      isGenerating={isGenerating}
      onIsGeneratingChange={(v: boolean): void => {
        setIsGenerating(v)
        props.onIsGeneratingChange(v)
      }}
    />
  )
}

function renderCvSection(overrides?: Partial<typeof defaultProps>): ReturnType<typeof render> {
  return render(<StatefulCvSection {...defaultProps} {...overrides} />)
}

describe('CvSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInvoke.mockReset()
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined)
  })

  it('shows empty_jd toast when generating with empty job description', async () => {
    renderCvSection()

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

    renderCvSection({ jobDescription: JD_FIXTURE })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith('profile:load', '/test/workspace')
      expect(generateCV).toHaveBeenCalledWith(
        expect.objectContaining({
          jobDescription: JD_FIXTURE,
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

    renderCvSection({ jobDescription: JD_FIXTURE })

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

    renderCvSection({ jobDescription: JD_FIXTURE })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.generate_error\nAPI error')
    })
  })

  it('copies generated CV to clipboard and shows success toast', async () => {
    renderCvSection({ generatedCV: '# My Resume Content' })

    const copyButton = screen.getByLabelText('resumes.copy')
    fireEvent.click(copyButton)

    await waitFor((): void => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('# My Resume Content')
      expect(toast.success).toHaveBeenCalledWith('resumes.copied')
    })
  })

  it('shows error toast when clipboard copy fails', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard denied'))

    renderCvSection({ generatedCV: '# My Resume' })

    const copyButton = screen.getByLabelText('resumes.copy')
    fireEvent.click(copyButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.copy_error')
    })
  })

  it('exports generated CV as markdown file and shows success toast', () => {
    renderCvSection({ generatedCV: '# Resume markdown', jobTitle: 'Engineer' })

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
    const downloadButton = screen.getByLabelText('common.download')
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
    renderCvSection({ generatedCV: '# Existing Resume' })

    const generatedCvElements = screen.getAllByText('resumes.generated_cv')
    expect(generatedCvElements[0]).toBeInTheDocument()
    fireEvent.click(generatedCvElements[0])
    await waitFor(() => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })
  })

  it('opens download dropdown showing export options on click', () => {
    renderCvSection({ generatedCV: '# Resume' })

    const downloadButton = screen.getByLabelText('common.download')
    fireEvent.click(downloadButton)

    expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
  })

  it('closes download dropdown on outside mousedown', () => {
    renderCvSection({ generatedCV: '# Resume' })

    const downloadButton = screen.getByLabelText('common.download')
    fireEvent.click(downloadButton)
    expect(screen.getByText('resumes.export_md')).toBeInTheDocument()

    fireEvent.mouseDown(document)

    expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
  })

  it('exports PDF via jsPDF and shows success toast', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# Resume', jobTitle: 'Engineer' })

    // Spy after render so any portals are already in the DOM
    const originalAppendChild = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => originalAppendChild(node))
    const originalRemoveChild = document.body.removeChild.bind(document.body)
    const removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockImplementation(<T extends Node>(node: T): T => originalRemoveChild(node))

    const downloadButton = screen.getByLabelText('common.download')
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

    renderCvSection({ generatedCV: '# Resume' })

    const originalAppendChild = document.body.appendChild.bind(document.body)
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(<T extends Node>(node: T): T => originalAppendChild(node))

    const downloadButton = screen.getByLabelText('common.download')
    fireEvent.click(downloadButton)
    const exportPdfButton = screen.getByText('resumes.export_pdf')
    fireEvent.click(exportPdfButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.export_error')
    })

    appendChildSpy.mockRestore()
  })

  it('export markdown does nothing when no CV exists', () => {
    renderCvSection()

    const mockCreateObjectURL = vi.fn((): string => 'blob:test-url')
    global.URL.createObjectURL = mockCreateObjectURL

    expect(screen.queryByLabelText('common.download')).not.toBeInTheDocument()
    expect(mockCreateObjectURL).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('export PDF does nothing when no CV exists', async (): Promise<void> => {
    renderCvSection()

    expect(screen.queryByLabelText('common.download')).not.toBeInTheDocument()
    expect(mockSave).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
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

    renderCvSection({ jobDescription: JD_FIXTURE })

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

    renderCvSection({ jobDescription: JD_FIXTURE })

    fireEvent.click(screen.getByText('resumes.generate_cv'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.generate_error')
    })
  })

  it('toggles CV section via keyboard Enter and Space keys', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# Keyboard Test' })

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

  it('renders keyword chips when resume has keywords', async (): Promise<void> => {
    renderCvSection({ keywords: ['React', 'TypeScript', 'Node.js'] })

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('resumes.keywords')).toBeInTheDocument()
  })

  it('shows notes textarea and language select inside expanded CV when generatedCV exists', async (): Promise<void> => {
    renderCvSection({
      generatedCV: '# My Generated CV\n\nSome content',
      cvLanguage: 'en',
      notes: 'Existing notes'
    })

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
    renderCvSection()

    // In CvSection without generatedCV, CV section starts expanded (setCvExpanded(!generatedCV))
    await waitFor((): void => {
      expect(screen.getByText('resumes.generated_cv_desc')).toBeInTheDocument()
    })

    const generateButtons = screen.getAllByText('resumes.generate_cv')
    expect(generateButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('clicks export Markdown and PDF buttons in export menu', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# Test CV' })
    mockInvoke.mockResolvedValue(undefined)

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByLabelText('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('common.download'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
      expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.export_md'))

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('common.download'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.export_pdf')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('resumes.export_pdf'))

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_pdf')).not.toBeInTheDocument()
    })
  })

  it('does not collapse CV section when clicking action buttons area', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# CV Content' })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByLabelText('resumes.copy')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('resumes.copy'))

    await waitFor((): void => {
      expect(screen.getByTestId('markdown-editor')).toBeInTheDocument()
    })
  })

  it('closes export menu when clicking outside', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# Outside CV' })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByLabelText('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('common.download'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    })

    fireEvent.mouseDown(document.body)

    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })
  })

  it('changes CV language via select when no generatedCV exists', async (): Promise<void> => {
    renderCvSection()

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

  it('toggles export menu open and closed via download button', async (): Promise<void> => {
    renderCvSection({ generatedCV: '# Toggle CV' })

    fireEvent.click(screen.getByText('resumes.generated_cv'))

    await waitFor((): void => {
      expect(screen.getByLabelText('common.download')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('common.download'))
    await waitFor((): void => {
      expect(screen.getByText('resumes.export_md')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('common.download'))
    await waitFor((): void => {
      expect(screen.queryByText('resumes.export_md')).not.toBeInTheDocument()
    })
  })

  it('shows regenerate button when CV exists and clicks it', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({
      personalInfo: { name: 'Test' },
      content: '# Profile',
      markdown: '# Profile MD'
    })
    vi.mocked(generateCV).mockResolvedValue('# Regenerated CV')

    renderCvSection({
      jobDescription: JD_FIXTURE,
      generatedCV: '# Existing CV'
    })

    const regenButton = screen.getByLabelText('resumes.generate_cv')
    expect(regenButton).toBeInTheDocument()

    fireEvent.click(regenButton)

    await waitFor((): void => {
      expect(mockInvoke).toHaveBeenCalledWith('profile:load', '/test/workspace')
    })
  })
})
