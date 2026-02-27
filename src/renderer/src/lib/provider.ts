export type AIProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'deepseek'
  | 'ollama'
  | 'openrouter'
  | 'groq'
  | 'mistral'
  | 'qwen'
  | 'zhipu'
  | 'kimi'
  | 'custom'

export interface ProviderConfig {
  label: string
  defaultBaseUrl: string
  defaultModel: string
  requiresApiKey: boolean
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-5.2',
    requiresApiKey: true
  },
  anthropic: {
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-sonnet-4-6',
    requiresApiKey: true
  },
  google: {
    label: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3-flash-preview',
    requiresApiKey: true
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    requiresApiKey: true
  },
  ollama: {
    label: 'Ollama (Local)',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    requiresApiKey: false
  },
  openrouter: {
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-sonnet-4-6',
    requiresApiKey: true
  },
  groq: {
    label: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    requiresApiKey: true
  },
  mistral: {
    label: 'Mistral',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    requiresApiKey: true
  },
  qwen: {
    label: 'Qwen (Alibaba)',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    requiresApiKey: true
  },
  zhipu: {
    label: 'Zhipu (GLM)',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    defaultModel: 'glm-5',
    requiresApiKey: true
  },
  kimi: {
    label: 'Kimi (Moonshot)',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'kimi-k2.5',
    requiresApiKey: true
  },
  custom: {
    label: 'Custom',
    defaultBaseUrl: '',
    defaultModel: '',
    requiresApiKey: true
  }
}

export interface GenerateCVOptions {
  profile: string
  jobDescription: string
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
  language?: string
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  zh: 'Chinese (Simplified)',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish'
}

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? 'English'
}

export async function generateCV(options: GenerateCVOptions): Promise<string> {
  const config = PROVIDER_CONFIGS[options.provider]
  const baseUrl = options.baseUrl || config.defaultBaseUrl
  const model = options.model || config.defaultModel

  const languageName = options.language ? getLanguageName(options.language) : ''
  const languageInstruction =
    options.language && options.language !== 'en' ? ` Output the entire CV in ${languageName}.` : ''

  const systemPrompt = `You are a professional CV/resume writer. Generate a well-structured, ATS-friendly CV in Markdown format tailored to the job description. Highlight relevant skills and experience. Be concise and professional.${languageInstruction}`

  const userPrompt = `Based on the following profile and job description, generate a tailored professional CV in Markdown format.

## Profile
${options.profile}

## Target Job Description
${options.jobDescription}

Generate the CV now.${options.language ? ` Write the CV entirely in ${languageName}.` : ''}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  const result = await window.electron.ipcRenderer.invoke('ai:chat', {
    provider: options.provider,
    apiKey: options.apiKey,
    model,
    messages,
    baseUrl
  })

  return result as string
}
