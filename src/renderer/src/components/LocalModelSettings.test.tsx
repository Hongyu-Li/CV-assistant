import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LocalModelSettings } from './LocalModelSettings'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params && Object.keys(params).length > 0) {
        return `${key} ${JSON.stringify(params)}`
      }
      return key
    }
  })
}))

const mockModels = [
  {
    id: 'model-1',
    name: 'model-1',
    displayName: 'Test Model 1',
    repo: 'test/repo',
    filename: 'test1.gguf',
    size: 2e9,
    sha256: 'abc',
    quantization: 'Q4',
    description: 'A test model',
    downloaded: false,
    downloadedAt: null
  },
  {
    id: 'model-2',
    name: 'model-2',
    displayName: 'Test Model 2',
    repo: 'test/repo2',
    filename: 'test2.gguf',
    size: 6e9,
    sha256: 'def',
    quantization: 'Q8',
    description: 'Another test model',
    downloaded: true,
    downloadedAt: '2025-01-01T00:00:00Z'
  }
]

describe('LocalModelSettings', () => {
  let mockInvoke: ReturnType<typeof vi.fn>
  let mockOn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockInvoke = vi.fn()
    mockOn = vi.fn()

    window.electron = {
      ipcRenderer: {
        invoke: mockInvoke,
        on: mockOn,
        send: vi.fn(),
        sendSync: vi.fn(),
        postMessage: vi.fn(),
        removeAllListeners: vi.fn(),
        removeListener: vi.fn(),
        once: vi.fn()
      }
    } as unknown as Window['electron']

    mockInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'llm:listModels') {
        return { success: true, models: mockModels }
      }
      if (channel === 'llm:engineStatus') {
        return {
          success: true,
          state: { status: 'stopped', port: null, modelId: null, error: null }
        }
      }
      return { success: true }
    })
  })

  it('1. Renders 2 model cards', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
      expect(screen.getByText('Test Model 2')).toBeInTheDocument()
    })
  })

  it('2. Shows download buttons for undownloaded models', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
    })
    const buttons = screen.getAllByRole('button', { name: 'localLlm.download' })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('3. Shows "Downloaded" badge for downloaded models', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('localLlm.download_complete')).toBeInTheDocument()
    })
  })

  it('4. Shows delete button for downloaded models', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: 'localLlm.delete' })
      expect(deleteButtons.length).toBeGreaterThan(0)
    })
  })

  it('5. Shows progress bar during active download', async () => {
    let progressCallback: (event: unknown, data: unknown) => void
    mockOn.mockImplementation((channel, cb) => {
      if (channel === 'llm:downloadProgress') progressCallback = cb
      return () => {}
    })

    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
    })

    act(() => {
      if (progressCallback) {
        progressCallback(null, {
          modelId: 'model-1',
          percent: 50.0,
          receivedBytes: 1e9,
          totalBytes: 2e9
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByText(/localLlm.download_progress/)).toBeInTheDocument()
      expect(screen.getByText(/50.0/)).toBeInTheDocument()
    })
  })

  it('6. Shows cancel button during download', async () => {
    let progressCallback: (event: unknown, data: unknown) => void
    mockOn.mockImplementation((channel, cb) => {
      if (channel === 'llm:downloadProgress') progressCallback = cb
      return () => {}
    })

    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
    })

    act(() => {
      if (progressCallback) {
        progressCallback(null, {
          modelId: 'model-1',
          percent: 10.0,
          receivedBytes: 1e8,
          totalBytes: 2e9
        })
      }
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'localLlm.cancel_download' })).toBeInTheDocument()
    })
  })

  it('7. Shows engine status badge', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('localLlm.engine_stopped')).toBeInTheDocument()
    })
  })

  it('8. Calls IPC on download button click', async () => {
    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument()
    })

    const downloadBtn = screen.getByRole('button', { name: 'localLlm.download' })
    fireEvent.click(downloadBtn)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('llm:downloadModel', { modelId: 'model-1' })
    })
  })

  it('9. Shows MAS guard when MAS build error is returned', async () => {
    mockInvoke.mockImplementation(async (channel: string) => {
      if (channel === 'llm:listModels') {
        return { success: false, error: 'Local LLM is not available in App Store builds.' }
      }
      return { success: true }
    })

    render(<LocalModelSettings />)
    await waitFor(() => {
      expect(screen.getByText('localLlm.error_not_available_mas')).toBeInTheDocument()
    })
  })
})
