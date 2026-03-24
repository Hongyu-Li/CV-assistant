import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { Settings } from './Settings'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
import { useSettings } from '../context/SettingsContext'

// Mock the module
vi.mock('../context/SettingsContext', () => ({
  useSettings: vi.fn(),
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}))

// Mock provider module
vi.mock('../lib/provider', () => ({
  PROVIDER_CONFIGS: {
    openai: {
      label: 'OpenAI',
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-5.2',
      requiresApiKey: true
    },
    anthropic: {
      label: 'Anthropic',
      defaultBaseUrl: 'https://api.anthropic.com/v1',
      defaultModel: 'claude-sonnet-4-6',
      requiresApiKey: true
    },
    ollama: {
      label: 'Ollama (Local)',
      defaultBaseUrl: 'http://localhost:11434/v1',
      defaultModel: 'llama3.2',
      requiresApiKey: false
    },
    custom: {
      label: 'Custom',
      defaultBaseUrl: '',
      defaultModel: '',
      requiresApiKey: true
    }
  }
}))

// Mock Radix Select with native <select> elements for testability in jsdom
vi.mock('../components/ui/select', async () => {
  const React = await import('react')
  return {
    Select: ({
      value,
      onValueChange,
      children
    }: {
      value: string
      onValueChange: (v: string) => void
      children: React.ReactNode
    }): React.ReactElement => {
      return React.createElement(
        'div',
        { 'data-testid': 'select-root' },
        React.createElement(
          'select',
          {
            value,
            'data-current-value': value,
            onChange: (e: React.ChangeEvent<HTMLSelectElement>): void =>
              onValueChange(e.target.value),
            'data-testid': 'native-select'
          },
          // Render children inside <select> so SelectItem <option>s are actual children
          children
        )
      )
    },
    SelectTrigger: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(React.Fragment, null, children),
    SelectContent: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({
      value,
      children
    }: {
      value: string
      children: React.ReactNode
    }): React.ReactElement => React.createElement('option', { value }, children),
    SelectValue: (): React.ReactElement => React.createElement(React.Fragment, null)
  }
})

// Mock AlertDialog with simple DOM elements for testability in jsdom
vi.mock('../components/ui/alert-dialog', async () => {
  const React = await import('react')
  return {
    AlertDialog: ({
      open,
      children
    }: {
      open: boolean
      children: React.ReactNode
    }): React.ReactElement | null => {
      if (!open) return null
      return React.createElement(
        'div',
        { 'data-testid': 'alert-dialog', role: 'alertdialog' },
        children
      )
    },
    AlertDialogContent: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('div', { 'data-testid': 'alert-dialog-content' }, children),
    AlertDialogHeader: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('div', null, children),
    AlertDialogFooter: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('div', null, children),
    AlertDialogTitle: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('h2', null, children),
    AlertDialogDescription: ({ children }: { children: React.ReactNode }): React.ReactElement =>
      React.createElement('p', null, children),
    AlertDialogAction: ({
      children,
      onClick
    }: {
      children: React.ReactNode
      onClick?: () => void
    }): React.ReactElement =>
      React.createElement('button', { 'data-testid': 'alert-dialog-confirm', onClick }, children),
    AlertDialogCancel: ({
      children,
      onClick
    }: {
      children: React.ReactNode
      onClick?: () => void
    }): React.ReactElement =>
      React.createElement('button', { 'data-testid': 'alert-dialog-cancel', onClick }, children)
  }
})

