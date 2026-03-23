import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Button } from '../ui/button'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select'
import { useSettings } from '../../context/SettingsContext'
import { toast } from 'sonner'
import { CvSection } from './CvSection'
import { InterviewTimeline } from './InterviewTimeline'
import type { InterviewStatus, InterviewRound, ResumeDialogProps } from './types'

/**
 * Inner form component that resets state via React key-based remounting.
 * The parent Dialog passes a `key` derived from resume id + open state,
 * so this component remounts with fresh initial state each time.
 */
function ResumeDialogForm({
  open,
  onOpenChange,
  resume,
  onSaved
}: ResumeDialogProps): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()

  const [jobTitle, setJobTitle] = useState(resume?.jobTitle ?? '')
  const [experienceLevel, setExperienceLevel] = useState(resume?.experienceLevel ?? '')
  const [companyName, setCompanyName] = useState(resume?.companyName ?? '')
  const [targetSalary, setTargetSalary] = useState(resume?.targetSalary ?? '')
  const [notes, setNotes] = useState(resume?.notes ?? '')
  const [jobDescription, setJobDescription] = useState(resume?.jobDescription ?? '')
  const [generatedCV, setGeneratedCV] = useState(resume?.generatedCV ?? '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [cvLanguage, setCvLanguage] = useState(resume?.cvLanguage ?? 'en')
  const [interviewStatus, setInterviewStatus] = useState<InterviewStatus>(
    resume?.interviewStatus ?? 'resume_sent'
  )
  const [interviewRounds, setInterviewRounds] = useState<InterviewRound[]>(
    resume?.interviewRounds ?? []
  )
  const [keywords, setKeywords] = useState<string[]>(resume?.keywords ?? [])

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

        {/* CV Section (language select, notes, keywords, generated CV) */}
        <CvSection
          jobTitle={jobTitle}
          jobDescription={jobDescription}
          generatedCV={generatedCV}
          onGeneratedCVChange={setGeneratedCV}
          cvLanguage={cvLanguage}
          onCvLanguageChange={setCvLanguage}
          notes={notes}
          onNotesChange={setNotes}
          keywords={keywords}
          onKeywordsChange={setKeywords}
          isGenerating={isGenerating}
          onIsGeneratingChange={setIsGenerating}
        />

        {/* Interview Status */}
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

        {/* Interview Rounds Timeline */}
        <InterviewTimeline
          interviewRounds={interviewRounds}
          onInterviewRoundsChange={setInterviewRounds}
          onInterviewStatusChange={setInterviewStatus}
        />

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

export function ResumeDialog(props: ResumeDialogProps): React.JSX.Element {
  const key = props.open ? (props.resume?.id ?? 'new') : 'closed'
  return <ResumeDialogForm key={key} {...props} />
}
