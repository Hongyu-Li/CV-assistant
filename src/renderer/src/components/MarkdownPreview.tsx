import React from 'react'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({
  content,
  className = ''
}: MarkdownPreviewProps): React.JSX.Element {
  // Convert markdown to HTML
  const markdownToHtml = (md: string): string => {
    if (!md) return ''

    return (
      md
        // Escape HTML first
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        // Headers
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>')
        // Bold and Italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Code inline
        .replace(
          /`([^`]+)`/g,
          '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-slate-200">$1</code>'
        )
        // Code blocks
        .replace(/```[\s\S]*?```/g, (match) => {
          const code = match.slice(3, -3).trim()
          return `<pre class="bg-slate-800 p-3 rounded-lg overflow-x-auto my-3"><code class="text-sm font-mono text-slate-200">${code}</code></pre>`
        })
        // Lists - unordered
        .replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
        // Wrap list items in ul
        .replace(/(<li[^>]*>.*<\/li>)(?![\s\S]*<li)/g, '<ul class="list-disc my-2">$1</ul>')
        // Fix consecutive list items
        .replace(/<\/ul>\s*<ul[^>]*>/g, '')
        // Ordered lists
        .replace(/^\s*\d+\.\s+(.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
        .replace(/(<li[^>]*>.*<\/li>)(?![\s\S]*<li)/g, '<ol class="list-decimal my-2">$1</ol>')
        .replace(/<\/ol>\s*<ol[^>]*>/g, '')
        // Links
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" class="text-blue-400 hover:underline" target="_blank" rel="noopener">$1</a>'
        )
        // Blockquotes
        .replace(
          /^>\s*(.*$)/gim,
          '<blockquote class="border-l-4 border-slate-600 pl-4 italic my-3 text-slate-400">$1</blockquote>'
        )
        // Horizontal rules
        .replace(/^---$/gim, '<hr class="border-slate-700 my-4" />')
        // Paragraphs - wrap text lines
        .replace(/^(?!<[a-z])(.*$)/gim, (match) => {
          if (match.trim()) {
            return `<p class="mb-2 leading-relaxed">${match}</p>`
          }
          return match
        })
        // Remove empty paragraphs
        .replace(/<p class="mb-2 leading-relaxed"><\/p>/g, '')
        // Line breaks within paragraphs
        .replace(/<\/p>\s*<p class="mb-2 leading-relaxed">/g, '<br/>')
    )
  }

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
    />
  )
}
