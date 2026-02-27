import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SettingsProvider, useSettings } from './SettingsContext'
import type { AppSettings } from './SettingsContext'

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

// Mock i18n dynamic import
const mockChangeLanguage = vi.fn()
vi.mock('../i18n', () => ({
  default: { changeLanguage: mockChangeLanguage }
}))

const mockInvoke = window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>

const defaultSettings: AppSettings = {
  provider: 'openai',
  apiKeys: {},
  model: 'gpt-5.2',
  baseUrl: '',
  theme: 'system',
  language: 'en',
  workspacePath: ''
}

// Test consumer component that exposes context values
function TestConsumer(): React.ReactElement {
  const { settings, updateSettings, isLoading, error } = useSettings()
  return (
    <div>
      <span data-testid="provider">{settings.provider}</span>
      <span data-testid="model">{settings.model}</span>
      <span data-testid="theme">{settings.theme}</span>
      <span data-testid="language">{settings.language}</span>
      <span data-testid="apiKeys">{JSON.stringify(settings.apiKeys)}</span>
      <span data-testid="isLoading">{String(isLoading)}</span>
      <span data-testid="error">{error ?? 'null'}</span>
      <button
        data-testid="update-btn"
        onClick={(): void => {
          void updateSettings({ model: 'gpt-4-turbo' })
        }}
      >
        Update
      </button>
      <button
        data-testid="update-provider-btn"
        onClick={(): void => {
          void updateSettings({ provider: 'anthropic', apiKeys: { anthropic: 'sk-ant-key' } })
        }}
      >
        Switch Provider
      </button>
      <button
        data-testid="update-theme-btn"
        onClick={(): void => {
          void updateSettings({ theme: 'dark' })
        }}
      >
        Dark Theme
      </button>
      <button
        data-testid="update-language-btn"
        onClick={(): void => {
          void updateSettings({ language: 'zh' })
        }}
      >
        Switch Language
      </button>
    </div>
  )
}

function renderWithProvider(): ReturnType<typeof render> {
  return render(
    <SettingsProvider>
      <TestConsumer />
    </SettingsProvider>
  )
}

