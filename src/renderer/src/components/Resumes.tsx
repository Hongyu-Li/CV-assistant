import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { Trash2, FileText, Calendar, Briefcase, Plus, Building2 } from 'lucide-react'
import { ResumeDialog } from './ResumeDialog'
import type { CV } from './ResumeDialog'

export function Resumes(): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()
  const [resumes, setResumes] = useState<CV[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResume, setEditingResume] = useState<CV | null>(null)

  const loadResumes = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.electron.ipcRenderer.invoke('cv:list', settings.workspacePath)
      // Ensure data is an array before calling sort
      if (Array.isArray(data)) {
        // Sort by lastModified descending
        const sorted = data.sort((a: CV, b: CV): number => {
          if (!a.lastModified) return 1
          if (!b.lastModified) return -1
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        })
        setResumes(sorted)
      } else {
        setResumes([])
      }
    } catch (error) {
      console.error('Failed to load resumes:', error)
      toast.error(t('resumes.load_error'))
    } finally {
      setLoading(false)
    }
  }, [t, settings.workspacePath])

  useEffect(() => {
    loadResumes()
  }, [loadResumes])

  const handleDelete = async (e: React.MouseEvent, filename: string): Promise<void> => {
    e.stopPropagation()
    try {
      const result = await window.electron.ipcRenderer.invoke('cv:delete', {
        filename,
        workspacePath: settings.workspacePath
      })
      if (result.success) {
        toast.success(t('resumes.delete_success'))
        loadResumes()
      } else {
        toast.error(t('resumes.delete_error'))
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
      toast.error(t('resumes.delete_error'))
    }
  }

  const handleEdit = async (resume: CV): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('cv:read', {
        filename: resume.filename,
        workspacePath: settings.workspacePath
      })
      if (result.success) {
        setEditingResume({ ...result.data, id: resume.id, filename: resume.filename })
        setDialogOpen(true)
      } else {
        toast.error(t('resumes.load_error'))
      }
    } catch {
      toast.error(t('resumes.load_error'))
    }
  }

  const handleCreate = (): void => {
    setEditingResume(null)
    setDialogOpen(true)
  }

  if (loading) {
    return <div className="p-6">{t('resumes.loading')}</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('app.resumes')}</h2>
          <p className="text-muted-foreground mt-1">{t('resumes.description')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('resumes.new_resume')}
        </Button>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">{t('resumes.empty_title')}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t('resumes.empty_desc')}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="group relative overflow-hidden transition-all hover:border-primary/50 cursor-pointer"
              onClick={(): void => {
                handleEdit(resume)
              }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="truncate">{resume.jobTitle || t('resumes.untitled')}</span>
                  </CardTitle>
                  {resume.status && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        resume.status === 'generated'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}
                    >
                      {resume.status === 'generated'
                        ? t('resumes.status_generated')
                        : t('resumes.status_draft')}
                    </span>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {resume.lastModified
                    ? new Date(resume.lastModified).toLocaleDateString()
                    : t('resumes.unknown_date')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {resume.companyName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{resume.companyName}</span>
                    </div>
                  )}
                  {resume.experienceLevel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="capitalize">
                        {t('resumes.experience_display', {
                          level: t(
                            `resumes.level_${resume.experienceLevel}`,
                            resume.experienceLevel
                          )
                        })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e: React.MouseEvent): void => {
                      handleDelete(e, resume.filename)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('common.delete')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResumeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resume={editingResume}
        onSaved={loadResumes}
      />
    </div>
  )
}
