import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, AppSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

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
                {t('settings.theme')}
              </label>
              <Select value={settings.theme} onValueChange={handleThemeChange}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Select theme" />
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
                  <SelectValue placeholder="Select language" />
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
                  <SelectValue placeholder="Select provider" />
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
                  <p className="text-xs text-muted-foreground">
                    Your OpenAI API key. Stored locally.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Your Anthropic API key. Stored locally.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Your DeepSeek API key. Stored locally.
                  </p>
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
                      Make sure you have pulled this model using `ollama pull &lt;model&gt;`
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
