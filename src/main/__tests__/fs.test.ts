import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { promises as fsp } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import * as nodeFs from 'node:fs'

// Module-level interception for fs.promises.rename and fs.promises.copyFile.
// vi.mock('fs') factory replacement does NOT affect the source module's binding
// (it imports `promises` once, at load time). Object.defineProperty on the REAL
// promises object lets us intercept calls the source module actually makes.
const origRename = nodeFs.promises.rename
const origCopyFile = nodeFs.promises.copyFile
let renameImpl: ((...args: unknown[]) => unknown) | null = null
let copyFileImpl: ((...args: unknown[]) => unknown) | null = null

Object.defineProperty(nodeFs.promises, 'rename', {
  configurable: true,
  get() {
    return renameImpl ?? origRename
  }
})
Object.defineProperty(nodeFs.promises, 'copyFile', {
  configurable: true,
  get() {
    return copyFileImpl ?? origCopyFile
  }
})

// Mock electron's app module since fs.ts imports it at top level
vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return '/tmp/mock-userData'
      if (name === 'home') return '/tmp/mock-home'
      return '/tmp/mock-' + name
    })
  }
}))

// Mock 'fs' — spread the real module so all other fs operations work normally.
vi.mock('fs', async () => {
  const actual = await import('node:fs')
  return { ...actual, default: actual }
})

