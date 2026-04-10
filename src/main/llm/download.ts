import { app } from 'electron'
import { createHash } from 'node:crypto'
import * as nodeFs from 'node:fs'
import * as fs from 'fs/promises'
import * as path from 'path'

import type { LocalModelInfo, DownloadedModel, DownloadProgress } from './types'
import { AVAILABLE_MODELS } from './types'

const PLACEHOLDER_SHA256 = '0000000000000000000000000000000000000000000000000000000000000000'

export function getModelsDir(): string {
  return path.join(app.getPath('userData'), 'models')
}

function findModelById(modelId: string): LocalModelInfo | undefined {
  return AVAILABLE_MODELS.find((m: LocalModelInfo): boolean => m.id === modelId)
}

export async function listDownloadedModels(): Promise<DownloadedModel[]> {
  const modelsDir = getModelsDir()
  await fs.mkdir(modelsDir, { recursive: true })

  const files = await fs.readdir(modelsDir)
  const results: DownloadedModel[] = []

  for (const filename of files) {
    const catalogEntry = AVAILABLE_MODELS.find(
      (m: LocalModelInfo): boolean => m.filename === filename
    )
    if (!catalogEntry) {
      continue
    }

    const filePath = path.join(modelsDir, filename)
    const fileStat = await fs.stat(filePath)

    results.push({
      ...catalogEntry,
      path: filePath,
      downloadedAt: new Date(fileStat.mtimeMs).toISOString()
    })
  }

  return results
}

export function downloadModel(
  modelInfo: LocalModelInfo,
  onProgress: (progress: DownloadProgress) => void
): { promise: Promise<DownloadedModel>; abort: AbortController } {
  const abort = new AbortController()

  const promise = executeDownload(modelInfo, onProgress, abort.signal)

  return { promise, abort }
}

async function executeDownload(
  modelInfo: LocalModelInfo,
  onProgress: (progress: DownloadProgress) => void,
  signal: AbortSignal
): Promise<DownloadedModel> {
  const modelsDir = getModelsDir()
  await fs.mkdir(modelsDir, { recursive: true })

  const tempPath = path.join(modelsDir, `${modelInfo.filename}.downloading`)
  const finalPath = path.join(modelsDir, modelInfo.filename)
  const url = `https://huggingface.co/${modelInfo.repo}/resolve/main/${modelInfo.filename}?download=true`

  const response = await fetch(url, { signal, redirect: 'follow' })

  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Download failed: no response body')
  }

  const contentLength = response.headers.get('content-length')
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 0

  const hash = createHash('sha256')
  const reader = response.body.getReader()
  const fileStream = nodeFs.createWriteStream(tempPath)
  let receivedBytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }

      fileStream.write(value)
      hash.update(value)
      receivedBytes += value.byteLength

      const percent = totalBytes > 0 ? Math.round((receivedBytes / totalBytes) * 100) : 0

      onProgress({
        modelId: modelInfo.id,
        receivedBytes,
        totalBytes,
        percent
      })
    }

    await new Promise<void>((resolve: () => void, reject: (err: unknown) => void): void => {
      fileStream.end((): void => {
        resolve()
      })
      fileStream.on('error', reject)
    })
  } catch (error: unknown) {
    fileStream.destroy()
    await cleanupTempFile(tempPath)
    throw error
  }

  const computedHash = hash.digest('hex')
  const isPlaceholder = modelInfo.sha256 === PLACEHOLDER_SHA256

  if (!isPlaceholder && computedHash !== modelInfo.sha256) {
    await cleanupTempFile(tempPath)
    throw new Error(`SHA256 checksum mismatch: expected ${modelInfo.sha256}, got ${computedHash}`)
  }

  await fs.rename(tempPath, finalPath)

  return {
    ...modelInfo,
    path: finalPath,
    downloadedAt: new Date().toISOString()
  }
}

async function cleanupTempFile(tempPath: string): Promise<void> {
  try {
    await fs.unlink(tempPath)
  } catch (_: unknown) {
    void _
  }
}

export async function deleteModel(modelId: string): Promise<void> {
  const modelEntry = findModelById(modelId)
  if (!modelEntry) {
    throw new Error(`Unknown model: ${modelId}`)
  }

  const filePath = path.join(getModelsDir(), modelEntry.filename)
  await fs.unlink(filePath)
}

export async function getModelPath(modelId: string): Promise<string | null> {
  const modelEntry = findModelById(modelId)
  if (!modelEntry) {
    return null
  }

  const filePath = path.join(getModelsDir(), modelEntry.filename)

  try {
    await fs.access(filePath)
    return filePath
  } catch {
    return null
  }
}
