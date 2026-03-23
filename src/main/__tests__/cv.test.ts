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

import type { CvSaveData } from '../handlers'

type FsMocks = typeof import('../fs')
type HandlerModule = typeof import('../handlers')

describe('main/handlers', (): void => {
  let fs: FsMocks
  let handlers: HandlerModule

  beforeEach(async (): Promise<void> => {
    vi.resetAllMocks()
    vi.spyOn(console, 'warn').mockImplementation((): void => {})
    vi.spyOn(console, 'error').mockImplementation((): void => {})

    fs = await import('../fs')
    handlers = await import('../handlers')
  })

  describe('handleCvSave', (): void => {
    it('with generatedCV: saves .md and saves .json without generatedCV but with mdFile ref', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)

      const data: CvSaveData = { title: 'T', generatedCV: '# CV' }
      const result = await handlers.handleCvSave({ filename: 'cv-1', data, workspacePath: '/ws' })
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'resumes/cv-1.md',
        '# CV',
        '/ws'
      )
      const jsonCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'resumes/cv-1.json')
      expect(jsonCall).toBeTruthy()

      const json = JSON.parse(String(jsonCall?.[1])) as Record<string, unknown>
      expect(json['title']).toBe('T')
      expect(json['mdFile']).toBe('cv-1.md')
      expect('generatedCV' in json).toBe(false)
    })

    it('without generatedCV: saves .json only', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)

      const data: CvSaveData = { title: 'T', mdFile: 'existing.md' }
      const result = await handlers.handleCvSave({
        filename: 'cv-2.json',
        data,
        workspacePath: '/ws'
      })
      expect(result).toEqual({ success: true })

      const calls = vi.mocked(fs.writeWorkspaceFile).mock.calls
      expect(calls.find((c) => String(c[0]).endsWith('.md'))).toBeUndefined()
      expect(calls.find((c) => c[0] === 'resumes/cv-2.json')).toBeTruthy()
    })

    it('returns {success:false} on write error', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('fail'))
      const result = await handlers.handleCvSave({ filename: 'x', data: {}, workspacePath: '/ws' })
      expect(result).toEqual({ success: false, error: 'fail' })
    })
  })

  describe('handleCvRead', (): void => {
    it('with mdFile ref: reads .json then reads .md and populates generatedCV', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ title: 'T', mdFile: 'a.md' })
          if (filename === 'resumes/a.md') return '# MD'
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject({ title: 'T', mdFile: 'a.md', generatedCV: '# MD' })
      }
    })

    it('when md read fails: sets generatedCV to empty string', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ mdFile: 'a.md' })
          if (filename === 'resumes/a.md') throw new Error('no md')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject({ mdFile: 'a.md', generatedCV: '' })
      }
    })

    it('without mdFile: returns parsed JSON as-is', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(JSON.stringify({ title: 'T' }))
      const result = await handlers.handleCvRead({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true, data: { title: 'T' } })
    })
  })

  describe('handleCvList', (): void => {
    it('lists .json files, reads each, and returns id/filename/lastModified', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockResolvedValue(['a.json', 'a.md', 'b.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/a.json') return JSON.stringify({ title: 'A' })
          if (filename === 'resumes/b.json') return JSON.stringify({ title: 'B' })
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.getWorkspaceLastModified).mockResolvedValue(new Date('2024-01-01T00:00:00.000Z'))

      const result = await handlers.handleCvList('/ws')
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ filename: 'a.json', id: 'a', title: 'A' })
      expect(result[0]?.['lastModified']).toBe('2024-01-01T00:00:00.000Z')
      expect(result[1]).toMatchObject({ filename: 'b.json', id: 'b', title: 'B' })
    })

    it('skips invalid CV JSON files', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockResolvedValue(['good.json', 'bad.json'])
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'resumes/good.json') return '{"ok":true}'
          if (filename === 'resumes/bad.json') return 'not json'
          throw new Error('unexpected')
        }
      )
      vi.mocked(fs.getWorkspaceLastModified).mockResolvedValue(new Date('2024-01-01T00:00:00.000Z'))

      const result = await handlers.handleCvList('/ws')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({ filename: 'good.json', id: 'good', ok: true })
    })

    it('returns [] when listing resumes directory fails', async (): Promise<void> => {
      vi.mocked(fs.listWorkspaceSubdirFiles).mockRejectedValue(new Error('boom'))

      const result = await handlers.handleCvList('/ws')

      expect(result).toEqual([])
    })
  })

  describe('handleCvDelete', (): void => {
    it('deletes .json and tries to delete .md', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile).mockResolvedValue(undefined)
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true })
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('resumes/a.json', '/ws')
      expect(vi.mocked(fs.deleteWorkspaceFile)).toHaveBeenCalledWith('resumes/a.md', '/ws')
    })

    it('ignores missing .md delete error and still returns success', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('no md'))
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: true })
    })

    it('returns error when deleting .json fails', async (): Promise<void> => {
      vi.mocked(fs.deleteWorkspaceFile).mockRejectedValue(new Error('fail'))
      const result = await handlers.handleCvDelete({ filename: 'a.json', workspacePath: '/ws' })
      expect(result).toEqual({ success: false, error: 'fail' })
    })
  })
})
