// Security: only https:, http:, mailto: links are rendered; all others become plain text (XSS prevention).

const SAFE_URL_PATTERN = /^(?:https?:|mailto:)/i

function isSafeUrl(url: string): boolean {
  return SAFE_URL_PATTERN.test(url.trim())
}

interface StyleMap {
  h1: string
  h2: string
  h3: string
  h4: string
  h5: string
  h6: string
  bold: string
  inlineCode: string
  codeBlock: string
  codeBlockCode: string
  link: string
  blockquote: string
  hr: string
  listItem: string
  listWrapper: string
  paragraph: string
  emptyParagraph: string
  paragraphJoin: string
  lineBreak: string
}

const DISPLAY_STYLES: StyleMap = {
  h1: '<h1 class="text-2xl font-bold mt-4 mb-3">$1</h1>',
  h2: '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>',
  h3: '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>',
  h4: '<h4 class="text-base font-semibold mt-3 mb-1">$1</h4>',
  h5: '<h5 class="text-sm font-semibold mt-2 mb-1">$1</h5>',
  h6: '<h6 class="text-xs font-semibold mt-2 mb-1">$1</h6>',
  bold: '<strong class="font-semibold">$1</strong>',
  inlineCode:
    '<code class="bg-slate-800 px-1.5 py-0.5 rounded text-sm font-mono text-slate-200">$1</code>',
  codeBlock:
    '<pre class="bg-slate-800 p-3 rounded-lg overflow-x-auto my-3"><code class="text-sm font-mono text-slate-200">$CODE</code></pre>',
  codeBlockCode: '',
  link: '<a href="$URL" class="text-info hover:underline" target="_blank" rel="noopener">$TEXT</a>',
  blockquote:
    '<blockquote class="border-l-4 border-slate-600 pl-4 italic my-3 text-slate-400">$1</blockquote>',
  hr: '<hr class="border-slate-700 my-4" />',
  listItem: '<li class="ml-4 mb-1">$1</li>',
  listWrapper: '<ul class="list-disc my-2">$1</ul>',
  paragraph: '<p class="mb-2 leading-relaxed">$CONTENT</p>',
  emptyParagraph: '<p class="mb-2 leading-relaxed"></p>',
  paragraphJoin: '<br/>',
  lineBreak: '<br/>'
}

const PDF_STYLES: StyleMap = {
  h1: '<h1 style="font-size:22px;font-weight:700;margin:20px 0 10px;">$1</h1>',
  h2: '<h2 style="font-size:18px;font-weight:700;margin:16px 0 8px;">$1</h2>',
  h3: '<h3 style="font-size:16px;font-weight:600;margin:14px 0 6px;">$1</h3>',
  h4: '<h4 style="font-size:14px;font-weight:600;margin:12px 0 4px;">$1</h4>',
  h5: '<h5 style="font-size:13px;font-weight:600;margin:10px 0 4px;">$1</h5>',
  h6: '<h6 style="font-size:12px;font-weight:600;margin:8px 0 4px;">$1</h6>',
  bold: '<strong>$1</strong>',
  inlineCode:
    '<code style="background:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:13px;">$1</code>',
  codeBlock:
    '<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;margin:12px 0;"><code style="font-size:13px;font-family:monospace;">$CODE</code></pre>',
  codeBlockCode: '',
  link: '<a href="$URL" style="color:#2563eb;text-decoration:underline;">$TEXT</a>',
  blockquote:
    '<blockquote style="border-left:4px solid #d1d5db;padding-left:16px;font-style:italic;margin:12px 0;color:#6b7280;">$1</blockquote>',
  hr: '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />',
  listItem: '<li style="margin-left:16px;margin-bottom:4px;">$1</li>',
  listWrapper: '<ul style="margin:8px 0;padding-left:20px;list-style:disc;">$1</ul>',
  paragraph: '',
  emptyParagraph: '',
  paragraphJoin: '',
  lineBreak: '<br/>'
}

export function markdownToHtml(md: string, mode: 'display' | 'pdf' = 'display'): string {
  if (!md) return ''

  const s = mode === 'display' ? DISPLAY_STYLES : PDF_STYLES

  // Extract fenced code blocks before HTML escaping so backticks are preserved
  const codeBlocks: string[] = []
  const processed = md.replace(/```[\s\S]*?```/g, (match: string): string => {
    const code = match.slice(3, -3).trim()
    const index = codeBlocks.length
    codeBlocks.push(code)
    return `\u200BCODEBLOCK${index}\u200B`
  })

  let html = processed.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Headers: h6 → h1 order so shorter prefixes don't match first
  html = html
    .replace(/^###### (.*$)/gim, s.h6)
    .replace(/^##### (.*$)/gim, s.h5)
    .replace(/^#### (.*$)/gim, s.h4)
    .replace(/^### (.*$)/gim, s.h3)
    .replace(/^## (.*$)/gim, s.h2)
    .replace(/^# (.*$)/gim, s.h1)

  html = html
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, s.bold)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')

  html = html.replace(/`([^`]+)`/g, s.inlineCode)

  // Restore fenced code blocks with proper styling (content is HTML-escaped separately)
  html = html.replace(/\u200BCODEBLOCK(\d+)\u200B/g, (_match: string, idx: string): string => {
    const code = codeBlocks[parseInt(idx, 10)]
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return s.codeBlock.replace('$CODE', escaped)
  })

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match: string, text: string, url: string): string => {
      if (isSafeUrl(url)) {
        return s.link.replace('$URL', url).replace('$TEXT', text)
      }
      return text
    }
  )

  // Blockquotes: match escaped &gt; since HTML escaping already ran
  html = html.replace(/^&gt;\s*(.*$)/gim, s.blockquote)

  html = html.replace(/^---$/gim, s.hr)

  if (mode === 'display') {
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, s.listItem)
    html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ul class="list-disc my-2">$1</ul>')
    html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '')

    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, s.listItem)
    const ulBlocks: string[] = []
    html = html.replace(/<ul[^>]*>[\s\S]*?<\/ul>/g, (m: string): string => {
      ulBlocks.push(m)
      return `\u200BUL${ulBlocks.length - 1}\u200B`
    })
    html = html.replace(/((?:<li[^>]*>.*<\/li>\s*)+)/g, '<ol class="list-decimal my-2">$1</ol>')
    html = html.replace(/<\/ol>\s*<ol[^>]*>/g, '')
    html = html.replace(
      /\u200BUL(\d+)\u200B/g,
      (_: string, i: string): string => ulBlocks[parseInt(i, 10)]
    )
  } else {
    html = html.replace(/^\s*\d+\.\s+(.*$)/gim, s.listItem)
    html = html.replace(/^\s*[-*+]\s+(.*$)/gim, s.listItem)
    html = html.replace(/(<li[^>]*>.*<\/li>)/g, s.listWrapper)
    html = html.replace(/<\/ul>\s*<ul[^>]*>/g, '')
  }

  if (mode === 'display') {
    html = html.replace(/^(?!<[a-z])(.*$)/gim, (match: string): string => {
      if (match.trim()) {
        return `<p class="mb-2 leading-relaxed">${match}</p>`
      }
      return match
    })
    html = html.replace(/<p class="mb-2 leading-relaxed"><\/p>/g, '')
    html = html.replace(/<\/p>\s*<p class="mb-2 leading-relaxed">/g, '<br/>')
  } else {
    html = html.replace(/\n\n/g, '<div style="margin-bottom:8px;"></div>')
    html = html.replace(/\n/g, '<br/>')
  }

  return html
}
