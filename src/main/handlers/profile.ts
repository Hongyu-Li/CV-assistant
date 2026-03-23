import { readWorkspaceFile, writeWorkspaceFile } from '../fs'
import { toErrorMessage } from '../utils'
import type {
  ProfileSaveData,
  ProfileLoadResult,
  ProfileLoadWorkExperience,
  ProfileLoadProject,
  ProfileLoadEducation,
  IpcSuccessResponse,
  IpcErrorResponse,
  DialogDeps
} from './types'

export interface PdfExtractResult {
  success: true
  text: string
  filename: string
}

export interface PdfExtractError {
  success: false
  error: string
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
      education?: Array<{
        id: string
        school: string
        degree: string
        date: string
        descriptionFile?: string
      }>
    }

    let summary = ''
    if (index.personalInfo?.summaryFile) {
      try {
        summary = await readWorkspaceFile(
          `profile/${index.personalInfo.summaryFile}`,
          workspacePath
        )
      } catch (e) {
        console.debug('Summary file not found:', e)
      }
    }

    const workExperience = await Promise.all(
      (index.workExperience || []).map(async (exp): Promise<ProfileLoadWorkExperience> => {
        let description = ''
        if (exp.descriptionFile) {
          try {
            description = await readWorkspaceFile(`profile/${exp.descriptionFile}`, workspacePath)
          } catch (e) {
            console.debug('Work experience description file not found:', e)
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
          } catch (e) {
            console.debug('Project description file not found:', e)
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

    const education = await Promise.all(
      (index.education || []).map(async (edu): Promise<ProfileLoadEducation> => {
        let description = ''
        if (edu.descriptionFile) {
          try {
            description = await readWorkspaceFile(`profile/${edu.descriptionFile}`, workspacePath)
          } catch (e) {
            console.debug('Education description file not found:', e)
          }
        }
        return {
          id: edu.id,
          school: edu.school,
          degree: edu.degree,
          date: edu.date,
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
      projects,
      education
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

    const education = await Promise.all(
      (data.education || []).map(
        async (edu: {
          id: string
          school: string
          degree: string
          date: string
          description: string
        }): Promise<{
          id: string
          school: string
          degree: string
          date: string
          descriptionFile: string
        }> => {
          const descFile = `education-${edu.id}.md`
          await writeWorkspaceFile(`profile/${descFile}`, edu.description || '', workspacePath)
          return {
            id: edu.id,
            school: edu.school,
            degree: edu.degree,
            date: edu.date,
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
      projects,
      education
    }
    await writeWorkspaceFile('profile/index.json', JSON.stringify(index, null, 2), workspacePath)

    return { success: true }
  } catch (error) {
    console.error('Failed to save profile:', error)
    return { success: false, error: toErrorMessage(error) }
  }
}

export async function handleProfileExtractPdfText(
  deps: DialogDeps
): Promise<PdfExtractResult | PdfExtractError | null> {
  const { canceled, filePaths } = await deps.dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
  })
  if (canceled || filePaths.length === 0) {
    return null
  }

  const filePath = filePaths[0]
  const filename = filePath.split(/[/\\]/).pop() ?? 'unknown.pdf'

  try {
    const { readFile } = await import('fs/promises')
    const { PDFParse } = await import('pdf-parse')
    const dataBuffer = await readFile(filePath)
    const parser = new PDFParse({ data: new Uint8Array(dataBuffer) })
    const result = await parser.getText()
    await parser.destroy()
    return { success: true, text: result.text, filename }
  } catch (error) {
    console.error('Failed to parse PDF:', error)
    return { success: false, error: toErrorMessage(error) }
  }
}
