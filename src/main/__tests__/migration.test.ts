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

    it('handles missing old profile gracefully (ENOENT suppressed)', async (): Promise<void> => {
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException
      enoent.code = 'ENOENT'
      vi.mocked(fs.readUserDataFile).mockRejectedValue(enoent)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(enoent)

      await runDataMigration('/ws')

      expect(vi.mocked(fs.writeWorkspaceFile)).not.toHaveBeenCalled()
      expect(console.debug).not.toHaveBeenCalled()
    })

    it('logs unexpected errors when reading old profile fails with non-ENOENT', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('EPERM'))
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException
      enoent.code = 'ENOENT'
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(enoent)

      await runDataMigration('/ws')

      expect(console.debug).toHaveBeenCalledWith(
        'Unexpected error reading old profile:',
        expect.any(Error)
      )
    })

    it('migrates profile with empty workExperience and projects arrays', async (): Promise<void> => {
      const oldProfile = {
        personalInfo: { name: 'Bob', email: 'b@c.com', phone: '456', summary: 'Engineer' },
        workExperience: [],
        projects: []
      }

      vi.mocked(fs.readUserDataFile).mockResolvedValue(JSON.stringify(oldProfile))
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // Should write summary.md
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/summary.md',
        'Engineer',
        '/ws'
      )
      // Should write index.json with empty arrays
      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(Array.isArray(indexJson['workExperience'])).toBe(true)
      expect((indexJson['workExperience'] as unknown[]).length).toBe(0)
      expect(Array.isArray(indexJson['projects'])).toBe(true)
      expect((indexJson['projects'] as unknown[]).length).toBe(0)
      // Should NOT write any work-exp or project md files
      const workExpWrites = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.filter((c) => String(c[0]).startsWith('profile/work-exp-'))
      expect(workExpWrites).toHaveLength(0)
    })

    it('migrates profile when workExperience and projects are undefined', async (): Promise<void> => {
      const oldProfile = {
        personalInfo: { name: 'Carol', email: 'c@d.com', phone: '789', summary: 'Designer' }
      }

      vi.mocked(fs.readUserDataFile).mockResolvedValue(JSON.stringify(oldProfile))
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // Should write summary.md
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/summary.md',
        'Designer',
        '/ws'
      )
      // Should write index.json
      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(Array.isArray(indexJson['workExperience'])).toBe(true)
      expect(Array.isArray(indexJson['projects'])).toBe(true)
    })

    it('migrates profile when personalInfo has all optional fields missing', async (): Promise<void> => {
      const oldProfile = {
        personalInfo: {},
        workExperience: [],
        projects: []
      }

      vi.mocked(fs.readUserDataFile).mockResolvedValue(JSON.stringify(oldProfile))
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // Should write summary.md with empty string
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith('profile/summary.md', '', '/ws')
      // Should write index.json with empty strings for name/email/phone
      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      const personalInfo = indexJson['personalInfo'] as Record<string, unknown>
      expect(personalInfo['name']).toBe('')
      expect(personalInfo['email']).toBe('')
      expect(personalInfo['phone']).toBe('')
    })

    it('skips writing profile when old profile has no personalInfo field', async (): Promise<void> => {
      const oldProfile = {
        workExperience: [{ id: 'w1', company: 'Co', role: 'Eng', date: '2020', description: 'x' }],
        projects: []
      }

      vi.mocked(fs.readUserDataFile).mockResolvedValue(JSON.stringify(oldProfile))
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.listWorkspaceFiles).mockRejectedValue(new Error('ENOENT'))

      await runDataMigration('/ws')

      // No profile files should be written since personalInfo is absent
      const profileWrites = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.filter((c) => String(c[0]).startsWith('profile/'))
      expect(profileWrites).toHaveLength(0)
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

    it('migrates CV file with jobTitle but no generatedCV — does not write .md file', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['cv-nomd.json'])
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(
        JSON.stringify({ jobTitle: 'Engineer', jobDescription: 'Build things' })
      )
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)

      await runDataMigration('/ws')

      // Should NOT write a .md file in resumes/
      expect(vi.mocked(fs.writeWorkspaceFile)).not.toHaveBeenCalledWith(
        'resumes/cv-nomd.md',
        expect.anything(),
        '/ws'
      )
      // Should still write .json in resumes/ with mdFile undefined
      const jsonCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'resumes/cv-nomd.json')
      expect(jsonCall).toBeTruthy()
      const written = JSON.parse(String(jsonCall?.[1])) as Record<string, unknown>
      expect('generatedCV' in written).toBe(false)
      expect(written['mdFile']).toBeUndefined()
      // Should delete old root file
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('cv-nomd.json', '/ws')
    })

    it('migrates CV file with only jobDescription and no jobTitle', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['cv-nodesc.json'])
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(
        JSON.stringify({ jobDescription: 'Must love TypeScript', generatedCV: '# Resume' })
      )
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)

      await runDataMigration('/ws')

      // Should write .md file
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'resumes/cv-nodesc.md',
        '# Resume',
        '/ws'
      )
      // Should migrate the json file
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('cv-nodesc.json', '/ws')
    })

    it('skips file and logs warning when readWorkspaceFile throws during individual file read', async (): Promise<void> => {
      vi.mocked(fs.readUserDataFile).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(fs.listWorkspaceFiles).mockResolvedValue(['failing.json', 'ok.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'failing.json') throw new Error('EACCES permission denied')
          if (filename === 'ok.json') {
            return JSON.stringify({ jobTitle: 'Dev', generatedCV: '# OK' })
          }
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)

      await runDataMigration('/ws')

      // Should have skipped failing.json and warned
      expect(console.warn).toHaveBeenCalledWith(
        'Skipping file during migration:',
        expect.any(Error)
      )
      // Should still have migrated ok.json
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('ok.json', '/ws')
      // Should NOT have tried to delete failing.json
      expect(vi.mocked(fs.deleteWorkspaceFile)).not.toHaveBeenCalledWith('failing.json', '/ws')
    })
  })
})
