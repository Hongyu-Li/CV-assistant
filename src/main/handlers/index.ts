import { join, resolve, relative, isAbsolute } from 'path'
import { z } from 'zod/v4'
import {
  migrateWorkspaceFiles,
  precheckWorkspaceMigration,
  readWorkspaceFile,
  writeWorkspaceFile
} from '../fs'
import type { MigrationPrecheck, MigrationResult } from '../fs'
import { toErrorMessage } from '../utils'
import type {
  IpcSuccessResponse,
  IpcErrorResponse,
  IpcResult,
  DialogDeps,
  ShellOpenPathDeps,
  AppDeps
} from './types'

export * from './types'
export * from './profile'
export * from './cv'
export * from './ai'
export * from './llm'

const settingsSchema = z
  .object({
    provider: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
    baseUrl: z.string().optional(),
    language: z.string().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    autoUpdate: z.boolean().optional(),
    workspacePath: z.string().optional()
  })
  .passthrough()

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
    const parsed = settingsSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: `Invalid settings: ${parsed.error.message}` }
    }
    await writeWorkspaceFile('settings.json', JSON.stringify(parsed.data, null, 2))
    return { success: true }
  } catch (error) {
    console.error('Failed to save settings:', error)
    return { success: false, error: toErrorMessage(error) }
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
    return { success: false, error: toErrorMessage(error) }
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
      errors: [{ file: '', error: toErrorMessage(error) }]
    }
  }
}

export async function handleGetVersion(deps: AppDeps): Promise<string> {
  return deps.app.getVersion()
}
