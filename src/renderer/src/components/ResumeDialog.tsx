import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Copy,
  Check,
  Download,
  Loader2,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  FileText
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from './ui/dialog'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { MarkdownEditor } from './MarkdownEditor'
import { Button } from './ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from './ui/select'
import { useSettings } from '../context/SettingsContext'
import { generateCV, extractKeywordsFromJD } from '../lib/provider'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

export type InterviewStatus =
  | 'resume_sent'
  | 'first_interview'
  | 'second_interview'
  | 'third_interview'
  | 'fourth_interview'
  | 'fifth_interview'
  | 'hr_interview'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'interview_failed'

export interface InterviewRound {
  id: string
  round: 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'hr'
  date: string
  notes: string
  result: 'pending' | 'passed' | 'failed'
}

export interface CV {
  id: string
  filename: string
  jobTitle?: string
  experienceLevel?: string
  companyName?: string
  targetSalary?: string
  notes?: string
  jobDescription?: string
  generatedCV?: string
  cvLanguage?: string
  createdAt?: string
  lastModified?: string
  status?: string
  interviewStatus?: InterviewStatus
  interviewRounds?: InterviewRound[]
  keywords?: string[]
  [key: string]: unknown
}

interface ResumeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resume?: CV | null
  onSaved: () => void
}