describe('precheckWorkspaceMigration', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-migrate-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  it('returns files from source recursively and identifies conflicts', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test1"}')
    await fsp.writeFile(join(sourceDir, 'resume2.json'), '{"name":"test2"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')
    // Dot-files should be ignored
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toContain('resume1.json')
    expect(result.files).toContain('resume2.json')
    expect(result.files).toHaveLength(2)
    expect(result.conflicts).toEqual(['resume1.json'])
    expect(result.files).not.toContain('.DS_Store')
  })

  it('returns empty arrays when source has only dot-files', async () => {
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toEqual([])
    expect(result.conflicts).toEqual([])
  })

  it('handles non-existent source directory', async () => {
    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration('/nonexistent/path', targetDir)

    expect(result.files).toEqual([])
    expect(result.conflicts).toEqual([])
  })

  it('returns empty when source equals target', async () => {
    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, sourceDir)

    expect(result.fileCount).toBe(0)
    expect(result.files).toEqual([])
  })

  it('rejects when target is inside source', async () => {
    const nestedTarget = join(sourceDir, 'subfolder')
    await fsp.mkdir(nestedTarget, { recursive: true })

    const { precheckWorkspaceMigration } = await import('../fs')
    await expect(precheckWorkspaceMigration(sourceDir, nestedTarget)).rejects.toThrow('inside')
  })

  it('rejects when source is inside target', async () => {
    const nestedSource = join(targetDir, 'subfolder')
    await fsp.mkdir(nestedSource, { recursive: true })

    const { precheckWorkspaceMigration } = await import('../fs')
    await expect(precheckWorkspaceMigration(nestedSource, targetDir)).rejects.toThrow('inside')
  })

  it('blocks startsWith-bypass path traversal for userData files (../<userData>-evil)', async () => {
    const evilRoot = '/tmp/mock-userData-evil'
    await fsp.mkdir(evilRoot, { recursive: true })
    await fsp.writeFile(join(evilRoot, 'secret.txt'), 'SECRET')

    const { readUserDataFile } = await import('../fs')
    await expect(readUserDataFile('../mock-userData-evil/secret.txt')).rejects.toThrow(
      'Invalid file path'
    )
  })

  it('blocks startsWith-bypass path traversal for workspace files (../workspace-evil)', async () => {
    const evilWorkspaceRoot = '/tmp/mock-userData/workspace-evil'
    await fsp.mkdir(evilWorkspaceRoot, { recursive: true })
    await fsp.writeFile(join(evilWorkspaceRoot, 'secret.txt'), 'SECRET')

    const { readWorkspaceFile } = await import('../fs')
    await expect(readWorkspaceFile('../workspace-evil/secret.txt')).rejects.toThrow(
      'Invalid file path'
    )
  })

  it('recursively collects files from subdirectories', async () => {
    // Create nested structure: profile/ and resumes/
    await fsp.mkdir(join(sourceDir, 'profile'), { recursive: true })
    await fsp.mkdir(join(sourceDir, 'resumes'), { recursive: true })
    await fsp.writeFile(join(sourceDir, 'settings.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'profile', 'index.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'profile', 'summary.md'), '# Summary')
    await fsp.writeFile(join(sourceDir, 'resumes', 'resume-001.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'resumes', 'resume-001.md'), '# CV')
    // Dot-file in subdir should be excluded
    await fsp.writeFile(join(sourceDir, 'profile', '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toContain('settings.json')
    expect(result.files).toContain('profile/index.json')
    expect(result.files).toContain('profile/summary.md')
    expect(result.files).toContain('resumes/resume-001.json')
    expect(result.files).toContain('resumes/resume-001.md')
    expect(result.fileCount).toBe(5)
    expect(result.files).not.toContain('profile/.DS_Store')
  })

  it('detects conflicts in subdirectories', async () => {
    await fsp.mkdir(join(sourceDir, 'resumes'), { recursive: true })
    await fsp.mkdir(join(targetDir, 'resumes'), { recursive: true })
    await fsp.writeFile(join(sourceDir, 'resumes', 'cv.md'), '# New')
    await fsp.writeFile(join(targetDir, 'resumes', 'cv.md'), '# Existing')
    await fsp.writeFile(join(sourceDir, 'settings.json'), '{}')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toContain('resumes/cv.md')
    expect(result.files).toContain('settings.json')
    expect(result.conflicts).toEqual(['resumes/cv.md'])
  })
})

describe('migrateWorkspaceFiles', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-migrate-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  it('moves json files from source to target', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test1"}')
    await fsp.writeFile(join(sourceDir, 'resume2.json'), '{"name":"test2"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.migrated).toContain('resume1.json')
    expect(result.migrated).toContain('resume2.json')
    expect(result.migrated).toHaveLength(2)
    expect(result.skipped).toEqual([])
    expect(result.errors).toEqual([])

    // Source json files should be gone
    const sourceFiles = await fsp.readdir(sourceDir)
    expect(sourceFiles.filter((f) => f.endsWith('.json'))).toEqual([])

    // Target files should exist with correct content
    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"test1"}')
  })

  it('skips conflicts when overwriteConflicts is false', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"new"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.migrated).toEqual([])
    expect(result.skipped).toEqual(['resume1.json'])
    expect(result.errors).toEqual([])

    // Existing file should be unchanged
    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"existing"}')
  })

  it('overwrites conflicts when overwriteConflicts is true', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"new"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, true)

    expect(result.migrated).toEqual(['resume1.json'])
    expect(result.skipped).toEqual([])

    const content = await fsp.readFile(join(targetDir, 'resume1.json'), 'utf-8')
    expect(content).toBe('{"name":"new"}')
  })

  it('preserves file timestamps', async () => {
    const pastDate = new Date('2024-01-15T10:30:00Z')
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test"}')
    await fsp.utimes(join(sourceDir, 'resume1.json'), pastDate, pastDate)

    const { migrateWorkspaceFiles } = await import('../fs')
    await migrateWorkspaceFiles(sourceDir, targetDir, false)

    const stats = await fsp.stat(join(targetDir, 'resume1.json'))
    // mtime should be preserved (within 1 second tolerance for filesystem rounding)
    expect(Math.abs(stats.mtime.getTime() - pastDate.getTime())).toBeLessThan(1000)
  })

  it('migrates all non-dot files and ignores dot-files', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')
    await fsp.writeFile(join(sourceDir, 'notes.txt'), 'hello')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.migrated).toContain('resume1.json')
    expect(result.migrated).toContain('notes.txt')
    expect(result.migrated).toHaveLength(2)

    // Dot-files should still be in source
    const sourceFiles = await fsp.readdir(sourceDir)
    expect(sourceFiles).toContain('.DS_Store')
    expect(sourceFiles).not.toContain('resume1.json')
    expect(sourceFiles).not.toContain('notes.txt')
  })

  it('creates target directory if it does not exist', async () => {
    const newTarget = join(targetDir, 'nested', 'path')
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, newTarget, false)

    expect(result.migrated).toEqual(['resume1.json'])
    const exists = await fsp.stat(join(newTarget, 'resume1.json'))
    expect(exists).toBeTruthy()
  })

  it('reports errors per-file without stopping', async () => {
    await fsp.writeFile(join(sourceDir, 'good.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'bad.json'), '{}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    // At minimum, structure should always include these arrays
    expect(Array.isArray(result.migrated)).toBe(true)
    expect(Array.isArray(result.skipped)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
  })

  it('returns success true when all files migrate without errors', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.success).toBe(true)
  })

  it('migrates files from subdirectories preserving structure', async () => {
    // Create full workspace structure
    await fsp.mkdir(join(sourceDir, 'profile'), { recursive: true })
    await fsp.mkdir(join(sourceDir, 'resumes'), { recursive: true })
    await fsp.writeFile(join(sourceDir, 'settings.json'), '{"theme":"dark"}')
    await fsp.writeFile(join(sourceDir, 'profile', 'index.json'), '{"name":"John"}')
    await fsp.writeFile(join(sourceDir, 'profile', 'summary.md'), '# Summary')
    await fsp.writeFile(join(sourceDir, 'resumes', 'resume-001.json'), '{"title":"CV"}')
    await fsp.writeFile(join(sourceDir, 'resumes', 'resume-001.md'), '# My CV')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.success).toBe(true)
    expect(result.migrated).toContain('settings.json')
    expect(result.migrated).toContain('profile/index.json')
    expect(result.migrated).toContain('profile/summary.md')
    expect(result.migrated).toContain('resumes/resume-001.json')
    expect(result.migrated).toContain('resumes/resume-001.md')
    expect(result.migrated).toHaveLength(5)

    // Verify files exist in target with correct content
    const profileJson = await fsp.readFile(join(targetDir, 'profile', 'index.json'), 'utf-8')
    expect(JSON.parse(profileJson).name).toBe('John')
    const resumeMd = await fsp.readFile(join(targetDir, 'resumes', 'resume-001.md'), 'utf-8')
    expect(resumeMd).toBe('# My CV')

    // Verify source files are gone
    await expect(fsp.stat(join(sourceDir, 'profile', 'index.json'))).rejects.toThrow()
    await expect(fsp.stat(join(sourceDir, 'resumes', 'resume-001.md'))).rejects.toThrow()
  })

  it('handles subdirectory conflicts with overwrite', async () => {
    await fsp.mkdir(join(sourceDir, 'resumes'), { recursive: true })
    await fsp.mkdir(join(targetDir, 'resumes'), { recursive: true })
    await fsp.writeFile(join(sourceDir, 'resumes', 'cv.md'), '# Updated CV')
    await fsp.writeFile(join(targetDir, 'resumes', 'cv.md'), '# Old CV')

    const { migrateWorkspaceFiles } = await import('../fs')
    const resultSkip = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(resultSkip.skipped).toContain('resumes/cv.md')
    // Old content should be preserved
    const oldContent = await fsp.readFile(join(targetDir, 'resumes', 'cv.md'), 'utf-8')
    expect(oldContent).toBe('# Old CV')
  })

  it('handles subdirectory conflicts with overwrite enabled', async () => {
    await fsp.mkdir(join(sourceDir, 'profile'), { recursive: true })
    await fsp.mkdir(join(targetDir, 'profile'), { recursive: true })
    await fsp.writeFile(join(sourceDir, 'profile', 'index.json'), '{"v":2}')
    await fsp.writeFile(join(targetDir, 'profile', 'index.json'), '{"v":1}')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, true)

    expect(result.migrated).toContain('profile/index.json')
    const content = await fsp.readFile(join(targetDir, 'profile', 'index.json'), 'utf-8')
    expect(JSON.parse(content).v).toBe(2)
  })
})

