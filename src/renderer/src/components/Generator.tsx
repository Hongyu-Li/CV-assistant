import React, { useState } from 'react'
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
            {isGenerating ? 'Generating...' : 'Generate CV'}
          </Button>
        </CardContent>
      </Card>

      {/* Right Pane: Generated CV */}
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle>Generated CV</CardTitle>
          <CardDescription>Your AI-tailored CV will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="flex-1 p-4 rounded-md border bg-muted/50 overflow-auto whitespace-pre-wrap font-mono text-sm">
            {generatedCV || (
              <span className="text-muted-foreground italic">Waiting for generation...</span>
            )}
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                navigator.clipboard.writeText(generatedCV)
                toast.success('Copied to clipboard')
              }}
              disabled={!generatedCV}
            >
              Copy to Clipboard
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!generatedCV}
              onClick={() => toast.info('Download functionality coming soon')}
            >
              Download Markdown
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
