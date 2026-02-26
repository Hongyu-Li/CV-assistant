import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import App from './App'

// Mock window.electron
window.electron = {
  ipcRenderer: {
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeAllListeners: vi.fn()
  },
  process: {
    versions: {
      electron: '1.0.0',
      chrome: '1.0.0',
      node: '1.0.0',
      v8: '1.0.0'
    }
  }
} as unknown as Window['electron']

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('app.title')).toBeInTheDocument()
  })
})
