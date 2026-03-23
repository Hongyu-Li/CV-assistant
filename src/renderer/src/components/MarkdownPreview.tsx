import React from 'react'
import { markdownToHtml } from '../lib/markdown'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({
  content,
  className = ''
}: MarkdownPreviewProps): React.JSX.Element {
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  )
}
