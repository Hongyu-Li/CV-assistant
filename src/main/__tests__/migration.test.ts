import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../fs', () => ({
  readWorkspaceFile: vi.fn(),
  writeWorkspaceFile: vi.fn(),
  listWorkspaceFiles: vi.fn(),
  listWorkspaceSubdirFiles: vi.fn(),
  deleteWorkspaceFile: vi.fn(),
  getWorkspaceLastModified: vi.fn(),
  precheckWorkspaceMigration: vi.fn(),
  migrateWorkspaceFiles: vi.fn(),
  readUserDataFile: vi.fn()
}))

type FsMocks = typeof import('../fs')

describe('runDataMigration', (): void => {
  let fs: FsMocks
  let runDataMigration: typeof import('../migration').runDataMigration

  beforeEach(async (): Promise<void> => {
    vi.resetAllMocks()
    vi.spyOn(console, 'log').mockImplementation((): void => {})
    vi.spyOn(console, 'warn').mockImplementation((): void => {})
    vi.spyOn(console, 'error').mockImplementation((): void => {})
    vi.spyOn(console, 'debug').mockImplementation((): void => {})

    fs = await import('../fs')
    const migrationModule = await import('../migration')
    runDataMigration = migrationModule.runDataMigration
  })

  describe('profile migration', (): void => {
    it('migrates old profile from userData to workspace when new profile does not exist', async (): Promise<void> => {
      const oldProfile = {
        personalInfo: { name: 'Alice', email: 'a@b.com', phone: '123', summary: 'Dev' },
        workExperience: [
          { id: 'w1', company: 'Co', role: 'Eng', date: '2020', description: 'Did stuff' }
        ],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: 'Built it' }]
      }

      vi.mocked(fs.readUserDataFile).mockResolvedValue(JSON.stringify(oldProfile))
      // New profile doesn't exist — readWorkspaceFile throws
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // Should write summary.md
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/summary.md',
        'Dev',
        '/ws'
      )
      // Should write work experience md
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/work-exp-w1.md',
        'Did stuff',
        '/ws'
      )
      // Should write project md
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/project-p1.md',
        'Built it',
        '/ws'
      )
      // Should write index.json
      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      const personalInfo = indexJson['personalInfo'] as Record<string, unknown>
      expect(personalInfo['name']).toBe('Alice')
      expect(personalInfo['summaryFile']).toBe('summary.md')
    })

    it('skips profile migration when new profile already exists', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockResolvedValue('{"personalInfo":{"name":"Old"}}')
      // New profile exists — readWorkspaceFile succeeds
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue('{}')
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // writeWorkspaceFile should NOT have been called for profile files
      const profileWrites = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.filter((c) => String(c[0]).startsWith('profile/'))
      expect(profileWrites).toHaveLength(0)
    })

    it('handles missing old profile gracefully (no userData profile)', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      // Should not throw
      await runDataMigration('/ws')

      expect(vi.mocked(fs.writeWorkspaceFile)).not.toHaveBeenCalled()
    })
  })

  describe('CV migration', (): void => {
    it('migrates root CV json files to resumes/ subdirectory', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['cv-1.json', 'settings.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'cv-1.json') {
            return JSON.stringify({
              jobTitle: 'Dev',
              jobDescription: 'Build stuff',
              generatedCV: '# Resume'
            })
          }
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)

      await runDataMigration('/ws')

      // Should write .md file in resumes/
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'resumes/cv-1.md',
        '# Resume',
        '/ws'
      )
      // Should write .json in resumes/ without generatedCV but with mdFile
      const jsonCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'resumes/cv-1.json')
      expect(jsonCall).toBeTruthy()
      const written = JSON.parse(String(jsonCall?.[1])) as Record<string, unknown>
      expect(written['mdFile']).toBe('cv-1.md')
      expect('generatedCV' in written).toBe(false)

      // Should delete old root file
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('cv-1.json', '/ws')
    })

    it('skips settings.json during CV migration', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['settings.json'])

      await runDataMigration('/ws')

      // readWorkspaceFile should not have been called for settings.json
      expect(vi.mocked(fs.readWorkspaceFile)).not.toHaveBeenCalledWith('settings.json', '/ws')
    })

    it('skips non-CV json files (no jobTitle or jobDescription)', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['random.json'])
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(JSON.stringify({ someOtherData: true }))

      await runDataMigration('/ws')

      expect(vi.mocked(fs.writeWorkspaceFile)).not.toHaveBeenCalled()
      expect(vi.mocked(fs.deleteWorkspaceFile)).not.toHaveBeenCalled()
    })

    it('handles listing failure gracefully (ENOENT)', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException
      enoent.code = 'ENOENT'
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(enoent)

      // Should not throw
      await runDataMigration('/ws')
    })

    it('logs unexpected errors when listing files fails with non-ENOENT', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('EPERM'))

      await runDataMigration('/ws')

      expect(console.error).toHaveBeenCalledWith(
        'Unexpected error listing files for migration:',
        expect.any(Error)
      )
    })

    it('skips individual files that fail to parse and continues', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['bad.json', 'good.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'bad.json') return 'not json'
          if (filename === 'good.json') {
            return JSON.stringify({ jobTitle: 'OK', generatedCV: '# Good' })
          }
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)

      await runDataMigration('/ws')

      // Should have migrated good.json
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('good.json', '/ws')
      // Should have warned about bad.json
      expect(console.warn).toHaveBeenCalled()
    })
  })
})
