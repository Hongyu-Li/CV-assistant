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
} as any

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText(/CV Assistant/i)).toBeInTheDocument()
  })
})