describe('listWorkspaceSubdirFiles', () => {
  let workspaceDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-subdir-test-'))
    workspaceDir = base
  })

  it('lists files in a subdirectory', async () => {
    const subdir = join(workspaceDir, 'resumes')
    await fsp.mkdir(subdir, { recursive: true })
    await fsp.writeFile(join(subdir, 'cv1.json'), '{}')
    await fsp.writeFile(join(subdir, 'cv1.md'), '# CV')

    const { listWorkspaceSubdirFiles } = await import('../fs')
    const files = await listWorkspaceSubdirFiles('resumes', workspaceDir)

    expect(files).toContain('cv1.json')
    expect(files).toContain('cv1.md')
    expect(files).toHaveLength(2)
  })

  it('returns empty array when subdirectory does not exist', async () => {
    const { listWorkspaceSubdirFiles } = await import('../fs')
    const files = await listWorkspaceSubdirFiles('nonexistent', workspaceDir)
    expect(files).toEqual([])
  })
})

describe('deleteWorkspaceFile with subdirectory paths', () => {
  let workspaceDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-delete-subdir-test-'))
    workspaceDir = base
  })

  it('deletes a file in a subdirectory', async () => {
    const subdir = join(workspaceDir, 'resumes')
    await fsp.mkdir(subdir, { recursive: true })
    await fsp.writeFile(join(subdir, 'cv1.md'), '# CV')

    const { deleteWorkspaceFile } = await import('../fs')
    await deleteWorkspaceFile('resumes/cv1.md', workspaceDir)

    const files = await fsp.readdir(subdir)
    expect(files).not.toContain('cv1.md')
  })
})

