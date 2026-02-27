import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Resumes } from './Resumes'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SettingsProvider } from '../context/SettingsContext'

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
const mockInvoke = vi.fn()
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: mockInvoke,
      on: vi.fn(),
      removeListener: vi.fn()
    }
  },
  writable: true
})

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

  it('renders status badge for generated resumes', async () => {
    const resumes = [
      {
        id: '1',
        filename: 'cv1.json',
        jobTitle: 'Developer',
        status: 'generated',
        lastModified: '2023-01-01'
      }
    ]
    mockInvoke.mockResolvedValue(resumes)
    renderWithProvider(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('resumes.status_generated')).toBeInTheDocument()
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

    const deleteButton = screen.getByText('common.delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('cv:delete', {
        filename: 'cv1.json',
        workspacePath: ''
      })
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
})
