import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Resumes } from './Resumes'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock electron ipcRenderer
const mockInvoke = vi.fn()
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: mockInvoke
    }
  },
  writable: true
})

describe('Resumes Component', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('renders loading state initially', () => {
    mockInvoke.mockReturnValue(new Promise(() => {})) // Pending promise
    render(<Resumes />)
    expect(screen.getByText('Loading resumes...')).toBeInTheDocument()
  })

  it('renders empty state when no resumes', async () => {
    mockInvoke.mockResolvedValue([])
    render(<Resumes />)
    await waitFor(() => {
      expect(screen.getByText('resumes.empty_title')).toBeInTheDocument()
    })
  })

  it('renders list of resumes', async () => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' },
      { id: '2', filename: 'cv2.json', jobTitle: 'Designer', lastModified: '2023-01-02' }
    ]
    mockInvoke.mockResolvedValue(resumes)
    render(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
      expect(screen.getByText('Designer')).toBeInTheDocument()
    })
  })

  it('calls delete when trash button is clicked', async () => {
    const resumes = [
      { id: '1', filename: 'cv1.json', jobTitle: 'Developer', lastModified: '2023-01-01' }
    ]
    mockInvoke.mockResolvedValueOnce(resumes)
    mockInvoke.mockResolvedValueOnce({ success: true }) // for delete
    mockInvoke.mockResolvedValueOnce([]) // for reload

    render(<Resumes />)

    await waitFor(() => {
      expect(screen.getByText('Developer')).toBeInTheDocument()
    })

    const deleteButton = screen.getByText('common.delete')
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('cv:delete', 'cv1.json')
    })
  })
})
