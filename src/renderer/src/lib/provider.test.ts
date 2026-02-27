import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PROVIDER_CONFIGS, generateCV, type AIProvider, type GenerateCVOptions } from './provider'

// Mock window.electron for IPC calls
const mockInvoke = vi.fn()
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      invoke: mockInvoke,
      on: vi.fn(),
      removeListener: vi.fn()
    }
  },
  writable: true
})

describe('PROVIDER_CONFIGS', () => {
  it('defines exactly 12 providers', (): void => {
    const providers = Object.keys(PROVIDER_CONFIGS)
    expect(providers).toHaveLength(12)
    expect(providers).toEqual([
      'openai',
      'anthropic',
      'google',
      'deepseek',
      'ollama',
      'openrouter',
      'groq',
      'mistral',
      'qwen',
      'zhipu',
      'kimi',
      'custom'
    ])
  })

  it('has correct structure for every provider config', (): void => {
    for (const [key, config] of Object.entries(PROVIDER_CONFIGS)) {
      expect(config).toHaveProperty('label')
      expect(config).toHaveProperty('defaultBaseUrl')
      expect(config).toHaveProperty('defaultModel')
      expect(config).toHaveProperty('requiresApiKey')
      expect(typeof config.label).toBe('string')
      expect(typeof config.defaultBaseUrl).toBe('string')
      expect(typeof config.defaultModel).toBe('string')
      expect(typeof config.requiresApiKey).toBe('boolean')
      // label should be non-empty for every provider
      expect(config.label.length).toBeGreaterThan(0)
      // defaultModel should be non-empty except for custom
      if (key !== 'custom') {
        expect(config.defaultModel.length).toBeGreaterThan(0)
      }
    }
  })

  it('has valid URLs for all providers except custom', (): void => {
    for (const [key, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (key === 'custom') {
        expect(config.defaultBaseUrl).toBe('')
      } else {
        expect(() => new URL(config.defaultBaseUrl)).not.toThrow()
      }
    }
  })

  it('only ollama does not require an API key', (): void => {
    for (const [key, config] of Object.entries(PROVIDER_CONFIGS)) {
      if (key === 'ollama') {
        expect(config.requiresApiKey).toBe(false)
      } else {
        expect(config.requiresApiKey).toBe(true)
      }
    }
  })
})

describe('generateCV', () => {
  const baseOptions: GenerateCVOptions = {
    profile: 'Senior engineer with 10 years experience',
    jobDescription: 'Looking for a staff engineer',
    provider: 'openai' as AIProvider,
    apiKey: 'sk-test-123',
    model: 'gpt-5.2',
    baseUrl: 'https://api.openai.com/v1'
  }

  beforeEach((): void => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue('# Generated CV\n\nContent here')
  })

  it('calls IPC with correct arguments', async (): Promise<void> => {
    await generateCV(baseOptions)

    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith('ai:chat', {
      provider: 'openai',
      apiKey: 'sk-test-123',
      model: 'gpt-5.2',
      messages: expect.arrayContaining([
        expect.objectContaining({ role: 'system' }),
        expect.objectContaining({ role: 'user' })
      ]),
      baseUrl: 'https://api.openai.com/v1'
    })
  })

  it('returns the IPC result as a string', async (): Promise<void> => {
    mockInvoke.mockResolvedValue('# My CV\n\nGreat content')

    const result = await generateCV(baseOptions)

    expect(result).toBe('# My CV\n\nGreat content')
  })

  it('uses fallback baseUrl from config when not provided', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      baseUrl: ''
    }

    await generateCV(options)

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai:chat',
      expect.objectContaining({
        baseUrl: 'https://api.openai.com/v1'
      })
    )
  })

  it('uses fallback model from config when not provided', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      model: ''
    }

    await generateCV(options)

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai:chat',
      expect.objectContaining({
        model: 'gpt-5.2'
      })
    )
  })

  it('constructs correct system and user prompts', async (): Promise<void> => {
    await generateCV(baseOptions)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    expect(systemMsg.role).toBe('system')
    expect(systemMsg.content).toContain('professional CV/resume writer')
    expect(systemMsg.content).toContain('ATS-friendly')
    expect(systemMsg.content).toContain('Markdown format')

    expect(userMsg.role).toBe('user')
    expect(userMsg.content).toContain(baseOptions.profile)
    expect(userMsg.content).toContain(baseOptions.jobDescription)
    expect(userMsg.content).toContain('Generate the CV now.')
  })

  it('includes language instruction in prompts when language is not en', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      language: 'zh'
    }

    await generateCV(options)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    expect(systemMsg.content).toContain('Output the entire CV in Chinese (Simplified)')
    expect(userMsg.content).toContain('Write the CV entirely in Chinese (Simplified)')
  })

  it('does not include language instruction when language is en', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      language: 'en'
    }

    await generateCV(options)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    expect(systemMsg.content).not.toContain('Output the entire CV in')
    expect(userMsg.content).toContain('Write the CV entirely in English')
  })

  it('does not include language instruction when language is undefined', async (): Promise<void> => {
    await generateCV(baseOptions)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    expect(systemMsg.content).not.toContain('Output the entire CV in')
    expect(userMsg.content).not.toContain('Write the CV entirely in')
  })

  it('handles Japanese language correctly via getLanguageName mapping', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      language: 'ja'
    }

    await generateCV(options)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    expect(systemMsg.content).toContain('Output the entire CV in Japanese')
    expect(userMsg.content).toContain('Write the CV entirely in Japanese')
  })

  it('falls back to English for unknown language codes via getLanguageName', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      ...baseOptions,
      language: 'xx'
    }

    await generateCV(options)

    const callArgs = mockInvoke.mock.calls[0][1]
    const systemMsg = callArgs.messages[0]
    const userMsg = callArgs.messages[1]

    // Unknown code falls back to 'English' via LANGUAGE_NAMES[code] ?? 'English'
    // But since 'xx' !== 'en', the language instruction IS included
    expect(systemMsg.content).toContain('Output the entire CV in English')
    expect(userMsg.content).toContain('Write the CV entirely in English')
  })

  it('propagates IPC errors', async (): Promise<void> => {
    mockInvoke.mockRejectedValue(new Error('IPC connection failed'))

    await expect(generateCV(baseOptions)).rejects.toThrow('IPC connection failed')
  })

  it('works with different providers using their config defaults', async (): Promise<void> => {
    const options: GenerateCVOptions = {
      profile: 'Designer with 5 years experience',
      jobDescription: 'UX Lead role',
      provider: 'ollama' as AIProvider,
      apiKey: '',
      model: '',
      baseUrl: ''
    }

    await generateCV(options)

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai:chat',
      expect.objectContaining({
        provider: 'ollama',
        apiKey: '',
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434/v1'
      })
    )
  })
})
