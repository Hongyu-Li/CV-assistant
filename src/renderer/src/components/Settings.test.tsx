import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
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
  toast: { success: vi.fn(), error: vi.fn() }
}))

// Mock provider module
vi.mock('../lib/provider', () => ({
  PROVIDER_CONFIGS: {
    openai: {
      label: 'OpenAI',
      defaultBaseUrl: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4o',
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

// Mock window.electron for IPC calls (first-run migration useEffect, dialog, shell)
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      on: vi.fn(),
      removeListener: vi.fn(),
      invoke: vi.fn()
    }
  },
  writable: true
})

describe('Settings Component', () => {
  const mockUpdateSettings = vi.fn()
  const defaultSettings = {
    provider: 'openai',
    apiKeys: {},
    model: 'gpt-4o',
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
  })

  it('renders settings page', () => {
    render(<Settings />)
    expect(screen.getByText('settings.title')).toBeInTheDocument()
    expect(screen.getByText('settings.ai_provider')).toBeInTheDocument()
  })

  it('shows provider selector with current provider', () => {
    render(<Settings />)
    expect(screen.getByText('settings.provider')).toBeInTheDocument()
  })

  it('shows API key field when provider requires it', () => {
    render(<Settings />)
    expect(screen.getByText('settings.api_key')).toBeInTheDocument()
  })

  it('shows model field with current model value', () => {
    render(<Settings />)
    expect(screen.getByText('settings.model')).toBeInTheDocument()
    expect(screen.getByDisplayValue('gpt-4o')).toBeInTheDocument()
  })

  it('calls updateSettings when model is changed', () => {
    render(<Settings />)
    const input = screen.getByDisplayValue('gpt-4o')
    fireEvent.change(input, { target: { value: 'gpt-4-turbo' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ model: 'gpt-4-turbo' })
  })

  it('shows base URL field', () => {
    render(<Settings />)
    expect(screen.getByText('settings.base_url')).toBeInTheDocument()
  })

  it('shows test connection button', () => {
    render(<Settings />)
    expect(screen.getByText('settings.test_connection')).toBeInTheDocument()
  })

  it('calls updateSettings when API key is changed', () => {
    render(<Settings />)
    // Find the password input (API key)
    const apiKeyInput = document.querySelector('input[type="password"]')
    expect(apiKeyInput).not.toBeNull()
    fireEvent.change(apiKeyInput!, { target: { value: 'sk-test-key' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ apiKeys: { openai: 'sk-test-key' } })
  })

  it('toggles API key visibility when eye button is clicked', () => {
    render(<Settings />)
    // Initially password field
    const apiKeyInput = document.querySelector('input[type="password"]')
    expect(apiKeyInput).not.toBeNull()
    // Click the eye toggle button
    const toggleBtn = screen.getByTitle('settings.show_api_key')
    fireEvent.click(toggleBtn)
    // Now should be text type
    const visibleInput = document.querySelector(
      'input[type="text"][placeholder="settings.api_key_ph"]'
    )
    expect(visibleInput).not.toBeNull()
  })

  it('shows per-provider API key value', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, apiKeys: { openai: 'sk-stored-key' } },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    const apiKeyInput = document.querySelector('input[type="password"]') as HTMLInputElement
    expect(apiKeyInput.value).toBe('sk-stored-key')
  })

  it('shows change directory button', () => {
    render(<Settings />)
    expect(screen.getByText('settings.change_dir')).toBeInTheDocument()
  })

  it('shows workspace directory input', () => {
    render(<Settings />)
    expect(screen.getByText('settings.workspace_dir')).toBeInTheDocument()
  })

  it('shows current workspace path in input', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, workspacePath: '/custom/path' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByDisplayValue('/custom/path')).toBeInTheDocument()
  })
})