describe('precheckWorkspaceMigration with .md files', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-migrate-md-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  it('includes .md files in migration precheck', async () => {
    await fsp.writeFile(join(sourceDir, 'resume.json'), '{}')
    await fsp.writeFile(join(sourceDir, 'resume.md'), '# Resume')
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toContain('resume.json')
    expect(result.files).toContain('resume.md')
    expect(result.files).toHaveLength(2)
    expect(result.files).not.toContain('.DS_Store')
  })

  it('detects .md file conflicts', async () => {
    await fsp.writeFile(join(sourceDir, 'resume.md'), '# New')
    await fsp.writeFile(join(targetDir, 'resume.md'), '# Existing')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.conflicts).toEqual(['resume.md'])
  })
})

describe('writeWorkspaceFile with subdirectory auto-creation (resume save flow)', () => {
  let workspaceDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-resume-save-test-'))
    workspaceDir = base
  })

  it('creates resumes/ directory and writes .md + .json files', async () => {
    const { writeWorkspaceFile, readWorkspaceFile } = await import('../fs')

    // Simulate cv:save handler: write .md content and .json metadata
    const mdContent = '# Senior Engineer Resume\n\n**5+ years** of experience'
    const jsonMetadata = JSON.stringify({ title: 'My Resume', mdFile: 'resume-001.md' }, null, 2)

    await writeWorkspaceFile('resumes/resume-001.md', mdContent, workspaceDir)
    await writeWorkspaceFile('resumes/resume-001.json', jsonMetadata, workspaceDir)

    // Verify both files exist and contain correct content
    const readMd = await readWorkspaceFile('resumes/resume-001.md', workspaceDir)
    expect(readMd).toBe(mdContent)

    const readJson = await readWorkspaceFile('resumes/resume-001.json', workspaceDir)
    const parsed = JSON.parse(readJson)
    expect(parsed.title).toBe('My Resume')
    expect(parsed.mdFile).toBe('resume-001.md')

    // Verify directory was auto-created
    const stat = await fsp.stat(join(workspaceDir, 'resumes'))
    expect(stat.isDirectory()).toBe(true)
  })

  it('reads back .md content referenced by .json metadata', async () => {
    const { writeWorkspaceFile, readWorkspaceFile } = await import('../fs')

    const generatedCV = '# Full Stack Developer\n\n- React\n- Node.js\n- TypeScript'
    const metadata = { title: 'Dev Resume', mdFile: 'dev-resume.md', language: 'en' }

    await writeWorkspaceFile('resumes/dev-resume.md', generatedCV, workspaceDir)
    await writeWorkspaceFile('resumes/dev-resume.json', JSON.stringify(metadata), workspaceDir)

    // Simulate cv:read handler: read JSON, then read .md via mdFile reference
    const jsonContent = await readWorkspaceFile('resumes/dev-resume.json', workspaceDir)
    const data = JSON.parse(jsonContent)
    const mdContent = await readWorkspaceFile(`resumes/${data.mdFile}`, workspaceDir)

    expect(mdContent).toBe(generatedCV)
    expect(data.language).toBe('en')
  })
})

describe('getSafeFilePath (via readUserDataFile)', () => {
  it('rejects path traversal with ../', async () => {
    const { readUserDataFile } = await import('../fs')
    await expect(readUserDataFile('../../etc/passwd')).rejects.toThrow('Invalid file path')
  })

  it('rejects path traversal with nested ../', async () => {
    const { readUserDataFile } = await import('../fs')
    await expect(readUserDataFile('../secret/data.json')).rejects.toThrow('Invalid file path')
  })

  it('allows valid simple filenames', async () => {
    // This should NOT throw 'Invalid file path' — it may throw ENOENT since the file doesn't exist
    const { readUserDataFile } = await import('../fs')
    await expect(readUserDataFile('valid-file.json')).rejects.toThrow()
    // Verify it's a filesystem error, not a path safety error
    try {
      await readUserDataFile('valid-file.json')
    } catch (error) {
      expect((error as Error).message).not.toBe('Invalid file path')
    }
  })

  it('allows valid nested filenames', async () => {
    const { readUserDataFile } = await import('../fs')
    try {
      await readUserDataFile('subdir/nested-file.json')
    } catch (error) {
      expect((error as Error).message).not.toBe('Invalid file path')
    }
  })
})

