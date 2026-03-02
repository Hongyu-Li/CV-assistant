import { app, shell, BrowserWindow, ipcMain, dialog, nativeImage, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// i18n translations for macOS application menu
interface MenuTranslations {
  about: string
  services: string
  hide: string
  hideOthers: string
  showAll: string
  quit: string
  file: string
  close: string
  edit: string
  undo: string
  redo: string
  cut: string
  copy: string
  paste: string
  selectAll: string
  view: string
  reload: string
  toggleDevTools: string
  resetZoom: string
  zoomIn: string
  zoomOut: string
  fullscreen: string
  window: string
  minimize: string
  zoom: string
  front: string
}

const menuI18n: Record<string, MenuTranslations> = {
  en: {
    about: 'About CV Assistant',
    services: 'Services',
    hide: 'Hide CV Assistant',
    hideOthers: 'Hide Others',
    showAll: 'Show All',
    quit: 'Quit CV Assistant',
    file: 'File',
    close: 'Close Window',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Toggle Full Screen',
    window: 'Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front'
  },
  zh: {
    about: '关于简历助手',
    services: '服务',
    hide: '隐藏简历助手',
    hideOthers: '隐藏其他',
    showAll: '显示全部',
    quit: '退出简历助手',
    file: '文件',
    close: '关闭窗口',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    view: '视图',
    reload: '重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    fullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    zoom: '缩放',
    front: '全部置于最前'
  }
}

function buildAppMenu(lang: string): void {
  if (process.platform !== 'darwin') return

  const t = menuI18n[lang] || menuI18n['en']
  const appName = lang === 'zh' ? '简历助手' : 'CV Assistant'

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: appName,
      submenu: [
        { role: 'about', label: t.about },
        { type: 'separator' },
        { role: 'services', label: t.services },
        { type: 'separator' },
        { role: 'hide', label: t.hide },
        { role: 'hideOthers', label: t.hideOthers },
        { role: 'unhide', label: t.showAll },
        { type: 'separator' },
        { role: 'quit', label: t.quit }
      ]
    },
    {
      label: t.file,
      submenu: [{ role: 'close', label: t.close }]
    },
    {
      label: t.edit,
      submenu: [
        { role: 'undo', label: t.undo },
        { role: 'redo', label: t.redo },
        { type: 'separator' },
        { role: 'cut', label: t.cut },
        { role: 'copy', label: t.copy },
        { role: 'paste', label: t.paste },
        { role: 'selectAll', label: t.selectAll }
      ]
    },
    {
      label: t.view,
      submenu: [
        { role: 'reload', label: t.reload },
        { role: 'toggleDevTools', label: t.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: t.resetZoom },
        { role: 'zoomIn', label: t.zoomIn },
        { role: 'zoomOut', label: t.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: t.fullscreen }
      ]
    },
    {
      label: t.window,
      submenu: [
        { role: 'minimize', label: t.minimize },
        { role: 'zoom', label: t.zoom },
        { type: 'separator' },
        { role: 'front', label: t.front }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // Update About panel
  app.setAboutPanelOptions({
    applicationName: lang === 'zh' ? '简历助手' : 'CV Assistant',
    applicationVersion: app.getVersion(),
    iconPath: icon
  })
}
import {
  handleAiChat,
  handleAiTest,
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

// Global error handlers for the main process
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled rejection in main process:', reason)
})

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception in main process:', error)
})

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
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!process.env.E2E_HEADLESS) {
      mainWindow.show()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        shell.openExternal(details.url)
      }
    } catch {
      console.warn('Blocked opening invalid URL:', details.url)
    }
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

    // Build initial macOS menu — read language from saved settings
    let initialLang = 'en'
    try {
      const settingsRaw = await readWorkspaceFile('settings.json')
      const savedSettings = JSON.parse(settingsRaw)
      if (savedSettings.language) {
        initialLang = savedSettings.language
      }
    } catch (e) {
      console.debug('Settings not found, using defaults:', e)
    }

    // Set dock icon on macOS (ensures correct icon in dev mode)
    const appIcon = nativeImage.createFromPath(icon)
    if (process.platform === 'darwin') {
      app.dock?.setIcon(appIcon)
    }

    // Build i18n-aware macOS menu and About panel
    buildAppMenu(initialLang)

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

    ipcMain.handle('app:getVersion', () => handleGetVersion({ app }))

    // Language change IPC — rebuild macOS menu and About panel
    ipcMain.handle('app:setLanguage', (_, lang: string) => {
      buildAppMenu(lang)
    })
    createWindow()

    // Register macOS activate handler early (before async migration) to ensure it's always available
    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })

    // First-run migration check: detect files at old default locations
    const legacyDraftsPath = join(app.getPath('userData'), 'drafts')
    const legacyHomePath = join(app.getPath('home'), '.cv-assistant')
    const newDefaultPath = join(app.getPath('userData'), 'workspace')
    try {
      // Check legacy drafts location first, then legacy home location
      let oldPath: string | null = null
      let oldFiles: string[] = []
      for (const legacyPath of [legacyDraftsPath, legacyHomePath]) {
        try {
          const files = await listWorkspaceFiles(legacyPath)
          if (files.length > 0) {
            oldPath = legacyPath
            oldFiles = files
            break
          }
        } catch (e) {
          console.debug('Legacy path check failed:', e)
        }
      }
      if (oldPath) {
        // Check if new default has any files
        const newFiles = await listWorkspaceFiles(newDefaultPath)
        if (newFiles.length === 0) {
          // Old location has files, new doesn't — notify renderer
          const mainWindow = BrowserWindow.getAllWindows()[0]
          if (mainWindow) {
            mainWindow.webContents.once('did-finish-load', () => {
              mainWindow.webContents.send('workspace:first-run-migration', {
                oldPath,
                fileCount: oldFiles.length
              })
            })
          }
        }
      }
    } catch (e) {
      console.debug('First-run migration check failed:', e)
    }

    // Data format migration: old flat workspace → new subdirectory structure
    try {
      const workspaceDir = join(app.getPath('userData'), 'workspace')

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
      } catch (e) {
        console.debug('Old profile not found:', e)
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
    } catch (err) {
      // Migration is best-effort — ENOENT is expected, log anything else
      if (err instanceof Error && (err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Unexpected error during migration:', err)
      }
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
