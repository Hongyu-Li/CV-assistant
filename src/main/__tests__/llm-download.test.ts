import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'node:path'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/mock/userData')
  }
}))

const mockMkdir = vi.fn()
const mockReaddir = vi.fn()
const mockStat = vi.fn()
const mockUnlink = vi.fn()
const mockRename = vi.fn()
const mockAccess = vi.fn()
const mockWriteFile = vi.fn()

vi.mock('fs/promises', () => ({
  mkdir: (...args: unknown[]): unknown => mockMkdir(...args),
  readdir: (...args: unknown[]): unknown => mockReaddir(...args),
  stat: (...args: unknown[]): unknown => mockStat(...args),
  unlink: (...args: unknown[]): unknown => mockUnlink(...args),
  rename: (...args: unknown[]): unknown => mockRename(...args),
  access: (...args: unknown[]): unknown => mockAccess(...args),
  writeFile: (...args: unknown[]): unknown => mockWriteFile(...args)
}))

const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true })

import {
  getModelsDir,
  listDownloadedModels,
  downloadModel,
  deleteModel,
  getModelPath
} from '../llm/download'

import { AVAILABLE_MODELS } from '../llm/types'

describe('llm/download', (): void => {
  beforeEach((): void => {
    vi.clearAllMocks()
    mockMkdir.mockResolvedValue(undefined)
  })

  describe('getModelsDir', (): void => {
    it('returns userData/models path', (): void => {
      const result = getModelsDir()
      expect(result).toBe(path.join('/mock/userData', 'models'))
    })
  })

  describe('listDownloadedModels', (): void => {
    it('returns empty array when no models exist', async (): Promise<void> => {
      mockReaddir.mockResolvedValue([])

      const models = await listDownloadedModels()

      expect(models).toEqual([])
      expect(mockMkdir).toHaveBeenCalledWith(path.join('/mock/userData', 'models'), {
        recursive: true
      })
    })

    it('matches files against AVAILABLE_MODELS catalog', async (): Promise<void> => {
      const knownModel = AVAILABLE_MODELS[0]
      mockReaddir.mockResolvedValue([knownModel.filename, 'unknown-model.gguf'])
      mockStat.mockResolvedValue({ mtimeMs: 1700000000000 })

      const models = await listDownloadedModels()

      expect(models).toHaveLength(1)
      expect(models[0].id).toBe(knownModel.id)
      expect(models[0].filename).toBe(knownModel.filename)
      expect(models[0].path).toBe(path.join('/mock/userData', 'models', knownModel.filename))
      expect(models[0].downloadedAt).toBeTruthy()
    })
  })

  describe('downloadModel', (): void => {
    function createMockStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
      let index = 0
      return new ReadableStream<Uint8Array>({
        pull(controller: ReadableStreamDefaultController<Uint8Array>): void {
          if (index < chunks.length) {
            controller.enqueue(chunks[index])
            index++
          } else {
            controller.close()
          }
        }
      })
    }

    it('emits progress events with increasing bytes', async (): Promise<void> => {
      const modelInfo = AVAILABLE_MODELS[0]
      const chunk1 = new Uint8Array([1, 2, 3])
      const chunk2 = new Uint8Array([4, 5, 6])
      const body = createMockStream([chunk1, chunk2])

      mockFetch.mockResolvedValue({
        ok: true,
        headers: {
          get: (name: string): string | null => (name === 'content-length' ? '6' : null)
        },
        body
      })
      mockRename.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const progressEvents: Array<{
        receivedBytes: number
        totalBytes: number
        percent: number
      }> = []
      const onProgress = vi.fn(
        (p: { receivedBytes: number; totalBytes: number; percent: number }): void => {
          progressEvents.push({ ...p })
        }
      )

      const { promise } = downloadModel(modelInfo, onProgress)
      await promise

      expect(progressEvents.length).toBeGreaterThanOrEqual(2)
      expect(progressEvents[0].receivedBytes).toBe(3)
      expect(progressEvents[1].receivedBytes).toBe(6)
      expect(progressEvents[1].percent).toBe(100)
    })

    it('skips SHA256 verification when sha256 is placeholder (all zeros)', async (): Promise<void> => {
      const modelInfo = AVAILABLE_MODELS[0]
      const body = createMockStream([new Uint8Array([1, 2, 3])])

      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: (): string | null => '3' },
        body
      })
      mockRename.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { promise } = downloadModel(modelInfo, vi.fn())
      const result = await promise

      expect(result.id).toBe(modelInfo.id)
      expect(mockRename).toHaveBeenCalled()
    })

    it('rejects with checksum error on SHA256 mismatch', async (): Promise<void> => {
      const modelInfo = {
        ...AVAILABLE_MODELS[0],
        sha256: 'definitely_wrong_expected_hash_value'
      }
      const body = createMockStream([new Uint8Array([1, 2, 3])])

      mockFetch.mockResolvedValue({
        ok: true,
        headers: { get: (): string | null => '3' },
        body
      })
      mockRename.mockResolvedValue(undefined)
      mockWriteFile.mockResolvedValue(undefined)

      const { promise } = downloadModel(modelInfo, vi.fn())

      await expect(promise).rejects.toThrow(/checksum/i)
      expect(mockUnlink).toHaveBeenCalled()
    })

    it('cancellation via AbortController cleans up temp file', async (): Promise<void> => {
      const modelInfo = AVAILABLE_MODELS[0]

      mockFetch.mockImplementation(
        (_url: string, init?: { signal?: AbortSignal }): Promise<unknown> => {
          let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
          const body = new ReadableStream<Uint8Array>({
            start(controller: ReadableStreamDefaultController<Uint8Array>): void {
              streamController = controller
              controller.enqueue(new Uint8Array([1, 2, 3]))
            }
          })

          if (init?.signal) {
            init.signal.addEventListener('abort', (): void => {
              streamController?.error(new Error('The operation was aborted'))
            })
          }

          return Promise.resolve({
            ok: true,
            headers: { get: (): string | null => '1000000' },
            body
          })
        }
      )
      mockUnlink.mockResolvedValue(undefined)

      const { promise, abort } = downloadModel(modelInfo, vi.fn())

      await new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, 10)
      })

      abort.abort()

      await expect(promise).rejects.toThrow(/abort/i)
      expect(mockUnlink).toHaveBeenCalledWith(
        path.join('/mock/userData', 'models', `${modelInfo.filename}.downloading`)
      )
    })
  })

  describe('deleteModel', (): void => {
    it('removes the model file', async (): Promise<void> => {
      mockUnlink.mockResolvedValue(undefined)

      const modelInfo = AVAILABLE_MODELS[0]
      await deleteModel(modelInfo.id)

      expect(mockUnlink).toHaveBeenCalledWith(
        path.join('/mock/userData', 'models', modelInfo.filename)
      )
    })
  })

  describe('getModelPath', (): void => {
    it('returns path for downloaded model', async (): Promise<void> => {
      mockAccess.mockResolvedValue(undefined)

      const modelInfo = AVAILABLE_MODELS[0]
      const result = await getModelPath(modelInfo.id)

      expect(result).toBe(path.join('/mock/userData', 'models', modelInfo.filename))
    })

    it('returns null when model is not downloaded', async (): Promise<void> => {
      mockAccess.mockRejectedValue(new Error('ENOENT'))

      const modelInfo = AVAILABLE_MODELS[0]
      const result = await getModelPath(modelInfo.id)

      expect(result).toBeNull()
    })
  })
})
