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
