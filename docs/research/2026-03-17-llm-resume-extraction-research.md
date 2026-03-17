# LLM Resume Extraction Research

> **Date**: 2026-03-17
> **Purpose**: Best practices, prompt templates, and portable strategies for extracting structured JSON from resumes/CVs using LLMs across multiple AI providers.
> **Context**: CV-assistant Electron app supporting 12+ AI providers.

---

## Table of Contents

1. [Provider-Specific Structured Output](#1-provider-specific-structured-output)
2. [Portable 3-Layer Extraction Strategy](#2-portable-3-layer-extraction-strategy)
3. [Recommended Prompt Template](#3-recommended-prompt-template)
4. [JSON Schema Definition](#4-json-schema-definition)
5. [JSON Extraction & Repair Pipeline](#5-json-extraction--repair-pipeline)
6. [Edge Cases & Mitigations](#6-edge-cases--mitigations)
7. [GitHub Repos & Prior Art](#7-github-repos--prior-art)
8. [References](#8-references)

---

## 1. Provider-Specific Structured Output

### OpenAI (GPT-4o, GPT-4o-mini)

**Native JSON Schema mode** (Structured Outputs, GA since Aug 2024):

```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'resume_extraction',
      strict: true,
      schema: resumeJsonSchema // JSON Schema object
    }
  }
})
```

**Requirements**: All fields must be in `required` array. Must set `additionalProperties: false` at every object level. Supports `anyOf` for nullable fields (e.g., `{ anyOf: [{ type: 'string' }, { type: 'null' }] }`).

**Known issues**:

- `gpt-4o-mini` less reliable than `gpt-4o` for complex schemas ([OpenAI Community Thread](https://community.openai.com/t/structured-outputs-not-reliable-with-gpt-4o-mini-and-gpt-4o/918735))
- Occasional `\n\n` padding in string fields
- Token truncation mid-JSON on very long resumes — mitigate with generous `max_tokens`

**Fallback**: `response_format: { type: 'json_object' }` — guarantees valid JSON but does NOT enforce schema structure. Must instruct schema in prompt.

---

### Anthropic Claude (Sonnet 4, Opus 4)

**Native Structured Outputs** (GA since Nov 2025, Claude Sonnet 4.5+ and Opus 4.1+):

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [...],
  output_format: {
    type: 'json_schema',
    json_schema: resumeJsonSchema
  }
})
```

**Legacy workarounds** (for older models or when native mode unavailable):

1. **Assistant prefill** — Start the assistant response with `{` to force JSON output:

   ```typescript
   messages: [
     { role: 'user', content: 'Extract resume data as JSON...' },
     { role: 'assistant', content: '{' }
   ]
   ```

   Used in production by [Skyvern AI](https://github.com/Skyvern-AI/skyvern) and [Khoj AI](https://github.com/khoj-ai/khoj). **Not compatible with extended thinking.**

2. **Tool use with forced tool choice** — Define a tool whose input schema IS your desired JSON schema, then force Claude to call it:
   ```typescript
   const response = await anthropic.messages.create({
     model: 'claude-sonnet-4-20250514',
     tools: [{
       name: 'extract_resume',
       description: 'Extract structured resume data',
       input_schema: resumeJsonSchema
     }],
     tool_choice: { type: 'tool', name: 'extract_resume' },
     messages: [...]
   })
   // Result in: response.content[0].input (the structured JSON)
   ```
   Recommended by [Anthropic Cookbook](https://docs.anthropic.com/en/docs/build-with-claude/tool-use). Most reliable legacy approach.

---

### Google Gemini (1.5 Pro, 2.0 Flash, 3.x)

**Native JSON Schema mode**:

```typescript
const result = await model.generateContent({
  contents: [...],
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: resumeJsonSchema // JSON Schema object
  }
})
```

**Notes**:

- `responseMimeType: 'application/json'` alone guarantees valid JSON (no schema enforcement)
- Adding `responseSchema` enforces structure via constrained decoding
- Output key order matches schema definition order
- Supports subset of JSON Schema (no `$ref`, limited `anyOf`)
- Works on Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash, 3.x models

---

### DeepSeek (V3, R1)

**JSON Object mode only** (no schema enforcement):

```typescript
const response = await openai.chat.completions.create({
  model: 'deepseek-chat',
  messages: [...], // MUST include word "json" in system/user prompt
  response_format: { type: 'json_object' }
})
```

**Critical limitations**:

- Does NOT support `json_schema` type — only `json_object`
- Must include the word "json" in the prompt or it fails silently
- Must provide example JSON structure in prompt for reliable output
- Set `max_tokens` generously — may return empty content if too low
- Known issue: occasionally returns empty `content` field ([DeepSeek-V3 #302](https://github.com/deepseek-ai/DeepSeek-V3/issues/302))
- Uses OpenAI-compatible API format

---

### Ollama (Local Models)

**Two methods** (Ollama 0.5+):

```typescript
// Method 1: Simple JSON mode
const response = await ollama.chat({
  model: 'llama3:70b',
  messages: [...],
  format: 'json'
})

// Method 2: Schema enforcement (Ollama 0.5+)
const response = await ollama.chat({
  model: 'llama3:70b',
  messages: [...],
  format: resumeJsonSchema // Pass JSON Schema directly
})
```

**Quality depends heavily on model size**:

- 7B models: Struggle with complex nested schemas, frequent malformed JSON
- 13B-34B models: Acceptable for simple schemas, unreliable for nested arrays
- 70B+ models: Reliable for most schemas (Llama 3 70B, Qwen 2.5 72B, Mistral Large)
- Always provide example output in prompt for local models

---

### Other Providers (OpenRouter, Azure, AWS Bedrock, etc.)

Most expose OpenAI-compatible APIs. Use `json_object` mode as baseline:

```typescript
response_format: {
  type: 'json_object'
}
```

For providers without even `json_object` mode: rely entirely on prompt engineering + post-processing repair (Layer 2 + Layer 3 of our strategy).

---

## 2. Portable 3-Layer Extraction Strategy

The core architectural decision: **never depend on any single provider's native JSON mode**. Instead, use a 3-layer approach that degrades gracefully.

````
Layer 1: Native JSON Mode (when available)
  ├── OpenAI: response_format.json_schema (strict)
  ├── Claude: output_format.json_schema (native) or tool_use (legacy)
  ├── Gemini: responseMimeType + responseSchema
  ├── DeepSeek: response_format.json_object
  └── Ollama: format: schema

Layer 2: Prompt-Only JSON (always applied, even with Layer 1)
  └── System prompt with schema definition + extraction rules + anti-hallucination

Layer 3: Post-Processing Repair (always applied)
  ├── Strip markdown code fences (```json ... ```)
  ├── Strip prefix text ("Here is the JSON:" etc.)
  ├── Extract JSON from mixed text (regex for { ... })
  ├── Repair common JSON errors (trailing commas, unquoted keys)
  └── Schema validation (Zod / JSON Schema)
````

**Key principle**: Layer 2 (prompt engineering) is ALWAYS applied regardless of whether Layer 1 is available. This makes the prompt the single source of truth for extraction logic, and Layer 1 merely improves reliability of the JSON format.

### Provider Config Interface

```typescript
interface ProviderJsonConfig {
  supportsJsonSchema: boolean // OpenAI, Claude 3.5+, Gemini
  supportsJsonObject: boolean // DeepSeek, older models
  supportsToolUse: boolean // Claude (legacy workaround)
  requiresJsonInPrompt: boolean // DeepSeek: must say "json" in prompt
  supportsPrefill: boolean // Claude: assistant message prefill
}

const PROVIDER_CONFIGS: Record<string, ProviderJsonConfig> = {
  openai: {
    supportsJsonSchema: true,
    supportsJsonObject: true,
    supportsToolUse: false,
    requiresJsonInPrompt: false,
    supportsPrefill: false
  },
  anthropic: {
    supportsJsonSchema: true,
    supportsJsonObject: false,
    supportsToolUse: true,
    requiresJsonInPrompt: false,
    supportsPrefill: true
  },
  gemini: {
    supportsJsonSchema: true,
    supportsJsonObject: true,
    supportsToolUse: false,
    requiresJsonInPrompt: false,
    supportsPrefill: false
  },
  deepseek: {
    supportsJsonSchema: false,
    supportsJsonObject: true,
    supportsToolUse: false,
    requiresJsonInPrompt: true,
    supportsPrefill: false
  },
  ollama: {
    supportsJsonSchema: true,
    supportsJsonObject: true,
    supportsToolUse: false,
    requiresJsonInPrompt: false,
    supportsPrefill: false
  },
  openrouter: {
    supportsJsonSchema: false,
    supportsJsonObject: true,
    supportsToolUse: false,
    requiresJsonInPrompt: false,
    supportsPrefill: false
  }
}
```

---

## 3. Recommended Prompt Template

Based on patterns from DocsBot.ai, Resume-Matcher, and production resume parsers. Designed to be **provider-agnostic** (works with or without native JSON mode).

```
SYSTEM PROMPT:
You are a resume/CV data extraction specialist. Your task is to extract structured information from resume text and return it as a JSON object.

## Rules

1. Extract ONLY information explicitly stated in the resume. Never infer, guess, or hallucinate data.
2. If a field is not present in the resume, use null for optional fields or an empty array [] for list fields.
3. For dates, normalize to "YYYY-MM" format when possible. Use "Present" for current positions. If only a year is given, use "YYYY". Preserve the original text if the date format is ambiguous.
4. For skills, extract individual skills as separate items. Do not group them unless the resume explicitly groups them.
5. Preserve the original language of the resume content. Do not translate.
6. For multi-language resumes (e.g., Chinese/English mixed), preserve both languages as they appear.
7. Return ONLY the JSON object. No explanations, no markdown, no code fences.

## Output Schema

Return a JSON object with this exact structure:

{
  "basics": {
    "name": "string | null",
    "email": "string | null",
    "phone": "string | null",
    "location": "string | null",
    "summary": "string | null",
    "url": "string | null",
    "profiles": [
      {
        "network": "string (e.g., LinkedIn, GitHub)",
        "url": "string"
      }
    ]
  },
  "work": [
    {
      "company": "string",
      "position": "string",
      "startDate": "string (YYYY-MM or YYYY)",
      "endDate": "string (YYYY-MM, YYYY, or Present)",
      "summary": "string | null",
      "highlights": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "area": "string (field of study)",
      "studyType": "string (e.g., Bachelor, Master, PhD)",
      "startDate": "string | null",
      "endDate": "string | null",
      "score": "string | null"
    }
  ],
  "skills": [
    {
      "name": "string (category name, e.g., Programming Languages)",
      "keywords": ["string"]
    }
  ],
  "languages": [
    {
      "language": "string",
      "fluency": "string | null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string | null",
      "startDate": "string | null",
      "endDate": "string | null",
      "highlights": ["string"],
      "url": "string | null"
    }
  ],
  "certificates": [
    {
      "name": "string",
      "issuer": "string | null",
      "date": "string | null"
    }
  ],
  "awards": [
    {
      "title": "string",
      "awarder": "string | null",
      "date": "string | null",
      "summary": "string | null"
    }
  ]
}

USER PROMPT:
Extract structured data from the following resume text and return it as a JSON object following the schema above.

<resume>
{resume_text}
</resume>
```

### Prompt Variants for Specific Providers

**DeepSeek addition** (must include "json" in prompt):
Append to user prompt: `Return the result as valid JSON.`

**Ollama / small model addition** (needs more explicit guidance):
Append to system prompt:

```
IMPORTANT: Your entire response must be a single valid JSON object. Do not include any text before or after the JSON. Do not wrap it in markdown code fences.
```

---

## 4. JSON Schema Definition

### TypeScript Interfaces

```typescript
interface ResumeProfile {
  network: string
  url: string
}

interface WorkExperience {
  company: string
  position: string
  startDate: string
  endDate: string | null
  summary: string | null
  highlights: string[]
}

interface Education {
  institution: string
  area: string
  studyType: string
  startDate: string | null
  endDate: string | null
  score: string | null
}

interface SkillGroup {
  name: string
  keywords: string[]
}

interface Language {
  language: string
  fluency: string | null
}

interface Project {
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  highlights: string[]
  url: string | null
}

interface Certificate {
  name: string
  issuer: string | null
  date: string | null
}

interface Award {
  title: string
  awarder: string | null
  date: string | null
  summary: string | null
}

interface ExtractedResume {
  basics: {
    name: string | null
    email: string | null
    phone: string | null
    location: string | null
    summary: string | null
    url: string | null
    profiles: ResumeProfile[]
  }
  work: WorkExperience[]
  education: Education[]
  skills: SkillGroup[]
  languages: Language[]
  projects: Project[]
  certificates: Certificate[]
  awards: Award[]
}
```

### JSON Schema (for provider APIs)

```json
{
  "type": "object",
  "required": [
    "basics",
    "work",
    "education",
    "skills",
    "languages",
    "projects",
    "certificates",
    "awards"
  ],
  "additionalProperties": false,
  "properties": {
    "basics": {
      "type": "object",
      "required": ["name", "email", "phone", "location", "summary", "url", "profiles"],
      "additionalProperties": false,
      "properties": {
        "name": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "email": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "phone": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "location": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "summary": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "url": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
        "profiles": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["network", "url"],
            "additionalProperties": false,
            "properties": {
              "network": { "type": "string" },
              "url": { "type": "string" }
            }
          }
        }
      }
    },
    "work": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["company", "position", "startDate", "endDate", "summary", "highlights"],
        "additionalProperties": false,
        "properties": {
          "company": { "type": "string" },
          "position": { "type": "string" },
          "startDate": { "type": "string" },
          "endDate": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "summary": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "highlights": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["institution", "area", "studyType", "startDate", "endDate", "score"],
        "additionalProperties": false,
        "properties": {
          "institution": { "type": "string" },
          "area": { "type": "string" },
          "studyType": { "type": "string" },
          "startDate": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "endDate": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "score": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "keywords"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" },
          "keywords": { "type": "array", "items": { "type": "string" } }
        }
      }
    },
    "languages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["language", "fluency"],
        "additionalProperties": false,
        "properties": {
          "language": { "type": "string" },
          "fluency": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
        }
      }
    },
    "projects": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "description", "startDate", "endDate", "highlights", "url"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" },
          "description": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "startDate": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "endDate": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "highlights": { "type": "array", "items": { "type": "string" } },
          "url": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
        }
      }
    },
    "certificates": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "issuer", "date"],
        "additionalProperties": false,
        "properties": {
          "name": { "type": "string" },
          "issuer": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "date": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
        }
      }
    },
    "awards": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["title", "awarder", "date", "summary"],
        "additionalProperties": false,
        "properties": {
          "title": { "type": "string" },
          "awarder": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "date": { "anyOf": [{ "type": "string" }, { "type": "null" }] },
          "summary": { "anyOf": [{ "type": "string" }, { "type": "null" }] }
        }
      }
    }
  }
}
```

---

## 5. JSON Extraction & Repair Pipeline

A 5-strategy cascade based on patterns found in production codebases ([claude-task-master](https://github.com/eyaltoledano/claude-task-master), [joelhooks/swarm-tools](https://github.com/joelhooks/swarm-tools), [SamuelZ12/longcut](https://github.com/SamuelZ12/longcut)).

````typescript
import { jsonrepair } from 'jsonrepair' // npm package

function extractJson(raw: string): Record<string, unknown> | null {
  const strategies = [
    tryDirectParse,
    tryStripCodeFences,
    tryExtractBraces,
    tryStripPrefix,
    tryJsonRepair
  ]

  for (const strategy of strategies) {
    const result = strategy(raw)
    if (result !== null) return result
  }

  return null
}

// Strategy 1: Direct parse (works when provider returns clean JSON)
function tryDirectParse(raw: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(raw.trim())
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}

// Strategy 2: Strip markdown code fences
function tryStripCodeFences(raw: string): Record<string, unknown> | null {
  const match = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (!match) return null
  return tryDirectParse(match[1])
}

// Strategy 3: Extract first { ... } block
function tryExtractBraces(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return tryDirectParse(raw.slice(start, end + 1))
}

// Strategy 4: Strip common prefixes ("Here is the JSON:", "const x = ", etc.)
function tryStripPrefix(raw: string): Record<string, unknown> | null {
  const stripped = raw
    .replace(/^[^{]*?(?=\{)/s, '') // Remove everything before first {
    .replace(/\}[^}]*$/s, '}') // Remove everything after last }
  return tryDirectParse(stripped)
}

// Strategy 5: Use jsonrepair library for malformed JSON
function tryJsonRepair(raw: string): Record<string, unknown> | null {
  try {
    // First try to extract the JSON-like portion
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    const jsonLike = start !== -1 && end > start ? raw.slice(start, end + 1) : raw
    const repaired = jsonrepair(jsonLike)
    const parsed = JSON.parse(repaired)
    return typeof parsed === 'object' && parsed !== null ? parsed : null
  } catch {
    return null
  }
}
````

### Schema Validation (post-extraction)

After extraction, validate against the schema using Zod or a JSON Schema validator:

```typescript
import { z } from 'zod'