describe('getWorkspaceFilePath (via readWorkspaceFile)', () => {
  it('rejects path traversal with ../', async () => {
    const tmpBase = await fsp.mkdtemp(join(tmpdir(), 'cv-wspath-test-'))
    const { readWorkspaceFile } = await import('../fs')
    await expect(readWorkspaceFile('../../etc/passwd', tmpBase)).rejects.toThrow(
      'Invalid file path'
    )
  })

  it('rejects path traversal with ../ in nested path', async () => {
    const tmpBase = await fsp.mkdtemp(join(tmpdir(), 'cv-wspath-test-'))
    const { readWorkspaceFile } = await import('../fs')
    await expect(readWorkspaceFile('../secret', tmpBase)).rejects.toThrow('Invalid file path')
  })

  it('allows valid paths within workspace', async () => {
    const tmpBase = await fsp.mkdtemp(join(tmpdir(), 'cv-wspath-test-'))
    await fsp.writeFile(join(tmpBase, 'valid.json'), '{}')

    const { readWorkspaceFile } = await import('../fs')
    const content = await readWorkspaceFile('valid.json', tmpBase)
    expect(content).toBe('{}')
  })
})

describe('readUserDataFile', () => {
  beforeEach(async () => {
    // Ensure the mock userData directory exists
    await fsp.mkdir('/tmp/mock-userData', { recursive: true })
  })

  it('reads an existing file', async () => {
    await fsp.writeFile('/tmp/mock-userData/test-read.json', '{"hello":"world"}')

    const { readUserDataFile } = await import('../fs')
    const content = await readUserDataFile('test-read.json')
    expect(content).toBe('{"hello":"world"}')

    // Cleanup
    await fsp.unlink('/tmp/mock-userData/test-read.json')
  })

  it('throws when file does not exist', async () => {
    const { readUserDataFile } = await import('../fs')
    await expect(readUserDataFile('nonexistent-file.json')).rejects.toThrow()
  })
})

describe('readWorkspaceFile', () => {
  let workspaceDir: string

  beforeEach(async () => {
    workspaceDir = await fsp.mkdtemp(join(tmpdir(), 'cv-read-ws-test-'))
  })

  it('reads an existing workspace file', async () => {
    await fsp.writeFile(join(workspaceDir, 'settings.json'), '{"theme":"dark"}')

    const { readWorkspaceFile } = await import('../fs')
    const content = await readWorkspaceFile('settings.json', workspaceDir)
    expect(content).toBe('{"theme":"dark"}')
  })

  it('reads a file in a subdirectory', async () => {
    await fsp.mkdir(join(workspaceDir, 'profile'), { recursive: true })
    await fsp.writeFile(join(workspaceDir, 'profile', 'bio.md'), '# Bio')

    const { readWorkspaceFile } = await import('../fs')
    const content = await readWorkspaceFile('profile/bio.md', workspaceDir)
    expect(content).toBe('# Bio')
  })

  it('throws for non-existent workspace file', async () => {
    const { readWorkspaceFile } = await import('../fs')
    await expect(readWorkspaceFile('nope.json', workspaceDir)).rejects.toThrow()
  })
})

describe('getWorkspaceLastModified', () => {
  let workspaceDir: string

  beforeEach(async () => {
    workspaceDir = await fsp.mkdtemp(join(tmpdir(), 'cv-ws-mtime-test-'))
  })

  it('returns modification time of workspace file', async () => {
    const pastDate = new Date('2024-03-10T08:00:00Z')
    await fsp.writeFile(join(workspaceDir, 'data.json'), '{}')
    await fsp.utimes(join(workspaceDir, 'data.json'), pastDate, pastDate)

    const { getWorkspaceLastModified } = await import('../fs')
    const mtime = await getWorkspaceLastModified('data.json', workspaceDir)

    expect(mtime).toBeInstanceOf(Date)
    expect(Math.abs(mtime.getTime() - pastDate.getTime())).toBeLessThan(1000)
  })

  it('throws for non-existent workspace file', async () => {
    const { getWorkspaceLastModified } = await import('../fs')
    await expect(getWorkspaceLastModified('nope.json', workspaceDir)).rejects.toThrow()
  })
})

