import { join, resolve, relative, isAbsolute } from 'path'
import {
  deleteWorkspaceFile,
  getWorkspaceLastModified,
  listWorkspaceSubdirFiles,
  migrateWorkspaceFiles,
  precheckWorkspaceMigration,
  readWorkspaceFile,
  writeWorkspaceFile
} from './fs'
import type { MigrationPrecheck, MigrationResult } from './fs'

export interface ProfilePersonalInfoSaveData {
  name?: string
  email?: string
  phone?: string
  summary?: string
}

export interface ProfileWorkExperienceSaveData {
  id: string
  company: string
  role: string
  date: string
  description: string
}

export interface ProfileProjectSaveData {
  id: string
  name: string
  techStack: string
  description: string
}

export interface ProfileSaveData {
  personalInfo?: ProfilePersonalInfoSaveData
  workExperience?: ProfileWorkExperienceSaveData[]
  projects?: ProfileProjectSaveData[]
}

export interface ProfileLoadPersonalInfo {
  name: string
  email: string
  phone: string
  summary: string
}

export interface ProfileLoadWorkExperience {
  id: string
  company: string
  role: string
  date: string
  description: string
}

export interface ProfileLoadProject {
  id: string
  name: string
  techStack: string
  description: string
}

export interface ProfileLoadResult {
  personalInfo: ProfileLoadPersonalInfo
  workExperience: ProfileLoadWorkExperience[]
  projects: ProfileLoadProject[]
}

export interface CvSaveData {
  mdFile?: string
  generatedCV?: string
  [key: string]: unknown
}

export interface AiChatMessage {
  role: string
  content: string
}

export interface IpcSuccessResponse {
  success: true
}

export interface IpcErrorResponse {
  success: false
  error: string
}

export type IpcResult<T> = ({ success: true } & T) | IpcErrorResponse

export interface DialogDeps {
  dialog: typeof import('electron').dialog
}

export interface ShellOpenPathDeps {
  shell: typeof import('electron').shell
  app: typeof import('electron').app
}

export interface AppDeps {
  app: typeof import('electron').app
}

function isNotNull<T>(value: T | null): value is T {
  return value !== null
}

export async function handleProfileLoad(
  workspacePath?: string
): Promise<ProfileLoadResult | Record<string, never>> {
  try {
    const indexRaw = await readWorkspaceFile('profile/index.json', workspacePath)
    const index = JSON.parse(indexRaw) as {
      personalInfo?: { name?: string; email?: string; phone?: string; summaryFile?: string }
      workExperience?: Array<{
        id: string
        company: string
        role: string
        date: string
        descriptionFile?: string
      }>
      projects?: Array<{ id: string; name: string; techStack: string; descriptionFile?: string }>
    }

    let summary = ''
    if (index.personalInfo?.summaryFile) {
      try {
        summary = await readWorkspaceFile(
          `profile/${index.personalInfo.summaryFile}`,
          workspacePath
        )
      } catch {
        /* file may not exist */
      }
    }

    const workExperience = await Promise.all(
      (index.workExperience || []).map(async (exp): Promise<ProfileLoadWorkExperience> => {
        let description = ''
        if (exp.descriptionFile) {
          try {
            description = await readWorkspaceFile(`profile/${exp.descriptionFile}`, workspacePath)
          } catch {
            /* file may not exist */
          }
        }
        return {
          id: exp.id,
          company: exp.company,
          role: exp.role,
          date: exp.date,
          description
        }
      })
    )

    const projects = await Promise.all(
      (index.projects || []).map(async (proj): Promise<ProfileLoadProject> => {
        let description = ''
        if (proj.descriptionFile) {
          try {
            description = await readWorkspaceFile(`profile/${proj.descriptionFile}`, workspacePath)
          } catch {
            /* file may not exist */
          }
        }
        return {
          id: proj.id,
          name: proj.name,
          techStack: proj.techStack,
          description
        }
      })
    )

    const result: ProfileLoadResult = {
      personalInfo: {
        name: index.personalInfo?.name || '',
        email: index.personalInfo?.email || '',
        phone: index.personalInfo?.phone || '',
        summary
      },
      workExperience,
      projects
    }

    return result
  } catch (error) {
    console.warn('Failed to load profile (may not exist yet):', error)
    return {}
  }
}

