import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'

function Badge({
  children,
  variant = 'default',
  className = ''
}: {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline'
  className?: string
}): React.ReactElement {
  const base =
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    success: 'border-transparent bg-green-500 text-white',
    warning: 'border-transparent bg-yellow-500 text-white',
    error: 'border-transparent bg-red-500 text-white',
    outline: 'text-foreground'
  }
  return <span className={`${base} ${variants[variant]} ${className}`}>{children}</span>
}

interface LocalModel {
  id: string
  name: string
  displayName: string
  repo: string
  filename: string
  size: number
  sha256: string
  quantization: string
  description: string
  downloaded: boolean
  downloadedAt: string | null
}

type EngineStatus = 'stopped' | 'starting' | 'running' | 'error'

interface EngineState {
  status: EngineStatus
  port: number | null
  modelId: string | null
  error: string | null
}

interface DownloadProgress {
  modelId: string
  receivedBytes: number
  totalBytes: number
  percent: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function LocalModelSettings(): React.ReactElement {
  const { t } = useTranslation()
  const [models, setModels] = useState<LocalModel[]>([])
  const [engineState, setEngineState] = useState<EngineState>({
    status: 'stopped',
    port: null,
    modelId: null,
    error: null
  })
  const [progresses, setProgresses] = useState<Record<string, DownloadProgress>>({})
  const [isMasBuild, setIsMasBuild] = useState<boolean>(false)
  const [modelToDelete, setModelToDelete] = useState<LocalModel | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async (): Promise<void> => {
    try {
      const modelRes = await window.electron.ipcRenderer.invoke('llm:listModels')
      if (!modelRes.success) {
        if (modelRes.error?.includes('not available in App Store')) {
          setIsMasBuild(true)
        } else {
          setErrorMsg(modelRes.error || 'Failed to load models')
        }
        return
      }
      setModels(modelRes.models)

      const engineRes = await window.electron.ipcRenderer.invoke('llm:engineStatus')
      if (engineRes.success) {
        setEngineState(engineRes.state)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('not available in App Store')) {
        setIsMasBuild(true)
      } else {
        setErrorMsg(msg)
      }
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData()

    const listener = (_event: unknown, progress: DownloadProgress): void => {
      setProgresses((prev) => ({
        ...prev,
        [progress.modelId]: progress
      }))
    }

    window.electron.ipcRenderer.on('llm:downloadProgress', listener)

    return () => {
      window.electron.ipcRenderer.removeListener('llm:downloadProgress', listener)
    }
  }, [])

  const handleDownload = async (modelId: string): Promise<void> => {
    setErrorMsg(null)
    const res = await window.electron.ipcRenderer.invoke('llm:downloadModel', { modelId })
    if (res.success) {
      setProgresses((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
      await loadData()
    } else {
      setErrorMsg(t('localLlm.error_download_failed', { error: res.error }))
      setProgresses((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
    }
  }

  const handleCancelDownload = async (modelId: string): Promise<void> => {
    const res = await window.electron.ipcRenderer.invoke('llm:cancelDownload')
    if (res.success) {
      setProgresses((prev) => {
        const next = { ...prev }
        delete next[modelId]
        return next
      })
    }
  }

  const handleDeleteModel = async (modelId: string): Promise<void> => {
    setErrorMsg(null)
    const res = await window.electron.ipcRenderer.invoke('llm:deleteModel', { modelId })
    if (res.success) {
      if (engineState.modelId === modelId && engineState.status !== 'stopped') {
        await handleStopEngine()
      }
      await loadData()
    } else {
      setErrorMsg(res.error || 'Failed to delete model')
    }
    setModelToDelete(null)
  }

  const handleStartEngine = async (modelId: string): Promise<void> => {
    setErrorMsg(null)
    setEngineState((prev) => ({ ...prev, status: 'starting', modelId }))
    const res = await window.electron.ipcRenderer.invoke('llm:startEngine', { modelId })
    if (res.success) {
      setEngineState(res.state)
    } else {
      setEngineState((prev) => ({ ...prev, status: 'error', error: res.error }))
      setErrorMsg(t('localLlm.error_engine_failed', { error: res.error }))
    }
  }

  const handleStopEngine = async (): Promise<void> => {
    const res = await window.electron.ipcRenderer.invoke('llm:stopEngine')
    if (res.success) {
      setEngineState(res.state)
    }
  }

  if (isMasBuild) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('localLlm.section_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('localLlm.error_not_available_mas')}</p>
        </CardContent>
      </Card>
    )
  }

  const downloadedCount = models.filter((m) => m.downloaded).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>{t('localLlm.section_title')}</CardTitle>
        <div className="flex items-center gap-2">
          {engineState.status === 'running' && (
            <Badge variant="success">{t('localLlm.engine_running')}</Badge>
          )}
          {engineState.status === 'starting' && (
            <Badge variant="warning">{t('localLlm.engine_starting')}</Badge>
          )}
          {engineState.status === 'stopped' && (
            <Badge variant="outline">{t('localLlm.engine_stopped')}</Badge>
          )}
          {engineState.status === 'error' && (
            <Badge variant="error">{t('localLlm.engine_error')}</Badge>
          )}
          {engineState.status === 'running' && (
            <Button variant="outline" size="sm" onClick={() => handleStopEngine()}>
              Stop
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {models.length === 0 && !errorMsg && (
          <p className="text-sm text-muted-foreground">{t('localLlm.empty_state')}</p>
        )}

        {downloadedCount === 0 && models.length > 0 && (
          <p className="text-sm text-muted-foreground mb-4">{t('localLlm.empty_state')}</p>
        )}

        <div className="grid gap-4">
          {models.map((model) => {
            const isDownloading = !!progresses[model.id]
            const progress = progresses[model.id]

            return (
              <div key={model.id} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{model.displayName}</h4>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>
                        {t('localLlm.model_size', { size: (model.size / 1e9).toFixed(2) })}
                      </span>
                      <span>•</span>
                      <span>
                        {t('localLlm.model_quantization', { quantization: model.quantization })}
                      </span>
                    </div>
                  </div>
                  <div>
                    {model.size < 5e9 ? (
                      <Badge variant="outline">{t('localLlm.memory_warning_8gb')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('localLlm.memory_warning_16gb')}</Badge>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">{model.description}</p>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {model.downloaded && !isDownloading ? (
                      <Badge variant="success">{t('localLlm.download_complete')}</Badge>
                    ) : null}

                    {isDownloading && progress && (
                      <div className="flex w-[200px] flex-col gap-1">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full bg-primary transition-all duration-200"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t('localLlm.download_progress', {
                            percent: progress.percent.toFixed(1),
                            received: formatBytes(progress.receivedBytes),
                            total: formatBytes(progress.totalBytes)
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isDownloading ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelDownload(model.id)}
                      >
                        {t('localLlm.cancel_download')}
                      </Button>
                    ) : !model.downloaded ? (
                      <Button size="sm" onClick={() => handleDownload(model.id)}>
                        {t('localLlm.download')}
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={
                            engineState.status === 'starting' ||
                            (engineState.status === 'running' && engineState.modelId === model.id)
                          }
                          onClick={() => handleStartEngine(model.id)}
                        >
                          {engineState.modelId === model.id && engineState.status === 'running'
                            ? t('localLlm.engine_running')
                            : 'Start Engine'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setModelToDelete(model)}
                        >
                          {t('localLlm.delete')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>

      <AlertDialog open={!!modelToDelete} onOpenChange={(open) => !open && setModelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('localLlm.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {modelToDelete &&
                t('localLlm.delete_confirm_desc', { name: modelToDelete.displayName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('localLlm.cancel_download')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => modelToDelete && handleDeleteModel(modelToDelete.id)}
            >
              {t('localLlm.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
