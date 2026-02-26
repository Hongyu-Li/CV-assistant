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

describe('Settings Component', () => {
  const mockUpdateSettings = vi.fn()
  const defaultSettings = {
    agentType: 'opencode',
    agentEndpoint: 'http://localhost:4096',
    agentCommand: '',
    agentArgs: '',
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
    expect(screen.getAllByText('settings.coding_agent').length).toBeGreaterThan(0)
  })

  it('shows OpenCode endpoint when OpenCode is selected', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, agentType: 'opencode' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByText('settings.agent_endpoint')).toBeInTheDocument()
  })

  it('shows command fields when Claude Code is selected', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, agentType: 'claude-code' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    expect(screen.getByText('settings.agent_command')).toBeInTheDocument()
    expect(screen.getByText('settings.agent_args')).toBeInTheDocument()
  })

  it('calls updateSettings when endpoint is changed', () => {
    ;(useSettings as Mock).mockReturnValue({
      settings: { ...defaultSettings, agentType: 'opencode' },
      updateSettings: mockUpdateSettings,
      isLoading: false,
      error: null
    })
    render(<Settings />)
    const input = screen.getByDisplayValue('http://localhost:4096')
    fireEvent.change(input, { target: { value: 'http://localhost:5000' } })
    expect(mockUpdateSettings).toHaveBeenCalledWith({ agentEndpoint: 'http://localhost:5000' })
  })
})
