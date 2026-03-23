import {
  deleteWorkspaceFile,
  listWorkspaceFiles,
  readUserDataFile,
  readWorkspaceFile,
  writeWorkspaceFile
} from './fs'

export async function runDataMigration(workspaceDir: string): Promise<void> {
  // 1. Migrate profile from userData to workspace
  try {
    const oldProfile = await readUserDataFile('profile.json')
    // Check if new profile already exists
    try {
      await readWorkspaceFile('profile/index.json', workspaceDir)
      // New profile exists — skip migration
    } catch {
      const data = JSON.parse(oldProfile) as {
        personalInfo?: {
          name?: string
          email?: string
          phone?: string
          summary?: string
        }
        workExperience?: Array<{
          id: string
          company: string
          role: string
          date: string
          description: string
        }>
        projects?: Array<{
          id: string
          name: string
          techStack: string
          description: string
        }>
      }
      if (data.personalInfo) {
        const summaryFile = 'summary.md'
        await writeWorkspaceFile(
          `profile/${summaryFile}`,
          data.personalInfo.summary || '',
          workspaceDir
        )

        const workExperience = (data.workExperience || []).map(
          (exp: {
            id: string
            company: string
            role: string
            date: string
            description: string
          }): {
            id: string
            company: string
            role: string
            date: string
            descriptionFile: string
          } => {
            const descFile = `work-exp-${exp.id}.md`
            return {
              id: exp.id,
              company: exp.company,
              role: exp.role,
              date: exp.date,
              descriptionFile: descFile
            }
          }
        )

        for (const exp of data.workExperience || []) {
          await writeWorkspaceFile(
            `profile/work-exp-${exp.id}.md`,
            exp.description || '',
            workspaceDir
          )
        }

        const projects = (data.projects || []).map(
          (proj: {
            id: string
            name: string
            techStack: string
            description: string
          }): {
            id: string
            name: string
            techStack: string
            descriptionFile: string
          } => {
            const descFile = `project-${proj.id}.md`
            return {
              id: proj.id,
              name: proj.name,
              techStack: proj.techStack,
              descriptionFile: descFile
            }
          }
        )

        for (const proj of data.projects || []) {
          await writeWorkspaceFile(
            `profile/project-${proj.id}.md`,
            proj.description || '',
            workspaceDir
          )
        }

        const index = {
          personalInfo: {
            name: data.personalInfo.name || '',
            email: data.personalInfo.email || '',
            phone: data.personalInfo.phone || '',
            summaryFile
          },
          workExperience,
          projects
        }
        await writeWorkspaceFile('profile/index.json', JSON.stringify(index, null, 2), workspaceDir)
        console.log('Profile migrated from userData to workspace')
      }
    }
  } catch (e) {
    if (e instanceof Error && (e as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.debug('Unexpected error reading old profile:', e)
    }
  }

  // 2. Migrate CVs from workspace root to resumes/ subdirectory
  try {
    const rootFiles = await listWorkspaceFiles(workspaceDir)
    const rootJsonFiles = rootFiles.filter((f) => f.endsWith('.json') && f !== 'settings.json')

    for (const file of rootJsonFiles) {
      try {
        const content = await readWorkspaceFile(file, workspaceDir)
        const data = JSON.parse(content) as {
          jobTitle?: string
          jobDescription?: string
          generatedCV?: string
          [key: string]: unknown
        }

        // Check if this looks like a CV file (has jobTitle or jobDescription)
        if (data.jobTitle || data.jobDescription) {
          const baseName = file.replace('.json', '')

          // Extract generatedCV to .md file if present
          let mdFile: string | undefined
          if (data.generatedCV) {
            mdFile = `${baseName}.md`
            await writeWorkspaceFile(`resumes/${mdFile}`, data.generatedCV, workspaceDir)
          }

          // Write metadata to resumes/ subdir without generatedCV content
          const metadata: Record<string, unknown> = { ...data, mdFile }
          delete metadata.generatedCV
          await writeWorkspaceFile(
            `resumes/${file}`,
            JSON.stringify(metadata, null, 2),
            workspaceDir
          )

          // Delete old root file
          await deleteWorkspaceFile(file, workspaceDir)
          console.log(`CV migrated: ${file} → resumes/${file}`)
        }
      } catch (err) {
        // Skip files that fail to parse
        console.warn('Skipping file during migration:', err)
      }
    }
  } catch (err) {
    // No files to migrate — ENOENT is expected, log anything else
    if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Unexpected error listing files for migration:', err)
    }
  }
}