describe('Settings Component', () => {
  const mockUpdateSettings = vi.fn()
  const defaultSettings = {
    provider: 'openai',
    apiKeys: {},
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: ''
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string): Promise<unknown> => {
        if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
        return Promise.resolve(undefined)
      }
    )
  })

  it('renders settings page', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.title')).toBeInTheDocument()
    expect(screen.getByText('settings.ai_provider')).toBeInTheDocument()
  })

  it('shows provider selector with current provider', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.provider')).toBeInTheDocument()
  })

  it('shows API key field when provider requires it', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.api_key')).toBeInTheDocument()
  })

  it('shows model field with current model value', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.model')).toBeInTheDocument()
    expect(screen.getByDisplayValue('gpt-5.2')).toBeInTheDocument()
  })

  it('calls updateSettings when model is changed', async () => {
    await act(async () => {
      render(<Settings />)
    })
    const input = screen.getByDisplayValue('gpt-5.2')
    fireEvent.change(input, { target: { value: 'gpt-4-turbo' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ model: 'gpt-4-turbo' })
  })

  it('shows base URL field', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.base_url')).toBeInTheDocument()
  })

  it('shows test connection button', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.test_connection')).toBeInTheDocument()
  })

  it('calls updateSettings when API key is changed', async () => {
    await act(async () => {
      render(<Settings />)
    })
    // Find the password input (API key)
    const apiKeyInput = document.querySelector('input[type="password"]')
    expect(apiKeyInput).not.toBeNull()
    fireEvent.change(apiKeyInput!, { target: { value: 'sk-test-key' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ apiKeys: { openai: 'sk-test-key' } })
  })

  it('toggles API key visibility when eye button is clicked', async () => {
    await act(async () => {
      render(<Settings />)
    })
    // Initially password field
    const apiKeyInput = document.querySelector('input[type="password"]')
    expect(apiKeyInput).not.toBeNull()
    // Click the eye toggle button
    const toggleBtn = screen.getByLabelText('settings.show_api_key')
    fireEvent.click(toggleBtn)
    // Now should be text type
    const visibleInput = document.querySelector(
      'input[type="text"][placeholder="settings.api_key_ph"]'
    )
    expect(visibleInput).not.toBeNull()
  })

  it('shows per-provider API key value', async () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, apiKeys: { openai: 'sk-stored-key' } },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    await act(async () => {
      render(<Settings />)
    })
    const apiKeyInput = document.querySelector('input[type="password"]') as HTMLInputElement
    expect(apiKeyInput.value).toBe('sk-stored-key')
  })

  it('shows change directory button', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.change_dir')).toBeInTheDocument()
  })

  it('shows workspace directory input', async () => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.workspace_dir')).toBeInTheDocument()
  })

  it('shows current workspace path in input', async () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, workspacePath: '/custom/path' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByDisplayValue('/custom/path')).toBeInTheDocument()
  })
})

describe('Settings - Provider/Theme/Language Changes', () => {
  const mockUpdateSettings = vi.fn()
  const defaultSettings = {
    provider: 'openai',
    apiKeys: {},
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: ''
  }

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string): Promise<unknown> => {
        if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
        return Promise.resolve(undefined)
      }
    )
  })

  it('calls updateSettings with new provider, default model, and baseUrl when provider changes', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    // Use data-current-value to find the provider select (value='openai')
    const providerSelect = document.querySelector(
      'select[data-current-value="openai"]'
    ) as HTMLSelectElement
    expect(providerSelect).not.toBeNull()
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({
      provider: 'anthropic',
      model: 'claude-sonnet-4-6',
      baseUrl: 'https://api.anthropic.com/v1'
    })
  })

  it('calls updateSettings with new theme when theme changes', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    // Use data-current-value to find the theme select (value='system')
    const themeSelect = document.querySelector(
      'select[data-current-value="system"]'
    ) as HTMLSelectElement
    expect(themeSelect).not.toBeNull()
    fireEvent.change(themeSelect, { target: { value: 'dark' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ theme: 'dark' })
  })

  it('calls updateSettings with new language when language changes', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    // Use data-current-value to find the language select (value='en')
    const languageSelect = document.querySelector(
      'select[data-current-value="en"]'
    ) as HTMLSelectElement
    expect(languageSelect).not.toBeNull()
    fireEvent.change(languageSelect, { target: { value: 'zh' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ language: 'zh' })
  })

  it('calls updateSettings when base URL is changed', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    // baseUrl is an input with empty value
    const baseUrlInput = screen.getByPlaceholderText('settings.base_url_ph')
    fireEvent.change(baseUrlInput, { target: { value: 'https://custom.api.com/v1' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ baseUrl: 'https://custom.api.com/v1' })
  })
})

