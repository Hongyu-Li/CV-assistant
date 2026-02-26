import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Generator } from './Generator'
import { SettingsProvider } from '../context/SettingsContext'

// Mock the agent module
vi.mock('../lib/agent', () => ({
  getAgent: () => ({
    generateCV: async function* () {
      yield 'Generated CV Content'
    }
  })
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}))

// Mock window.electron
window.electron = {
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn()
  }
} as unknown as Window['electron']

describe('Generator Component', () => {
  it('renders correctly', () => {
    render(
      <SettingsProvider>
        <Generator />
      </SettingsProvider>
    )
    expect(screen.getByText('generator.job_description')).toBeInTheDocument()
    expect(screen.getByText('generator.generated_cv')).toBeInTheDocument()
  })

  it('handles generation', async () => {
    render(
      <SettingsProvider>
        <Generator />
      </SettingsProvider>
    )

    const textarea = screen.getByPlaceholderText('generator.jd_placeholder')
    fireEvent.change(textarea, { target: { value: 'Software Engineer' } })

    const button = screen.getByText('generator.generate')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Generated CV Content')).toBeInTheDocument()
    })
  })
})
