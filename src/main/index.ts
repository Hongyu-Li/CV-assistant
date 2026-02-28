import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { autoUpdater } from 'electron-updater'
import {
  handleAiChat,
  handleAiTest,
  handleAutoUpdateCheck,
  handleAutoUpdateInstall,
  handleAutoUpdateSetAutoDownload,
  handleCvDelete,
  handleCvList,
  handleCvRead,
  handleCvSave,
  handleDialogOpenDirectory,
  handleGetDefaultWorkspacePath,
  handleGetVersion,
  handleProfileLoad,
  handleProfileSave,
  handleSettingsLoad,
  handleSettingsSave,
  handleShellOpenPath,
  handleWorkspaceMigrate,
  handleWorkspacePrecheck
} from './handlers'
import {
  listWorkspaceFiles,
  readWorkspaceFile,
  writeWorkspaceFile,
  deleteWorkspaceFile,
  readUserDataFile
} from './fs'

function createWindow(): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    title: '简历助手 - CV Assistant',
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
  return mainWindow
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(async () => {
    // Set app name for macOS menu bar
    app.setName('简历助手')

    // Set About panel options (icon, app name, version)
    const appIcon = nativeImage.createFromPath(icon)
    app.setAboutPanelOptions({
      applicationName: '简历助手 - CV Assistant',
      applicationVersion: app.getVersion(),
      iconPath: icon
    })

    // Set dock icon on macOS (ensures correct icon in dev mode)
    if (process.platform === 'darwin') {
      app.dock?.setIcon(appIcon)
    }

    // Set app user model id for windows
    electronApp.setAppUserModelId('com.cv-assistant')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    // Profile Management IPC
    ipcMain.handle('profile:load', (_, workspacePath?: string) => handleProfileLoad(workspacePath))

    ipcMain.handle('profile:save', (_, data, workspacePath?: string) =>
      handleProfileSave(data, workspacePath)
    )

    // Settings Management IPC
    ipcMain.handle('settings:load', () => handleSettingsLoad())

    ipcMain.handle('settings:save', (_, data) => handleSettingsSave(data))

    // CV Management IPC
    ipcMain.handle('cv:list', (_, workspacePath?: string) => handleCvList(workspacePath))

    ipcMain.handle('cv:save', (_, { filename, data, workspacePath }) =>
      handleCvSave({ filename, data, workspacePath })
    )

    ipcMain.handle('cv:delete', (_, { filename, workspacePath }) =>
      handleCvDelete({ filename, workspacePath })
    )

    ipcMain.handle('cv:read', (_, { filename, workspacePath }) =>
      handleCvRead({ filename, workspacePath })
    )

    // Directory Picker IPC
    ipcMain.handle('dialog:openDirectory', () => handleDialogOpenDirectory({ dialog }))

    // Open folder in OS file manager
    ipcMain.handle('shell:openPath', (_, requestedPath: string) =>
      handleShellOpenPath(requestedPath, { shell, app })
    )

    // Get default workspace path (userData/drafts)
    ipcMain.handle('app:getDefaultWorkspacePath', () => handleGetDefaultWorkspacePath({ app }))

    // Workspace migration IPC
    ipcMain.handle('workspace:precheck', (_, { from, to }) => handleWorkspacePrecheck({ from, to }))

    ipcMain.handle('workspace:migrate', (_, { from, to, overwriteConflicts }) =>
      handleWorkspaceMigrate({ from, to, overwriteConflicts })
    )

    // AI API proxy IPC — all external HTTP from main process to bypass CSP
    ipcMain.handle('ai:chat', (_, { provider, apiKey, model, messages, baseUrl }) =>
      handleAiChat({ provider, apiKey, model, messages, baseUrl })
    )

    ipcMain.handle('ai:test', (_, { provider, apiKey, model, baseUrl }) =>
      handleAiTest({ provider, apiKey, model, baseUrl })
    )

    // Auto-update IPC handlers
    ipcMain.handle('auto-update:check', () => handleAutoUpdateCheck({ autoUpdater }))

    ipcMain.handle('auto-update:install', () => handleAutoUpdateInstall({ autoUpdater }))

    ipcMain.handle('auto-update:set-auto-download', (_, enabled: boolean) =>
      handleAutoUpdateSetAutoDownload(enabled, { autoUpdater })
    )

    ipcMain.handle('app:getVersion', () => handleGetVersion({ app }))
    const mainWindow = createWindow()

    // Setup auto-updater
    try {
      const settingsRaw = await readWorkspaceFile('settings.json')
      const savedSettings = JSON.parse(settingsRaw)
      autoUpdater.autoDownload = savedSettings.autoUpdate !== false
    } catch {
      // Settings not found — default to auto-download enabled
      autoUpdater.autoDownload = true
    }
    autoUpdater.autoInstallOnAppQuit = true

    // Auto-updater events → renderer (with destroyed-window guard)
    autoUpdater.on('checking-for-update', () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:checking')
      }
    })
    autoUpdater.on('update-available', (info) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:available', { version: info.version })
      }
    })
    autoUpdater.on('update-not-available', () => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:not-available')
      }
    })
    autoUpdater.on('download-progress', (progress) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:download-progress', {
          percent: Math.round(progress.percent)
        })
      }
    })
    autoUpdater.on('update-downloaded', (info) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:downloaded', { version: info.version })
      }
    })
    autoUpdater.on('error', (err) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auto-update:error', { error: err.message })
      }
    })

    // Check for updates after window is ready (non-blocking)
    mainWindow.webContents.once('did-finish-load', () => {
      if (autoUpdater.autoDownload && app.isPackaged) {
        autoUpdater.checkForUpdates().catch(() => {
          // Silently ignore — update check is best-effort
        })
      }
    })

    // Register macOS activate handler early (before async migration) to ensure it's always available
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

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

    // Data format migration: old flat workspace → new subdirectory structure
    try {
      const workspaceDir = join(app.getPath('home'), '.cv-assistant')

      // 1. Migrate profile from userData to workspace
      try {
        const oldProfile = await readUserDataFile('profile.json')
        // Check if new profile already exists
        try {
          await readWorkspaceFile('profile/index.json', workspaceDir)
          // New profile exists — skip migration
        } catch {
          // New profile doesn't exist — migrate
          const data = JSON.parse(oldProfile)
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
            await writeWorkspaceFile(
              'profile/index.json',
              JSON.stringify(index, null, 2),
              workspaceDir
            )
            console.log('Profile migrated from userData to workspace')
          }
        }
      } catch {
        // Old profile doesn't exist — nothing to migrate
      }

      // 2. Migrate CVs from workspace root to resumes/ subdirectory
      try {
        const rootFiles = await listWorkspaceFiles(workspaceDir)
        const rootJsonFiles = rootFiles.filter((f) => f.endsWith('.json') && f !== 'settings.json')

        for (const file of rootJsonFiles) {
          try {
            const content = await readWorkspaceFile(file, workspaceDir)
            const data = JSON.parse(content)

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
              const metadata = { ...data, mdFile }
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
          } catch {
            // Skip files that fail to parse
          }
        }
      } catch {
        // No files to migrate
      }
    } catch {
      // Migration is best-effort, don't block app startup
    }

    // (activate handler registered above, before async migration code)
  })
  .catch((err: Error) => {
    // Catch unhandled startup errors to prevent silent crashes
    console.error('Fatal error during app startup:', err)
    app.quit()
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
