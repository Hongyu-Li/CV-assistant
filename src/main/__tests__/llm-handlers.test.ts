import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { EngineState, DownloadedModel, LocalModelInfo, DownloadProgress } from '../llm/types'
import type { IpcErrorResponse } from '../handlers/types'

vi.mock('../llm/engine', () => ({
  startEngine: vi.fn(),
  stopEngine: vi.fn(),
  getEngineState: vi.fn()
}))

vi.mock('../llm/download', () => ({
  listDownloadedModels: vi.fn(),
  downloadModel: vi.fn(),
  deleteModel: vi.fn(),
  getModelPath: vi.fn()
}))

interface MockIpcMain {
  handle: ReturnType<typeof vi.fn>
}

interface MockWebContents {
  send: ReturnType<typeof vi.fn>
}

interface MockBrowserWindow {
  webContents: MockWebContents
}

function createMockIpcMain(): MockIpcMain {
  return { handle: vi.fn() }
}

function createMockMainWindow(): MockBrowserWindow {
  return { webContents: { send: vi.fn() } }
}

type HandlerFn = (_event: unknown, args: Record<string, unknown>) => Promise<unknown>

function getHandler(mockIpcMain: MockIpcMain, channel: string): HandlerFn {
  const call = mockIpcMain.handle.mock.calls.find((c: unknown[]) => c[0] === channel) as
    | [string, HandlerFn]
    | undefined
  if (!call) {
    throw new Error(`No handler registered for channel "${channel}"`)
  }
  return call[1]
}

