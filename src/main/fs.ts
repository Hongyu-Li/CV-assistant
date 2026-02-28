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

function getWorkspaceFilePath(filename: string, workspaceDir?: string): string {
  const rootPath = workspaceDir
    ? normalize(workspaceDir)
    : join(app.getPath('userData'), 'workspace')
  const safePath = normalize(join(rootPath, filename))

  if (!safePath.startsWith(rootPath)) {
    throw new Error('Invalid file path')
  }

  return safePath
}

export async function readWorkspaceFile(filename: string, workspaceDir?: string): Promise<string> {
  const filePath = getWorkspaceFilePath(filename, workspaceDir)
  return fs.readFile(filePath, 'utf-8')
}

export async function writeWorkspaceFile(
  filename: string,
  content: string,
  workspaceDir?: string
): Promise<void> {
  const filePath = getWorkspaceFilePath(filename, workspaceDir)
  await fs.mkdir(dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content, 'utf-8')
}

export async function listWorkspaceFiles(workspaceDir?: string): Promise<string[]> {
  const dirPath = getWorkspaceFilePath('', workspaceDir)
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

export async function listWorkspaceSubdirFiles(
  subdir: string,
  workspaceDir?: string
): Promise<string[]> {
  const dirPath = getWorkspaceFilePath(subdir, workspaceDir)
  try {
    const entries = await fs.readdir(dirPath)
    return entries
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

export async function deleteWorkspaceFile(filename: string, workspaceDir?: string): Promise<void> {
  const filePath = getWorkspaceFilePath(filename, workspaceDir)
  await fs.unlink(filePath)
}

export async function getWorkspaceLastModified(
  filename: string,
  workspaceDir?: string
): Promise<Date> {
  const filePath = getWorkspaceFilePath(filename, workspaceDir)
  const stats = await fs.stat(filePath)
  return stats.mtime
}

export interface MigrationPrecheck {
  fileCount: number
  files: string[]
  conflicts: string[]
}

async function collectFilesRecursively(dir: string, prefix: string): Promise<string[]> {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  const result: string[] = []
  for (const entry of entries) {
    if (entry.startsWith('.')) continue
    const fullPath = join(dir, entry)
    const stat = await fs.stat(fullPath)
    const relativePath = prefix ? `${prefix}/${entry}` : entry
    if (stat.isDirectory()) {
      const nested = await collectFilesRecursively(fullPath, relativePath)
      result.push(...nested)
    } else if (stat.isFile()) {
      result.push(relativePath)
    }
  }
  return result
}

export async function precheckWorkspaceMigration(
  from: string,
  to: string
): Promise<MigrationPrecheck> {
  const normalFrom = normalize(from)
  const normalTo = normalize(to)

  // Same directory check
  if (normalFrom === normalTo) {
    return { fileCount: 0, files: [], conflicts: [] }
  }

  // Path containment check — reject if one is parent of the other
  if (normalTo.startsWith(normalFrom + '/') || normalTo.startsWith(normalFrom + '\\')) {
    throw new Error('Target directory cannot be inside the source directory')
  }
  if (normalFrom.startsWith(normalTo + '/') || normalFrom.startsWith(normalTo + '\\')) {
    throw new Error('Source directory cannot be inside the target directory')
  }

  // Collect all files recursively (excluding dot-files like .DS_Store)
  const files = await collectFilesRecursively(normalFrom, '')

  if (files.length === 0) {
    return { fileCount: 0, files: [], conflicts: [] }
  }

  // Check for conflicts in target
  const conflicts: string[] = []
  for (const file of files) {
    try {
      await fs.stat(join(normalTo, file))
      conflicts.push(file)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
      // File doesn't exist in target — no conflict
    }
  }

  return { fileCount: files.length, files, conflicts }
}

export interface MigrationResult {
  success: boolean
  migrated: string[]
  skipped: string[]
  errors: Array<{ file: string; error: string }>
}

// Guard against concurrent migrations
let migrationInProgress = false

export async function migrateWorkspaceFiles(
  from: string,
  to: string,
  overwriteConflicts: boolean
): Promise<MigrationResult> {
  if (migrationInProgress) {
    throw new Error('A migration is already in progress')
  }
  migrationInProgress = true

  try {
    const normalFrom = normalize(from)
    const normalTo = normalize(to)

    // Ensure target directory exists
    await fs.mkdir(normalTo, { recursive: true })

    // Re-check files at execution time (don't trust precheck state)
    const precheck = await precheckWorkspaceMigration(normalFrom, normalTo)
    if (precheck.fileCount === 0) {
      return { success: true, migrated: [], skipped: [], errors: [] }
    }

    const conflictSet = new Set(precheck.conflicts)
    const migrated: string[] = []
    const skipped: string[] = []
    const errors: Array<{ file: string; error: string }> = []

    for (const file of precheck.files) {
      const sourcePath = join(normalFrom, file)
      const targetPath = join(normalTo, file)

      // Handle conflicts
      if (conflictSet.has(file)) {
        if (!overwriteConflicts) {
          skipped.push(file)
          continue
        }
      }

      try {
        // Ensure target subdirectory exists for nested files
        await fs.mkdir(dirname(targetPath), { recursive: true })
        // Try atomic rename first (only works on same volume)
        await fs.rename(sourcePath, targetPath)
        migrated.push(file)
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code === 'EXDEV') {
          // Cross-volume: copy + preserve timestamps + delete original
          try {
            const stat = await fs.stat(sourcePath)
            await fs.mkdir(dirname(targetPath), { recursive: true })
            await fs.copyFile(sourcePath, targetPath)
            await fs.utimes(targetPath, stat.atime, stat.mtime)
            await fs.unlink(sourcePath)
            migrated.push(file)
          } catch (copyError) {
            errors.push({ file, error: (copyError as Error).message })
          }
        } else {
          errors.push({ file, error: (renameError as Error).message })
        }
      }
    }

    return {
      success: errors.length === 0,
      migrated,
      skipped,
      errors
    }
  } finally {
    migrationInProgress = false
  }
}
