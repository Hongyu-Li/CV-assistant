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

import type {
  AppDeps,
  DialogDeps,
  ShellOpenPathDeps,
  ProfileSaveData,
  CvSaveData,
  AiChatMessage
} from '../handlers'

type FsMocks = typeof import('../fs')
type HandlerModule = typeof import('../handlers')

const mockFetch = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: mockFetch, writable: true })

function createShellOpenPathDeps(params: {
  home: string
  openPathResult?: string
}): ShellOpenPathDeps {
  const { home, openPathResult } = params
  const openPath = vi.fn(async (): Promise<string> => openPathResult ?? '')
  const getPath = vi.fn((name: string): string => {
    if (name === 'home') return home
    return `/mock-${name}`
  })

  return {
    shell: { openPath } as unknown as ShellOpenPathDeps['shell'],
    app: { getPath } as unknown as ShellOpenPathDeps['app']
  }
}

function createAppDeps(params: { home: string; version?: string }): AppDeps {
  const { home, version } = params
  const getPath = vi.fn((name: string): string => {
    if (name === 'home') return home
    return `/mock-${name}`
  })
  const getVersion = vi.fn((): string => version ?? '0.0.0')

  return {
    app: { getPath, getVersion } as unknown as AppDeps['app']
  }
}

function createDialogDeps(params: { canceled: boolean; filePaths: string[] }): DialogDeps {
  const showOpenDialog = vi.fn(
    async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({
      canceled: params.canceled,
      filePaths: params.filePaths
    })
  )

  return {
    dialog: { showOpenDialog } as unknown as DialogDeps['dialog']
  }
}

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
  let fs: FsMocks
  let handlers: HandlerModule

  beforeEach(async (): Promise<void> => {
    vi.resetAllMocks()
    mockFetch.mockReset()
    vi.spyOn(console, 'warn').mockImplementation((): void => {})
    vi.spyOn(console, 'error').mockImplementation((): void => {})

    fs = await import('../fs')
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
        ]
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

    it('returns timeout error when fetch takes longer than 60 seconds', async (): Promise<void> => {
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

        // Advance past the 60s timeout
        await vi.advanceTimersByTimeAsync(60_000)

        const result = await resultPromise
        expect(result).toEqual({
          success: false,
          error: 'AI request timed out after 60 seconds'
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

      expect(result).toEqual({ success: false, error: 'net' })
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
        error: 'AI test request timed out after 60 seconds'
      })
    })
  })

  describe('handleShellOpenPath', (): void => {
    it('allows path within default workspace and calls shell.openPath', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test', openPathResult: '' })
      const result = await handlers.handleShellOpenPath(
        '/mock-userData/workspace/resumes/a.md',
        deps
      )
      expect(result).toBe('')
      expect(vi.mocked(deps.shell.openPath)).toHaveBeenCalledWith(
        '/mock-userData/workspace/resumes/a.md'
      )
    })

    it('denies path outside workspace (and not home)', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test' })
      const result = await handlers.handleShellOpenPath('/Users/test/Downloads/file.txt', deps)
      expect(result).toBe('Access denied: path is outside workspace')
      expect(vi.mocked(deps.shell.openPath)).not.toHaveBeenCalled()
    })

    it('allows home directory path', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test', openPathResult: 'ok' })
      const result = await handlers.handleShellOpenPath('/Users/test', deps)
      expect(result).toBe('ok')
      expect(vi.mocked(deps.shell.openPath)).toHaveBeenCalledWith('/Users/test')
    })
  })

  describe('handleProfileLoad', (): void => {
    it('loads index.json, summary.md, work exp .md files, and project .md files', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summaryFile: 'summary.md' },
        workExperience: [
          {
            id: '1',
            company: 'Co',
            role: 'Dev',
            date: '2020',
            descriptionFile: 'work-exp-1.md'
          }
        ],
        projects: [
          {
            id: 'p1',
            name: 'Proj',
            techStack: 'TS',
            descriptionFile: 'project-p1.md'
          }
        ]
      }

      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/summary.md') return 'SUM'
          if (filename === 'profile/work-exp-1.md') return 'WORK'
          if (filename === 'profile/project-p1.md') return 'PROJ'
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: 'SUM' },
        workExperience: [
          { id: '1', company: 'Co', role: 'Dev', date: '2020', description: 'WORK' }
        ],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: 'PROJ' }]
      })
      expect(vi.mocked(fs.readWorkspaceFile)).toHaveBeenCalledWith('profile/index.json', '/ws')
    })

    it('fills defaults when personalInfo/workExperience/projects are missing', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(JSON.stringify({}))

      const result = await handlers.handleProfileLoad('/ws')

      expect(result).toEqual({
        personalInfo: { name: '', email: '', phone: '', summary: '' },
        workExperience: [],
        projects: []
      })
    })

    it('returns {} when no profile exists (read index fails)', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({})
    })
  })

  describe('handleProfileSave', (): void => {
    it('writes summary.md, work exp .md, project .md, and index.json', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const data: ProfileSaveData = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: 'SUM' },
        workExperience: [
          { id: '1', company: 'Co', role: 'Dev', date: '2020', description: 'WORK' }
        ],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: 'PROJ' }]
      }

      const result = await handlers.handleProfileSave(data, '/ws')
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/summary.md',
        'SUM',
        '/ws'
      )
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/work-exp-1.md',
        'WORK',
        '/ws'
      )
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/project-p1.md',
        'PROJ',
        '/ws'
      )

      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(indexJson['personalInfo']).toMatchObject({
        name: 'A',
        email: 'B',
        phone: 'C',
        summaryFile: 'summary.md'
      })
    })

    it('returns {success:false} when write fails', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('boom'))

      const result = await handlers.handleProfileSave({ personalInfo: { summary: 'x' } }, '/ws')
      expect(result).toEqual({ success: false, error: 'boom' })
    })
  })

  describe('handleSettingsLoad', (): void => {
    it('returns parsed JSON when settings file exists', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue('{"theme":"dark"}')
      const result = await handlers.handleSettingsLoad()
      expect(result).toEqual({ theme: 'dark' })
      expect(vi.mocked(fs.readWorkspaceFile)).toHaveBeenCalledWith('settings.json')
    })

    it('returns {} when settings file does not exist', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      const result = await handlers.handleSettingsLoad()
      expect(result).toEqual({})
    })
  })

  describe('handleSettingsSave', (): void => {
    it('writes stringified JSON to settings.json', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const result = await handlers.handleSettingsSave({ a: 1 })
      expect(result).toEqual({ success: true })

      const call = vi.mocked(fs.writeWorkspaceFile).mock.calls[0]
      expect(call?.[0]).toBe('settings.json')
      expect(call?.[1]).toBe(JSON.stringify({ a: 1 }, null, 2))
    })

    it('returns {success:false} when settings write fails', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('bad'))
      const result = await handlers.handleSettingsSave({})
      expect(result).toEqual({ success: false, error: 'bad' })
    })
  })

  describe('handleCvSave', (): void => {
    it('with generatedCV: saves .md and saves .json without generatedCV but with mdFile ref', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)

      const data: CvSaveData = { title: 'T', generatedCV: '# CV' }
      const result = await handlers.handleCvSave({ filename: 'cv-1', data, workspacePath: '/ws' })
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'resumes/cv-1.md',
        '# CV',
        '/ws'
      )
      const jsonCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'resumes/cv-1.json')
      expect(jsonCall).toBeTruthy()

      const json = JSON.parse(String(jsonCall?.[1])) as Record<string, unknown>
      expect(json['title']).toBe('T')
      expect(json['mdFile']).toBe('cv-1.md')
      expect('generatedCV' in json).toBe(false)
    })

    it('without generatedCV: saves .json only', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)

      const data: CvSaveData = { title: 'T', mdFile: 'existing.md' }
      const result = await handlers.handleCvSave({
        filename: 'cv-2.json',
        data,
        workspacePath: '/ws'
      })
      expect(result).toEqual({ success: true })

      const calls = vi.mocked(fs.writeWorkspaceFile).mock.calls
      expect(calls.find((c) => String(c[0]).endsWith('.md'))).toBeUndefined()
      expect(calls.find((c) => c[0] === 'resumes/cv-2.json')).toBeTruthy()
    })

    it('returns {success:false} on write error', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('fail'))
      const result = await handlers.handleCvSave({ filename: 'x', data: {}, workspacePath: '/ws' })
      expect(result).toEqual({ success: false, error: 'fail' })
    })
  })

  describe('handleCvRead', (): void => {
    it('with mdFile ref: reads .json then reads .md and populates generatedCV', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ title: 'T', mdFile: 'a.md' })
          if (filename === 'resumes/a.md') return '# MD'
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject({ title: 'T', mdFile: 'a.md', generatedCV: '# MD' })
      }
    })

    it('when md read fails: sets generatedCV to empty string', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ mdFile: 'a.md' })
          if (filename === 'resumes/a.md') throw new Error('no md')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject({ mdFile: 'a.md', generatedCV: '' })
      }
    })

    it('without mdFile: returns parsed JSON as-is', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(JSON.stringify({ title: 'T' }))
      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true, data: { title: 'T' } })
    })
  })

  describe('handleCvList', (): void => {
    it('lists .json files, reads each, and returns id/filename/lastModified', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockResolvedValue(['a.json', 'a.md', 'b.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ title: 'A' })
          if (filename === 'resumes/b.json') return JSON.stringify({ title: 'B' })
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.getWorkspaceLastModified).mockResolvedValue(new Date('2024-01-01T00:00:00.000Z'))

      const result = await handlers.handleCvList('/ws')
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ filename: 'a.json', id: 'a', title: 'A' })
      expect(result[0]?.['lastModified']).toBe('2024-01-01T00:00:00.000Z')
      expect(result[1]).toMatchObject({ filename: 'b.json', id: 'b', title: 'B' })
    })

    it('skips invalid CV JSON files', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockResolvedValue(['good.json', 'bad.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/good.json') return '{"ok":true}'
          if (filename === 'resumes/bad.json') return 'not json'
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.getWorkspaceLastModified).mockResolvedValue(new Date('2024-01-01T00:00:00.000Z'))

      const result = await handlers.handleCvList('/ws')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ filename: 'good.json', id: 'good', ok: true })
    })

    it('returns [] when listing resumes directory fails', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockRejectedValue(new Error('boom'))

      const result = await handlers.handleCvList('/ws')

      expect(result).toEqual([])
    })
  })

  describe('handleCvDelete', (): void => {
    it('deletes .json and tries to delete .md', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true })
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('resumes/a.json', '/ws')
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('resumes/a.md', '/ws')
    })

    it('ignores missing .md delete error and still returns success', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('no md'))
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true })
    })

    it('returns error when deleting .json fails', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile).mockRejectedValue(new Error('fail'))
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: false, error: 'fail' })
    })
  })

  describe('handleDialogOpenDirectory', (): void => {
    it('returns null when dialog is canceled', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: true, filePaths: [] })
      const result = await handlers.handleDialogOpenDirectory(deps)
      expect(result).toBeNull()
      expect(vi.mocked(deps.dialog.showOpenDialog)).toHaveBeenCalledWith({
        properties: ['openDirectory', 'createDirectory']
      })
    })

    it('returns first selected path when not canceled', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: ['/a', '/b'] })
      const result = await handlers.handleDialogOpenDirectory(deps)
      expect(result).toBe('/a')
    })
  })

  describe('handleGetDefaultWorkspacePath', (): void => {
    it("returns join(userDataPath, 'workspace')", async (): Promise<void> => {
      const deps = createAppDeps({ home: '/Users/test' })
      const result = await handlers.handleGetDefaultWorkspacePath(deps)
      expect(result).toBe('/mock-userData/workspace')
    })
  })

  describe('handleWorkspacePrecheck', (): void => {
    it('returns {success:true, ...result} on success', async (): Promise<void> => {
      vi.mocked(fs.precheckWorkspaceMigration).mockResolvedValue({
        fileCount: 1,
        files: ['a.json'],
        conflicts: []
      })

      const result = await handlers.handleWorkspacePrecheck({ from: '/a', to: '/b' })
      expect(result).toEqual({ success: true, fileCount: 1, files: ['a.json'], conflicts: [] })
      expect(vi.mocked(fs.precheckWorkspaceMigration)).toHaveBeenCalledWith('/a', '/b')
    })

    it('returns {success:false} on error', async (): Promise<void> => {
      vi.mocked(fs.precheckWorkspaceMigration).mockRejectedValue(new Error('boom'))
      const result = await handlers.handleWorkspacePrecheck({ from: '/a', to: '/b' })
      expect(result).toEqual({ success: false, error: 'boom' })
    })
  })

  describe('handleWorkspaceMigrate', (): void => {
    it('returns migration result on success', async (): Promise<void> => {
      const migration = {
        success: true,
        migrated: ['a'],
        skipped: [],
        errors: []
      }
      vi.mocked(fs.migrateWorkspaceFiles).mockResolvedValue(migration)

      const result = await handlers.handleWorkspaceMigrate({
        from: '/a',
        to: '/b',
        overwriteConflicts: true
      })
      expect(result).toEqual(migration)
      expect(vi.mocked(fs.migrateWorkspaceFiles)).toHaveBeenCalledWith('/a', '/b', true)
    })

    it('returns structured failure result when migrate throws', async (): Promise<void> => {
      vi.mocked(fs.migrateWorkspaceFiles).mockRejectedValue(new Error('migrate failed'))
      const result = await handlers.handleWorkspaceMigrate({
        from: '/a',
        to: '/b',
        overwriteConflicts: false
      })
      expect(result).toEqual({
        success: false,
        migrated: [],
        skipped: [],
        errors: [{ file: '', error: 'migrate failed' }]
      })
    })
  })

  describe('handleGetVersion', (): void => {
    it('returns app.getVersion()', async (): Promise<void> => {
      const deps = createAppDeps({ home: '/Users/test', version: '9.9.9' })
      const result = await handlers.handleGetVersion(deps)
      expect(result).toBe('9.9.9')
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
  })
})
