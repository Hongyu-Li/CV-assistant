import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, type AppSettings } from '../context/SettingsContext'
import { PROVIDER_CONFIGS, AIProvider } from '../lib/provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select'
import { Button } from '../components/ui/button'
import { toast } from 'sonner'
import { Eye, EyeOff, FolderOpen, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from '../components/ui/alert-dialog'

interface ConfirmDialogState {
  open: boolean
  title: string
  description: string
  resolve: ((value: boolean) => void) | null
}

export const Settings = (): React.JSX.Element => {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()
  const [isMigrating, setIsMigrating] = React.useState(false)
  const [showApiKey, setShowApiKey] = React.useState(false)
  const [isTesting, setIsTesting] = React.useState(false)
  const [appVersion, setAppVersion] = React.useState<string>('')
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState>({
    open: false,
    title: '',
    description: '',
    resolve: null
  })

  const showConfirmDialog = React.useCallback(
    (title: string, description: string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setConfirmDialog({ open: true, title, description, resolve })
      })
    },
    []
  )

  const handleConfirmDialogResponse = React.useCallback(
    (confirmed: boolean): void => {
      confirmDialog.resolve?.(confirmed)
      setConfirmDialog({ open: false, title: '', description: '', resolve: null })
    },
    [confirmDialog]
  )

  const handleMigration = React.useCallback(
    async (currentPath: string, newDir: string): Promise<void> => {
      // Determine actual source path
      const fromPath =
        currentPath || (await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath'))

      // If newDir not yet selected, open directory picker
      let toPath = newDir
      if (!toPath) {
        toPath = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
        if (!toPath) return // User cancelled
      }

      // Same directory check
      if (fromPath === toPath) {
        toast.info(t('settings.migration_same_dir'))
        return
      }

      setIsMigrating(true)
      try {
        // Step 1: Precheck
        const precheck = await window.electron.ipcRenderer.invoke('workspace:precheck', {
          from: fromPath,
          to: toPath
        })

        if (!precheck.success) {
          toast.error(t('settings.migration_error', { error: precheck.error }))
          return
        }

        // No files to migrate — just update path
        if (precheck.fileCount === 0) {
          updateSettings({ workspacePath: toPath })
          return
        }

        // Step 2: Confirmation dialog
        const confirmed = await showConfirmDialog(
          t('settings.migration_confirm_title', { defaultValue: 'Confirm Migration' }),
          t('settings.migration_confirm', { count: precheck.fileCount })
        )
        if (!confirmed) return

        // Step 3: Handle conflicts
        let overwriteConflicts = false
        if (precheck.conflicts.length > 0) {
          overwriteConflicts = await showConfirmDialog(
            t('settings.migration_conflict_title', { defaultValue: 'File Conflicts' }),
            t('settings.migration_conflict', { count: precheck.conflicts.length })
          )
        }

        // Step 4: Execute migration
        const result = await window.electron.ipcRenderer.invoke('workspace:migrate', {
          from: fromPath,
          to: toPath,
          overwriteConflicts
        })

        if (result.success) {
          // All files migrated successfully — update path
          updateSettings({ workspacePath: toPath })
          toast.success(t('settings.migration_success', { count: result.migrated.length }))
        } else if (result.migrated.length > 0) {
          // Partial failure — don't update path
          toast.error(
            t('settings.migration_partial', {
              migrated: result.migrated.length,
              failed: result.errors.length
            })
          )
        } else {
          // Total failure
          const errorMsg = result.errors[0]?.error || 'Unknown error'
          toast.error(t('settings.migration_error', { error: errorMsg }))
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(t('settings.migration_error', { error: msg }))
      } finally {
        setIsMigrating(false)
      }
    },
    [t, updateSettings, showConfirmDialog]
  )

  // Listen for first-run migration prompt from main process
  React.useEffect(() => {
    const handler = (_event: unknown, data: { oldPath: string; fileCount: number }): void => {
      toast.info(t('settings.migration_first_run'), {
        duration: 10000,
        action: {
          label: t('settings.change_dir'),
          onClick: async () => {
            await handleMigration(data.oldPath, '')
          }
        }
      })
    }
    window.electron.ipcRenderer.on('workspace:first-run-migration', handler)
    return () => {
      window.electron.ipcRenderer.removeListener('workspace:first-run-migration', handler)
    }
  }, [t, handleMigration])

  React.useEffect(() => {
    window.electron.ipcRenderer
      .invoke('app:getVersion')
      .then((version: string) => {
        setAppVersion(version)
      })
      .catch((e: unknown) => {
        console.debug('Version fetch failed:', e)
      })
  }, [])

  const handleProviderChange = (value: string): void => {
    const provider = value as AIProvider
    updateSettings({
      provider,
      model: PROVIDER_CONFIGS[provider].defaultModel,
      baseUrl: PROVIDER_CONFIGS[provider].defaultBaseUrl
    })
  }

  const handleThemeChange = (value: string): void => {
    updateSettings({ theme: value as AppSettings['theme'] })
  }

  const handleLanguageChange = (value: string): void => {
    updateSettings({ language: value as AppSettings['language'] })
  }

  const providerConfig = PROVIDER_CONFIGS[settings.provider]

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-page-enter">
      <div>
        <h2 className="text-3xl font-extrabold tracking-wide">{t('settings.title')}</h2>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.general')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="settings-workspace"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('settings.workspace_dir')}
              </label>
              <div className="flex gap-2">
                <Input
                  id="settings-workspace"
                  readOnly
                  value={settings.workspacePath || ''}
                  placeholder={t('settings.workspace_dir_ph')}
                />
                <Button
                  variant="outline"
                  disabled={isMigrating}
                  onClick={async (): Promise<void> => {
                    const dir = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
                    if (dir) {
                      await handleMigration(settings.workspacePath || '', dir)
                    }
                  }}
                >
                  {isMigrating ? t('settings.migration_in_progress') : t('settings.change_dir')}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('settings.open_folder')}
                  onClick={async (): Promise<void> => {
                    try {
                      const pathToOpen =
                        settings.workspacePath ||
                        (await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath'))
                      if (pathToOpen) {
                        await window.electron.ipcRenderer.invoke('shell:openPath', pathToOpen)
                      }
                    } catch {
                      toast.error(t('settings.open_folder_error'))
                    }
                  }}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.workspace_dir_desc')}</p>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="settings-theme"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('settings.theme')}
              </label>
              <Select value={settings.theme} onValueChange={handleThemeChange}>
                <SelectTrigger id="settings-theme" className="w-full md:w-[240px]">
                  <SelectValue placeholder={t('settings.select_theme_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t('settings.theme_light')}</SelectItem>
                  <SelectItem value="dark">{t('settings.theme_dark')}</SelectItem>
                  <SelectItem value="system">{t('settings.theme_system')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="settings-language"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('settings.language')}
              </label>
              <Select value={settings.language || 'en'} onValueChange={handleLanguageChange}>
                <SelectTrigger id="settings-language" className="w-full md:w-[240px]">
                  <SelectValue placeholder={t('settings.select_language_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.lang_english')}</SelectItem>
                  <SelectItem value="zh">{t('settings.lang_chinese')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.ai_provider')}</CardTitle>
            <CardDescription>{t('settings.ai_provider_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="settings-provider" className="text-sm font-medium leading-none">
                {t('settings.provider')}
              </label>
              <Select value={settings.provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="settings-provider" className="w-full">
                  <SelectValue placeholder={t('settings.select_provider_ph')} />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROVIDER_CONFIGS) as AIProvider[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {t(`settings.provider_${key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {providerConfig.requiresApiKey && (
              <div className="space-y-2">
                <label htmlFor="settings-apikey" className="text-sm font-medium leading-none">
                  {t('settings.api_key')}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="settings-apikey"
                      type={showApiKey ? 'text' : 'password'}
                      placeholder={t('settings.api_key_ph')}
                      value={settings.apiKeys?.[settings.provider] || ''}
                      onChange={(e): void => {
                        updateSettings({ apiKeys: { [settings.provider]: e.target.value } })
                      }}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={(): void => setShowApiKey(!showApiKey)}
                    aria-label={
                      showApiKey ? t('settings.hide_api_key') : t('settings.show_api_key')
                    }
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('settings.api_key_desc')}</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="settings-model" className="text-sm font-medium leading-none">
                {t('settings.model')}
              </label>
              <Input
                id="settings-model"
                type="text"
                placeholder={t('settings.model_ph')}
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t('settings.model_desc')}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-baseurl" className="text-sm font-medium leading-none">
                {t('settings.base_url')}
              </label>
              <Input
                id="settings-baseurl"
                type="text"
                placeholder={t('settings.base_url_ph')}
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">{t('settings.base_url_desc')}</p>
            </div>

            <Button
              variant="outline"
              disabled={isTesting}
              onClick={async (): Promise<void> => {
                setIsTesting(true)
                try {
                  const result = await window.electron.ipcRenderer.invoke('ai:test', {
                    provider: settings.provider,
                    apiKey: settings.apiKeys?.[settings.provider] || '',
                    model: settings.model,
                    baseUrl: settings.baseUrl
                  })
                  if (result.success) {
                    toast.success(t('settings.connection_success'))
                  } else {
                    toast.error(`${t('settings.connection_failed')} ${result.error || ''}`)
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err)
                  toast.error(`${t('settings.connection_failed')} ${msg}`)
                } finally {
                  setIsTesting(false)
                }
              }}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('settings.test_connection')}
            </Button>
          </CardContent>
        </Card>

        {/* Version */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.version')}</CardTitle>
            <CardDescription>{t('settings.version_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('settings.auto_update_version')}: {appVersion || '...'}
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDialog.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(): void => handleConfirmDialogResponse(false)}>
              {t('settings.confirm_dialog_cancel', { defaultValue: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={(): void => handleConfirmDialogResponse(true)}>
              {t('settings.confirm_dialog_confirm', { defaultValue: 'Confirm' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
