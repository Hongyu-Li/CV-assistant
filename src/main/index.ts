import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  listWorkspaceFiles,
  listWorkspaceSubdirFiles,
  readWorkspaceFile,
  getWorkspaceLastModified,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  precheckWorkspaceMigration,
  migrateWorkspaceFiles
} from './fs'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Profile Management IPC
  ipcMain.handle('profile:load', async (_, workspacePath?: string) => {
    try {
      // Read index file
      const indexRaw = await readWorkspaceFile('profile/index.json', workspacePath)
      const index = JSON.parse(indexRaw)

      // Read summary markdown
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

      // Read work experience descriptions
      const workExperience = await Promise.all(
        (index.workExperience || []).map(
          async (exp: {
            id: string
            company: string
            role: string
            date: string
            descriptionFile?: string
          }) => {
            let description = ''
            if (exp.descriptionFile) {
              try {
                description = await readWorkspaceFile(
                  `profile/${exp.descriptionFile}`,
                  workspacePath
                )
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
          }
        )
      )

      // Read project descriptions
      const projects = await Promise.all(
        (index.projects || []).map(
          async (proj: {
            id: string
            name: string
            techStack: string
            descriptionFile?: string
          }) => {
            let description = ''
            if (proj.descriptionFile) {
              try {
                description = await readWorkspaceFile(
                  `profile/${proj.descriptionFile}`,
                  workspacePath
                )
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
          }
        )
      )

      return {
        personalInfo: {
          name: index.personalInfo?.name || '',
          email: index.personalInfo?.email || '',
          phone: index.personalInfo?.phone || '',
          summary
        },
        workExperience,
        projects
      }
    } catch (error) {
      console.warn('Failed to load profile (may not exist yet):', error)
      return {}
    }
  })

  ipcMain.handle('profile:save', async (_, data, workspacePath?: string) => {
    try {
      // Write summary markdown
      const summaryFile = 'summary.md'
      await writeWorkspaceFile(
        `profile/${summaryFile}`,
        data.personalInfo?.summary || '',
        workspacePath
      )

      // Write work experience descriptions
      const workExperience = await Promise.all(
        (data.workExperience || []).map(
          async (exp: {
            id: string
            company: string
            role: string
            date: string
            description: string
          }) => {
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

      // Write project descriptions
      const projects = await Promise.all(
        (data.projects || []).map(
          async (proj: { id: string; name: string; techStack: string; description: string }) => {
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

      // Write index
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
  })

  // Settings Management IPC
  ipcMain.handle('settings:load', async () => {
    try {
      const data = await readWorkspaceFile('settings.json')
      return JSON.parse(data)
    } catch (error) {
      // Settings file doesn't exist yet — return empty object (use defaults)
      console.warn('Failed to load settings (may not exist yet):', error)
      return {}
    }
  })

  ipcMain.handle('settings:save', async (_, data) => {
    try {
      await writeWorkspaceFile('settings.json', JSON.stringify(data, null, 2))
      return { success: true }
    } catch (error) {
      console.error('Failed to save settings:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // CV Management IPC
  ipcMain.handle('cv:list', async (_, workspacePath?: string) => {
    try {
      const files = await listWorkspaceSubdirFiles('resumes', workspacePath)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))
      const drafts = await Promise.all(
        jsonFiles.map(async (file) => {
          try {
            const content = await readWorkspaceFile(`resumes/${file}`, workspacePath)
            const data = JSON.parse(content)
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
      return drafts.filter(Boolean)
    } catch (error) {
      console.warn('Failed to list CVs:', error)
      return []
    }
  })

  ipcMain.handle('cv:save', async (_, { filename, data, workspacePath }) => {
    try {
      const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`
      const baseName = safeFilename.replace('.json', '')

      // If there's generated CV content, save it as a separate .md file
      let mdFile: string | undefined = data.mdFile
      if (data.generatedCV) {
        mdFile = `${baseName}.md`
        await writeWorkspaceFile(`resumes/${mdFile}`, data.generatedCV, workspacePath)
      }

      // Save JSON metadata WITHOUT generatedCV content — use mdFile reference instead
      const metadata = { ...data, mdFile }
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
  })

  ipcMain.handle('cv:delete', async (_, { filename, workspacePath }) => {
    try {
      // Delete JSON file
      await deleteWorkspaceFile(`resumes/${filename}`, workspacePath)
      // Also delete companion .md file if it exists
      const mdFilename = filename.replace('.json', '.md')
      try {
        await deleteWorkspaceFile(`resumes/${mdFilename}`, workspacePath)
      } catch {
        // .md file may not exist — that's fine
      }
      return { success: true }
    } catch (error) {
      console.error('Failed to delete CV:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('cv:read', async (_, { filename, workspacePath }) => {
    try {
      const content = await readWorkspaceFile(`resumes/${filename}`, workspacePath)
      const data = JSON.parse(content)

      // If there's a mdFile reference, read the .md content and return as generatedCV
      if (data.mdFile) {
        try {
          const mdContent = await readWorkspaceFile(`resumes/${data.mdFile}`, workspacePath)
          data.generatedCV = mdContent
        } catch {
          // .md file may not exist
          data.generatedCV = ''
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Failed to read CV:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Directory Picker IPC
  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    if (canceled) {
      return null
    }
    return filePaths[0]
  })

  // Open folder in OS file manager
  ipcMain.handle('shell:openPath', async (_, path: string) => {
    const result = await shell.openPath(path)
    return result // empty string = success
  })

  // Get default workspace path (userData/drafts)
  ipcMain.handle('app:getDefaultWorkspacePath', () => {
    return join(app.getPath('home'), '.cv-assistant')
  })

  // Workspace migration IPC
  ipcMain.handle('workspace:precheck', async (_, { from, to }: { from: string; to: string }) => {
    try {
      const result = await precheckWorkspaceMigration(from, to)
      return { success: true, ...result }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle(
    'workspace:migrate',
    async (
      _,
      { from, to, overwriteConflicts }: { from: string; to: string; overwriteConflicts: boolean }
    ) => {
      try {
        const result = await migrateWorkspaceFiles(from, to, overwriteConflicts)
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
  )

  // AI API proxy IPC — all external HTTP from main process to bypass CSP
  ipcMain.handle(
    'ai:chat',
    async (
      _,
      {
        provider,
        apiKey,
        model,
        messages,
        baseUrl
      }: {
        provider: string
        apiKey: string
        model: string
        messages: Array<{ role: string; content: string }>
        baseUrl: string
      }
    ) => {
      // Build URL
      let url: string
      if (provider === 'anthropic') {
        url = `${baseUrl || 'https://api.anthropic.com/v1'}/messages`
      } else {
        url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`
      }

      // Build headers
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (provider === 'anthropic') {
        headers['x-api-key'] = apiKey
        headers['anthropic-version'] = '2023-06-01'
      } else if (provider !== 'ollama') {
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      // Build body
      let body: string
      if (provider === 'anthropic') {
        const systemMsgs = messages.filter((m) => m.role === 'system')
        const nonSystemMsgs = messages.filter((m) => m.role !== 'system')
        body = JSON.stringify({
          model,
          max_tokens: 4096,
          ...(systemMsgs.length > 0 ? { system: systemMsgs.map((m) => m.content).join('\n') } : {}),
          messages: nonSystemMsgs
        })
      } else {
        body = JSON.stringify({ model, messages })
      }

      const response = await fetch(url, { method: 'POST', headers, body })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API error ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      // Extract content
      if (provider === 'anthropic') {
        return data.content?.[0]?.text || ''
      }
      return data.choices?.[0]?.message?.content || ''
    }
  )

  ipcMain.handle(
    'ai:test',
    async (
      _,
      {
        provider,
        apiKey,
        model,
        baseUrl
      }: {
        provider: string
        apiKey: string
        model: string
        baseUrl: string
      }
    ) => {
      try {
        let url: string
        if (provider === 'anthropic') {
          url = `${baseUrl || 'https://api.anthropic.com/v1'}/messages`
        } else {
          url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (provider === 'anthropic') {
          headers['x-api-key'] = apiKey
          headers['anthropic-version'] = '2023-06-01'
        } else if (provider !== 'ollama') {
          headers['Authorization'] = `Bearer ${apiKey}`
        }

        let body: string
        if (provider === 'anthropic') {
          body = JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }]
          })
        } else {
          body = JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 10
          })
        }

        const response = await fetch(url, { method: 'POST', headers, body })
        if (!response.ok) {
          const errorText = await response.text()
          return { success: false, error: `HTTP ${response.status}: ${errorText}` }
        }
        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    }
  )
  createWindow()

  // First-run migration check: detect files at old default location
  const oldDefaultPath = join(app.getPath('userData'), 'drafts')
  const newDefaultPath = join(app.getPath('home'), '.cv-assistant')
  try {
    const oldFiles = await listWorkspaceFiles(oldDefaultPath)
    if (oldFiles.length > 0) {
      // Check if new default has any files
      const newFiles = await listWorkspaceFiles(newDefaultPath)
      if (newFiles.length === 0) {
        // Old location has files, new doesn't — notify renderer
        const mainWindow = BrowserWindow.getAllWindows()[0]
        if (mainWindow) {
          mainWindow.webContents.once('did-finish-load', () => {
            mainWindow.webContents.send('workspace:first-run-migration', {
              oldPath: oldDefaultPath,
              fileCount: oldFiles.length
            })
          })
        }
      }
    }
  } catch {
    // Silently ignore — not critical
  }

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
