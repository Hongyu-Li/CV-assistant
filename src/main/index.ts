import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import {
  readUserDataFile,
  writeUserDataFile,
  listWorkspaceFiles,
  readWorkspaceFile,
  getWorkspaceLastModified,
  writeWorkspaceFile,
  deleteWorkspaceFile
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
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Profile Management IPC
  ipcMain.handle('profile:load', async () => {
    try {
      const data = await readUserDataFile('profile.json')
      return JSON.parse(data)
    } catch (error) {
      console.warn('Failed to load profile (may not exist yet):', error)
      return {}
    }
  })

  ipcMain.handle('profile:save', async (_, data) => {
    try {
      await writeUserDataFile('profile.json', JSON.stringify(data, null, 2))
      return { success: true }
    } catch (error) {
      console.error('Failed to save profile:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  // CV Management IPC
  ipcMain.handle('cv:list', async (_, workspacePath?: string) => {
    try {
      const files = await listWorkspaceFiles(workspacePath)
      const drafts = await Promise.all(
        files.map(async (file) => {
          try {
            const content = await readWorkspaceFile(file, workspacePath)
            const data = JSON.parse(content)
            const modified = await getWorkspaceLastModified(file, workspacePath)
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
      await writeWorkspaceFile(safeFilename, JSON.stringify(data, null, 2), workspacePath)
      return { success: true }
    } catch (error) {
      console.error('Failed to save CV:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('cv:delete', async (_, { filename, workspacePath }) => {
    try {
      await deleteWorkspaceFile(filename, workspacePath)
      return { success: true }
    } catch (error) {
      console.error('Failed to delete CV:', error)
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
  createWindow()

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