describe('Settings - Test Connection', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>
  const defaultSettings = {
    provider: 'openai',
    apiKeys: { openai: 'sk-test-key' },
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: ''
  }

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      return Promise.resolve(undefined)
    })
  })

  it('shows success toast when test connection succeeds', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'ai:test') return Promise.resolve({ success: true })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const testBtn = screen.getByText('settings.test_connection')
    await act(async (): Promise<void> => {
      fireEvent.click(testBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.success).toHaveBeenCalledWith('settings.connection_success')
    })
  })

  it('shows error toast when test connection returns failure', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'ai:test')
        return Promise.resolve({ success: false, error: 'Invalid API key' })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const testBtn = screen.getByText('settings.test_connection')
    await act(async (): Promise<void> => {
      fireEvent.click(testBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.connection_failed Invalid API key')
    })
  })

  it('shows error toast when test connection throws', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'ai:test') return Promise.reject(new Error('Network error'))
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const testBtn = screen.getByText('settings.test_connection')
    await act(async (): Promise<void> => {
      fireEvent.click(testBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.connection_failed Network error')
    })
  })
})

describe('Settings - Workspace Directory', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>
  const defaultSettings = {
    provider: 'openai',
    apiKeys: {},
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: '/test/workspace'
  }

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      return Promise.resolve(undefined)
    })
  })

  it('calls shell:openPath when open folder button is clicked', async (): Promise<void> => {
    mockInvoke.mockResolvedValue(undefined)
    await act(async () => {
      render(<Settings />)
    })
    const openBtn = screen.getByLabelText('settings.open_folder')
    await act(async (): Promise<void> => {
      fireEvent.click(openBtn)
    })
    expect(mockInvoke).toHaveBeenCalledWith('shell:openPath', '/test/workspace')
  })

  it('calls dialog:openDirectory when change directory button is clicked', async (): Promise<void> => {
    // Return null from dialog to simulate user cancelling
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve(null)
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    expect(mockInvoke).toHaveBeenCalledWith('dialog:openDirectory')
  })

  it('calls app:getDefaultWorkspacePath for open folder when workspacePath is empty', async (): Promise<void> => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, workspacePath: '' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getDefaultWorkspacePath') return Promise.resolve('/default/path')
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const openBtn = screen.getByLabelText('settings.open_folder')
    await act(async (): Promise<void> => {
      fireEvent.click(openBtn)
    })
    expect(mockInvoke).toHaveBeenCalledWith('app:getDefaultWorkspacePath')
    expect(mockInvoke).toHaveBeenCalledWith('shell:openPath', '/default/path')
  })
})

