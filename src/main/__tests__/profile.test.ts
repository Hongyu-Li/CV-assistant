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

vi.mock('fs/promises', () => ({
  readFile: vi.fn()
}))

vi.mock('pdf-parse', () => {
  const mockGetText = vi.fn()
  const mockDestroy = vi.fn().mockResolvedValue(undefined)
  return {
    PDFParse: vi.fn().mockImplementation(function () {
      return { getText: mockGetText, destroy: mockDestroy }
    })
  }
})

import type { DialogDeps, ProfileSaveData, PdfExtractResult, PdfExtractError } from '../handlers'

type FsMocks = typeof import('../fs')
type HandlerModule = typeof import('../handlers')

function createDialogDeps(params: { canceled: boolean; filePaths: string[] }): DialogDeps {
  const showOpenDialog = vi.fn(
    async (): Promise<{ canceled: boolean; filePaths: string[] }> => ({
      canceled: params.canceled,
      filePaths: params.filePaths
    })
  )

  return {
    dialog: { showOpenDialog } as unknown as DialogDeps['dialog']
  }
}

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

  describe('handleProfileLoad', (): void => {
    it('loads index.json, summary.md, work exp .md files, and project .md files', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summaryFile: 'summary.md' },
        workExperience: [
          {
            id: '1',
            company: 'Co',
            role: 'Dev',
            date: '2020',
            descriptionFile: 'work-exp-1.md'
          }
        ],
        projects: [
          {
            id: 'p1',
            name: 'Proj',
            techStack: 'TS',
            descriptionFile: 'project-p1.md'
          }
        ],
        education: [
          {
            id: 'e1',
            school: 'MIT',
            degree: 'CS',
            date: '2020',
            descriptionFile: 'education-e1.md'
          }
        ]
      }

      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/summary.md') return 'SUM'
          if (filename === 'profile/work-exp-1.md') return 'WORK'
          if (filename === 'profile/project-p1.md') return 'PROJ'
          if (filename === 'profile/education-e1.md') return 'EDU'
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: 'SUM' },
        workExperience: [
          { id: '1', company: 'Co', role: 'Dev', date: '2020', description: 'WORK' }
        ],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: 'PROJ' }],
        education: [{ id: 'e1', school: 'MIT', degree: 'CS', date: '2020', description: 'EDU' }]
      })
      expect(vi.mocked(fs.readWorkspaceFile)).toHaveBeenCalledWith('profile/index.json', '/ws')
    })

    it('fills defaults when personalInfo/workExperience/projects are missing', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue(JSON.stringify({}))

      const result = await handlers.handleProfileLoad('/ws')

      expect(result).toEqual({
        personalInfo: { name: '', email: '', phone: '', summary: '' },
        workExperience: [],
        projects: [],
        education: []
      })
    })

    it('returns {} when no profile exists (read index fails)', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({})
    })

    it('falls back to empty summary when summaryFile read fails', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summaryFile: 'summary.md' },
        workExperience: [],
        projects: [],
        education: []
      }
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/summary.md') throw new Error('ENOENT')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: '' },
        workExperience: [],
        projects: [],
        education: []
      })
    })

    it('falls back to empty description when work experience descriptionFile read fails', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'N', email: 'E', phone: 'P' },
        workExperience: [
          { id: '1', company: 'Co', role: 'Dev', date: '2020', descriptionFile: 'work-exp-1.md' }
        ],
        projects: [],
        education: []
      }
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/work-exp-1.md') throw new Error('ENOENT')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toMatchObject({
        workExperience: [{ id: '1', company: 'Co', role: 'Dev', date: '2020', description: '' }]
      })
    })

    it('falls back to empty description when project descriptionFile read fails', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'N', email: 'E', phone: 'P' },
        workExperience: [],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', descriptionFile: 'project-p1.md' }],
        education: []
      }
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/project-p1.md') throw new Error('ENOENT')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toMatchObject({
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: '' }]
      })
    })

    it('falls back to empty description when education descriptionFile read fails', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'N', email: 'E', phone: 'P' },
        workExperience: [],
        projects: [],
        education: [
          {
            id: 'e1',
            school: 'MIT',
            degree: 'CS',
            date: '2020',
            descriptionFile: 'education-e1.md'
          }
        ]
      }
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          if (filename === 'profile/education-e1.md') throw new Error('ENOENT')
          throw new Error('unexpected')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toMatchObject({
        education: [{ id: 'e1', school: 'MIT', degree: 'CS', date: '2020', description: '' }]
      })
    })

    it('skips description read when entry has no descriptionFile field', async (): Promise<void> => {
      const index = {
        personalInfo: { name: 'N', email: 'E', phone: 'P' },
        workExperience: [{ id: '1', company: 'Co', role: 'Dev', date: '2020' }],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS' }],
        education: [{ id: 'e1', school: 'MIT', degree: 'CS', date: '2020' }]
      }
      vi.mocked(fs.readWorkspaceFile).mockImplementation(
        async (filename: string): Promise<string> => {
          if (filename === 'profile/index.json') return JSON.stringify(index)
          throw new Error('should not be called for description files')
        }
      )

      const result = await handlers.handleProfileLoad('/ws')
      expect(result).toEqual({
        personalInfo: { name: 'N', email: 'E', phone: 'P', summary: '' },
        workExperience: [{ id: '1', company: 'Co', role: 'Dev', date: '2020', description: '' }],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: '' }],
        education: [{ id: 'e1', school: 'MIT', degree: 'CS', date: '2020', description: '' }]
      })
      expect(vi.mocked(fs.readWorkspaceFile)).toHaveBeenCalledTimes(1)
    })
  })

  describe('handleProfileSave', (): void => {
    it('writes summary.md, work exp .md, project .md, education .md, and index.json', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const data: ProfileSaveData = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: 'SUM' },
        workExperience: [
          { id: '1', company: 'Co', role: 'Dev', date: '2020', description: 'WORK' }
        ],
        projects: [{ id: 'p1', name: 'Proj', techStack: 'TS', description: 'PROJ' }],
        education: [{ id: 'e1', school: 'MIT', degree: 'CS', date: '2020', description: 'EDU' }]
      }

      const result = await handlers.handleProfileSave(data, '/ws')
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/summary.md',
        'SUM',
        '/ws'
      )
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/work-exp-1.md',
        'WORK',
        '/ws'
      )
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/project-p1.md',
        'PROJ',
        '/ws'
      )
      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/education-e1.md',
        'EDU',
        '/ws'
      )

      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(indexJson['personalInfo']).toMatchObject({
        name: 'A',
        email: 'B',
        phone: 'C',
        summaryFile: 'summary.md'
      })
      expect(indexJson['education']).toEqual([
        { id: 'e1', school: 'MIT', degree: 'CS', date: '2020', descriptionFile: 'education-e1.md' }
      ])
    })

    it('returns {success:false} when write fails', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('boom'))

      const result = await handlers.handleProfileSave({ personalInfo: { summary: 'x' } }, '/ws')
      expect(result).toEqual({ success: false, error: 'boom' })
    })

    it('saves with empty arrays when workExperience, projects, and education are missing', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const data: ProfileSaveData = {
        personalInfo: { name: 'A', email: 'B', phone: 'C', summary: 'SUM' }
      }

      const result = await handlers.handleProfileSave(data, '/ws')
      expect(result).toEqual({ success: true })

      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(indexJson['workExperience']).toEqual([])
      expect(indexJson['projects']).toEqual([])
      expect(indexJson['education']).toEqual([])
    })

    it('defaults personalInfo fields to empty strings when personalInfo is missing', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const data: ProfileSaveData = {}

      const result = await handlers.handleProfileSave(data, '/ws')
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith('profile/summary.md', '', '/ws')

      const indexCall = vi
        .mocked(fs.writeWorkspaceFile)
        .mock.calls.find((c) => c[0] === 'profile/index.json')
      expect(indexCall).toBeTruthy()
      const indexJson = JSON.parse(String(indexCall?.[1])) as Record<string, unknown>
      expect(indexJson['personalInfo']).toMatchObject({
        name: '',
        email: '',
        phone: '',
        summaryFile: 'summary.md'
      })
    })

    it('writes empty description when workExperience entry has no description', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const data: ProfileSaveData = {
        workExperience: [{ id: '1', company: 'Co', role: 'Dev', date: '2020', description: '' }]
      }

      const result = await handlers.handleProfileSave(data, '/ws')
      expect(result).toEqual({ success: true })

      expect(vi.mocked(fs.writeWorkspaceFile)).toHaveBeenCalledWith(
        'profile/work-exp-1.md',
        '',
        '/ws'
      )
    })
  })

  describe('handleProfileExtractPdfText', (): void => {
    it('returns null when dialog is canceled', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: true, filePaths: [] })
      const result = await handlers.handleProfileExtractPdfText(deps)
      expect(result).toBeNull()
    })

    it('returns null when filePaths is empty', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: [] })
      const result = await handlers.handleProfileExtractPdfText(deps)
      expect(result).toBeNull()
    })

    it('returns success with extracted text and filename on valid PDF', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: ['/some/path/resume.pdf'] })
      const { readFile } = await import('fs/promises')
      const { PDFParse } = await import('pdf-parse')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake pdf content'))
      ;(PDFParse as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return {
          getText: vi.fn().mockResolvedValue({ text: 'extracted text' }),
          destroy: vi.fn().mockResolvedValue(undefined)
        }
      })

      const result: PdfExtractResult | PdfExtractError | null =
        await handlers.handleProfileExtractPdfText(deps)

      expect(result).toEqual({ success: true, text: 'extracted text', filename: 'resume.pdf' })
    })

    it('returns error when readFile fails', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: ['/some/path/resume.pdf'] })
      const { readFile } = await import('fs/promises')
      ;(readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('read error'))

      const result: PdfExtractResult | PdfExtractError | null =
        await handlers.handleProfileExtractPdfText(deps)

      expect(result).toEqual({ success: false, error: 'read error' })
    })

    it('returns error when pdf-parse fails', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: ['/some/path/resume.pdf'] })
      const { readFile } = await import('fs/promises')
      const { PDFParse } = await import('pdf-parse')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake pdf content'))
      ;(PDFParse as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return {
          getText: vi.fn().mockRejectedValue(new Error('parse error')),
          destroy: vi.fn().mockResolvedValue(undefined)
        }
      })

      const result: PdfExtractResult | PdfExtractError | null =
        await handlers.handleProfileExtractPdfText(deps)

      expect(result).toEqual({ success: false, error: 'parse error' })
    })

    it('correctly extracts filename from path with forward slashes', async (): Promise<void> => {
      const deps = createDialogDeps({
        canceled: false,
        filePaths: ['/Users/test/documents/my-cv.pdf']
      })
      const { readFile } = await import('fs/promises')
      const { PDFParse } = await import('pdf-parse')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake'))
      ;(PDFParse as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return {
          getText: vi.fn().mockResolvedValue({ text: 'content' }),
          destroy: vi.fn().mockResolvedValue(undefined)
        }
      })

      const result: PdfExtractResult | PdfExtractError | null =
        await handlers.handleProfileExtractPdfText(deps)

      expect(result).toEqual({ success: true, text: 'content', filename: 'my-cv.pdf' })
    })

    it('correctly extracts filename from path with backslashes', async (): Promise<void> => {
      const deps = createDialogDeps({
        canceled: false,
        filePaths: ['C:\\Users\\test\\Documents\\my-cv.pdf']
      })
      const { readFile } = await import('fs/promises')
      const { PDFParse } = await import('pdf-parse')
      ;(readFile as ReturnType<typeof vi.fn>).mockResolvedValue(Buffer.from('fake'))
      ;(PDFParse as unknown as ReturnType<typeof vi.fn>).mockImplementation(function () {
        return {
          getText: vi.fn().mockResolvedValue({ text: 'content' }),
          destroy: vi.fn().mockResolvedValue(undefined)
        }
      })

      const result: PdfExtractResult | PdfExtractError | null =
        await handlers.handleProfileExtractPdfText(deps)

      expect(result).toEqual({ success: true, text: 'content', filename: 'my-cv.pdf' })
    })
  })
})
