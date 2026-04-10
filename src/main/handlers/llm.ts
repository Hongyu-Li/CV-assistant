import type { BrowserWindow } from 'electron'
import { startEngine, stopEngine, getEngineState } from '../llm/engine'
import { listDownloadedModels, downloadModel, deleteModel, getModelPath } from '../llm/download'
import { AVAILABLE_MODELS } from '../llm/types'
import type { DownloadProgress, EngineState, DownloadedModel, LocalModelInfo } from '../llm/types'
import type { IpcErrorResponse } from './types'
import { toErrorMessage } from '../utils'

const MAS_ERROR: IpcErrorResponse = {
  success: false,
  error: 'Local LLM is not available in App Store builds'
}

const FILE_PATH_PATTERN =
  /(?:\/(?:Users|home|tmp|var|opt|etc|private)\/[^\s"',}]+|[A-Z]:\\[^\s"',}]+)/g

function sanitizeLlmError(message: string): string {
  return message.replace(FILE_PATH_PATTERN, '[path]')
}

function isMas(): boolean {
  return !!(process as NodeJS.Process & { mas?: boolean }).mas
}

interface IpcMainLike {
  handle: (channel: string, handler: (...args: unknown[]) => unknown) => void
}

let activeDownloadAbort: AbortController | null = null

export function registerLlmHandlers(ipcMain: IpcMainLike, mainWindow: BrowserWindow): void {
  ipcMain.handle(
    'llm:startEngine',
    async (
      _event: unknown,
      rawArgs: unknown
    ): Promise<{ success: true; state: EngineState } | IpcErrorResponse> => {
      if (isMas()) return MAS_ERROR
      const args = rawArgs as { modelId: string }
      const modelPath = await getModelPath(args.modelId)
      if (!modelPath) {
        return { success: false, error: 'Model not found. Please download it first.' }
      }
      try {
        const state = await startEngine(modelPath)
        return { success: true, state }
      } catch (error) {
        return { success: false, error: sanitizeLlmError(toErrorMessage(error)) }
      }
    }
  )

  ipcMain.handle('llm:stopEngine', async (): Promise<{ success: true } | IpcErrorResponse> => {
    if (isMas()) return MAS_ERROR
    try {
      await stopEngine()
      return { success: true }
    } catch (error) {
      return { success: false, error: sanitizeLlmError(toErrorMessage(error)) }
    }
  })

  ipcMain.handle(
    'llm:engineStatus',
    async (): Promise<{ success: true; state: EngineState } | IpcErrorResponse> => {
      if (isMas()) return MAS_ERROR
      return { success: true, state: getEngineState() }
    }
  )

  ipcMain.handle(
    'llm:listModels',
    async (): Promise<
      | {
          success: true
          models: Array<LocalModelInfo & { downloaded: boolean; downloadedAt: string | null }>
        }
      | IpcErrorResponse
    > => {
      if (isMas()) return MAS_ERROR
      try {
        const downloaded = await listDownloadedModels()
        const downloadedMap = new Map<string, DownloadedModel>(
          downloaded.map((m: DownloadedModel): [string, DownloadedModel] => [m.id, m])
        )

        const models = AVAILABLE_MODELS.map(
          (
            model: LocalModelInfo
          ): LocalModelInfo & { downloaded: boolean; downloadedAt: string | null } => {
            const dl = downloadedMap.get(model.id)
            return {
              ...model,
              downloaded: !!dl,
              downloadedAt: dl?.downloadedAt ?? null
            }
          }
        )

        return { success: true, models }
      } catch (error) {
        return { success: false, error: sanitizeLlmError(toErrorMessage(error)) }
      }
    }
  )

  ipcMain.handle(
    'llm:downloadModel',
    async (
      _event: unknown,
      rawArgs: unknown
    ): Promise<{ success: true; model: DownloadedModel } | IpcErrorResponse> => {
      if (isMas()) return MAS_ERROR

      const args = rawArgs as { modelId: string }
      const modelInfo = AVAILABLE_MODELS.find((m: LocalModelInfo): boolean => m.id === args.modelId)
      if (!modelInfo) {
        return { success: false, error: `Unknown model: ${args.modelId}` }
      }

      try {
        const onProgress = (progress: DownloadProgress): void => {
          mainWindow.webContents.send('llm:downloadProgress', progress)
        }

        const { promise, abort } = downloadModel(modelInfo, onProgress)
        activeDownloadAbort = abort

        const model = await promise
        activeDownloadAbort = null

        return { success: true, model }
      } catch (error) {
        activeDownloadAbort = null
        return { success: false, error: sanitizeLlmError(toErrorMessage(error)) }
      }
    }
  )

  ipcMain.handle('llm:cancelDownload', async (): Promise<{ success: true } | IpcErrorResponse> => {
    if (isMas()) return MAS_ERROR
    if (activeDownloadAbort) {
      activeDownloadAbort.abort()
      activeDownloadAbort = null
    }
    return { success: true }
  })

  ipcMain.handle(
    'llm:deleteModel',
    async (_event: unknown, rawArgs: unknown): Promise<{ success: true } | IpcErrorResponse> => {
      if (isMas()) return MAS_ERROR
      const args = rawArgs as { modelId: string }
      try {
        await deleteModel(args.modelId)
        return { success: true }
      } catch (error) {
        return { success: false, error: sanitizeLlmError(toErrorMessage(error)) }
      }
    }
  )
}
