import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, AppSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
export const Settings = (): React.JSX.Element => {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()

  const handleProviderChange = (value: string): void => {
    updateSettings({ provider: value as AppSettings['provider'] })
  }

  const handleThemeChange = (value: string): void => {
    updateSettings({ theme: value as AppSettings['theme'] })
  }

  const handleLanguageChange = (value: string): void => {
    updateSettings({ language: value as AppSettings['language'] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('settings.title')}</h2>
        <p className="text-muted-foreground">{t('settings.provider_desc')}</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.general')}</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('settings.workspace_dir')}
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={settings.workspacePath || ''}
                  placeholder={t('settings.workspace_dir_ph')}
                />
                <Button
                  variant="outline"
                  onClick={async (): Promise<void> => {
                    const dir = await window.electron.ipcRenderer.invoke('dialog:openDirectory')
                    if (dir) {
                      updateSettings({ workspacePath: dir })
                    }
                  }}
                >
                  {t('settings.change_dir')}
                </Button>
                <Button
                  variant="outline"
                  onClick={async (): Promise<void> => {
                    const pathToOpen =
                      settings.workspacePath ||
                      (await window.electron.ipcRenderer.invoke('app:getDefaultWorkspacePath'))
                    if (pathToOpen) {
                      await window.electron.ipcRenderer.invoke('shell:openPath', pathToOpen)
                    }
                  }}
                >
                  {t('settings.open_folder')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.workspace_dir_desc')}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('settings.theme')}
              </label>
              <Select value={settings.theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full md:w-[240px]">
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
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {t('settings.language')}
              </label>
              <Select value={settings.language || 'en'} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder={t('settings.select_language_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* AI Provider Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.ai_providers')}</CardTitle>
            <CardDescription>{t('settings.provider_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                {t('settings.active_provider')}
              </label>
              <Select value={settings.provider} onValueChange={handleProviderChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.select_provider_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (GPT-4 / GPT-3.5)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              {settings.provider === 'openai' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    {t('settings.openai_key')}
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-..."
                    value={settings.openAiApiKey}
                    onChange={(e) => updateSettings({ openAiApiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.openai_key_desc')}</p>
                </div>
              )}

              {settings.provider === 'anthropic' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    {t('settings.claude_key')}
                  </label>
                  <Input
                    type="password"
                    placeholder="sk-ant-..."
                    value={settings.claudeApiKey}
                    onChange={(e) => updateSettings({ claudeApiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.claude_key_desc')}</p>
                </div>
              )}

              {settings.provider === 'deepseek' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none">
                    {t('settings.deepseek_key')}
                  </label>
                  <Input
                    type="password"
                    placeholder="ds-..."
                    value={settings.deepSeekApiKey}
                    onChange={(e) => updateSettings({ deepSeekApiKey: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.deepseek_key_desc')}</p>
                </div>
              )}

              {settings.provider === 'ollama' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.ollama_url')}
                    </label>
                    <Input
                      type="text"
                      placeholder="http://localhost:11434"
                      value={settings.ollamaUrl}
                      onChange={(e) => updateSettings({ ollamaUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.ollama_model')}
                    </label>
                    <Input
                      type="text"
                      placeholder="llama3"
                      value={settings.ollamaModel}
                      onChange={(e) => updateSettings({ ollamaModel: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.ollama_model_desc')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
