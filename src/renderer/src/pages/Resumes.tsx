import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../context/SettingsContext'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { toast } from 'sonner'
import { Trash2, FileText, Calendar, Plus, Search } from 'lucide-react'
import { ResumeDialog } from '../components/resume-dialog'
import type { CV, InterviewStatus } from '../components/resume-dialog'
import { INTERVIEW_STATUSES, REJECTED_STATUSES, MAX_VISIBLE_KEYWORDS } from '../lib/constants'

type FilterTab = 'all' | 'draft' | 'interview' | 'hr' | 'offer' | 'rejected'

function getInterviewStatusColor(status: InterviewStatus): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-600 border-slate-200'
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
  const loadIdRef = useRef(0)

  const loadResumes = React.useCallback(async (): Promise<void> => {
    const currentLoadId = ++loadIdRef.current
    try {
      setLoading(true)
      const data = await window.electron.ipcRenderer.invoke('cv:list', settings.workspacePath)
      if (currentLoadId !== loadIdRef.current) return
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
      if (currentLoadId !== loadIdRef.current) return
      console.error('Failed to load resumes:', error)
      toast.error(t('resumes.load_error'))
    } finally {
      if (currentLoadId === loadIdRef.current) {
        setLoading(false)
      }
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
    draft: resumes.filter(
      (r) =>
        !r.interviewStatus || r.interviewStatus === 'draft' || r.interviewStatus === 'resume_sent'
    ).length,
    inInterview: resumes.filter((r) =>
      INTERVIEW_STATUSES.includes(r.interviewStatus as InterviewStatus)
    ).length,
    hrInterview: resumes.filter((r) => r.interviewStatus === 'hr_interview').length,
    offerAccepted: resumes.filter((r) => r.interviewStatus === 'offer_accepted').length,
    rejected: resumes.filter((r) =>
      REJECTED_STATUSES.includes(r.interviewStatus as InterviewStatus)
    ).length
  }

  // Filter resumes by tab and search
  const filteredResumes = resumes.filter((resume) => {
    // Tab filter
    const status = resume.interviewStatus || 'draft'
    let matchesTab = true
    switch (activeTab) {
      case 'draft':
        matchesTab =
          !resume.interviewStatus ||
          resume.interviewStatus === 'draft' ||
          resume.interviewStatus === 'resume_sent'
        break
      case 'interview':
        matchesTab = INTERVIEW_STATUSES.includes(status as InterviewStatus)
        break
      case 'hr':
        matchesTab = status === 'hr_interview'
        break
      case 'offer':
        matchesTab = status === 'offer_accepted'
        break
      case 'rejected':
        matchesTab = REJECTED_STATUSES.includes(status as InterviewStatus)
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
    { key: 'draft', label: t('resumes.tab_draft'), count: stats.draft, color: 'bg-slate-400' },
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
              <CardHeader className="pb-2">
                {/* Company Name - Most Prominent */}
                <CardTitle className="text-xl font-bold text-foreground truncate">
                  {resume.companyName || t('resumes.untitled')}
                </CardTitle>

                {/* Job Title and Salary in same row */}
                <div className="mt-1.5 flex items-center justify-between">
                  {resume.jobTitle ? (
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                      {resume.jobTitle}
                    </span>
                  ) : (
                    <span />
                  )}
                  {resume.targetSalary && (
                    <div className="flex items-center text-sm font-medium text-green-600">
                      <span>{resume.targetSalary}</span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0 pb-4">
                {/* Interview Status - Prominent */}
                {resume.interviewStatus && (
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getInterviewStatusColor(resume.interviewStatus)}`}
                    >
                      {t(`resumes.status_${resume.interviewStatus}`)}
                    </span>
                  </div>
                )}

                {/* Keywords Tags - more compact, no label */}
                {resume.keywords && resume.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {resume.keywords.slice(0, MAX_VISIBLE_KEYWORDS).map((keyword, index) => (
                      <span
                        key={index}
                        className="px-1.5 py-0.5 bg-primary/5 text-primary/80 text-[10px] rounded-full border border-primary/10"
                      >
                        {keyword}
                      </span>
                    ))}
                    {resume.keywords.length > MAX_VISIBLE_KEYWORDS && (
                      <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full">
                        +{resume.keywords.length - MAX_VISIBLE_KEYWORDS}
                      </span>
                    )}
                  </div>
                )}

                {/* Last Modified Date - inline with delete */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {resume.lastModified
                      ? new Date(resume.lastModified).toLocaleDateString()
                      : t('resumes.unknown_date')}
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                    onClick={(e: React.MouseEvent): void => {
                      handleDelete(e, resume.filename)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
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
