import { jsonrepair } from 'jsonrepair'
import { z } from 'zod/v4'
import { AI_CHAT_TIMEOUT_MS, AI_PDF_EXTRACT_TIMEOUT_MS } from './constants'

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
  timeoutMs?: number
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
    baseUrl,
    timeoutMs: options.timeoutMs ?? AI_CHAT_TIMEOUT_MS
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  // Strip markdown code block fences if present (e.g., ```markdown ... ```)
  let content = result.content as string
  content = content.trim()
  if (content.startsWith('```')) {
    // Remove opening fence (``` or ```markdown)
    content = content.replace(/^```(?:markdown)?\s*\n?/, '')
    // Remove closing fence
    content = content.replace(/\n?```\s*$/, '')
  }

  return content
}

export interface ExtractProfileFromPdfOptions {
  pdfText: string
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
}

export interface ExtractedProfileData {
  personalInfo: {
    name: string
    email: string
    phone: string
    summary: string
  }
  workExperience: Array<{
    company: string
    role: string
    date: string
    description: string
  }>
  projects: Array<{
    name: string
    techStack: string
    description: string
  }>
  education: Array<{
    school: string
    degree: string
    date: string
    description: string
  }>
}

const coerceString = z
  .union([z.string(), z.number(), z.boolean(), z.null()])
  .transform((v): string => (v === null ? '' : String(v)))
const optionalString = coerceString.optional().transform((v): string => v ?? '')

const ExtractedProfileDataSchema = z
  .object({
    personalInfo: z.object({
      name: optionalString,
      email: optionalString,
      phone: optionalString,
      summary: optionalString
    }),
    workExperience: z
      .array(
        z.object({
          company: optionalString,
          role: optionalString,
          date: optionalString,
          description: optionalString
        })
      )
      .optional()
      .transform(
        (v): Array<{ company: string; role: string; date: string; description: string }> => v ?? []
      ),
    projects: z
      .array(
        z.object({
          name: optionalString,
          techStack: optionalString,
          description: optionalString
        })
      )
      .optional()
      .transform((v): Array<{ name: string; techStack: string; description: string }> => v ?? []),
    education: z
      .array(
        z.object({
          school: optionalString,
          degree: optionalString,
          date: optionalString,
          description: optionalString
        })
      )
      .optional()
      .transform(
        (v): Array<{ school: string; degree: string; date: string; description: string }> => v ?? []
      )
  })
  .strip()

export function parseJsonFromAiResponse(text: string): unknown {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(text)
  } catch {
    /* continue */
  }

  // Strategy 2-3: Code block extraction (with and without repair)
  const codeBlockMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(text)
  if (codeBlockMatch?.[1]) {
    const inner = codeBlockMatch[1].trim()
    try {
      return JSON.parse(inner)
    } catch {
      /* continue */
    }
    try {
      return JSON.parse(jsonrepair(inner))
    } catch {
      /* continue */
    }
  }

  // Strategy 4-5: Brace extraction (with and without repair)
  const jsonMatch = /\{[\s\S]*\}/.exec(text)
  if (jsonMatch?.[0]) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch {
      /* continue */
    }
    try {
      return JSON.parse(jsonrepair(jsonMatch[0]))
    } catch {
      /* continue */
    }
  }

  // Strategy 6: Full text repair (only accept objects/arrays, not primitives)
  try {
    const repaired = JSON.parse(jsonrepair(text))
    if (typeof repaired === 'object' && repaired !== null) {
      return repaired
    }
  } catch {
    /* exhausted */
  }

  throw new Error('No valid JSON found in AI response')
}

export interface ExtractKeywordsOptions {
  jobDescription: string
  provider: AIProvider
  apiKey: string
  model: string
  baseUrl: string
}

const ExtractedKeywordsSchema = z
  .object({
    keywords: z
      .array(z.string())
      .optional()
      .transform((v): string[] => v ?? [])
  })
  .strip()

export async function extractKeywordsFromJD(options: ExtractKeywordsOptions): Promise<string[]> {
  const config = PROVIDER_CONFIGS[options.provider]
  const baseUrl = options.baseUrl || config.defaultBaseUrl
  const model = options.model || config.defaultModel

  const systemPrompt = `You are a job description analyzer. Extract the 3-4 most important technical skills/keywords from the job description.
Return ONLY a valid JSON object with no markdown formatting, no code blocks, no extra text.
The JSON must have this exact structure:
{
  "keywords": ["skill1", "skill2", "skill3", "skill4"]
}
Rules:
- Extract technical skills, programming languages, frameworks, tools, or key competencies mentioned in the JD
- Focus on the most important/required skills, not nice-to-haves
- Use concise terms (1-2 words each)
- Return exactly 3-4 keywords, no more, no less
- If fewer than 3 relevant skills are found, pad with general domain terms from the field`

  const userPrompt = `Extract key technical skills from this job description:\n\n${options.jobDescription}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  const result = await window.electron.ipcRenderer.invoke('ai:chat', {
    provider: options.provider,
    apiKey: options.apiKey,
    model,
    messages,
    baseUrl,
    timeoutMs: AI_CHAT_TIMEOUT_MS
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  const raw = parseJsonFromAiResponse(result.content as string)
  const validated = ExtractedKeywordsSchema.safeParse(raw)
  if (!validated.success) {
    throw new Error(`Invalid keywords data: ${validated.error.message}`)
  }
  return validated.data.keywords.slice(0, 4)
}

export async function extractProfileFromPdf(
  options: ExtractProfileFromPdfOptions
): Promise<ExtractedProfileData> {
  const config = PROVIDER_CONFIGS[options.provider]
  const baseUrl = options.baseUrl || config.defaultBaseUrl
  const model = options.model || config.defaultModel

  const systemPrompt = `You are a professional resume parser. Extract structured data from resume text.
Return ONLY a valid JSON object with no markdown formatting, no code blocks, no extra text.
The JSON must have this exact structure:
{
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "summary": ""
  },
  "workExperience": [
    {
      "company": "",
      "role": "",
      "date": "",
      "description": ""
    }
  ],
  "projects": [
    {
      "name": "",
      "techStack": "",
      "description": ""
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "date": "",
      "description": ""
    }
  ]
}
Rules:
- Use empty strings for missing fields, empty arrays for missing sections.
- "description" fields should be in Markdown format with bullet points for key achievements.
- "date" should be formatted as a human-readable range like "Jan 2020 - Present".
- "summary" should be a concise professional summary derived from the resume content.
- "techStack" should be a comma-separated list of technologies.
- "degree" should include degree type and major, e.g., "Bachelor of Science in Computer Science".
- Do NOT generate any "id" fields.
- Preserve the original language of the resume content.`

  const userPrompt = `Extract structured profile data from this resume text:\n\n${options.pdfText}`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  const result = await window.electron.ipcRenderer.invoke('ai:chat', {
    provider: options.provider,
    apiKey: options.apiKey,
    model,
    messages,
    baseUrl,
    timeoutMs: AI_PDF_EXTRACT_TIMEOUT_MS
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  const raw = parseJsonFromAiResponse(result.content as string)
  const validated = ExtractedProfileDataSchema.safeParse(raw)
  if (!validated.success) {
    throw new Error(`Invalid extracted data: ${validated.error.message}`)
  }
  return validated.data
}