const ResumeSchema = z.object({
  basics: z.object({
    name: z.string().nullable(),
    email: z.string().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    summary: z.string().nullable(),
    url: z.string().nullable(),
    profiles: z.array(
      z.object({
        network: z.string(),
        url: z.string()
      })
    )
  }),
  work: z.array(
    z.object({
      company: z.string(),
      position: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      summary: z.string().nullable(),
      highlights: z.array(z.string())
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      area: z.string(),
      studyType: z.string(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      score: z.string().nullable()
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      keywords: z.array(z.string())
    })
  ),
  languages: z.array(
    z.object({
      language: z.string(),
      fluency: z.string().nullable()
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      highlights: z.array(z.string()),
      url: z.string().nullable()
    })
  ),
  certificates: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      date: z.string().nullable()
    })
  ),
  awards: z.array(
    z.object({
      title: z.string(),
      awarder: z.string().nullable(),
      date: z.string().nullable(),
      summary: z.string().nullable()
    })
  )
})

function validateResume(data: unknown): ExtractedResume | null {
  const result = ResumeSchema.safeParse(data)
  if (result.success) return result.data
  console.warn('Resume validation errors:', result.error.issues)
  return null
}
```

---

## 6. Edge Cases & Mitigations

### 1. Two-Column / Table Layouts

**Problem**: PDF-to-text extraction interleaves columns. "John Doe" in the left column and "Skills: Python" in the right column becomes "John Doe Skills: Python" in raw text.

**Mitigation**:

- Use layout-aware PDF extraction (e.g., `pdfplumber` with `extract_text(layout=True)`, or `pdf2image` + OCR).
- [Alibaba research paper](https://arxiv.org/html/2510.09722v1): Layout normalization BEFORE LLM extraction dramatically improves accuracy.
- Add to system prompt: "The resume text may have interleaved columns. Use contextual clues to separate sections correctly."

### 2. Very Long Resumes (5+ pages)

**Problem**: Exceeds context window or output token limits, causing truncated JSON.

**Mitigation**:

- Set generous `max_tokens` (at least 4096 for output).
- For extremely long resumes: chunk by section headers, extract per-section, merge results.
- Monitor for truncated JSON (response ends without closing `}`) — trigger retry with higher `max_tokens`.

### 3. Non-Standard Section Names

**Problem**: Resumes use creative section headers ("What I've Built" instead of "Projects", "My Journey" instead of "Work Experience").

**Mitigation**:

- Add to system prompt: "Section headers may use non-standard names. Map them to the closest standard category based on content."
- Include examples of common aliases in prompt: "Experience/Career History/Professional Background → work"

### 4. Mixed Language Resumes (Chinese/English)

**Problem**: Name might be in Chinese, job titles in English, company names mixed.

**Mitigation**:

- Prompt rule: "Preserve the original language of all content. Do not translate."
- Ensure UTF-8 handling throughout the pipeline.
- Test with actual mixed-language resumes from target demographics.

### 5. Missing or Ambiguous Dates

**Problem**: "2019 - current", "Since 2020", "3 years experience", "Summer 2021", no dates at all.

**Mitigation**:

- Prompt rule: "Normalize to YYYY-MM format when possible. Use 'Present' for current. Preserve original if ambiguous."
- Accept flexible date formats in schema validation (don't enforce strict YYYY-MM regex).
- Handle "X years experience" as metadata, not as date range.

### 6. Hallucinated Data

**Problem**: LLM fills in plausible-sounding but fake data for missing fields.

**Mitigation**:

- Strong anti-hallucination rules in prompt: "Extract ONLY information explicitly stated. Never infer or guess."
- Require `null` for missing fields (not empty string or placeholder).
- Post-extraction validation: flag suspiciously complete resumes (every field filled = possible hallucination).
- Consider confidence scoring: ask LLM to rate extraction confidence per section.

### 7. Provider Returns Empty or Malformed Response

**Problem**: DeepSeek occasionally returns empty `content`, Ollama small models return partial JSON, rate limiting returns 429.

**Mitigation**:

- Retry logic with exponential backoff (max 3 retries).
- Parse `Retry-After` header for 429 responses.
- Validate response is non-empty before processing.
- Log raw responses for debugging.
- Graceful degradation: show partial results with warning rather than complete failure.

---

## 7. GitHub Repos & Prior Art

| Repo                                                                                  | Stars | Approach                                       | Notes                                           |
| ------------------------------------------------------------------------------------- | ----- | ---------------------------------------------- | ----------------------------------------------- |
| [srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)                       | ~5K   | LiteLLM multi-provider, Qdrant vector DB       | Best example of multi-provider architecture     |
| [Nutlope/self.so](https://github.com/Nutlope/self.so)                                 | ~2K   | Resume to portfolio site, JSON Resume standard | Uses JSON Resume schema                         |
| [hxu296/nlp-resume-parser](https://github.com/hxu296/nlp-resume-parser)               | ~200  | OpenAI GPT-3, direct prompt with flat schema   | Simple but effective prompt pattern             |
| [The-Pocket/PocketFlow](https://github.com/The-Pocket/PocketFlow)                     | ~500  | YAML output instead of JSON                    | Interesting alternative: YAML is more forgiving |
| [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) | —     | 4-strategy JSON extraction cascade             | Best JSON repair pipeline reference             |
| [joelhooks/swarm-tools](https://github.com/joelhooks/swarm-tools)                     | —     | 4-strategy structured extraction               | Clean TypeScript implementation                 |
| [Skyvern-AI/skyvern](https://github.com/Skyvern-AI/skyvern)                           | ~1K   | Claude prefill with `{`                        | Production Claude JSON pattern                  |
| [khoj-ai/khoj](https://github.com/khoj-ai/khoj)                                       | ~1K   | Claude prefill + streaming aggregation         | Handles streaming JSON from Claude              |

### Key Libraries

| Library                                                      | Language | Purpose                                            |
| ------------------------------------------------------------ | -------- | -------------------------------------------------- |
| [`jsonrepair`](https://www.npmjs.com/package/jsonrepair)     | JS/TS    | Repair malformed JSON (most popular)               |
| [`litellm`](https://github.com/BerriAI/litellm)              | Python   | Unified API for 100+ LLM providers                 |
| [`instructor`](https://github.com/jxnl/instructor)           | Python   | Structured output with retry + Pydantic validation |
| [`zod`](https://github.com/colinhacks/zod)                   | TS       | Runtime schema validation                          |
| [`dirty-json`](https://www.npmjs.com/package/dirty-json)     | JS       | Parse "dirty" JSON with errors                     |
| [`partial-json`](https://www.npmjs.com/package/partial-json) | JS       | Parse truncated/streaming JSON                     |

---

## 8. References

### Official Documentation

- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Anthropic Structured Outputs](https://docs.anthropic.com/en/docs/build-with-claude/structured-outputs)
- [Anthropic Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Google Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output)
- [DeepSeek JSON Mode](https://api-docs.deepseek.com/guides/json_mode)
- [Ollama Structured Outputs](https://ollama.com/blog/structured-outputs)

### Research & Articles

- [Alibaba — Layout-Aware Resume Extraction](https://arxiv.org/html/2510.09722v1) — Layout normalization before LLM extraction
- [Refuel.ai — Parsing Resumes with LLMs](https://refuel.ai/blog-posts/parsing-and-extracting-from-resumes-with-llms) — Traditional ATS parsers only 60-70% accurate
- [DocsBot.ai — Resume Data Extraction Prompt](https://docsbot.ai/prompts/business/resume-data-extraction) — Production prompt template
- [JSON Resume Standard](https://jsonresume.org/) — Community-driven resume schema standard
- [Thomas Wiegold — Claude API Structured Output](https://thomas-wiegold.com/blog/claude-api-structured-output/) — Claude JSON workarounds

### Community Discussions

- [OpenAI Community — Structured Outputs Reliability](https://community.openai.com/t/structured-outputs-not-reliable-with-gpt-4o-mini-and-gpt-4o/918735)
- [Reddit — Claude Structured Outputs](https://www.reddit.com/r/ClaudeAI/comments/1ox5f1y/)
- [DeepSeek-V3 Issue #302 — Empty Content Bug](https://github.com/deepseek-ai/DeepSeek-V3/issues/302)

---

_Generated for CV-assistant project. Last updated: 2026-03-17._
