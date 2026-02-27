import '@testing-library/jest-dom'

import { vi, beforeEach, afterEach } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock react-i18next with stable references to prevent useEffect re-triggers
const mockT = (key: string): string => key
const mockI18n = {
  changeLanguage: () => new Promise(() => {}),
  language: 'en'
}
const mockUseTranslation = (): { t: typeof mockT; i18n: typeof mockI18n } => ({
  t: mockT,
  i18n: mockI18n
})
vi.mock('react-i18next', () => ({
  useTranslation: mockUseTranslation,
  initReactI18next: {
    type: '3rdParty',
    init: () => {}
  }
}))

// Mock window.electron - canonical mock for all renderer tests
Object.defineProperty(window, 'electron', {
  value: {
    ipcRenderer: {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      removeAllListeners: vi.fn(),
      removeListener: vi.fn(),
      invoke: vi.fn().mockResolvedValue({}),
      postMessage: vi.fn(),
      sendSync: vi.fn()
    },
    webFrame: {
      insertCSS: vi.fn(),
      setZoomFactor: vi.fn(),
      setZoomLevel: vi.fn()
    },
    webUtils: {
      getPathForFile: vi.fn()
    },
    process: {
      platform: 'darwin',
      versions: {
        electron: '28.0.0',
        chrome: '120.0.0',
        node: '18.0.0',
        v8: '12.0.0'
      },
      env: {}
    }
  },
  writable: true,
  configurable: true
})

// Reset all mocks before each test
beforeEach((): void => {
  if (window.electron) {
    Object.values(window.electron.ipcRenderer).forEach((method) => {
      if (typeof method === 'function' && 'mockClear' in method) {
        ;(method as ReturnType<typeof vi.fn>).mockClear()
      }
    })
    ;(window.electron.ipcRenderer.invoke as ReturnType<typeof vi.fn>).mockResolvedValue({})
  }
})

// Cleanup
afterEach((): void => {
  vi.restoreAllMocks()
})