describe('listWorkspaceFiles', () => {
  let workspaceDir: string

  beforeEach(async () => {
    workspaceDir = await fsp.mkdtemp(join(tmpdir(), 'cv-list-ws-test-'))
  })

  it('lists files in the workspace root', async () => {
    await fsp.writeFile(join(workspaceDir, 'settings.json'), '{}')
    await fsp.writeFile(join(workspaceDir, 'profile.json'), '{}')

    const { listWorkspaceFiles } = await import('../fs')
    const files = await listWorkspaceFiles(workspaceDir)

    expect(files).toContain('settings.json')
    expect(files).toContain('profile.json')
    expect(files).toHaveLength(2)
  })

  it('returns empty array for empty workspace', async () => {
    const { listWorkspaceFiles } = await import('../fs')
    const files = await listWorkspaceFiles(workspaceDir)
    expect(files).toEqual([])
  })

  it('returns empty array for non-existent workspace directory', async () => {
    const { listWorkspaceFiles } = await import('../fs')
    const files = await listWorkspaceFiles('/tmp/nonexistent-ws-dir-99999')
    expect(files).toEqual([])
  })
})

describe('migrateWorkspaceFiles - concurrent guard', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-concurrent-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  it('throws when a second migration starts while first is running', async () => {
    // Create enough files so the first migration takes some time
    for (let i = 0; i < 10; i++) {
      await fsp.writeFile(join(sourceDir, `file-${i}.json`), JSON.stringify({ i }))
    }

    const { migrateWorkspaceFiles } = await import('../fs')

    // Start first migration but don't await it
    const first = migrateWorkspaceFiles(sourceDir, targetDir, false)

    // Immediately start second migration — should throw
    await expect(migrateWorkspaceFiles(sourceDir, targetDir, false)).rejects.toThrow(
      'A migration is already in progress'
    )

    // Wait for first to complete so the flag resets for other tests
    await first
  })

  it('allows migration after previous one completes', async () => {
    await fsp.writeFile(join(sourceDir, 'file1.json'), '{}')

    const { migrateWorkspaceFiles } = await import('../fs')

    // First migration
    const result1 = await migrateWorkspaceFiles(sourceDir, targetDir, false)
    expect(result1.success).toBe(true)

    // Add another file to source and create a fresh target
    await fsp.writeFile(join(sourceDir, 'file2.json'), '{}')
    const base2 = await fsp.mkdtemp(join(tmpdir(), 'cv-concurrent-test2-'))
    const targetDir2 = join(base2, 'target')
    await fsp.mkdir(targetDir2, { recursive: true })

    // Second migration should succeed (flag was reset in finally block)
    const result2 = await migrateWorkspaceFiles(sourceDir, targetDir2, false)
    expect(result2.success).toBe(true)
  })
})

describe('migrateWorkspaceFiles - EXDEV cross-volume fallback', () => {
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    const base = await fsp.mkdtemp(join(tmpdir(), 'cv-exdev-test-'))
    sourceDir = join(base, 'source')
    targetDir = join(base, 'target')
    await fsp.mkdir(sourceDir, { recursive: true })
    await fsp.mkdir(targetDir, { recursive: true })
  })

  afterEach(() => {
    renameImpl = null
    copyFileImpl = null
  })

  it('falls back to copy+delete when rename throws EXDEV', async () => {
    const pastDate = new Date('2024-05-20T10:00:00Z')
    await fsp.writeFile(join(sourceDir, 'cross-vol.json'), '{"cross":"volume"}')
    await fsp.utimes(join(sourceDir, 'cross-vol.json'), pastDate, pastDate)

    // Intercept rename to throw EXDEV
    renameImpl = () =>
      Promise.reject(
        Object.assign(new Error('EXDEV: cross-device link not permitted'), { code: 'EXDEV' })
      )

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.success).toBe(true)
    expect(result.migrated).toContain('cross-vol.json')

    // Verify file was copied to target
    const content = await fsp.readFile(join(targetDir, 'cross-vol.json'), 'utf-8')
    expect(content).toBe('{"cross":"volume"}')

    // Verify source file was deleted (unlink happens after copy)
    await expect(fsp.stat(join(sourceDir, 'cross-vol.json'))).rejects.toThrow()

    // Verify timestamps were preserved
    const stats = await fsp.stat(join(targetDir, 'cross-vol.json'))
    expect(Math.abs(stats.mtime.getTime() - pastDate.getTime())).toBeLessThan(1000)
  })
})
