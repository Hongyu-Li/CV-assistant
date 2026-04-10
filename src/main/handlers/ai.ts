import { toErrorMessage } from '../utils'
import type { AiChatMessage, IpcSuccessResponse, IpcErrorResponse } from './types'

export function sanitizeApiError(statusCode: number, rawError: string): string {
  const truncated = rawError.length > 500 ? rawError.substring(0, 500) + '...' : rawError
  const sanitized = truncated.replace(
    /(?:Bearer |sk-|gsk_|xai-|AIza[A-Za-z0-9_-]+|key-|api[_-]?key[=:]\s*)[^\s"',}]*/gi,
    '[REDACTED]'
  )
  return `API error ${statusCode}: ${sanitized}`
}

function validateBaseUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Only http and https protocols are allowed')
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error('Invalid base URL')
    }
    throw e
  }
}

interface AiRequestConfig {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
}

function buildAiRequestBase(config: AiRequestConfig): {
  url: string
  headers: Record<string, string>
} {
  const baseUrl =
    config.baseUrl ||
    (config.provider === 'anthropic' ? 'https://api.anthropic.com/v1' : 'https://api.openai.com/v1')
  validateBaseUrl(baseUrl)

  const url =
    config.provider === 'anthropic' ? `${baseUrl}/messages` : `${baseUrl}/chat/completions`

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey
    headers['anthropic-version'] = '2023-06-01'
  } else if (config.provider !== 'ollama' && config.provider !== 'local') {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  return { url, headers }
}

export async function handleAiChat(params: {
  provider: string
  apiKey: string
  model: string
  messages: AiChatMessage[]
  baseUrl: string
  timeoutMs?: number
}): Promise<{ success: true; content: string } | IpcErrorResponse> {
  const timeoutMs = params.timeoutMs ?? 30_000
  try {
    const { url, headers } = buildAiRequestBase(params)

    let body: string
    if (params.provider === 'anthropic') {
      const systemMsgs = params.messages.filter((m) => m.role === 'system')
      const nonSystemMsgs = params.messages.filter((m) => m.role !== 'system')
      body = JSON.stringify({
        model: params.model,
        max_tokens: 4096,
        ...(systemMsgs.length > 0 ? { system: systemMsgs.map((m) => m.content).join('\n') } : {}),
        messages: nonSystemMsgs
      })
    } else {
      body = JSON.stringify({ model: params.model, messages: params.messages, max_tokens: 4096 })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      })
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : ''
          return { success: false, error: `Rate limited by AI provider.${retryMsg}` }
        }
        const errorText = await response.text()
        return { success: false, error: sanitizeApiError(response.status, errorText) }
      }

      const data = (await response.json()) as Record<string, unknown>

      if (params.provider === 'anthropic') {
        const content = (data['content'] as Array<{ text?: string }> | undefined)?.[0]?.text || ''
        return { success: true, content }
      }
      const choices = data['choices'] as Array<{ message?: { content?: string } }> | undefined
      return { success: true, content: choices?.[0]?.message?.content || '' }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSec = Math.round(timeoutMs / 1000)
      return { success: false, error: `AI request timed out after ${timeoutSec} seconds` }
    }
    return { success: false, error: `AI chat failed: ${toErrorMessage(error)}` }
  }
}

export async function handleAiTest(params: {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
}): Promise<IpcSuccessResponse | IpcErrorResponse> {
  try {
    const { url, headers } = buildAiRequestBase(params)

    let body: string
    if (params.provider === 'anthropic') {
      body = JSON.stringify({
        model: params.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    } else {
      body = JSON.stringify({
        model: params.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal
      })
      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After')
          const retryMsg = retryAfter ? ` Retry after ${retryAfter} seconds.` : ''
          return { success: false, error: `Rate limited by AI provider.${retryMsg}` }
        }
        const errorText = await response.text()
        return { success: false, error: sanitizeApiError(response.status, errorText) }
      }
      return { success: true }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'AI test request timed out after 30 seconds' }
    }
    return { success: false, error: `AI test failed: ${toErrorMessage(error)}` }
  }
}
