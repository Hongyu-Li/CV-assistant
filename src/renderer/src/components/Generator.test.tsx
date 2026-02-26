import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Generator } from './Generator'
import { SettingsProvider } from '../context/SettingsContext'

// Mock the AI provider
vi.mock('../lib/ai', () => ({
  getAIProvider: () => ({
    generateCV: async function* () {
      yield 'Generated CV Content'
    }
  })
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
    expect(screen.getByText('Job Description')).toBeInTheDocument()
    expect(screen.getByText('Generated CV')).toBeInTheDocument()
  })

  it('handles generation', async () => {
    render(
      <SettingsProvider>
        <Generator />
      </SettingsProvider>
    )

    const textarea = screen.getByPlaceholderText('Paste job description...')
    fireEvent.change(textarea, { target: { value: 'Software Engineer' } })

    const button = screen.getByText('Generate CV')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Generated CV Content')).toBeInTheDocument()
    })
  })
})
