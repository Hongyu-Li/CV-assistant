import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { toast } from 'sonner'
import { Trash2, FileText, Calendar, Briefcase } from 'lucide-react'

interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  lastModified?: string
  [key: string]: unknown
}

export function Resumes(): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()
  const [resumes, setResumes] = useState<CV[]>([])
  const [loading, setLoading] = useState(true)

  const loadResumes = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.electron.ipcRenderer.invoke('cv:list', settings.workspacePath)
      // Ensure data is an array before calling sort
      if (Array.isArray(data)) {
        // Sort by lastModified descending
        const sorted = data.sort((a: CV, b: CV) => {
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
      toast.error(t('resumes.load_error') || 'Failed to load resumes')
    } finally {
      setLoading(false)
    }
  }, [t, settings.workspacePath])

  useEffect(() => {
    loadResumes()
  }, [loadResumes])

  const handleDelete = async (filename: string): Promise<void> => {
    try {
      const result = await window.electron.ipcRenderer.invoke('cv:delete', {
        filename,
        workspacePath: settings.workspacePath
      })
      if (result.success) {
        toast.success(t('resumes.delete_success') || 'Resume deleted successfully')
        loadResumes() // Reload list
      } else {
        toast.error(t('resumes.delete_error') || 'Failed to delete resume')
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
      toast.error(t('resumes.delete_error') || 'Failed to delete resume')
    }
  }

  if (loading) {
    return <div className="p-6">Loading resumes...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t('app.resumes')}</h2>
          <p className="text-muted-foreground mt-1">
            {t('resumes.description') || 'Manage your saved CV drafts and generated resumes.'}
          </p>
        </div>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">
                {t('resumes.empty_title') || 'No resumes found'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('resumes.empty_desc') || 'Create a new draft from the dashboard to get started.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="group relative overflow-hidden transition-all hover:border-primary/50"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 truncate">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="truncate">{resume.jobTitle || 'Untitled Resume'}</span>
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                  <Calendar className="h-3 w-3" />
                  {resume.lastModified
                    ? new Date(resume.lastModified).toLocaleDateString()
                    : 'Unknown date'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {resume.experienceLevel && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      <span className="capitalize">{resume.experienceLevel} level</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(resume.filename)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('common.delete') || 'Delete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
