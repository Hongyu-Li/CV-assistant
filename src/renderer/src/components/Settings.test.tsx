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

describe('Settings Component', () => {
  const mockUpdateSettings = vi.fn()
  const defaultSettings = {
    provider: 'openai',
    openAiApiKey: 'sk-test-openai',
    claudeApiKey: 'sk-ant-test',
    deepSeekApiKey: 'ds-test',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    theme: 'system'
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
    // Depending on whether it's h2 or something else, getByText is safer than getByRole
    expect(screen.getAllByText('settings.ai_providers').length).toBeGreaterThan(0)
  })

  it('shows OpenAI settings when OpenAI is selected', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, provider: 'openai' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByText('settings.openai_key')).toBeInTheDocument()
    expect(screen.queryByText('settings.claude_key')).not.toBeInTheDocument()
  })

  it('shows Anthropic settings when Anthropic is selected', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, provider: 'anthropic' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByText('settings.claude_key')).toBeInTheDocument()
    expect(screen.queryByText('settings.openai_key')).not.toBeInTheDocument()
  })

  it('calls updateSettings when API key is changed', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, provider: 'openai' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    const input = screen.getByDisplayValue('sk-test-openai')
    fireEvent.change(input, { target: { value: 'new-key' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ openAiApiKey: 'new-key' })
  })
})
