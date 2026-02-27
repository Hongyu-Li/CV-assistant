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

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadInitialSettings = async (): Promise<void> => {
      try {
        setIsLoading(true)

        const loaded = await window.electron.ipcRenderer.invoke('settings:load')
        if (loaded && Object.keys(loaded).length > 0) {
          setSettings({ ...defaultSettings, ...loaded })
        }
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
      await window.electron.ipcRenderer.invoke('settings:save', updated)
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
