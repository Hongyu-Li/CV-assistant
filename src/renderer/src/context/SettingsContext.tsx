import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface AppSettings {
  provider:
    | 'openai'
    | 'anthropic'
    | 'google'
    | 'deepseek'
    | 'ollama'
    | 'openrouter'
    | 'groq'
    | 'mistral'
    | 'custom'
  apiKey: string
  model: string
  baseUrl: string
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'
  workspacePath?: string
}

export interface SettingsContextType {
  settings: AppSettings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
  isLoading: boolean
  error: string | null
}

const defaultSettings: AppSettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  baseUrl: '',
  theme: 'system',
  language: 'en',
  workspacePath: ''
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Mock IPC calls for now
const mockLoadSettings = async (): Promise<AppSettings> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const stored = localStorage.getItem('mock_settings')
      if (stored) {
        try {
          resolve({ ...defaultSettings, ...JSON.parse(stored) })
        } catch {
          resolve(defaultSettings)
        }
      } else {
        resolve(defaultSettings)
      }
    }, 100)
  })
}

const mockSaveSettings = async (settings: AppSettings): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.setItem('mock_settings', JSON.stringify(settings))
      resolve()
    }, 100)
  })
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInitialSettings = async (): Promise<void> => {
      try {
        setIsLoading(true)
        // In the future, replace with window.electron.ipcRenderer.invoke('get-settings')
        const loadedSettings = await mockLoadSettings()
        setSettings(loadedSettings)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings')
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialSettings()
  }, [])

  // Effect to apply theme to document
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')

    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      root.classList.add(systemTheme)
    } else {
      root.classList.add(settings.theme)
    }
  }, [settings.theme])

  // Effect to apply language
  useEffect(() => {
    import('../i18n').then(({ default: i18n }) => {
      i18n.changeLanguage(settings.language)
    })
  }, [settings.language])

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    try {
      const updated = { ...settings, ...newSettings }
      // Optimistic update
      setSettings(updated)
      // In the future, replace with window.electron.ipcRenderer.invoke('save-settings', updated)
      await mockSaveSettings(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      // Revert on failure could be implemented here
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading, error }}>
      {children}
    </SettingsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
