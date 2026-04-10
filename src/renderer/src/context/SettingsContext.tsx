import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { AIProvider } from '../lib/provider'
export interface AppSettings {
  provider: AIProvider
  apiKeys: Partial<Record<AIProvider, string>>
  model: string
  baseUrl: string
  theme: 'light' | 'dark' | 'system'
  language: 'en' | 'zh'
  workspacePath?: string
  autoUpdate?: boolean
  localModelId?: string | null
}

export interface SettingsContextType {
  settings: AppSettings
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>
  isLoading: boolean
  error: string | null
}

const defaultSettings: AppSettings = {
  provider: 'openai',
  apiKeys: {},
  model: 'gpt-5.2',
  baseUrl: '',
  theme: 'system',
  language: 'en',
  workspacePath: '',
  autoUpdate: true,
  localModelId: null
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
          // Migrate old apiKey (string) to apiKeys (Record) format
          let apiKeys: Partial<Record<AIProvider, string>> = loaded.apiKeys || {}
          if (!loaded.apiKeys && loaded.apiKey) {
            const provider = (loaded.provider as AIProvider) || 'openai'
            apiKeys = { [provider]: loaded.apiKey }
          }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { apiKey: _oldApiKey, ...rest } = loaded
          setSettings({ ...defaultSettings, ...rest, apiKeys })
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
    const applyTheme = (): void => {
      root.classList.remove('light', 'dark')
      if (settings.theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        root.classList.add(systemTheme)
      } else {
        root.classList.add(settings.theme)
      }
    }

    applyTheme()

    if (settings.theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (): void => {
        applyTheme()
      }
      mq.addEventListener('change', handler)
      return (): void => {
        mq.removeEventListener('change', handler)
      }
    }
    return undefined
  }, [settings.theme])

  // Effect to apply language
  useEffect(() => {
    import('../i18n')
      .then(({ default: i18n }) => {
        i18n.changeLanguage(settings.language)
      })
      .catch((e: unknown) => {
        console.debug('Failed to load i18n module:', e)
      })
    // Notify main process to rebuild macOS menu and About panel
    window.electron.ipcRenderer.invoke('app:setLanguage', settings.language).catch((e: unknown) => {
      console.debug('Language sync failed:', e)
    })
  }, [settings.language])

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    const previousSettings = settings
    try {
      const updated = {
        ...settings,
        ...newSettings,
        // Deep-merge apiKeys so switching providers doesn't wipe other keys
        ...(newSettings.apiKeys ? { apiKeys: { ...settings.apiKeys, ...newSettings.apiKeys } } : {})
      }
      // Optimistic update
      setSettings(updated)
      await window.electron.ipcRenderer.invoke('settings:save', updated)
    } catch (err) {
      // Revert optimistic update on failure
      setSettings(previousSettings)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
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
