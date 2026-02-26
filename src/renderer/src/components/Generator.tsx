import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Download, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useSettings } from '../context/SettingsContext'
import { getAgent } from '../lib/agent'
import { toast } from 'sonner'

export function Generator(): React.JSX.Element {
  const { settings } = useSettings()
  const { t } = useTranslation()
  const [jobDescription, setJobDescription] = useState('')
  const [generatedCV, setGeneratedCV] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleGenerate = async (): Promise<void> => {
    if (!jobDescription.trim()) {
      toast.error(t('generator.empty_jd'))
      return
    }

    setIsGenerating(true)
    setGeneratedCV('')

    try {
      const agent = getAgent(settings)
      // Mock profile data for now as we don't have a profile context yet
      const profile = 'Mock Profile Data'

      const stream = agent.generateCV({
        profile,
        jobDescription
      })

      for await (const chunk of stream) {
        setGeneratedCV((prev) => prev + chunk)
      }

      toast.success(t('generator.generate_success'))
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error(t('generator.generate_error'))
    } finally {
      setIsGenerating(false)
    }
  }
  const handleCopy = async (): Promise<void> => {
    if (!generatedCV) return
    await navigator.clipboard.writeText(generatedCV)
    setIsCopied(true)
    toast.success(t('generator.copied'))
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleDownload = (): void => {
    if (!generatedCV) return
    const blob = new Blob([generatedCV], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-cv.md'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(t('generator.exported'))
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Pane: Job Description */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>{t('generator.job_description')}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <Textarea
            placeholder={t('generator.jd_placeholder')}
            className="flex-1 resize-none font-mono text-sm"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('generator.generating_text')}
              </>
            ) : (
              t('generator.generate')
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right Pane: Generated CV */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>{t('generator.generated_cv')}</CardTitle>
            {generatedCV && (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  title={t('generator.copy')}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  title={t('generator.export')}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <CardDescription>{t('generator.cv_desc')}</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 p-4 rounded-md border bg-muted/50 overflow-auto whitespace-pre-wrap font-mono text-sm">
            {generatedCV || (
              <span className="text-muted-foreground italic">{t('generator.waiting')}</span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCopy}
              disabled={!generatedCV}
            >
              {isCopied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {t('generator.copied_text')}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  {t('generator.copy')}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              disabled={!generatedCV}
              onClick={handleDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              {t('generator.export')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
