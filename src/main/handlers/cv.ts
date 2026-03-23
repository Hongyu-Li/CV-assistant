import {
  deleteWorkspaceFile,
  getWorkspaceLastModified,
  listWorkspaceSubdirFiles,
  readWorkspaceFile,
  writeWorkspaceFile
} from '../fs'
import { toErrorMessage } from '../utils'
import type { CvSaveData, IpcSuccessResponse, IpcErrorResponse, IpcResult } from './types'

function isNotNull<T>(value: T | null): value is T {
  return value !== null
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
    return { success: false, error: toErrorMessage(error) }
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
    } catch (e) {
      console.debug('MD file not found during CV delete:', e)
    }
    return { success: true }
  } catch (error) {
    console.error('Failed to delete CV:', error)
    return { success: false, error: toErrorMessage(error) }
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
      } catch (e) {
        console.debug('MD file not found during CV read:', e)
        data.generatedCV = ''
      }
    }

    return { success: true, data: data as unknown as Record<string, unknown> }
  } catch (error) {
    console.error('Failed to read CV:', error)
    return { success: false, error: toErrorMessage(error) }
  }
}