export function ResumeDialog({
  open,
  onOpenChange,
  resume,
  onSaved
}: ResumeDialogProps): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()

  const [jobTitle, setJobTitle] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [targetSalary, setTargetSalary] = useState('')
  const [notes, setNotes] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [generatedCV, setGeneratedCV] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [cvLanguage, setCvLanguage] = useState('en')
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>('resume_sent')
  const [interviewRounds, setInterviewRounds] = useState<InterviewRound[]>([])
  const [roundsExpanded, setRoundsExpanded] = useState(false)
  const [editingRound, setEditingRound] = useState<InterviewRound | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [cvExpanded, setCvExpanded] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      if (resume) {
        setJobTitle(resume.jobTitle ?? '')
        setExperienceLevel(resume.experienceLevel ?? '')
        setCompanyName(resume.companyName ?? '')
        setTargetSalary(resume.targetSalary ?? '')
        setNotes(resume.notes ?? '')
        setJobDescription(resume.jobDescription ?? '')
        setGeneratedCV(resume.generatedCV ?? '')
        setCvLanguage(resume.cvLanguage ?? 'en')
        setInterviewStatus(resume.interviewStatus ?? 'resume_sent')
        setInterviewRounds(resume.interviewRounds ?? [])
        setKeywords(resume.keywords ?? [])
        setRoundsExpanded(false)
        setEditingRound(null)
        setCvExpanded(!resume.generatedCV)
      } else {
        setJobTitle('')
        setExperienceLevel('')
        setCompanyName('')
        setTargetSalary('')
        setNotes('')
        setJobDescription('')
        setGeneratedCV('')
        setCvLanguage('en')
        setInterviewStatus('resume_sent')
        setInterviewRounds([])
        setKeywords([])
        setRoundsExpanded(false)
        setEditingRound(null)
        setCvExpanded(true)
      }
      setIsGenerating(false)
      setIsCopied(false)
    }
  }, [resume, open])

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [exportMenuOpen])

  const handleGenerate = async (): Promise<void> => {
    if (!jobDescription.trim()) {
      toast.error(t('resumes.empty_jd'))
      return
    }
    setIsGenerating(true)
    try {
      // Load real profile data
      const profileData = await window.electron.ipcRenderer.invoke(
        'profile:load',
        settings.workspacePath
      )

      // Format profile as readable text for the AI prompt
      let profileText = ''
      if (profileData?.personalInfo) {
        const pi = profileData.personalInfo
        if (pi.name) profileText += `Name: ${pi.name}\n`
        if (pi.email) profileText += `Email: ${pi.email}\n`
        if (pi.phone) profileText += `Phone: ${pi.phone}\n`
        if (pi.summary) profileText += `\nSummary:\n${pi.summary}\n`
      }
      if (profileData?.education?.length > 0) {
        profileText += '\nEducation:\n'
        for (const edu of profileData.education) {
          profileText += `- ${edu.degree} at ${edu.school} (${edu.date})\n`
          if (edu.description) profileText += `  ${edu.description}\n`
        }
      }
      if (profileData?.workExperience?.length > 0) {
        profileText += '\nWork Experience:\n'
        for (const exp of profileData.workExperience) {
          profileText += `- ${exp.role} at ${exp.company} (${exp.date})\n`
          if (exp.description) profileText += `  ${exp.description}\n`
        }
      }
      if (profileData?.projects?.length > 0) {
        profileText += '\nProjects:\n'
        for (const proj of profileData.projects) {
          profileText += `- ${proj.name} [${proj.techStack}]\n`
          if (proj.description) profileText += `  ${proj.description}\n`
        }
      }

      if (!profileText.trim()) {
        profileText = 'No profile data available. Generate a generic professional CV.'
      }

      // Extract keywords and generate CV in parallel
      const [cvResult, extractedKeywords] = await Promise.all([
        generateCV({
          profile: profileText,
          jobDescription,
          provider: settings.provider,
          apiKey: settings.apiKeys?.[settings.provider] || '',
          model: settings.model,
          baseUrl: settings.baseUrl,
          language: cvLanguage
        }),
        extractKeywordsFromJD({
          jobDescription,
          provider: settings.provider,
          apiKey: settings.apiKeys?.[settings.provider] || '',
          model: settings.model,
          baseUrl: settings.baseUrl
        })
      ])
      setGeneratedCV(cvResult)
      setKeywords(extractedKeywords)
      toast.success(t('resumes.generate_success'))
    } catch (error) {
      console.error('Generation failed:', error)
      const message = error instanceof Error ? error.message : ''
      if (message) {
        toast.error(`${t('resumes.generate_error')}\n${message}`)
      } else {
        toast.error(t('resumes.generate_error'))
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Derive interview status from rounds
  const deriveInterviewStatus = (rounds: InterviewRound[]): InterviewStatus => {
    if (rounds.length === 0) return 'resume_sent'

    // Sort by date
    const sortedRounds = [...rounds].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    // Find the latest round with a result
    const latestRound = sortedRounds[sortedRounds.length - 1]

    // If latest round failed, interview failed
    if (latestRound.result === 'failed') {
      return 'interview_failed'
    }

    // Map round type to status
    const roundToStatus: Record<string, InterviewStatus> = {
      first: 'first_interview',
      second: 'second_interview',
      third: 'third_interview',
      fourth: 'fourth_interview',
      fifth: 'fifth_interview',
      hr: 'hr_interview'
    }

    return roundToStatus[latestRound.round] || 'resume_sent'
  }

  const handleCopy = async (): Promise<void> => {
    if (!generatedCV) return
    try {
      await navigator.clipboard.writeText(generatedCV)
      setIsCopied(true)
      toast.success(t('resumes.copied'))
      setTimeout((): void => {
        setIsCopied(false)
      }, 2000)
    } catch {
      toast.error(t('resumes.copy_error'))
    }
  }

  const handleExportMarkdown = (): void => {
    if (!generatedCV) return
    const blob = new Blob([generatedCV], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${jobTitle || t('resumes.default_filename')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('resumes.exported'))
  }

  const markdownToHtml = (md: string): string => {
    if (!md) return ''

    return md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(
        /^###### (.*$)/gim,
        '<h6 style="font-size:12px;font-weight:600;margin:8px 0 4px;">$1</h6>'
      )
      .replace(
        /^##### (.*$)/gim,
        '<h5 style="font-size:13px;font-weight:600;margin:10px 0 4px;">$1</h5>'
      )
      .replace(
        /^#### (.*$)/gim,
        '<h4 style="font-size:14px;font-weight:600;margin:12px 0 4px;">$1</h4>'
      )
      .replace(
        /^### (.*$)/gim,
        '<h3 style="font-size:16px;font-weight:600;margin:14px 0 6px;">$1</h3>'
      )
      .replace(
        /^## (.*$)/gim,
        '<h2 style="font-size:18px;font-weight:700;margin:16px 0 8px;">$1</h2>'
      )
      .replace(
        /^# (.*$)/gim,
        '<h1 style="font-size:22px;font-weight:700;margin:20px 0 10px;">$1</h1>'
      )
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(
        /`([^`]+)`/g,
        '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:13px;">$1</code>'
      )
      .replace(/```[\s\S]*?```/g, (match) => {
        const code = match.slice(3, -3).trim()
        return `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;margin:12px 0;"><code style="font-size:13px;font-family:monospace;">${code}</code></pre>`
      })
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" style="color:#2563eb;text-decoration:underline;">$1</a>'
      )
      .replace(
        /^>\s*(.*$)/gim,
        '<blockquote style="border-left:4px solid #d1d5db;padding-left:16px;font-style:italic;margin:12px 0;color:#6b7280;">$1</blockquote>'
      )
      .replace(/^---$/gim, '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />')
      .replace(/^\s*\d+\.\s+(.*$)/gim, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li style="margin-left:16px;margin-bottom:4px;">$1</li>')
      .replace(
        /(<li[^>]*>.*<\/li>)/g,
        '<ul style="margin:8px 0;padding-left:20px;list-style:disc;">$1</ul>'
      )
      .replace(/<\/ul>\s*<ul[^>]*>/g, '')
      .replace(/\n\n/g, '<div style="margin-bottom:8px;"></div>')
      .replace(/\n/g, '<br/>')
  }

  const handleExportPdf = async (): Promise<void> => {
    if (!generatedCV) return
    setIsExportingPdf(true)

    try {
      const container = document.createElement('div')
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto;">
          ${markdownToHtml(generatedCV)}
        </div>
      `
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      document.body.appendChild(container)

      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pdfWidth - margin * 2
      const pageContentHeight = pdfHeight - margin * 2

      const scale = contentWidth / canvas.width
      const pageCanvasHeight = Math.floor(pageContentHeight / scale)
      const totalPages = Math.ceil(canvas.height / pageCanvasHeight)

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) pdf.addPage()

        const srcY = page * pageCanvasHeight
        const srcH = Math.min(pageCanvasHeight, canvas.height - srcY)

        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = srcH
        const ctx = pageCanvas.getContext('2d')
        if (!ctx) continue
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH)

        const pageImgData = pageCanvas.toDataURL('image/png')
        const sliceHeight = srcH * scale
        pdf.addImage(pageImgData, 'PNG', margin, margin, contentWidth, sliceHeight)
      }

      const filename = jobTitle || t('resumes.default_filename')
      pdf.save(`${filename}.pdf`)
      document.body.removeChild(container)
      toast.success(t('resumes.exported'))
    } catch (error) {
      console.error('Failed to export PDF:', error)
      toast.error(t('resumes.export_error'))
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!jobTitle.trim()) {
      toast.error(t('resumes.validation_error'))
      return
    }
    try {
      const filename =
        resume?.filename ??
        `${jobTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.json`
      const data = {
        jobTitle,
        experienceLevel,
        companyName,
        targetSalary,
        notes,
        jobDescription,
        generatedCV,
        cvLanguage,
        createdAt: resume?.createdAt ?? new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: generatedCV ? 'generated' : 'draft',
        interviewStatus,
        interviewRounds,
        keywords
      }
      const result = await window.electron.ipcRenderer.invoke('cv:save', {
        filename,
        data,
        workspacePath: settings.workspacePath
      })
      if (result.success) {
        toast.success(t('resumes.save_success'))
        onSaved()
        onOpenChange(false)
      } else {
        toast.error(t('resumes.save_error'))
      }
    } catch {
      toast.error(t('resumes.save_error'))
    }
  }

  const isEditMode = !!resume

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t('resumes.edit_resume') : t('resumes.create_resume')}
          </DialogTitle>
          <DialogDescription>{t('resumes.description')}</DialogDescription>
        </DialogHeader>

        {/* Form fields - 2 column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('resumes.job_title')}</label>
            <Input
              placeholder={t('resumes.job_title_ph')}
              value={jobTitle}
              onChange={(e): void => setJobTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('resumes.exp_level')}</label>
            <Select value={experienceLevel} onValueChange={setExperienceLevel}>
              <SelectTrigger>
                <SelectValue placeholder={t('resumes.exp_level_ph')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="junior">{t('resumes.level_junior')}</SelectItem>
                <SelectItem value="mid">{t('resumes.level_mid')}</SelectItem>
                <SelectItem value="senior">{t('resumes.level_senior')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('resumes.company_name')}</label>
            <Input
              placeholder={t('resumes.company_name_ph')}
              value={companyName}
              onChange={(e): void => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('resumes.target_salary')}</label>
            <Input
              placeholder={t('resumes.target_salary_ph')}
              value={targetSalary}
              onChange={(e): void => setTargetSalary(e.target.value)}
            />
          </div>
        </div>

        {/* Job Description - Always visible */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('resumes.job_description')}</label>
          <Textarea
            placeholder={t('resumes.jd_placeholder')}
            value={jobDescription}
            onChange={(e): void => setJobDescription(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
        </div>

        {/* CV Language and Notes - Show directly when no CV, inside Generated CV section when CV exists */}
        {!generatedCV && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('resumes.cv_language')}</label>
              <Select value={cvLanguage} onValueChange={setCvLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder={t('resumes.cv_language_ph')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('resumes.lang_en')}</SelectItem>
                  <SelectItem value="zh">{t('resumes.lang_zh')}</SelectItem>
                  <SelectItem value="ja">{t('resumes.lang_ja')}</SelectItem>
                  <SelectItem value="ko">{t('resumes.lang_ko')}</SelectItem>
                  <SelectItem value="fr">{t('resumes.lang_fr')}</SelectItem>
                  <SelectItem value="de">{t('resumes.lang_de')}</SelectItem>
                  <SelectItem value="es">{t('resumes.lang_es')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('resumes.notes')}</label>
              <Textarea
                placeholder={t('resumes.notes_ph')}
                value={notes}
                onChange={(e): void => setNotes(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          </>
        )}

        {/* Keywords - Auto-extracted from JD */}
        {keywords.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('resumes.keywords')}</label>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-md"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Generated CV Section */}
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setCvExpanded(!cvExpanded)}
            className={`w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors ${cvExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
          >
            <span className="font-medium">{t('resumes.generated_cv')}</span>
            <div className="flex items-center gap-2">
              {/* Action buttons - only show when CV exists */}
              {generatedCV && (
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    title={t('resumes.copy')}
                    className="h-7 w-7"
                  >
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <div className="relative" ref={exportMenuRef}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExportMenuOpen(!exportMenuOpen)}
                      disabled={isExportingPdf}
                      title={t('common.download')}
                      className="h-7 w-7"
                    >
                      {isExportingPdf ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    {exportMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 z-50 w-max rounded-md border bg-popover p-1 shadow-md">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => {
                            handleExportMarkdown()
                            setExportMenuOpen(false)
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          {t('resumes.export_md')}
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                          onClick={() => {
                            handleExportPdf()
                            setExportMenuOpen(false)
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {t('resumes.export_pdf')}
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    title={t('resumes.generate_cv')}
                    className="h-7 w-7"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${cvExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>
          {cvExpanded && (
            <div className="p-4 space-y-4">
              {/* CV Language and Notes - shown when CV exists */}
              {generatedCV && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('resumes.cv_language')}</label>
                    <Select value={cvLanguage} onValueChange={setCvLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('resumes.cv_language_ph')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">{t('resumes.lang_en')}</SelectItem>
                        <SelectItem value="zh">{t('resumes.lang_zh')}</SelectItem>
                        <SelectItem value="ja">{t('resumes.lang_ja')}</SelectItem>
                        <SelectItem value="ko">{t('resumes.lang_ko')}</SelectItem>
                        <SelectItem value="fr">{t('resumes.lang_fr')}</SelectItem>
                        <SelectItem value="de">{t('resumes.lang_de')}</SelectItem>
                        <SelectItem value="es">{t('resumes.lang_es')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('resumes.notes')}</label>
                    <Textarea
                      placeholder={t('resumes.notes_ph')}
                      value={notes}
                      onChange={(e): void => setNotes(e.target.value)}
                      className="min-h-[60px]"
                    />
                  </div>
                </>
              )}

              {generatedCV ? (
                <MarkdownEditor
                  value={generatedCV}
                  onChange={setGeneratedCV}
                  minHeight="200px"
                  className="max-h-[400px] overflow-y-auto"
                />
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-sm text-muted-foreground">{t('resumes.generated_cv_desc')}</p>
                  <Button onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('resumes.generating')}
                      </>
                    ) : (
                      t('resumes.generate_cv')
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interview Status - Auto-updates based on rounds */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('resumes.interview_status')}</label>
          <Select
            value={interviewStatus}
            onValueChange={(value) => setInterviewStatus(value as InterviewStatus)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('resumes.interview_status_ph')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resume_sent">{t('resumes.status_resume_sent')}</SelectItem>
              <SelectItem value="first_interview">{t('resumes.status_first_interview')}</SelectItem>
              <SelectItem value="second_interview">
                {t('resumes.status_second_interview')}
              </SelectItem>
              <SelectItem value="third_interview">{t('resumes.status_third_interview')}</SelectItem>
              <SelectItem value="fourth_interview">
                {t('resumes.status_fourth_interview')}
              </SelectItem>
              <SelectItem value="fifth_interview">{t('resumes.status_fifth_interview')}</SelectItem>
              <SelectItem value="hr_interview">{t('resumes.status_hr_interview')}</SelectItem>
              <SelectItem value="offer_accepted">{t('resumes.status_offer_accepted')}</SelectItem>
              <SelectItem value="offer_rejected">{t('resumes.status_offer_rejected')}</SelectItem>
              <SelectItem value="interview_failed">
                {t('resumes.status_interview_failed')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Interview Rounds */}
        <div className="border rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setRoundsExpanded(!roundsExpanded)}
            className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors"
          >
            <span className="font-medium">{t('resumes.interview_rounds')}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${roundsExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {roundsExpanded && (
            <div className="p-4 space-y-4">
              {interviewRounds.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('resumes.no_rounds')}
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-muted" />

                  {/* Timeline items */}
                  <div className="space-y-0">
                    {[...interviewRounds]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((round, index) => {
                        const dotColor =
                          round.result === 'passed'
                            ? 'bg-green-500 border-green-500'
                            : round.result === 'failed'
                              ? 'bg-red-500 border-red-500'
                              : 'bg-yellow-400 border-yellow-400'

                        return (
                          <div key={round.id} className="relative flex gap-4 pb-6">
                            {/* Timeline dot */}
                            <div className="relative z-10">
                              <div
                                className={`w-10 h-10 rounded-full border-4 border-background ${dotColor} flex items-center justify-center shadow-sm`}
                              >
                                <span className="text-xs font-bold text-white">{index + 1}</span>
                              </div>
                            </div>

                            {/* Content card */}
                            <div className="flex-1 -mt-1">
                              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h4 className="font-semibold text-sm">
                                      {t(`resumes.round_${round.round}`)}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(round.date).toLocaleDateString()} ·{' '}
                                      {new Date(round.date).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        round.result === 'passed'
                                          ? 'bg-green-100 text-green-700'
                                          : round.result === 'failed'
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {t(`resumes.result_${round.result}`)}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => setEditingRound(round)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => {
                                        const updatedRounds = interviewRounds.filter(
                                          (r) => r.id !== round.id
                                        )
                                        setInterviewRounds(updatedRounds)
                                        // Auto-update interview status based on remaining rounds
                                        setInterviewStatus(deriveInterviewStatus(updatedRounds))
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Interview Notes - Scrollable full content */}
                                {round.notes && (
                                  <div className="space-y-2 text-sm">
                                    <div className="bg-muted/50 rounded p-2">
                                      <p className="text-xs font-medium text-muted-foreground mb-1">
                                        {t('resumes.interview_notes')}
                                      </p>
                                      <div
                                        className="text-sm prose prose-sm dark:prose-invert max-w-none max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent"
                                        dangerouslySetInnerHTML={{
                                          __html: markdownToHtml(round.notes)
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() =>
                  setEditingRound({
                    id: crypto.randomUUID(),
                    round: 'first',
                    date: new Date().toISOString().split('T')[0],
                    notes: '',
                    result: 'pending'
                  })
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('resumes.add_round')}
              </Button>
            </div>
          )}
        </div>

        {/* Edit Round Dialog */}
        {editingRound && (
          <Dialog open={!!editingRound} onOpenChange={() => setEditingRound(null)}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('resumes.edit_round')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('resumes.round')}</label>
                    <Select
                      value={editingRound.round}
                      onValueChange={(value) =>
                        setEditingRound((prev) =>
                          prev ? { ...prev, round: value as InterviewRound['round'] } : null
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">{t('resumes.round_first')}</SelectItem>
                        <SelectItem value="second">{t('resumes.round_second')}</SelectItem>
                        <SelectItem value="third">{t('resumes.round_third')}</SelectItem>
                        <SelectItem value="fourth">{t('resumes.round_fourth')}</SelectItem>
                        <SelectItem value="fifth">{t('resumes.round_fifth')}</SelectItem>
                        <SelectItem value="hr">{t('resumes.round_hr')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('resumes.result')}</label>
                    <Select
                      value={editingRound.result}
                      onValueChange={(value) =>
                        setEditingRound((prev) =>
                          prev ? { ...prev, result: value as InterviewRound['result'] } : null
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('resumes.result_pending')}</SelectItem>
                        <SelectItem value="passed">{t('resumes.result_passed')}</SelectItem>
                        <SelectItem value="failed">{t('resumes.result_failed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('resumes.date')}</label>
                  <Input
                    type="date"
                    value={editingRound.date}
                    onChange={(e) =>
                      setEditingRound((prev) => (prev ? { ...prev, date: e.target.value } : null))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('resumes.interview_notes')}</label>
                  <MarkdownEditor
                    value={editingRound.notes}
                    onChange={(value) =>
                      setEditingRound((prev) => (prev ? { ...prev, notes: value } : null))
                    }
                    minHeight="150px"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingRound(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (editingRound) {
                      const updatedRounds = (() => {
                        const existing = interviewRounds.find((r) => r.id === editingRound.id)
                        if (existing) {
                          return interviewRounds.map((r) =>
                            r.id === editingRound.id ? editingRound : r
                          )
                        }
                        return [...interviewRounds, editingRound]
                      })()
                      setInterviewRounds(updatedRounds)
                      // Auto-update interview status based on rounds
                      setInterviewStatus(deriveInterviewStatus(updatedRounds))
                      setEditingRound(null)
                    }
                  }}
                >
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button variant="outline" onClick={(): void => onOpenChange(false)}>
            {t('resumes.cancel')}
          </Button>
          <Button onClick={handleSave}>{t('resumes.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
