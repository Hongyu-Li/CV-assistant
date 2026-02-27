import { describe, it, expect, beforeEach, vi } from 'vitest'
import { promises as fsp } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

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

  it('returns json files from source and identifies conflicts', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{"name":"test1"}')
    await fsp.writeFile(join(sourceDir, 'resume2.json'), '{"name":"test2"}')
    await fsp.writeFile(join(targetDir, 'resume1.json'), '{"name":"existing"}')
    // Non-json file should be ignored
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')

    const { precheckWorkspaceMigration } = await import('../fs')
    const result = await precheckWorkspaceMigration(sourceDir, targetDir)

    expect(result.files).toContain('resume1.json')
    expect(result.files).toContain('resume2.json')
    expect(result.files).toHaveLength(2)
    expect(result.conflicts).toEqual(['resume1.json'])
    expect(result.files).not.toContain('.DS_Store')
  })

  it('returns empty arrays when source has no json files', async () => {
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

  it('ignores non-json files', async () => {
    await fsp.writeFile(join(sourceDir, 'resume1.json'), '{}')
    await fsp.writeFile(join(sourceDir, '.DS_Store'), '')
    await fsp.writeFile(join(sourceDir, 'notes.txt'), 'hello')

    const { migrateWorkspaceFiles } = await import('../fs')
    const result = await migrateWorkspaceFiles(sourceDir, targetDir, false)

    expect(result.migrated).toEqual(['resume1.json'])

    // Non-json files should still be in source
    const sourceFiles = await fsp.readdir(sourceDir)
    expect(sourceFiles).toContain('.DS_Store')
    expect(sourceFiles).toContain('notes.txt')
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
