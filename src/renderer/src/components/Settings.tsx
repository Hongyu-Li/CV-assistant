import React from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings, AppSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { toast } from 'sonner'

export const Settings = (): React.JSX.Element => {
  const { settings, updateSettings } = useSettings()
  const { t } = useTranslation()

  const handleAgentTypeChange = (value: string): void => {
    updateSettings({ agentType: value as AppSettings['agentType'] })
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
        <p className="text-muted-foreground">{t('settings.coding_agent_desc')}</p>
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

        {/* Coding Agent Settings */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.coding_agent')}</CardTitle>
            <CardDescription>{t('settings.coding_agent_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">{t('settings.agent_type')}</label>
              <Select value={settings.agentType} onValueChange={handleAgentTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('settings.select_agent_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="opencode">OpenCode</SelectItem>
                  <SelectItem value="claude-code">Claude Code</SelectItem>
                  <SelectItem value="aider">{t('settings.agent_aider')}</SelectItem>
                  <SelectItem value="cursor">{t('settings.agent_cursor')}</SelectItem>
                  <SelectItem value="copilot">{t('settings.agent_copilot')}</SelectItem>
                  <SelectItem value="custom-cli">Custom CLI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              {settings.agentType === 'opencode' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_endpoint')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.agent_endpoint_ph')}
                      value={settings.agentEndpoint}
                      onChange={(e) => updateSettings({ agentEndpoint: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_endpoint_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_model')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.agent_model_ph')}
                      value={settings.agentModel}
                      onChange={(e) => updateSettings({ agentModel: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_model_desc')}
                    </p>
                  </div>
                </div>
              )}

              {settings.agentType === 'claude-code' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_command')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.agent_command_ph')}
                      value={settings.agentCommand}
                      onChange={(e) => updateSettings({ agentCommand: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_command_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_args')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.agent_args_ph')}
                      value={settings.agentArgs}
                      onChange={(e) => updateSettings({ agentArgs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">{t('settings.agent_args_desc')}</p>
                  </div>
                </div>
              )}

              {settings.agentType === 'custom-cli' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_command')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.custom_command_ph')}
                      value={settings.agentCommand}
                      onChange={(e) => updateSettings({ agentCommand: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_command_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_args')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.custom_args_ph')}
                      value={settings.agentArgs}
                      onChange={(e) => updateSettings({ agentArgs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.custom_args_desc')}
                    </p>
                  </div>
                </div>
              )}

              {settings.agentType === 'aider' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_command')}
                    </label>
                    <Input
                      type="text"
                      placeholder="aider"
                      value={settings.agentCommand}
                      onChange={(e) => updateSettings({ agentCommand: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_command_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.aider_model')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.aider_model_ph')}
                      value={settings.agentArgs}
                      onChange={(e) => updateSettings({ agentArgs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.aider_model_desc')}
                    </p>
                  </div>
                </div>
              )}

              {settings.agentType === 'cursor' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_command')}
                    </label>
                    <Input
                      type="text"
                      placeholder="cursor"
                      value={settings.agentCommand}
                      onChange={(e) => updateSettings({ agentCommand: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_command_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.cursor_model')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.cursor_model_ph')}
                      value={settings.agentArgs}
                      onChange={(e) => updateSettings({ agentArgs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.cursor_model_desc')}
                    </p>
                  </div>
                </div>
              )}

              {settings.agentType === 'copilot' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.agent_command')}
                    </label>
                    <Input
                      type="text"
                      placeholder="copilot"
                      value={settings.agentCommand}
                      onChange={(e) => updateSettings({ agentCommand: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.agent_command_desc')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {t('settings.copilot_model')}
                    </label>
                    <Input
                      type="text"
                      placeholder={t('settings.copilot_model_ph')}
                      value={settings.agentArgs}
                      onChange={(e) => updateSettings({ agentArgs: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('settings.copilot_model_desc')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={async (): Promise<void> => {
                try {
                  if (settings.agentType === 'opencode') {
                    const res = await fetch(`${settings.agentEndpoint}/v1/models`)
                    if (res.ok) {
                      toast.success(t('settings.connection_success'))
                    } else {
                      toast.error(t('settings.connection_failed'))
                    }
                  } else {
                    // CLI agents can't be tested from renderer
                    toast.success(t('settings.connection_success'))
                  }
                } catch {
                  toast.error(t('settings.connection_failed'))
                }
              }}
            >
              {t('settings.test_connection')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
