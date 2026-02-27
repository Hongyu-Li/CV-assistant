import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Download, Loader2 } from 'lucide-react'
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
import { generateCV } from '../lib/provider'
import { toast } from 'sonner'

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
      } else {
        setJobTitle('')
        setExperienceLevel('')
        setCompanyName('')
        setTargetSalary('')
        setNotes('')
        setJobDescription('')
        setGeneratedCV('')
        setCvLanguage('en')
      }
      setIsGenerating(false)
      setIsCopied(false)
    }
  }, [resume, open])

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

      const result = await generateCV({
        profile: profileText,
        jobDescription,
        provider: settings.provider,
        apiKey: settings.apiKeys?.[settings.provider] || '',
        model: settings.model,
        baseUrl: settings.baseUrl,
        language: cvLanguage
      })
      setGeneratedCV(result)
      toast.success(t('resumes.generate_success'))
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error(t('resumes.generate_error'))
    } finally {
      setIsGenerating(false)
    }
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
      toast.error(t('resumes.copy_error') || 'Failed to copy to clipboard')
    }
  }

  const handleExport = (): void => {
    if (!generatedCV) return
    const blob = new Blob([generatedCV], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${jobTitle || 'resume'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('resumes.exported'))
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
        status: generatedCV ? 'generated' : 'draft'
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

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('resumes.notes')}</label>
          <Textarea
            placeholder={t('resumes.notes_ph')}
            value={notes}
            onChange={(e): void => setNotes(e.target.value)}
            className="min-h-[60px]"
          />
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('resumes.job_description')}</label>
          <Textarea
            placeholder={t('resumes.jd_placeholder')}
            value={jobDescription}
            onChange={(e): void => setJobDescription(e.target.value)}
            className="min-h-[120px] font-mono text-sm"
          />
        </div>

        {/* Generate button */}
        <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('resumes.generating')}
            </>
          ) : (
            t('resumes.generate_cv')
          )}
        </Button>

        {/* Generated CV output */}
        {generatedCV && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">{t('resumes.generated_cv')}</label>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy} title={t('resumes.copy')}>
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExport}
                  title={t('resumes.export_md')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <MarkdownEditor
              value={generatedCV}
              onChange={setGeneratedCV}
              minHeight="200px"
              className="max-h-[400px] overflow-y-auto"
            />
          </div>
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
