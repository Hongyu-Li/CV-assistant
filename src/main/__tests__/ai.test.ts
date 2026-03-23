import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../fs', () => ({
  readWorkspaceFile: vi.fn(),
  writeWorkspaceFile: vi.fn(),
  listWorkspaceFiles: vi.fn(),
  listWorkspaceSubdirFiles: vi.fn(),
  deleteWorkspaceFile: vi.fn(),
  getWorkspaceLastModified: vi.fn(),
  precheckWorkspaceMigration: vi.fn(),
  migrateWorkspaceFiles: vi.fn(),
  readUserDataFile: vi.fn()
}))

import type { AiChatMessage } from '../handlers'

type HandlerModule = typeof import('../handlers')

const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true })

function mockFetchOkJson(data: unknown): void {
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async (): Promise<unknown> => data,
    text: async (): Promise<string> => ''
  })
}

function mockFetchNotOk(status: number, text: string): void {
  mockFetch.mockResolvedValue({
    ok: false,
    status,
    json: async (): Promise<unknown> => ({}),
    text: async (): Promise<string> => text
  })
}

function getFetchCall(): {
  url: string
  init: RequestInit & { headers?: Record<string, string>; body?: string }
} {
  const call = mockFetch.mock.calls[0] as unknown as [string, unknown]
  const url = call[0]
  const init = call[1] as RequestInit & { headers?: Record<string, string>; body?: string }
  return { url, init }
}

