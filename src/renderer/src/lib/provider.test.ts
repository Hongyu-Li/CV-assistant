import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  PROVIDER_CONFIGS,
  generateCV,
  extractProfileFromPdf,
  parseJsonFromAiResponse,
  type AIProvider,
  type GenerateCVOptions,
  type ExtractProfileFromPdfOptions
} from './provider'

// Mock window.electron for IPC calls
const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>
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
    mockInvoke.mockResolvedValue({ success: true, content: '# Generated CV\n\nContent here' })
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
    mockInvoke.mockResolvedValue({ success: true, content: '# My CV\n\nGreat content' })

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

  it('throws when IPC returns structured error', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: false, error: 'API key invalid' })

    await expect(generateCV(baseOptions)).rejects.toThrow('API key invalid')
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

describe('extractProfileFromPdf', () => {
  const validProfileResponse = {
    personalInfo: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      summary: 'Experienced senior engineer'
    },
    workExperience: [
      {
        company: 'Acme Corp',
        role: 'Senior Engineer',
        date: 'Jan 2020 - Present',
        description: '- Led platform migration\n- Mentored junior engineers'
      }
    ],
    projects: [
      {
        name: 'My Project',
        techStack: 'TypeScript, React',
        description: '- Built core features'
      }
    ]
  }

  const baseOptions: ExtractProfileFromPdfOptions = {
    pdfText: 'John Doe\njohn@example.com\n+1234567890\nSenior Engineer...',
    provider: 'openai' as AIProvider,
    apiKey: 'sk-test-123',
    model: 'gpt-5.2',
    baseUrl: 'https://api.openai.com/v1'
  }

  beforeEach((): void => {
    mockInvoke.mockReset()
    mockInvoke.mockResolvedValue({ success: true, content: JSON.stringify(validProfileResponse) })
  })

  it('calls IPC with correct arguments', async (): Promise<void> => {
    await extractProfileFromPdf(baseOptions)

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

  it('successfully parses plain JSON response', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: true, content: JSON.stringify(validProfileResponse) })

    const result = await extractProfileFromPdf(baseOptions)

    expect(result.personalInfo.name).toBe('John Doe')
    expect(result.personalInfo.email).toBe('john@example.com')
    expect(result.workExperience).toHaveLength(1)
    expect(result.workExperience[0].company).toBe('Acme Corp')
    expect(result.projects).toHaveLength(1)
    expect(result.projects[0].name).toBe('My Project')
  })

  it('successfully parses JSON wrapped in markdown code block', async (): Promise<void> => {
    const wrapped = '```json\n' + JSON.stringify(validProfileResponse) + '\n```'
    mockInvoke.mockResolvedValue({ success: true, content: wrapped })

    const result = await extractProfileFromPdf(baseOptions)

    expect(result.personalInfo.name).toBe('John Doe')
    expect(result.personalInfo.email).toBe('john@example.com')
  })

  it('successfully parses JSON embedded in extra text', async (): Promise<void> => {
    const withExtraText =
      'Here is the extracted data:\n' + JSON.stringify(validProfileResponse) + '\nEnd of data.'
    mockInvoke.mockResolvedValue({ success: true, content: withExtraText })

    const result = await extractProfileFromPdf(baseOptions)

    expect(result.personalInfo.name).toBe('John Doe')
  })

  it('uses fallback baseUrl from config when not provided', async (): Promise<void> => {
    const options: ExtractProfileFromPdfOptions = {
      ...baseOptions,
      baseUrl: ''
    }

    await extractProfileFromPdf(options)

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai:chat',
      expect.objectContaining({
        baseUrl: 'https://api.openai.com/v1'
      })
    )
  })

  it('uses fallback model from config when not provided', async (): Promise<void> => {
    const options: ExtractProfileFromPdfOptions = {
      ...baseOptions,
      model: ''
    }

    await extractProfileFromPdf(options)

    expect(mockInvoke).toHaveBeenCalledWith(
      'ai:chat',
      expect.objectContaining({
        model: 'gpt-5.2'
      })
    )
  })

  it('normalizes missing fields to empty strings', async (): Promise<void> => {
    const sparseResponse = {
      personalInfo: {},
      workExperience: [{ company: 'Corp' }],
      projects: [{ name: 'Proj' }]
    }
    mockInvoke.mockResolvedValue({ success: true, content: JSON.stringify(sparseResponse) })

    const result = await extractProfileFromPdf(baseOptions)

    expect(result.personalInfo.name).toBe('')
    expect(result.personalInfo.email).toBe('')
    expect(result.personalInfo.phone).toBe('')
    expect(result.personalInfo.summary).toBe('')
    expect(result.workExperience[0].role).toBe('')
    expect(result.workExperience[0].date).toBe('')
    expect(result.workExperience[0].description).toBe('')
    expect(result.projects[0].techStack).toBe('')
    expect(result.projects[0].description).toBe('')
  })

  it('returns empty arrays when workExperience and projects are missing from response', async (): Promise<void> => {
    const minimalResponse = {
      personalInfo: {
        name: 'Jane',
        email: 'jane@example.com',
        phone: '',
        summary: ''
      }
    }
    mockInvoke.mockResolvedValue({ success: true, content: JSON.stringify(minimalResponse) })

    const result = await extractProfileFromPdf(baseOptions)

    expect(result.workExperience).toEqual([])
    expect(result.projects).toEqual([])
  })

  it('throws when IPC returns { success: false, error }', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: false, error: 'API key invalid' })

    await expect(extractProfileFromPdf(baseOptions)).rejects.toThrow('API key invalid')
  })

  it('throws when IPC rejects with a network error', async (): Promise<void> => {
    mockInvoke.mockRejectedValue(new Error('Network connection refused'))

    await expect(extractProfileFromPdf(baseOptions)).rejects.toThrow('Network connection refused')
  })

  it('throws when response is not valid JSON at all', async (): Promise<void> => {
    mockInvoke.mockResolvedValue({ success: true, content: 'hello world' })

    await expect(extractProfileFromPdf(baseOptions)).rejects.toThrow(
      'No valid JSON found in AI response'
    )
  })

  it('throws when response JSON is missing personalInfo', async (): Promise<void> => {
    const noPersonalInfo = { workExperience: [], projects: [] }
    mockInvoke.mockResolvedValue({ success: true, content: JSON.stringify(noPersonalInfo) })

    await expect(extractProfileFromPdf(baseOptions)).rejects.toThrow(
      'Invalid response: missing personalInfo'
    )
  })
})