export async function handleProfileSave(
  data: ProfileSaveData,
  workspacePath?: string
): Promise<IpcSuccessResponse | IpcErrorResponse> {
  try {
    const summaryFile = 'summary.md'
    await writeWorkspaceFile(
      `profile/${summaryFile}`,
      data.personalInfo?.summary || '',
      workspacePath
    )

    const workExperience = await Promise.all(
      (data.workExperience || []).map(
        async (exp: {
          id: string
          company: string
          role: string
          date: string
          description: string
        }): Promise<{
          id: string
          company: string
          role: string
          date: string
          descriptionFile: string
        }> => {
          const descFile = `work-exp-${exp.id}.md`
          await writeWorkspaceFile(`profile/${descFile}`, exp.description || '', workspacePath)
          return {
            id: exp.id,
            company: exp.company,
            role: exp.role,
            date: exp.date,
            descriptionFile: descFile
          }
        }
      )
    )

    const projects = await Promise.all(
      (data.projects || []).map(
        async (proj: {
          id: string
          name: string
          techStack: string
          description: string
        }): Promise<{ id: string; name: string; techStack: string; descriptionFile: string }> => {
          const descFile = `project-${proj.id}.md`
          await writeWorkspaceFile(`profile/${descFile}`, proj.description || '', workspacePath)
          return {
            id: proj.id,
            name: proj.name,
            techStack: proj.techStack,
            descriptionFile: descFile
          }
        }
      )
    )

    const index = {
      personalInfo: {
        name: data.personalInfo?.name || '',
        email: data.personalInfo?.email || '',
        phone: data.personalInfo?.phone || '',
        summaryFile
      },
      workExperience,
      projects
    }
    await writeWorkspaceFile('profile/index.json', JSON.stringify(index, null, 2), workspacePath)

    return { success: true }
  } catch (error) {
    console.error('Failed to save profile:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function handleSettingsLoad(): Promise<Record<string, unknown>> {
  try {
    const data = await readWorkspaceFile('settings.json')
    return JSON.parse(data) as Record<string, unknown>
  } catch (error) {
    console.warn('Failed to load settings (may not exist yet):', error)
    return {}
  }
}

export async function handleSettingsSave(
  data: unknown
): Promise<IpcSuccessResponse | IpcErrorResponse> {
  try {
    await writeWorkspaceFile('settings.json', JSON.stringify(data, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Failed to save settings:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function handleCvList(
  workspacePath?: string
): Promise<Array<Record<string, unknown>>> {
  try {
    const files = await listWorkspaceSubdirFiles('resumes', workspacePath)
    const jsonFiles = files.filter((f) => f.endsWith('.json'))
    const drafts = await Promise.all(
      jsonFiles.map(async (file): Promise<Record<string, unknown> | null> => {
        try {
          const content = await readWorkspaceFile(`resumes/${file}`, workspacePath)
          const data = JSON.parse(content) as Record<string, unknown>
          const modified = await getWorkspaceLastModified(`resumes/${file}`, workspacePath)
          return {
            ...data,
            id: file.replace('.json', ''),
            filename: file,
            lastModified: modified.toISOString()
          }
        } catch (e) {
          console.warn(`Skipping invalid CV file: ${file}`, e)
          return null
        }
      })
    )
    return drafts.filter(isNotNull)
  } catch (error) {
    console.warn('Failed to list CVs:', error)
    return []
  }
}

export async function handleCvSave(params: {
  filename: string
  data: CvSaveData
  workspacePath?: string
}): Promise<IpcSuccessResponse | IpcErrorResponse> {
  try {
    const { filename, data, workspacePath } = params
    const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`
    const baseName = safeFilename.replace('.json', '')

    let mdFile: string | undefined = data.mdFile
    if (data.generatedCV) {
      mdFile = `${baseName}.md`
      await writeWorkspaceFile(`resumes/${mdFile}`, data.generatedCV, workspacePath)
    }

    const metadata: CvSaveData = { ...data, mdFile }
    delete metadata.generatedCV
    const jsonData = metadata
    await writeWorkspaceFile(
      `resumes/${safeFilename}`,
      JSON.stringify(jsonData, null, 2),
      workspacePath
    )
    return { success: true }
  } catch (error) {
    console.error('Failed to save CV:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function handleCvDelete(params: {
  filename: string
  workspacePath?: string
}): Promise<IpcSuccessResponse | IpcErrorResponse> {
  try {
    const { filename, workspacePath } = params
    await deleteWorkspaceFile(`resumes/${filename}`, workspacePath)
    const mdFilename = filename.replace('.json', '.md')
    try {
      await deleteWorkspaceFile(`resumes/${mdFilename}`, workspacePath)
    } catch {
      /* .md file may not exist — that's fine */
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to delete CV:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function handleCvRead(params: {
  filename: string
  workspacePath?: string
}): Promise<IpcResult<{ data: Record<string, unknown> }>> {
  try {
    const { filename, workspacePath } = params
    const content = await readWorkspaceFile(`resumes/${filename}`, workspacePath)
    const data = JSON.parse(content) as CvSaveData

    if (data.mdFile) {
      try {
        const mdContent = await readWorkspaceFile(`resumes/${data.mdFile}`, workspacePath)
        data.generatedCV = mdContent
      } catch {
        data.generatedCV = ''
      }
    }

    return { success: true, data: data as unknown as Record<string, unknown> }
  } catch (error) {
    console.error('Failed to read CV:', error)
    return { success: false, error: (error as Error).message }
  }
}

export async function handleDialogOpenDirectory(deps: DialogDeps): Promise<string | null> {
  const { canceled, filePaths } = await deps.dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory']
  })
  if (canceled) {
    return null
  }
  return filePaths[0]
}

export async function handleShellOpenPath(
  requestedPath: string,
  deps: ShellOpenPathDeps
): Promise<string> {
  const ACCESS_DENIED_MESSAGE = 'Access denied: path is outside workspace'
  const defaultWorkspace = join(deps.app.getPath('userData'), 'workspace')
  const resolvedPath = resolve(requestedPath)
  if (resolvedPath === deps.app.getPath('home')) {
    const result = await deps.shell.openPath(resolvedPath)
    return result
  }
  const rel = relative(defaultWorkspace, resolvedPath)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    return ACCESS_DENIED_MESSAGE
  }
  const result = await deps.shell.openPath(resolvedPath)
  return result
}

export async function handleGetDefaultWorkspacePath(deps: AppDeps): Promise<string> {
  return join(deps.app.getPath('userData'), 'workspace')
}

export async function handleWorkspacePrecheck(params: {
  from: string
  to: string
}): Promise<IpcResult<MigrationPrecheck>> {
  try {
    const result = await precheckWorkspaceMigration(params.from, params.to)
    return { success: true, ...result }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export async function handleWorkspaceMigrate(params: {
  from: string
  to: string
  overwriteConflicts: boolean
}): Promise<MigrationResult> {
  try {
    const result = await migrateWorkspaceFiles(params.from, params.to, params.overwriteConflicts)
    return result
  } catch (error) {
    return {
      success: false,
      migrated: [],
      skipped: [],
      errors: [{ file: '', error: (error as Error).message }]
    }
  }
}

function sanitizeApiError(statusCode: number, rawError: string): string {
  // Limit error length to prevent huge error payloads
  const truncated = rawError.length > 500 ? rawError.substring(0, 500) + '...' : rawError
  // Remove potential auth tokens/keys from error text
  const sanitized = truncated.replace(
    /(?:Bearer |sk-|key-|api[_-]?key[=:]\s*)[^\s"',}]*/gi,
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
  } else if (config.provider !== 'ollama') {
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
}): Promise<{ success: true; content: string } | IpcErrorResponse> {
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
      body = JSON.stringify({ model: params.model, messages: params.messages })
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
      return { success: false, error: 'AI request timed out after 30 seconds' }
    }
    return { success: false, error: `AI chat failed: ${(error as Error).message}` }
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
    return { success: false, error: (error as Error).message }
  }
}

export async function handleGetVersion(deps: AppDeps): Promise<string> {
  return deps.app.getVersion()
}
