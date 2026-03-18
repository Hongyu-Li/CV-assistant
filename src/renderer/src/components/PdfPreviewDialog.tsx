import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import jsPDF from 'jspdf'

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  markdown: string
  filename?: string
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  markdown,
  filename = 'resume'
}: PdfPreviewDialogProps): React.JSX.Element {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  // Convert markdown to HTML for preview
  const markdownToHtml = (md: string): string => {
    let html = md
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code
      .replace(
        /`([^`]+)`/g,
        '<code style="background: #f0f0f0; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>'
      )
      // Lists
      .replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/g, '<br/>')

    // Wrap consecutive list items in ul
    html = html.replace(
      /(<li>.*<\/li>)(<br\/>)?/g,
      '<ul style="margin: 8px 0; padding-left: 20px;">$1</ul>'
    )
    // Fix nested ul
    html = html.replace(/<\/ul><ul[^>]*>/g, '')

    return html
  }

  // Generate PDF preview
  const generatePreview = async (): Promise<void> => {
    if (!previewRef.current) return
    setIsGenerating(true)

    try {
      // Create a temporary container for PDF generation
      const container = document.createElement('div')
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto;">
          ${markdownToHtml(markdown)}
        </div>
      `
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.width = '800px'
      document.body.appendChild(container)

      // Use html2canvas-pro for better rendering
      const { default: html2canvas } = await import('html2canvas-pro')
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })

      // Convert canvas to data URL for preview
      const dataUrl = canvas.toDataURL('image/png')
      setPreviewUrl(dataUrl)

      document.body.removeChild(container)
    } catch (error) {
      console.error('Failed to generate PDF preview:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate and download PDF
  const handleDownload = async (): Promise<void> => {
    if (!previewRef.current) return
    setIsGenerating(true)

    try {
      const container = document.createElement('div')
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 40px; max-width: 800px; margin: 0 auto;">
          ${markdownToHtml(markdown)}
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

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      const ratio = (pdfWidth - 20) / imgWidth
      const imgY = 10

      const imgData = canvas.toDataURL('image/png')

      // Calculate how many pages needed
      const scaledHeight = (imgHeight * ratio * (pdfWidth - 20)) / (imgWidth * ratio)
      const pageHeight = pdfHeight - 20
      let heightLeft = scaledHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 10, imgY, pdfWidth - 20, scaledHeight)
      heightLeft -= pageHeight

      // Add more pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - scaledHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position + 10, pdfWidth - 20, scaledHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`${filename}.pdf`)
      document.body.removeChild(container)
    } catch (error) {
      console.error('Failed to generate PDF:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate preview when dialog opens
  useEffect(() => {
    if (open && markdown) {
      generatePreview()
    }
    return () => {
      setPreviewUrl(null)
    }
  }, [open, markdown])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>PDF Preview</DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={isGenerating || !previewUrl}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              {t('common.download')}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto bg-gray-100 rounded-lg p-4 min-h-[500px]">
          {isGenerating && !previewUrl ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : previewUrl ? (
            <div className="flex justify-center">
              <img
                src={previewUrl}
                alt="PDF Preview"
                className="max-w-full shadow-lg"
                style={{ maxHeight: '600px' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No content to preview
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
