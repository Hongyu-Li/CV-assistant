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

import type { AppDeps, DialogDeps, ShellOpenPathDeps } from '../handlers'

type FsMocks = typeof import('../fs')
type HandlerModule = typeof import('../handlers')

function createShellOpenPathDeps(params: {
  home: string
  openPathResult?: string
}): ShellOpenPathDeps {
  const { home, openPathResult } = params
  const openPath = vi.fn(async (): Promise<string> => openPathResult ?? '')
  const getPath = vi.fn((name: string): string => {
    if (name === 'home') return home
    return `/mock-${name}`
  })

  return {
    shell: { openPath } as unknown as ShellOpenPathDeps['shell'],
    app: { getPath } as unknown as ShellOpenPathDeps['app']
  }
}

function createAppDeps(params: { home: string; version?: string }): AppDeps {
  const { home, version } = params
  const getPath = vi.fn((name: string): string => {
    if (name === 'home') return home
    return `/mock-${name}`
  })
  const getVersion = vi.fn((): string => version ?? '0.0.0')

  return {
    app: { getPath, getVersion } as unknown as AppDeps['app']
  }
}

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

  describe('handleShellOpenPath', (): void => {
    it('allows path within default workspace and calls shell.openPath', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test', openPathResult: '' })
      const result = await handlers.handleShellOpenPath(
        '/mock-userData/workspace/resumes/a.md',
        deps
      )
      expect(result).toBe('')
      expect(vi.mocked(deps.shell.openPath)).toHaveBeenCalledWith(
        '/mock-userData/workspace/resumes/a.md'
      )
    })

    it('denies path outside workspace (and not home)', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test' })
      const result = await handlers.handleShellOpenPath('/Users/test/Downloads/file.txt', deps)
      expect(result).toBe('Access denied: path is outside workspace')
      expect(vi.mocked(deps.shell.openPath)).not.toHaveBeenCalled()
    })

    it('allows home directory path', async (): Promise<void> => {
      const deps = createShellOpenPathDeps({ home: '/Users/test', openPathResult: 'ok' })
      const result = await handlers.handleShellOpenPath('/Users/test', deps)
      expect(result).toBe('ok')
      expect(vi.mocked(deps.shell.openPath)).toHaveBeenCalledWith('/Users/test')
    })
  })

  describe('handleSettingsLoad', (): void => {
    it('returns parsed JSON when settings file exists', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockResolvedValue('{"theme":"dark"}')
      const result = await handlers.handleSettingsLoad()
      expect(result).toEqual({ theme: 'dark' })
      expect(vi.mocked(fs.readWorkspaceFile)).toHaveBeenCalledWith('settings.json')
    })

    it('returns {} when settings file does not exist', async (): Promise<void> => {
      vi.mocked(fs.readWorkspaceFile).mockRejectedValue(new Error('ENOENT'))
      const result = await handlers.handleSettingsLoad()
      expect(result).toEqual({})
    })
  })

  describe('handleSettingsSave', (): void => {
    it('writes stringified JSON to settings.json', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const result = await handlers.handleSettingsSave({ a: 1 })
      expect(result).toEqual({ success: true })

      const call = vi.mocked(fs.writeWorkspaceFile).mock.calls[0]
      expect(call?.[0]).toBe('settings.json')
      expect(call?.[1]).toBe(JSON.stringify({ a: 1 }, null, 2))
    })

    it('returns {success:false} when settings write fails', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockRejectedValue(new Error('bad'))
      const result = await handlers.handleSettingsSave({})
      expect(result).toEqual({ success: false, error: 'bad' })
    })

    it('rejects settings with invalid typed field (theme must be enum)', async (): Promise<void> => {
      const result = await handlers.handleSettingsSave({ theme: 123 })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Invalid settings')
      }
      expect(vi.mocked(fs.writeWorkspaceFile)).not.toHaveBeenCalled()
    })

    it('passes through unknown keys via .passthrough()', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const result = await handlers.handleSettingsSave({ unknownFutureKey: 'value', theme: 'dark' })
      expect(result).toEqual({ success: true })

      const call = vi.mocked(fs.writeWorkspaceFile).mock.calls[0]
      const written = JSON.parse(String(call?.[1])) as Record<string, unknown>
      expect(written['unknownFutureKey']).toBe('value')
      expect(written['theme']).toBe('dark')
    })

    it('accepts valid settings with all known fields', async (): Promise<void> => {
      vi.mocked(fs.writeWorkspaceFile).mockResolvedValue(undefined)
      const settings = {
        provider: 'openai',
        apiKey: 'key',
        model: 'gpt-4',
        baseUrl: 'https://api.openai.com/v1',
        language: 'en',
        theme: 'dark' as const,
        autoUpdate: true,
        workspacePath: '/path'
      }
      const result = await handlers.handleSettingsSave(settings)
      expect(result).toEqual({ success: true })
    })
  })

  describe('handleDialogOpenDirectory', (): void => {
    it('returns null when dialog is canceled', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: true, filePaths: [] })
      const result = await handlers.handleDialogOpenDirectory(deps)
      expect(result).toBeNull()
      expect(vi.mocked(deps.dialog.showOpenDialog)).toHaveBeenCalledWith({
        properties: ['openDirectory', 'createDirectory']
      })
    })

    it('returns first selected path when not canceled', async (): Promise<void> => {
      const deps = createDialogDeps({ canceled: false, filePaths: ['/a', '/b'] })
      const result = await handlers.handleDialogOpenDirectory(deps)
      expect(result).toBe('/a')
    })
  })

  describe('handleGetDefaultWorkspacePath', (): void => {
    it("returns join(userDataPath, 'workspace')", async (): Promise<void> => {
      const deps = createAppDeps({ home: '/Users/test' })
      const result = await handlers.handleGetDefaultWorkspacePath(deps)
      expect(result).toBe('/mock-userData/workspace')
    })
  })

  describe('handleWorkspacePrecheck', (): void => {
    it('returns {success:true, ...result} on success', async (): Promise<void> => {
      vi.mocked(fs.precheckWorkspaceMigration).mockResolvedValue({
        fileCount: 1,
        files: ['a.json'],
        conflicts: []
      })

      const result = await handlers.handleWorkspacePrecheck({ from: '/a', to: '/b' })
      expect(result).toEqual({ success: true, fileCount: 1, files: ['a.json'], conflicts: [] })
      expect(vi.mocked(fs.precheckWorkspaceMigration)).toHaveBeenCalledWith('/a', '/b')
    })

    it('returns {success:false} on error', async (): Promise<void> => {
      vi.mocked(fs.precheckWorkspaceMigration).mockRejectedValue(new Error('boom'))
      const result = await handlers.handleWorkspacePrecheck({ from: '/a', to: '/b' })
      expect(result).toEqual({ success: false, error: 'boom' })
    })
  })

  describe('handleWorkspaceMigrate', (): void => {
    it('returns migration result on success', async (): Promise<void> => {
      const migration = {
        success: true,
        migrated: ['a'],
        skipped: [],
        errors: []
      }
      vi.mocked(fs.migrateWorkspaceFiles).mockResolvedValue(migration)

      const result = await handlers.handleWorkspaceMigrate({
        from: '/a',
        to: '/b',
        overwriteConflicts: true
      })
      expect(result).toEqual(migration)
      expect(vi.mocked(fs.migrateWorkspaceFiles)).toHaveBeenCalledWith('/a', '/b', true)
    })

    it('returns structured failure result when migrate throws', async (): Promise<void> => {
      vi.mocked(fs.migrateWorkspaceFiles).mockRejectedValue(new Error('migrate failed'))
      const result = await handlers.handleWorkspaceMigrate({
        from: '/a',
        to: '/b',
        overwriteConflicts: false
      })
      expect(result).toEqual({
        success: false,
        migrated: [],
        skipped: [],
        errors: [{ file: '', error: 'migrate failed' }]
      })
    })
  })

  describe('handleGetVersion', (): void => {
    it('returns app.getVersion()', async (): Promise<void> => {
      const deps = createAppDeps({ home: '/Users/test', version: '9.9.9' })
      const result = await handlers.handleGetVersion(deps)
      expect(result).toBe('9.9.9')
    })
  })
})