describe('parseJsonFromAiResponse', () => {
  it('parses valid JSON directly', (): void => {
    const result = parseJsonFromAiResponse('{"name":"John"}')
    expect(result).toEqual({ name: 'John' })
  })

  it('parses JSON from markdown code block', (): void => {
    const input = '```json\n{"a":1}\n```'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ a: 1 })
  })

  it('parses JSON from code block without json tag', (): void => {
    const input = '```\n{"a":1}\n```'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ a: 1 })
  })

  it('parses JSON embedded in extra text', (): void => {
    const input = 'Here is data: {"a":1} done.'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ a: 1 })
  })

  it('repairs trailing commas', (): void => {
    const input = '{"a":1, "b":2,}'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('repairs unquoted keys', (): void => {
    const input = '{name: "John", age: 30}'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ name: 'John', age: 30 })
  })

  it('repairs truncated JSON (missing closing brace)', (): void => {
    const input = '{"name":"John"'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ name: 'John' })
  })

  it('repairs malformed JSON inside code block', (): void => {
    const input = '```json\n{name: "test",}\n```'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ name: 'test' })
  })

  it('repairs malformed JSON extracted from text', (): void => {
    const input = 'Result: {name: "test",} end'
    const result = parseJsonFromAiResponse(input)
    expect(result).toEqual({ name: 'test' })
  })

  it('throws on non-JSON text', (): void => {
    expect(() => parseJsonFromAiResponse('hello world no json')).toThrow(
      'No valid JSON found in AI response'
    )
  })

  it('throws on empty string', (): void => {
    expect(() => parseJsonFromAiResponse('')).toThrow('No valid JSON found in AI response')
  })
})
