import '@testing-library/jest-dom'

import { vi } from 'vitest'

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
