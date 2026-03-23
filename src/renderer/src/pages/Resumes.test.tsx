import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Resumes } from './Resumes'
import type { CV } from '../components/resume-dialog'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SettingsProvider } from '../context/SettingsContext'
import { toast } from 'sonner'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock provider module (required by ResumeDialog)
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

// Mock electron ipcRenderer
const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

const renderWithProvider = (ui: React.ReactElement): ReturnType<typeof render> => {
  return render(<SettingsProvider>{ui}</SettingsProvider>)
}

describe('Resumes Component', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('renders loading state initially', () => {
    mockInvoke.mockReturnValue(new Promise(() => {})) // Pending promise
    const { container } = renderWithProvider(<Resumes />)
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument()
  })

  it('renders empty state when no resumes', async () => {
    mockInvoke.mockResolvedValue([])
    renderWithProvider(<Resumes />)
    await waitFor(() => {
      expect(screen.getByText('resumes.empty_title')).toBeInTheDocument()
    })
  })

  it('renders empty state when cv:list returns non-array data', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(null)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('resumes.empty_title')).toBeInTheDocument()
    })
  })

  it('renders new resume button', async () => {
    mockInvoke.mockResolvedValue([])
    renderWithProvider(<Resumes />)
    await waitFor(() => {
      expect(screen.getByText('resumes.new_resume')).toBeInTheDocument()
    })
  })

  it('renders list of resumes', async () => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' },
      { id: '2', filename: 'cv2.json', jobTitle: 'Designer', lastModified: '2023-01-02' }
    ]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
  })

  it('renders company name when present', async () => {
    const resumes = [
      {
        id: '1',
        filename: 'cv1.json',
        jobTitle: 'Developer',
        companyName: 'Acme Corp',
        lastModified: '2023-01-01'
      }
    ]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    })
  })

  it('renders company name and job title for resumes', async () => {
    const resumes = [
      {
        id: '1',
        filename: 'cv1.json',
        jobTitle: 'Developer',
        companyName: 'Google',
        status: 'generated',
        lastModified: '2023-01-01'
      }
    ]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Google')).toBeInTheDocument()
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })
  })

  it('opens dialog when new resume button is clicked', async () => {
    mockInvoke.mockResolvedValue([])
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('resumes.new_resume')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.new_resume'))

    await waitFor(() => {
      expect(screen.getByText('resumes.create_resume')).toBeInTheDocument()
    })
  })

  it('opens dialog with resume data when card is clicked', async () => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'cv:list') return Promise.resolve(resumes)
      if (channel === 'cv:read')
        return Promise.resolve({
          success: true,
          data: { jobTitle: 'Developer', experienceLevel: 'senior' }
        })
      return Promise.resolve()
    })

    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Developer'))

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('cv:read', {
        filename: 'cv1.json',
        workspacePath: ''
      })
    })
  })

  it('calls delete when trash button is clicked', async () => {
    let resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'cv:list') return Promise.resolve(resumes)
      if (channel === 'cv:delete') {
        resumes = []
        return Promise.resolve({ success: true })
      }
      return Promise.resolve()
    })

    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    // Find delete button by aria-label
    const deleteButton = screen.getByLabelText('common.delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('cv:delete', {
        filename: 'cv1.json',
        workspacePath: ''
      })
    })
  })

  it('shows delete error toast when cv:delete returns success false', async (): Promise<void> => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'cv:list') return Promise.resolve(resumes)
      if (channel === 'cv:delete') return Promise.resolve({ success: false })
      return Promise.resolve(undefined)
    })

    renderWithProvider(<Resumes />)
    await waitFor((): void => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    // Find delete button by aria-label
    const deleteButton = screen.getByLabelText('common.delete')
    fireEvent.click(deleteButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.delete_error')
    })
  })

  it('shows delete error toast when cv:delete throws', async (): Promise<void> => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'cv:list') return Promise.resolve(resumes)
      if (channel === 'cv:delete') return Promise.reject(new Error('delete failed'))
      return Promise.resolve(undefined)
    })

    renderWithProvider(<Resumes />)
    await waitFor((): void => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    // Find delete button by aria-label
    const deleteButton = screen.getByLabelText('common.delete')
    fireEvent.click(deleteButton)

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.delete_error')
    })
  })

  it('shows load error toast when cv:read throws during edit', async (): Promise<void> => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === 'cv:list') return Promise.resolve(resumes)
      if (channel === 'cv:read') return Promise.reject(new Error('read failed'))
      return Promise.resolve(undefined)
    })

    renderWithProvider(<Resumes />)
    await waitFor((): void => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Developer'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.load_error')
    })
  })

  it('sorts resumes by lastModified descending', async () => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Older', lastModified: '2023-01-01' },
      { id: '2', filename: 'cv2.json', jobTitle: 'Newer', lastModified: '2023-06-01' }
    ]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      const cards = screen.getAllByText(/Older|Newer/)
      expect(cards[0].textContent).toBe('Newer')
      expect(cards[1].textContent).toBe('Older')
    })
  })

  it('shows untitled for resumes without jobTitle', async () => {
    const resumes = [{ id: '1', filename: 'cv1.json', lastModified: '2023-01-01' }]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('resumes.untitled')).toBeInTheDocument()
    })
  })

  const richResumes: CV[] = [
    {
      id: '1',
      filename: 'cv1.json',
      jobTitle: 'React Developer',
      companyName: 'Google',
      interviewStatus: 'first_interview',
      keywords: ['React', 'TypeScript', 'Node.js'],
      targetSalary: '$150k',
      lastModified: '2026-03-01'
    },
    {
      id: '2',
      filename: 'cv2.json',
      jobTitle: 'Backend Engineer',
      companyName: 'Meta',
      interviewStatus: 'hr_interview',
      keywords: ['Python', 'Django', 'PostgreSQL', 'Redis', 'Docker'],
      targetSalary: '$180k',
      lastModified: '2026-03-05'
    },
    {
      id: '3',
      filename: 'cv3.json',
      jobTitle: 'Designer',
      companyName: 'Apple',
      interviewStatus: 'offer_accepted',
      lastModified: '2026-03-10'
    },
    {
      id: '4',
      filename: 'cv4.json',
      jobTitle: 'QA Engineer',
      companyName: 'Amazon',
      interviewStatus: 'interview_failed',
      lastModified: '2026-03-08'
    },
    {
      id: '5',
      filename: 'cv5.json',
      jobTitle: 'DevOps',
      companyName: 'Netflix',
      interviewStatus: 'offer_rejected',
      lastModified: '2026-03-07'
    }
  ]

  it('filters to Interview tab showing only interview-stage resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('React Developer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_interview'))

    await waitFor((): void => {
      expect(screen.getByText('React Developer')).toBeInTheDocument()
      expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
      expect(screen.queryByText('Designer')).not.toBeInTheDocument()
      expect(screen.queryByText('QA Engineer')).not.toBeInTheDocument()
      expect(screen.queryByText('DevOps')).not.toBeInTheDocument()
    })
  })

  it('filters to HR tab showing only hr_interview resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_hr'))

    await waitFor((): void => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
      expect(screen.queryByText('React Developer')).not.toBeInTheDocument()
      expect(screen.queryByText('Designer')).not.toBeInTheDocument()
    })
  })

  it('filters to Offer tab showing only offer_accepted resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_offer'))

    await waitFor((): void => {
      expect(screen.getByText('Designer')).toBeInTheDocument()
      expect(screen.queryByText('React Developer')).not.toBeInTheDocument()
      expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
    })
  })

  it('filters to Rejected tab showing failed and rejected resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_rejected'))

    await waitFor((): void => {
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
      expect(screen.getByText('DevOps')).toBeInTheDocument()
      expect(screen.queryByText('React Developer')).not.toBeInTheDocument()
      expect(screen.queryByText('Designer')).not.toBeInTheDocument()
    })
  })

  it('filters resumes by job title search', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('React Developer')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('resumes.search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'React' } })

    await waitFor((): void => {
      expect(screen.getByText('React Developer')).toBeInTheDocument()
      expect(screen.queryByText('Backend Engineer')).not.toBeInTheDocument()
      expect(screen.queryByText('Designer')).not.toBeInTheDocument()
    })
  })

  it('filters resumes by company name search', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Meta')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('resumes.search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'Meta' } })

    await waitFor((): void => {
      expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
      expect(screen.queryByText('React Developer')).not.toBeInTheDocument()
    })
  })

  it('combines tab and search filters', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_rejected'))

    await waitFor((): void => {
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
      expect(screen.getByText('DevOps')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('resumes.search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'QA' } })

    await waitFor((): void => {
      expect(screen.getByText('QA Engineer')).toBeInTheDocument()
      expect(screen.queryByText('DevOps')).not.toBeInTheDocument()
    })
  })

  it('shows no_search_results when search yields no matches', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('React Developer')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('resumes.search_placeholder')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor((): void => {
      expect(screen.getByText('resumes.no_search_results')).toBeInTheDocument()
      expect(screen.queryByText('resumes.empty_title')).not.toBeInTheDocument()
    })
  })

  it('shows no_search_results when tab filter yields no matches', async (): Promise<void> => {
    const noOfferResumes: CV[] = [
      {
        id: '1',
        filename: 'cv1.json',
        jobTitle: 'Dev',
        companyName: 'Co',
        interviewStatus: 'first_interview',
        lastModified: '2026-03-01'
      }
    ]
    mockInvoke.mockResolvedValue(noOfferResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Dev')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('resumes.tab_offer'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.no_search_results')).toBeInTheDocument()
      expect(screen.queryByText('resumes.empty_title')).not.toBeInTheDocument()
    })
  })

  it('displays keyword tags for resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
      expect(screen.getByText('Node.js')).toBeInTheDocument()
    })
  })

  it('shows +N overflow badge when resume has more than 4 keywords', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      // Backend Engineer has 5 keywords, should show 4 + "+1"
      expect(screen.getByText('Python')).toBeInTheDocument()
      expect(screen.getByText('Django')).toBeInTheDocument()
      expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
      expect(screen.getByText('Redis')).toBeInTheDocument()
      expect(screen.getByText('+1')).toBeInTheDocument()
      // Docker should NOT be shown (5th keyword, overflow)
      expect(screen.queryByText('Docker')).not.toBeInTheDocument()
    })
  })

  it('displays target salary for resumes', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('$150k')).toBeInTheDocument()
      expect(screen.getByText('$180k')).toBeInTheDocument()
    })
  })

  it('displays interview status badges', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('resumes.status_first_interview')).toBeInTheDocument()
      expect(screen.getByText('resumes.status_hr_interview')).toBeInTheDocument()
      expect(screen.getByText('resumes.status_offer_accepted')).toBeInTheDocument()
      expect(screen.getByText('resumes.status_interview_failed')).toBeInTheDocument()
      expect(screen.getByText('resumes.status_offer_rejected')).toBeInTheDocument()
    })
  })

  it('shows correct counts in tab badges', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(richResumes)
    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      // All tab shows total count 5
      const allTab = screen.getByText('resumes.tab_all').closest('button')
      expect(allTab).toHaveTextContent('5')
      // Interview tab: 1 (first_interview)
      const interviewTab = screen.getByText('resumes.tab_interview').closest('button')
      expect(interviewTab).toHaveTextContent('1')
      // HR tab: 1 (hr_interview)
      const hrTab = screen.getByText('resumes.tab_hr').closest('button')
      expect(hrTab).toHaveTextContent('1')
      // Offer tab: 1 (offer_accepted)
      const offerTab = screen.getByText('resumes.tab_offer').closest('button')
      expect(offerTab).toHaveTextContent('1')
      // Rejected tab: 2 (interview_failed + offer_rejected)
      const rejectedTab = screen.getByText('resumes.tab_rejected').closest('button')
      expect(rejectedTab).toHaveTextContent('2')
    })
  })

  it('opens dialog with resume data when cv:read succeeds', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'cv:list') return Promise.resolve(richResumes)
      if (channel === 'cv:read')
        return Promise.resolve({
          success: true,
          data: { jobTitle: 'React Developer', companyName: 'Google' }
        })
      if (channel === 'settings:load') return Promise.resolve({})
      return Promise.resolve(undefined)
    })

    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Google')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Google'))

    await waitFor((): void => {
      expect(screen.getByText('resumes.edit_resume')).toBeInTheDocument()
    })
  })

  it('shows load error toast when cv:read returns success false', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'cv:list') return Promise.resolve(richResumes)
      if (channel === 'cv:read') return Promise.resolve({ success: false })
      if (channel === 'settings:load') return Promise.resolve({})
      return Promise.resolve(undefined)
    })

    renderWithProvider(<Resumes />)

    await waitFor((): void => {
      expect(screen.getByText('Google')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Google'))

    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('resumes.load_error')
    })
  })

  it('discards stale load results via loadIdRef guard', async (): Promise<void> => {
    let resolveList: ((value: unknown) => void) | undefined
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'cv:list') {
        return new Promise((resolve) => {
          resolveList = resolve
        })
      }
      if (channel === 'settings:load') return Promise.resolve({ workspacePath: '' })
      return Promise.resolve(undefined)
    })

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = renderWithProvider(<Resumes />)

    unmount()

    resolveList?.([
      { id: '1', filename: 'cv1.json', jobTitle: 'Stale Result', lastModified: '2026-01-01' }
    ])

    await new Promise((r) => setTimeout(r, 50))

    expect(screen.queryByText('Stale Result')).not.toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})