describe('Settings - Migration Flow', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>
  const defaultSettings = {
    provider: 'openai',
    apiKeys: {},
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: '/old/workspace'
  }

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      return Promise.resolve(undefined)
    })
  })

  it('shows info toast when same directory is selected', async (): Promise<void> => {
    // dialog returns same path as current workspacePath
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/old/workspace')
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.info).toHaveBeenCalledWith('settings.migration_same_dir')
    })
  })

  it('shows error toast when precheck returns error', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: false, error: 'Permission denied' })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.migration_error')
    })
  })

  it('updates directory without migration when precheck returns no files', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: true, fileCount: 0, conflicts: [] })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ workspacePath: '/new/workspace' })
    })
  })

  it('migrates files when user confirms and migration succeeds', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: true, fileCount: 3, conflicts: [] })
      if (channel === 'workspace:migrate')
        return Promise.resolve({ success: true, migrated: ['a', 'b', 'c'], errors: [] })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-confirm'))
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ workspacePath: '/new/workspace' })
      expect(toast.success).toHaveBeenCalled()
    })
  })

  it('handles conflicts when user confirms overwrite', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({
          success: true,
          fileCount: 5,
          conflicts: ['file1.pdf', 'file2.pdf']
        })
      if (channel === 'workspace:migrate')
        return Promise.resolve({ success: true, migrated: ['a', 'b', 'c', 'd', 'e'], errors: [] })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-confirm'))
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-confirm'))
    })
    await waitFor((): void => {
      expect(mockUpdateSettings).toHaveBeenCalledWith({ workspacePath: '/new/workspace' })
    })
  })

  it('does not migrate when user cancels confirmation', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: true, fileCount: 3, conflicts: [] })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-cancel'))
    })
    expect(mockUpdateSettings).not.toHaveBeenCalled()
    expect(mockInvoke).not.toHaveBeenCalledWith('workspace:migrate', expect.anything())
  })

  it('shows error toast on partial migration failure', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: true, fileCount: 3, conflicts: [] })
      if (channel === 'workspace:migrate')
        return Promise.resolve({
          success: false,
          migrated: ['a'],
          errors: [
            { file: 'b', error: 'fail' },
            { file: 'c', error: 'fail' }
          ]
        })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-confirm'))
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalled()
      // Should NOT update workspace path on partial failure
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    })
  })

  it('shows error toast on total migration failure', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck')
        return Promise.resolve({ success: true, fileCount: 2, conflicts: [] })
      if (channel === 'workspace:migrate')
        return Promise.resolve({
          success: false,
          migrated: [],
          errors: [{ file: 'a', error: 'Disk full' }]
        })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    await waitFor((): void => {
      expect(screen.getByTestId('alert-dialog')).toBeInTheDocument()
    })
    await act(async (): Promise<void> => {
      fireEvent.click(screen.getByTestId('alert-dialog-confirm'))
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.migration_error')
      expect(mockUpdateSettings).not.toHaveBeenCalled()
    })
  })

  it('shows error toast when migration throws an exception', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck') return Promise.reject(new Error('IPC failed'))
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.migration_error')
    })
  })
})

describe('Settings - API Key Visibility by Provider', () => {
  const mockUpdateSettings = vi.fn()

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string): Promise<unknown> => {
        if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
        return Promise.resolve(undefined)
      }
    )
  })

  it('hides API key field when provider does not require it (ollama)', async (): Promise<void> => {
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'ollama',
        apiKeys: {},
        model: 'llama3.2',
        baseUrl: 'http://localhost:11434/v1',
        theme: 'system',
        language: 'en',
        workspacePath: ''
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    await act(async () => {
      render(<Settings />)
    })
    // API key label should NOT be present when requiresApiKey is false
    expect(screen.queryByText('settings.api_key')).not.toBeInTheDocument()
  })

  it('shows API key field when provider requires it (openai)', async (): Promise<void> => {
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: '',
        autoUpdate: true
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.api_key')).toBeInTheDocument()
  })
})

describe('Settings - First-Run Migration Listener', () => {
  const mockUpdateSettings = vi.fn()
  const mockOn = window.electron.ipcRenderer.on as ReturnType<typeof vi.fn>
  const mockRemoveListener = window.electron.ipcRenderer.removeListener as ReturnType<typeof vi.fn>

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: ''
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string): Promise<unknown> => {
        if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
        return Promise.resolve(undefined)
      }
    )
  })

  it('registers IPC listener for workspace:first-run-migration on mount', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    expect(mockOn).toHaveBeenCalledWith('workspace:first-run-migration', expect.any(Function))
  })

  it('removes IPC listener on unmount', async (): Promise<void> => {
    let unmount: () => void
    await act(async () => {
      const result = render(<Settings />)
      unmount = result.unmount
    })
    unmount!()
    expect(mockRemoveListener).toHaveBeenCalledWith(
      'workspace:first-run-migration',
      expect.any(Function)
    )
  })

  it('shows info toast when first-run migration event fires', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    // Get the handler that was registered
    const onCall = mockOn.mock.calls.find(
      (call: unknown[]) => call[0] === 'workspace:first-run-migration'
    )
    expect(onCall).toBeDefined()
    const handler = onCall![1] as (
      event: unknown,
      data: { oldPath: string; fileCount: number }
    ) => void
    // Fire the handler
    await act(async (): Promise<void> => {
      handler({}, { oldPath: '/old/path', fileCount: 5 })
    })
    const { toast } = await import('sonner')
    expect(toast.info).toHaveBeenCalled()
  })
})

