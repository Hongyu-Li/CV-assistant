export interface LocalModelInfo {
  id: string
  name: string
  displayName: string
  repo: string
  filename: string
  size: number
  sha256: string
  quantization: string
  description: string
}

export interface DownloadedModel extends LocalModelInfo {
  path: string
  downloadedAt: string
}

export type EngineStatus = 'stopped' | 'starting' | 'running' | 'error'

export interface DownloadProgress {
  modelId: string
  receivedBytes: number
  totalBytes: number
  percent: number
}

export interface EngineState {
  status: EngineStatus
  port: number | null
  modelId: string | null
  error: string | null
}

/**
 * Curated Gemma 4 GGUF models.
 * IMPORTANT: sha256 values are placeholders — verify at implementation time.
 */
export const AVAILABLE_MODELS: readonly LocalModelInfo[] = [
  {
    id: 'gemma-4-e2b-it',
    name: 'gemma-4-e2b-it',
    displayName: 'Gemma 4 E2B-it',
    repo: 'ggml-org/gemma-4-E2B-it-GGUF',
    filename: 'gemma-4-e2b-it-Q8_0.gguf',
    size: 4_970_000_000,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    quantization: 'Q8_0',
    description: 'Smaller model, faster inference. Recommended for 8GB+ RAM.'
  },
  {
    id: 'gemma-4-e4b-it',
    name: 'gemma-4-e4b-it',
    displayName: 'Gemma 4 E4B-it',
    repo: 'ggml-org/gemma-4-E4B-it-GGUF',
    filename: 'gemma-4-e4b-it-Q4_K_M.gguf',
    size: 5_340_000_000,
    sha256: '0000000000000000000000000000000000000000000000000000000000000000',
    quantization: 'Q4_K_M',
    description: 'Larger model, better quality. Recommended for 16GB+ RAM.'
  }
] as const
