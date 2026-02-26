import { app } from 'electron'
import { join, normalize, dirname } from 'path'
import { promises as fs } from 'fs'

function getSafeFilePath(filename: string): string {
  const userDataPath = app.getPath('userData')
  const safePath = normalize(join(userDataPath, filename))

  if (!safePath.startsWith(userDataPath)) {
    throw new Error('Invalid file path')
  }

  return safePath
}

export async function readUserDataFile(filename: string): Promise<string> {
  const filePath = getSafeFilePath(filename)
  return fs.readFile(filePath, 'utf-8')
}

export async function writeUserDataFile(filename: string, content: string): Promise<void> {
  const filePath = getSafeFilePath(filename)
  await fs.mkdir(dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function listUserDataFiles(directory: string): Promise<string[]> {
  const dirPath = getSafeFilePath(directory)
  try {
    const files = await fs.readdir(dirPath)
    return files
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function deleteUserDataFile(filename: string): Promise<void> {
  const filePath = getSafeFilePath(filename)
  await fs.unlink(filePath)
}
export async function getLastModified(filename: string): Promise<Date> {
  const filePath = getSafeFilePath(filename)
  const stats = await fs.stat(filePath)
  return stats.mtime
}