describe('Settings - Version Display', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: ''
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      return Promise.resolve(undefined)
    })
  })

  it('renders version section with title', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.getByText('settings.version')).toBeInTheDocument()
  })

  it('displays app version from IPC', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    await waitFor((): void => {
      expect(screen.getByText(/1\.0\.2/)).toBeInTheDocument()
    })
  })

  it('does not render auto-update controls', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    expect(screen.queryByText('settings.auto_update_check')).not.toBeInTheDocument()
    expect(screen.queryByTestId('auto-update-switch')).not.toBeInTheDocument()
  })
})

describe('Settings - Version Fetch Failure', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: ''
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.reject(new Error('IPC failed'))
      return Promise.resolve(undefined)
    })
  })

  it('shows ellipsis when version fetch fails and calls console.debug', async (): Promise<void> => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation((): void => {})
    await act(async () => {
      render(<Settings />)
    })
    await waitFor((): void => {
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument()
    })
    expect(debugSpy).toHaveBeenCalledWith('Version fetch failed:', expect.any(Error))
    debugSpy.mockRestore()
  })
})

describe('Settings - Open Folder Error Handling', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: '/test/workspace'
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'shell:openPath') return Promise.reject(new Error('Permission denied'))
      return Promise.resolve(undefined)
    })
  })

  it('shows error toast when shell:openPath throws', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    const openBtn = screen.getByLabelText('settings.open_folder')
    await act(async (): Promise<void> => {
      fireEvent.click(openBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.open_folder_error')
    })
  })
})

describe('Settings - Migration With Non-Error Thrown', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: {
        provider: 'openai',
        apiKeys: {},
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en',
        workspacePath: '/old/workspace'
      },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'dialog:openDirectory') return Promise.resolve('/new/workspace')
      if (channel === 'workspace:precheck') return Promise.reject('string error')
      return Promise.resolve(undefined)
    })
  })

  it('shows error toast when migration throws a non-Error string value', async (): Promise<void> => {
    await act(async () => {
      render(<Settings />)
    })
    const changeBtn = screen.getByText('settings.change_dir')
    await act(async (): Promise<void> => {
      fireEvent.click(changeBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.migration_error')
    })
  })
})

describe('Settings - Test Connection Edge Cases', () => {
  const mockUpdateSettings = vi.fn()
  const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>
  const defaultSettings = {
    provider: 'openai',
    apiKeys: { openai: 'sk-test-key' },
    model: 'gpt-5.2',
    baseUrl: '',
    theme: 'system',
    language: 'en',
    workspacePath: ''
  }

  beforeEach((): void => {
    vi.clearAllMocks()
    ;(useSettings as Mock).mockReturnValue({
      settings: defaultSettings,
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      return Promise.resolve(undefined)
    })
  })

  it('shows toast with stringified value when ai:test throws a non-Error', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'ai:test') return Promise.reject('plain string')
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const testBtn = screen.getByText('settings.test_connection')
    await act(async (): Promise<void> => {
      fireEvent.click(testBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.connection_failed plain string')
    })
  })

  it('shows toast with empty error part when ai:test returns failure without error field', async (): Promise<void> => {
    mockInvoke.mockImplementation((channel: string): Promise<unknown> => {
      if (channel === 'app:getVersion') return Promise.resolve('1.0.2')
      if (channel === 'ai:test') return Promise.resolve({ success: false })
      return Promise.resolve(undefined)
    })
    await act(async () => {
      render(<Settings />)
    })
    const testBtn = screen.getByText('settings.test_connection')
    await act(async (): Promise<void> => {
      fireEvent.click(testBtn)
    })
    const { toast } = await import('sonner')
    await waitFor((): void => {
      expect(toast.error).toHaveBeenCalledWith('settings.connection_failed ')
    })
  })
})