describe('SettingsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: IPC load resolves with empty (triggers defaultSettings fallback)
    mockInvoke.mockResolvedValue(null)
    // Reset classList on documentElement
    document.documentElement.classList.remove('light', 'dark')
  })

  describe('loading settings from IPC on mount', () => {
    it('should load settings from IPC and display them', async () => {
      const savedSettings: AppSettings = {
        provider: 'anthropic',
        apiKeys: { anthropic: 'sk-saved-key' },
        model: 'claude-sonnet-4-6',
        baseUrl: 'https://api.anthropic.com/v1',
        theme: 'dark',
        language: 'zh',
        workspacePath: '/workspace'
      }
      mockInvoke.mockResolvedValueOnce(savedSettings)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('provider').textContent).toBe('anthropic')
      expect(screen.getByTestId('model').textContent).toBe('claude-sonnet-4-6')
      expect(screen.getByTestId('theme').textContent).toBe('dark')
      expect(screen.getByTestId('language').textContent).toBe('zh')
      expect(mockInvoke).toHaveBeenCalledWith('settings:load')
    })

    it('should fallback to defaultSettings when IPC returns empty', async () => {
      mockInvoke.mockResolvedValueOnce(null)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('provider').textContent).toBe('openai')
      expect(screen.getByTestId('model').textContent).toBe('gpt-5.2')
      expect(screen.getByTestId('apiKeys').textContent).toBe('{}')
    })

    it('should fallback to defaultSettings when IPC returns empty object', async () => {
      mockInvoke.mockResolvedValueOnce({})

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('provider').textContent).toBe('openai')
      expect(screen.getByTestId('model').textContent).toBe('gpt-5.2')
    })

    it('should include autoUpdate in default settings', async () => {
      mockInvoke.mockResolvedValueOnce(null)
      renderWithProvider()
      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })
      // autoUpdate defaults to true but isn't rendered by TestConsumer,
      // so we verify the save call includes it when updating
      mockInvoke.mockResolvedValueOnce(undefined)
      await act(async () => {
        screen.getByTestId('update-btn').click()
      })
      expect(mockInvoke).toHaveBeenCalledWith(
        'settings:save',
        expect.objectContaining({ autoUpdate: true })
      )
    })
  })

  describe('migration from old apiKey format', () => {
    it('should migrate old apiKey (string) to apiKeys (Record) format', async () => {
      const legacySettings = {
        provider: 'openai',
        apiKey: 'sk-legacy-key',
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en'
      }
      mockInvoke.mockResolvedValueOnce(legacySettings)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      const apiKeys = JSON.parse(screen.getByTestId('apiKeys').textContent ?? '{}')
      expect(apiKeys).toEqual({ openai: 'sk-legacy-key' })
    })

    it('should prefer apiKeys over old apiKey when both exist', async () => {
      const mixedSettings = {
        provider: 'openai',
        apiKey: 'sk-old-key',
        apiKeys: { openai: 'sk-new-key' },
        model: 'gpt-5.2',
        baseUrl: '',
        theme: 'system',
        language: 'en'
      }
      mockInvoke.mockResolvedValueOnce(mixedSettings)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      const apiKeys = JSON.parse(screen.getByTestId('apiKeys').textContent ?? '{}')
      expect(apiKeys).toEqual({ openai: 'sk-new-key' })
    })
  })

  describe('theme application', () => {
    it('should add "dark" class when theme is dark', async () => {
      const darkSettings: AppSettings = {
        ...defaultSettings,
        theme: 'dark'
      }
      mockInvoke.mockResolvedValueOnce(darkSettings)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(document.documentElement.classList.contains('light')).toBe(false)
    })

    it('should add system-detected theme class when theme is "system"', async () => {
      // matchMedia is mocked in setup.ts to return matches: false (light)
      mockInvoke.mockResolvedValueOnce({ ...defaultSettings, theme: 'system' })

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      // setup.ts mocks matchMedia to return matches:false → light theme
      expect(document.documentElement.classList.contains('light')).toBe(true)
    })
  })

  describe('language change', () => {
    it('should trigger i18n.changeLanguage when language changes', async () => {
      mockInvoke.mockResolvedValue(undefined)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      // Initial render triggers changeLanguage with 'en'
      await waitFor(() => {
        expect(mockChangeLanguage).toHaveBeenCalledWith('en')
      })

      // Update language to 'zh'
      await act(async () => {
        screen.getByTestId('update-language-btn').click()
      })

      await waitFor(() => {
        expect(mockChangeLanguage).toHaveBeenCalledWith('zh')
      })
    })
  })

  describe('updateSettings', () => {
    it('should optimistically update settings and save via IPC', async () => {
      mockInvoke.mockResolvedValue(undefined)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      await act(async () => {
        screen.getByTestId('update-btn').click()
      })

      expect(screen.getByTestId('model').textContent).toBe('gpt-4-turbo')
      expect(mockInvoke).toHaveBeenCalledWith(
        'settings:save',
        expect.objectContaining({ model: 'gpt-4-turbo' })
      )
    })

    it('should ROLLBACK settings on IPC save failure', async () => {
      // First call: settings:load succeeds
      mockInvoke.mockResolvedValueOnce(null)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      // settings:save will fail
      mockInvoke.mockRejectedValueOnce(new Error('Save failed'))

      // Trigger update — optimistic update happens, then rollback on failure
      await act(async () => {
        screen.getByTestId('update-btn').click()
      })

      // After rollback, model should revert to original default
      await waitFor(() => {
        expect(screen.getByTestId('model').textContent).toBe('gpt-5.2')
      })

      // Error state should be set
      expect(screen.getByTestId('error').textContent).toBe('Save failed')
    })

    it('should deep-merge apiKeys so switching providers does not wipe other keys', async () => {
      const initialSettings: AppSettings = {
        ...defaultSettings,
        apiKeys: { openai: 'sk-openai-key' }
      }
      mockInvoke.mockResolvedValueOnce(initialSettings)

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      // Ensure IPC save succeeds
      mockInvoke.mockResolvedValueOnce(undefined)

      // Switch to anthropic (adds anthropic key)
      await act(async () => {
        screen.getByTestId('update-provider-btn').click()
      })

      const apiKeys = JSON.parse(screen.getByTestId('apiKeys').textContent ?? '{}')
      // Both keys should be preserved
      expect(apiKeys).toEqual({
        openai: 'sk-openai-key',
        anthropic: 'sk-ant-key'
      })
    })
  })

  describe('error state', () => {
    it('should set error when load fails', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Network error'))

      renderWithProvider()

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false')
      })

      expect(screen.getByTestId('error').textContent).toBe('Network error')
    })
  })

  describe('useSettings outside provider', () => {
    it('should throw when used outside SettingsProvider', () => {
      // Suppress React error boundary console output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      function BadConsumer(): React.ReactElement {
        useSettings()
        return <div />
      }

      expect(() => render(<BadConsumer />)).toThrow(
        'useSettings must be used within a SettingsProvider'
      )

      consoleSpy.mockRestore()
    })
  })
})