describe('main/handlers', (): void => {
  let handlers: HandlerModule

  beforeEach(async (): Promise<void> => {
    vi.resetAllMocks()
    mockFetch.mockReset()
    vi.spyOn(console, 'warn').mockImplementation((): void => {})
    vi.spyOn(console, 'error').mockImplementation((): void => {})

    await import('../fs')
    handlers = await import('../handlers')
  })

  describe('handleAiChat', (): void => {
    it('anthropic: uses baseUrl + /messages, correct headers, and body with system extracted + max_tokens 4096', async (): Promise<void> => {
      mockFetchOkJson({ content: [{ text: 'Hello' }] })

      const messages: AiChatMessage[] = [
        { role: 'system', content: 'You are helpful.' },
        { role: 'system', content: 'Follow instructions.' },
        { role: 'user', content: 'Hi' }
      ]

      const result = await handlers.handleAiChat({
        provider: 'anthropic',
        apiKey: 'k-anth',
        model: 'claude-test',
        messages,
        baseUrl: 'https://api.anthropic.com/v1'
      })

      expect(result).toEqual({ success: true, content: 'Hello' })

      const { url, init } = getFetchCall()
      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(init.method).toBe('POST')
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        'x-api-key': 'k-anth',
        'anthropic-version': '2023-06-01'
      })
      const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>
      expect(body['model']).toBe('claude-test')
      expect(body['max_tokens']).toBe(4096)
      expect(body['system']).toBe('You are helpful.\nFollow instructions.')
      expect(body['messages']).toEqual([{ role: 'user', content: 'Hi' }])
    })

    it('openai: uses baseUrl + /chat/completions, Authorization header, and body with messages', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'Hi there' } }] })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k-openai',
        model: 'gpt-test',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'hello' }
        ],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: true, content: 'Hi there' })

      const { url, init } = getFetchCall()
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer k-openai'
      })
      const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>
      expect(body).toEqual({
        model: 'gpt-test',
        messages: [
          { role: 'system', content: 'sys' },
          { role: 'user', content: 'hello' }
        ],
        max_tokens: 4096
      })
    })

    it('ollama: does not send Authorization header', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'ok' } }] })

      await handlers.handleAiChat({
        provider: 'ollama',
        apiKey: 'ignored',
        model: 'llama',
        messages: [{ role: 'user', content: 'hi' }],
        baseUrl: 'http://localhost:11434/v1'
      })

      const { init } = getFetchCall()
      expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
      expect(init.headers && 'Authorization' in init.headers).toBe(false)
    })

    it('non-Anthropic: includes max_tokens in request body', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'ok' } }] })
      await handlers.handleAiChat({
        provider: 'deepseek',
        apiKey: 'k-ds',
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hi' }],
        baseUrl: 'https://api.deepseek.com/v1'
      })
      const { init } = getFetchCall()
      const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>
      expect(body).toHaveProperty('max_tokens', 4096)
    })

    it('parses anthropic response content[0].text', async (): Promise<void> => {
      mockFetchOkJson({ content: [{ text: 'A' }] })

      const result = await handlers.handleAiChat({
        provider: 'anthropic',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.anthropic.com/v1'
      })

      expect(result).toEqual({ success: true, content: 'A' })
    })

    it('parses openai response choices[0].message.content', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'B' } }] })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: true, content: 'B' })
    })

    it('returns API error when response is not ok', async (): Promise<void> => {
      mockFetchNotOk(401, 'nope')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: false, error: 'API error 401: nope' })
    })

    it('returns AI chat failed on network error', async (): Promise<void> => {
      mockFetch.mockRejectedValue(new Error('boom'))

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: false, error: 'AI chat failed: boom' })
    })

    it('uses provided baseUrl (custom) rather than defaults', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'ok' } }] })

      await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'http://localhost:1234/v1'
      })

      const { url } = getFetchCall()
      expect(url).toBe('http://localhost:1234/v1/chat/completions')
    })

    it('returns timeout error when fetch takes longer than 30 seconds', async (): Promise<void> => {
      vi.useFakeTimers()
      try {
        // Mock fetch that respects AbortSignal
        mockFetch.mockImplementation(
          (_url: string, init?: { signal?: AbortSignal }) =>
            new Promise<never>((_resolve, reject) => {
              if (init?.signal) {
                init.signal.addEventListener('abort', () => {
                  const err = new Error('The operation was aborted')
                  err.name = 'AbortError'
                  reject(err)
                })
              }
            })
        )

        const resultPromise = handlers.handleAiChat({
          provider: 'openai',
          apiKey: 'k',
          model: 'm',
          messages: [{ role: 'user', content: 'x' }],
          baseUrl: 'https://api.openai.com/v1'
        })

        // Advance past the 30s timeout
        await vi.advanceTimersByTimeAsync(30_000)

        const result = await resultPromise
        expect(result).toEqual({
          success: false,
          error: 'AI request timed out after 30 seconds'
        })
      } finally {
        vi.useRealTimers()
      }
    })

    it('returns rate-limit error with Retry-After on 429 response', async (): Promise<void> => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (name: string): string | null => (name === 'Retry-After' ? '30' : null) },
        json: async (): Promise<unknown> => ({}),
        text: async (): Promise<string> => 'rate limited'
      })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'Rate limited by AI provider. Retry after 30 seconds.'
      })
    })

    it('returns rate-limit error without Retry-After when header is absent', async (): Promise<void> => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (): null => null },
        json: async (): Promise<unknown> => ({}),
        text: async (): Promise<string> => 'rate limited'
      })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'Rate limited by AI provider.'
      })
    })

    it('429 handler returns its own message, not the sanitized raw error', async (): Promise<void> => {
      // The 429 response body contains a Bearer token that sanitizeApiError would redact.
      // If 429 is handled BEFORE sanitizeApiError, the token won't appear in the result.
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (): null => null },
        json: async (): Promise<unknown> => ({}),
        text: async (): Promise<string> => 'Bearer sk-secret-token rate limit exceeded'
      })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'Rate limited by AI provider.'
      })
      // Should NOT contain sanitized error text — 429 short-circuits before reading body
      if (!result.success) {
        expect(result.error).not.toContain('sk-secret-token')
        expect(result.error).not.toContain('[REDACTED]')
        expect(result.error).not.toContain('API error')
      }
    })

    it('rejects invalid baseUrl protocol (file:)', async (): Promise<void> => {
      mockFetchOkJson({ choices: [{ message: { content: 'x' } }] })

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'file:///etc'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain('protocol')
      }
    })
  })

  describe('handleAiTest', (): void => {
    it('anthropic: sends fixed test message and max_tokens 10', async (): Promise<void> => {
      mockFetchOkJson({})

      const result = await handlers.handleAiTest({
        provider: 'anthropic',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.anthropic.com/v1'
      })

      expect(result).toEqual({ success: true })
      const { url, init } = getFetchCall()
      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        'x-api-key': 'k',
        'anthropic-version': '2023-06-01'
      })
      const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>
      expect(body['max_tokens']).toBe(10)
      expect(body['messages']).toEqual([{ role: 'user', content: 'Hi' }])
    })

    it('openai: includes Authorization header and max_tokens 10', async (): Promise<void> => {
      mockFetchOkJson({})

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k-openai',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: true })
      const { url, init } = getFetchCall()
      expect(url).toBe('https://api.openai.com/v1/chat/completions')
      expect(init.headers).toMatchObject({
        'Content-Type': 'application/json',
        Authorization: 'Bearer k-openai'
      })
      const body = JSON.parse(init.body ?? '{}') as Record<string, unknown>
      expect(body['max_tokens']).toBe(10)
    })

    it('returns HTTP error when response is not ok', async (): Promise<void> => {
      mockFetchNotOk(400, 'bad')

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: false, error: 'API error 400: bad' })
    })

    it('returns error message when fetch throws', async (): Promise<void> => {
      mockFetch.mockRejectedValue(new Error('net'))

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({ success: false, error: 'AI test failed: net' })
    })

    it('rejects invalid baseUrl protocol (file:)', async (): Promise<void> => {
      mockFetchOkJson({})

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'file:///etc'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.toLowerCase()).toContain('protocol')
      }
    })

    it('returns timeout message when fetch aborts (AbortError)', async (): Promise<void> => {
      mockFetch.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'AI test request timed out after 30 seconds'
      })
    })

    it('returns rate-limit error with Retry-After on 429 response', async (): Promise<void> => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (name: string): string | null => (name === 'Retry-After' ? '60' : null) },
        json: async (): Promise<unknown> => ({}),
        text: async (): Promise<string> => 'rate limited'
      })

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'Rate limited by AI provider. Retry after 60 seconds.'
      })
    })

    it('returns rate-limit error without Retry-After when header is absent', async (): Promise<void> => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: { get: (): null => null },
        json: async (): Promise<unknown> => ({}),
        text: async (): Promise<string> => 'rate limited'
      })

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result).toEqual({
        success: false,
        error: 'Rate limited by AI provider.'
      })
    })
  })

  describe('sanitizeApiError', (): void => {
    it('truncates errors longer than 500 characters', async (): Promise<void> => {
      const longError = 'x'.repeat(600)
      mockFetchNotOk(500, longError)

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.length).toBeLessThan(600)
        expect(result.error).toContain('...')
      }
    })

    it('redacts Bearer tokens', async (): Promise<void> => {
      mockFetchNotOk(401, 'Invalid token: Bearer sk-abc123xyz')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('sk-abc123xyz')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('redacts sk- prefixed keys', async (): Promise<void> => {
      mockFetchNotOk(401, 'Bad key: sk-proj-abc123def456')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('sk-proj-abc123def456')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('redacts api_key= patterns', async (): Promise<void> => {
      mockFetchNotOk(400, 'Error with api_key=supersecret123 in request')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('supersecret123')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('leaves clean error messages unchanged', async (): Promise<void> => {
      mockFetchNotOk(500, 'Internal server error')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('API error 500: Internal server error')
      }
    })

    it('sanitizes errors in handleAiTest too', async (): Promise<void> => {
      mockFetchNotOk(401, 'Bearer sk-secret-token was invalid')

      const result = await handlers.handleAiTest({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('sk-secret-token')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('redacts gsk_ prefixed keys (Groq)', async (): Promise<void> => {
      mockFetchNotOk(401, 'Invalid key: gsk_abc123def456')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('gsk_abc123def456')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('redacts xai- prefixed keys (xAI/Grok)', async (): Promise<void> => {
      mockFetchNotOk(401, 'Bad key: xai-proj-secret789')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('xai-proj-secret789')
        expect(result.error).toContain('[REDACTED]')
      }
    })

    it('redacts AIza prefixed keys (Google)', async (): Promise<void> => {
      mockFetchNotOk(401, 'Invalid: AIzaSyA1234567890abcDEF')

      const result = await handlers.handleAiChat({
        provider: 'openai',
        apiKey: 'k',
        model: 'm',
        messages: [{ role: 'user', content: 'x' }],
        baseUrl: 'https://api.openai.com/v1'
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).not.toContain('AIzaSyA1234567890abcDEF')
        expect(result.error).toContain('[REDACTED]')
      }
    })
  })
})
