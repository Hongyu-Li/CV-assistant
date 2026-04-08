import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, Download, Loader2, ChevronDown, RotateCcw, FileText } from 'lucide-react'
import { markdownToHtml } from '../../lib/markdown'
import { COPY_FEEDBACK_DURATION_MS } from '../../lib/constants'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { MarkdownEditor } from '../MarkdownEditor'
import { CvLanguageSelect } from './CvLanguageSelect'
import { useSettings } from '../../context/SettingsContext'
import { generateCV, extractKeywordsFromJD } from '../../lib/provider'
import { toast } from 'sonner'
import jsPDF from 'jspdf'

interface CvSectionProps {
  jobTitle: string
  jobDescription: string
  generatedCV: string
  onGeneratedCVChange: (value: string) => void
  cvLanguage: string
  onCvLanguageChange: (value: string) => void
  notes: string
  onNotesChange: (value: string) => void
  keywords: string[]
  onKeywordsChange: (value: string[]) => void
  isGenerating: boolean
  onIsGeneratingChange: (value: boolean) => void
}

export function CvSection({
  jobTitle,
  jobDescription,
  generatedCV,
  onGeneratedCVChange,
  cvLanguage,
  onCvLanguageChange,
  notes,
  onNotesChange,
  keywords,
  onKeywordsChange,
  isGenerating,
  onIsGeneratingChange
}: CvSectionProps): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()

  const [isCopied, setIsCopied] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [cvExpanded, setCvExpanded] = useState(!generatedCV)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setExportMenuOpen(false)
      }
    }
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return (): void => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [exportMenuOpen])

  const handleGenerate = async (): Promise<void> => {
    if (!jobDescription.trim()) {
      toast.error(t('resumes.empty_jd'))
      return
    }
    onIsGeneratingChange(true)
    try {
      const profileData = await window.electron.ipcRenderer.invoke(
        'profile:load',
        settings.workspacePath
      )

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
      onGeneratedCVChange(cvResult)
      onKeywordsChange(extractedKeywords)
      toast.success(t('resumes.generate_success'))
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message) {
        toast.error(`${t('resumes.generate_error')}\n${message}`)
      } else {
        toast.error(t('resumes.generate_error'))
      }
    } finally {
      onIsGeneratingChange(false)
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
      }, COPY_FEEDBACK_DURATION_MS)
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

  const handleExportPdf = async (): Promise<void> => {
    if (!generatedCV) return
    setIsExportingPdf(true)

    try {
      const container = document.createElement('div')
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto;">
          ${markdownToHtml(generatedCV, 'pdf')}
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
    } catch {
      toast.error(t('resumes.export_error'))
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <>
      {!generatedCV && (
        <>
          <div className="space-y-2">
            <label htmlFor="cv-language" className="text-sm font-medium">
              {t('resumes.cv_language')}
            </label>
            <CvLanguageSelect
              id="cv-language"
              value={cvLanguage}
              onValueChange={onCvLanguageChange}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="cv-notes" className="text-sm font-medium">
              {t('resumes.notes')}
            </label>
            <Textarea
              id="cv-notes"
              placeholder={t('resumes.notes_ph')}
              value={notes}
              onChange={(e): void => onNotesChange(e.target.value)}
              className="min-h-[60px]"
            />
          </div>
        </>
      )}

      {keywords.length > 0 && (
        <div className="space-y-2">
          <label id="cv-keywords-label" className="text-sm font-medium">
            {t('resumes.keywords')}
          </label>
          <div className="flex flex-wrap gap-2" role="list" aria-labelledby="cv-keywords-label">
            {keywords.map((keyword, index) => (
              <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-md">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setCvExpanded(!cvExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              setCvExpanded(!cvExpanded)
            }
          }}
          className={`w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${cvExpanded ? 'rounded-t-lg' : 'rounded-lg'}`}
        >
          <span className="font-medium">{t('resumes.generated_cv')}</span>
          <div className="flex items-center gap-2">
            {generatedCV && (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  aria-label={t('resumes.copy')}
                  className="h-9 w-9"
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <div className="relative" ref={exportMenuRef}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setExportMenuOpen(!exportMenuOpen)}
                    disabled={isExportingPdf}
                    aria-label={t('common.download')}
                    className="h-9 w-9"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-max rounded-md border bg-popover p-1 shadow-deep-dramatic">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none transition-colors"
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
                        className="flex w-full items-center gap-2 whitespace-nowrap rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none transition-colors"
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
                  aria-label={t('resumes.generate_cv')}
                  className="h-9 w-9"
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
        </div>
        {cvExpanded && (
          <div className="p-4 space-y-4">
            {generatedCV && (
              <>
                <div className="space-y-2">
                  <label htmlFor="cv-language-gen" className="text-sm font-medium">
                    {t('resumes.cv_language')}
                  </label>
                  <CvLanguageSelect
                    id="cv-language-gen"
                    value={cvLanguage}
                    onValueChange={onCvLanguageChange}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="cv-notes-gen" className="text-sm font-medium">
                    {t('resumes.notes')}
                  </label>
                  <Textarea
                    id="cv-notes-gen"
                    placeholder={t('resumes.notes_ph')}
                    value={notes}
                    onChange={(e): void => onNotesChange(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              </>
            )}

            {generatedCV ? (
              <MarkdownEditor
                value={generatedCV}
                onChange={onGeneratedCVChange}
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
    </>
  )
}
