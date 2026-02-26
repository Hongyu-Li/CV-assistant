import { useState } from 'react'
import { Copy, Download, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useSettings } from '../context/SettingsContext'
import { getAIProvider } from '../lib/ai'
import { toast } from 'sonner'

export function Generator(): React.JSX.Element {
  const { settings } = useSettings()
  const [jobDescription, setJobDescription] = useState('')
  const [generatedCV, setGeneratedCV] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const handleGenerate = async (): Promise<void> => {
    if (!jobDescription.trim()) {
      toast.error('Please enter a job description')
      return
    }

    setIsGenerating(true)
    setGeneratedCV('')

    try {
      const provider = getAIProvider(settings)
      // Mock profile data for now as we don't have a profile context yet
      const profile = 'Mock Profile Data'

      const apiKey =
        settings.provider === 'openai'
          ? settings.openAiApiKey
          : settings.provider === 'anthropic'
            ? settings.claudeApiKey
            : settings.provider === 'deepseek'
              ? settings.deepSeekApiKey
              : ''

      const stream = provider.generateCV({
        profile,
        jobDescription,
        apiKey
      })

      for await (const chunk of stream) {
        setGeneratedCV((prev) => prev + chunk)
      }

      toast.success('CV Generated Successfully!')
    } catch (error) {
      console.error('Generation failed:', error)
      toast.error('Failed to generate CV. Please check your settings.')
    } finally {
      setIsGenerating(false)
    }
  }
  const handleCopy = async (): Promise<void> => {
    if (!generatedCV) return
    await navigator.clipboard.writeText(generatedCV)
    setIsCopied(true)
    toast.success('Copied to clipboard')
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
    toast.success('CV exported successfully')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Left Pane: Job Description */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Job Description</CardTitle>
          <CardDescription>Paste the job description here.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4">
          <Textarea
            placeholder="Paste job description..."
            className="flex-1 resize-none font-mono text-sm"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate CV'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Right Pane: Generated CV */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <div className="flex flex-row items-center justify-between">
            <CardTitle>Generated CV</CardTitle>
            {generatedCV && (
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy to Clipboard">
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDownload}
                  title="Export to Markdown"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <CardDescription>Your AI-tailored CV will appear here.</CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 p-4 rounded-md border bg-muted/50 overflow-auto whitespace-pre-wrap font-mono text-sm">
            {generatedCV || (
              <span className="text-muted-foreground italic">Waiting for generation...</span>
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
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to Clipboard
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
              Download Markdown
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
