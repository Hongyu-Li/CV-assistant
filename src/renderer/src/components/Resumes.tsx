import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { toast } from 'sonner'
import { Trash2, FileText, Calendar, Briefcase, Plus, Building2, Search } from 'lucide-react'
import { ResumeDialog } from './ResumeDialog'
import type { CV, InterviewStatus } from './ResumeDialog'

type FilterTab = 'all' | 'interview' | 'hr' | 'offer' | 'rejected'

function getInterviewStatusColor(status: InterviewStatus): string {
  switch (status) {
    case 'resume_sent':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'first_interview':
    case 'second_interview':
    case 'third_interview':
    case 'fourth_interview':
    case 'fifth_interview':
      return 'bg-blue-100 text-blue-700 border-blue-200'
    case 'hr_interview':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    case 'offer_accepted':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'offer_rejected':
    case 'interview_failed':
      return 'bg-red-100 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export function Resumes(): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()
  const [resumes, setResumes] = useState<CV[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResume, setEditingResume] = useState<CV | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadResumes = React.useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      const data = await window.electron.ipcRenderer.invoke('cv:list', settings.workspacePath)
      // Ensure data is an array before calling sort
      if (Array.isArray(data)) {
        // Sort by lastModified descending
        const sorted = [...data].sort((a: CV, b: CV): number => {
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
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-page-enter">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 rounded-lg animate-shimmer" />
            <div className="h-4 w-64 rounded animate-shimmer" />
          </div>
          <div className="h-10 w-32 rounded-lg animate-shimmer" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  // Calculate statistics
  const stats = {
    resumeSent: resumes.filter((r) => !r.interviewStatus || r.interviewStatus === 'resume_sent')
      .length,
    inInterview: resumes.filter((r) =>
      [
        'first_interview',
        'second_interview',
        'third_interview',
        'fourth_interview',
        'fifth_interview'
      ].includes(r.interviewStatus || '')
    ).length,
    hrInterview: resumes.filter((r) => r.interviewStatus === 'hr_interview').length,
    offerAccepted: resumes.filter((r) => r.interviewStatus === 'offer_accepted').length,
    rejected: resumes.filter((r) =>
      ['offer_rejected', 'interview_failed'].includes(r.interviewStatus || '')
    ).length
  }

  // Filter resumes by tab and search
  const filteredResumes = resumes.filter((resume) => {
    // Tab filter
    const status = resume.interviewStatus || 'resume_sent'
    let matchesTab = true
    switch (activeTab) {
      case 'interview':
        matchesTab = [
          'first_interview',
          'second_interview',
          'third_interview',
          'fourth_interview',
          'fifth_interview'
        ].includes(status)
        break
      case 'hr':
        matchesTab = status === 'hr_interview'
        break
      case 'offer':
        matchesTab = status === 'offer_accepted'
        break
      case 'rejected':
        matchesTab = ['offer_rejected', 'interview_failed'].includes(status)
        break
      default:
        matchesTab = true
    }

    // Search filter
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      !query ||
      resume.jobTitle?.toLowerCase().includes(query) ||
      resume.companyName?.toLowerCase().includes(query)

    return matchesTab && matchesSearch
  })

  const tabs: { key: FilterTab; label: string; count: number; color: string }[] = [
    { key: 'all', label: t('resumes.tab_all'), count: resumes.length, color: 'bg-gray-500' },
    {
      key: 'interview',
      label: t('resumes.tab_interview'),
      count: stats.inInterview,
      color: 'bg-blue-500'
    },
    { key: 'hr', label: t('resumes.tab_hr'), count: stats.hrInterview, color: 'bg-purple-500' },
    {
      key: 'offer',
      label: t('resumes.tab_offer'),
      count: stats.offerAccepted,
      color: 'bg-green-500'
    },
    {
      key: 'rejected',
      label: t('resumes.tab_rejected'),
      count: stats.rejected,
      color: 'bg-red-500'
    }
  ]

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-page-enter">
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

      {/* Statistics Cards */}
      {resumes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{stats.resumeSent}</p>
              <p className="text-xs text-gray-500 font-medium">{t('resumes.stats_resume_sent')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{stats.inInterview}</p>
              <p className="text-xs text-blue-600 font-medium">{t('resumes.stats_in_interview')}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{stats.hrInterview}</p>
              <p className="text-xs text-purple-600 font-medium">
                {t('resumes.stats_hr_interview')}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{stats.offerAccepted}</p>
              <p className="text-xs text-green-600 font-medium">
                {t('resumes.stats_offer_accepted')}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
              <p className="text-xs text-red-600 font-medium">{t('resumes.stats_rejected')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs & Search */}
      {resumes.length > 0 && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${tab.color}`} />
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    activeTab === tab.key ? 'bg-primary-foreground/20' : 'bg-background'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('resumes.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {filteredResumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <div className="p-4 bg-muted rounded-full">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium">
                {searchQuery || activeTab !== 'all'
                  ? t('resumes.no_search_results')
                  : t('resumes.empty_title')}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || activeTab !== 'all'
                  ? t('resumes.no_search_results_desc')
                  : t('resumes.empty_desc')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-fade-in">
          {filteredResumes.map((resume) => (
            <Card
              key={resume.id}
              className="group relative overflow-hidden card-hover cursor-pointer"
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
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
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
                  {resume.interviewStatus && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getInterviewStatusColor(resume.interviewStatus)}`}
                      >
                        {t(`resumes.status_${resume.interviewStatus}`)}
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