describe('registerLlmHandlers', () => {
  let mockIpcMain: MockIpcMain
  let mockMainWindow: MockBrowserWindow
  let registerLlmHandlers: typeof import('../handlers/llm').registerLlmHandlers
  let engineMock: typeof import('../llm/engine')
  let downloadMock: typeof import('../llm/download')

  beforeEach(async () => {
    vi.resetAllMocks()

    const originalProcess = globalThis.process
    Object.defineProperty(originalProcess, 'mas', {
      value: false,
      writable: true,
      configurable: true
    })

    engineMock = await import('../llm/engine')
    downloadMock = await import('../llm/download')
    const llmHandlers = await import('../handlers/llm')
    registerLlmHandlers = llmHandlers.registerLlmHandlers

    mockIpcMain = createMockIpcMain()
    mockMainWindow = createMockMainWindow()

    registerLlmHandlers(
      mockIpcMain as unknown as Parameters<typeof registerLlmHandlers>[0],
      mockMainWindow as unknown as Parameters<typeof registerLlmHandlers>[1]
    )
  })

  afterEach(() => {
    Object.defineProperty(globalThis.process, 'mas', {
      value: undefined,
      writable: true,
      configurable: true
    })
  })

  it('registers all expected IPC channels', () => {
    const channels = mockIpcMain.handle.mock.calls.map((c: unknown[]) => c[0]) as string[]
    expect(channels).toContain('llm:startEngine')
    expect(channels).toContain('llm:stopEngine')
    expect(channels).toContain('llm:engineStatus')
    expect(channels).toContain('llm:listModels')
    expect(channels).toContain('llm:downloadModel')
    expect(channels).toContain('llm:cancelDownload')
    expect(channels).toContain('llm:deleteModel')
  })

  describe('llm:startEngine', () => {
    it('returns running state when model is downloaded', async () => {
      const expectedState: EngineState = {
        status: 'running',
        port: 54321,
        modelId: '/path/to/model.gguf',
        error: null
      }
      vi.mocked(downloadMock.getModelPath).mockResolvedValue('/path/to/model.gguf')
      vi.mocked(engineMock.startEngine).mockResolvedValue(expectedState)

      const handler = getHandler(mockIpcMain, 'llm:startEngine')
      const result = await handler(null, { modelId: 'gemma-4-e2b-it' })

      expect(result).toEqual({ success: true, state: expectedState })
      expect(engineMock.startEngine).toHaveBeenCalledWith('gemma-4-e2b-it', '/path/to/model.gguf')
    })

    it('returns error when model is not downloaded', async () => {
      vi.mocked(downloadMock.getModelPath).mockResolvedValue(null)

      const handler = getHandler(mockIpcMain, 'llm:startEngine')
      const result = await handler(null, { modelId: 'nonexistent-model' })

      expect(result).toEqual({
        success: false,
        error: 'Model not found. Please download it first.'
      })
      expect(engineMock.startEngine).not.toHaveBeenCalled()
    })

    it('returns sanitized error when engine start throws', async () => {
      vi.mocked(downloadMock.getModelPath).mockResolvedValue('/path/to/model.gguf')
      vi.mocked(engineMock.startEngine).mockRejectedValue(
        new Error('Failed at /Users/secret/path/llama-server: spawn error')
      )

      const handler = getHandler(mockIpcMain, 'llm:startEngine')
      const result = (await handler(null, { modelId: 'gemma-4-e2b-it' })) as IpcErrorResponse

      expect(result.success).toBe(false)
      expect(result.error).not.toContain('/Users/')
    })
  })

  describe('llm:stopEngine', () => {
    it('returns success with state after stopping engine', async () => {
      vi.mocked(engineMock.stopEngine).mockResolvedValue(undefined)
      const stoppedState: EngineState = {
        status: 'stopped',
        port: null,
        modelId: null,
        error: null
      }
      vi.mocked(engineMock.getEngineState).mockReturnValue(stoppedState)

      const handler = getHandler(mockIpcMain, 'llm:stopEngine')
      const result = await handler(null, {})

      expect(result).toEqual({ success: true, state: stoppedState })
      expect(engineMock.stopEngine).toHaveBeenCalled()
    })
  })

  describe('llm:engineStatus', () => {
    it('returns current engine state', async () => {
      const state: EngineState = {
        status: 'running',
        port: 12345,
        modelId: 'gemma-4-e2b-it',
        error: null
      }
      vi.mocked(engineMock.getEngineState).mockReturnValue(state)

      const handler = getHandler(mockIpcMain, 'llm:engineStatus')
      const result = await handler(null, {})

      expect(result).toEqual({ success: true, state })
    })
  })

  describe('llm:listModels', () => {
    it('returns AVAILABLE_MODELS merged with download status', async () => {
      const downloaded: DownloadedModel[] = [
        {
          id: 'gemma-4-e2b-it',
          name: 'gemma-4-e2b-it',
          displayName: 'Gemma 4 E2B-it',
          repo: 'ggml-org/gemma-4-E2B-it-GGUF',
          filename: 'gemma-4-E2B-it-Q8_0.gguf',
          size: 4_970_000_000,
          sha256: '0000000000000000000000000000000000000000000000000000000000000000',
          quantization: 'Q8_0',
          description: 'Smaller model, faster inference. Recommended for 8GB+ RAM.',
          path: '/models/gemma-4-E2B-it-Q8_0.gguf',
          downloadedAt: '2025-01-01T00:00:00.000Z'
        }
      ]
      vi.mocked(downloadMock.listDownloadedModels).mockResolvedValue(downloaded)

      const handler = getHandler(mockIpcMain, 'llm:listModels')
      const result = (await handler(null, {})) as {
        success: true
        models: Array<LocalModelInfo & { downloaded: boolean; downloadedAt: string | null }>
      }

      expect(result.success).toBe(true)
      expect(result.models).toHaveLength(2)

      const gemmaE2b = result.models.find((m) => m.id === 'gemma-4-e2b-it')
      expect(gemmaE2b?.downloaded).toBe(true)
      expect(gemmaE2b?.downloadedAt).toBe('2025-01-01T00:00:00.000Z')

      const gemmaE4b = result.models.find((m) => m.id === 'gemma-4-e4b-it')
      expect(gemmaE4b?.downloaded).toBe(false)
      expect(gemmaE4b?.downloadedAt).toBeNull()
    })
  })

  describe('llm:downloadModel', () => {
    it('calls download manager and sends progress via webContents', async () => {
      const downloadedModel: DownloadedModel = {
        id: 'gemma-4-e2b-it',
        name: 'gemma-4-e2b-it',
        displayName: 'Gemma 4 E2B-it',
        repo: 'ggml-org/gemma-4-E2B-it-GGUF',
        filename: 'gemma-4-E2B-it-Q8_0.gguf',
        size: 4_970_000_000,
        sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        quantization: 'Q8_0',
        description: 'Smaller model, faster inference. Recommended for 8GB+ RAM.',
        path: '/models/gemma-4-E2B-it-Q8_0.gguf',
        downloadedAt: '2025-01-01T00:00:00.000Z'
      }

      const mockAbort = new AbortController()
      vi.mocked(downloadMock.downloadModel).mockImplementation(
        (
          _modelInfo: LocalModelInfo,
          onProgress: (progress: DownloadProgress) => void
        ): { promise: Promise<DownloadedModel>; abort: AbortController } => {
          onProgress({
            modelId: 'gemma-4-e2b-it',
            receivedBytes: 500,
            totalBytes: 1000,
            percent: 50
          })
          return {
            promise: Promise.resolve(downloadedModel),
            abort: mockAbort
          }
        }
      )

      const handler = getHandler(mockIpcMain, 'llm:downloadModel')
      const result = await handler(null, { modelId: 'gemma-4-e2b-it' })

      expect(result).toEqual({ success: true, model: downloadedModel })
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('llm:downloadProgress', {
        modelId: 'gemma-4-e2b-it',
        receivedBytes: 500,
        totalBytes: 1000,
        percent: 50
      })
    })

    it('returns error for unknown model ID', async () => {
      const handler = getHandler(mockIpcMain, 'llm:downloadModel')
      const result = await handler(null, { modelId: 'nonexistent-model' })

      expect(result).toEqual({
        success: false,
        error: 'Unknown model: nonexistent-model'
      })
    })
  })

  describe('llm:cancelDownload', () => {
    it('aborts an in-progress download', async () => {
      const mockAbort = new AbortController()
      const abortSpy = vi.spyOn(mockAbort.signal, 'aborted', 'get')
      abortSpy.mockReturnValue(false)

      vi.mocked(downloadMock.downloadModel).mockReturnValue({
        promise: new Promise(() => {}),
        abort: mockAbort
      })

      const downloadHandler = getHandler(mockIpcMain, 'llm:downloadModel')
      void downloadHandler(null, { modelId: 'gemma-4-e2b-it' })

      const cancelHandler = getHandler(mockIpcMain, 'llm:cancelDownload')
      const result = await cancelHandler(null, {})

      expect(result).toEqual({ success: true })
    })
  })

  describe('llm:deleteModel', () => {
    it('deletes a downloaded model', async () => {
      vi.mocked(downloadMock.deleteModel).mockResolvedValue(undefined)

      const handler = getHandler(mockIpcMain, 'llm:deleteModel')
      const result = await handler(null, { modelId: 'gemma-4-e2b-it' })

      expect(result).toEqual({ success: true })
      expect(downloadMock.deleteModel).toHaveBeenCalledWith('gemma-4-e2b-it')
    })

    it('returns error when delete fails', async () => {
      vi.mocked(downloadMock.deleteModel).mockRejectedValue(new Error('Unknown model: bad-id'))

      const handler = getHandler(mockIpcMain, 'llm:deleteModel')
      const result = await handler(null, { modelId: 'bad-id' })

      expect(result).toEqual({ success: false, error: 'Unknown model: bad-id' })
    })
  })

  describe('MAS guard', () => {
    it('all handlers return error when process.mas is true', async () => {
      Object.defineProperty(globalThis.process, 'mas', {
        value: true,
        writable: true,
        configurable: true
      })

      const masIpcMain = createMockIpcMain()
      const masWindow = createMockMainWindow()
      registerLlmHandlers(
        masIpcMain as unknown as Parameters<typeof registerLlmHandlers>[0],
        masWindow as unknown as Parameters<typeof registerLlmHandlers>[1]
      )

      const channels = [
        'llm:startEngine',
        'llm:stopEngine',
        'llm:engineStatus',
        'llm:listModels',
        'llm:downloadModel',
        'llm:cancelDownload',
        'llm:deleteModel'
      ]

      for (const channel of channels) {
        const handler = getHandler(masIpcMain, channel)
        const result = (await handler(null, { modelId: 'gemma-4-e2b-it' })) as IpcErrorResponse
        expect(result.success).toBe(false)
        expect(result.error).toContain('not available')
      }
    })
  })

  describe('error sanitization', () => {
    it('does not leak file paths in engine start error messages', async () => {
      vi.mocked(downloadMock.getModelPath).mockResolvedValue('/Users/john/Library/models/test.gguf')
      vi.mocked(engineMock.startEngine).mockRejectedValue(
        new Error(
          'ENOENT: no such file or directory, open /Users/john/Library/Application Support/cv-assistant/llama-server'
        )
      )

      const handler = getHandler(mockIpcMain, 'llm:startEngine')
      const result = (await handler(null, { modelId: 'gemma-4-e2b-it' })) as IpcErrorResponse

      expect(result.success).toBe(false)
      expect(result.error).not.toMatch(/\/Users\//)
      expect(result.error).not.toMatch(/\/home\//)
      expect(result.error).not.toMatch(/[A-Z]:\\/)
    })
  })
})
