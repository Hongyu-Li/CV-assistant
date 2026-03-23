import { describe, it, expect } from 'vitest'
import { markdownToHtml } from './markdown'

describe('markdownToHtml', () => {
  it('returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('', 'display')).toBe('')
    expect(markdownToHtml('', 'pdf')).toBe('')
  })

  describe('HTML escaping', () => {
    it('escapes ampersands, angle brackets', () => {
      const result = markdownToHtml('a & b < c > d', 'pdf')
      expect(result).toContain('&amp;')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
      expect(result).not.toContain('< c')
    })
  })

  describe('headers', () => {
    it('renders h1 in display mode with Tailwind classes', () => {
      const result = markdownToHtml('# Hello', 'display')
      expect(result).toContain('<h1')
      expect(result).toContain('class=')
      expect(result).toContain('Hello')
    })

    it('renders h1 in pdf mode with inline styles', () => {
      const result = markdownToHtml('# Hello', 'pdf')
      expect(result).toContain('<h1')
      expect(result).toContain('style=')
      expect(result).toContain('Hello')
    })

    it('renders h2 through h6', () => {
      expect(markdownToHtml('## H2', 'display')).toContain('<h2')
      expect(markdownToHtml('### H3', 'display')).toContain('<h3')
      expect(markdownToHtml('#### H4', 'pdf')).toContain('<h4')
      expect(markdownToHtml('##### H5', 'pdf')).toContain('<h5')
      expect(markdownToHtml('###### H6', 'pdf')).toContain('<h6')
    })

    it('does not confuse h6 with h1 (order correctness)', () => {
      const result = markdownToHtml('###### Tiny', 'pdf')
      expect(result).toContain('<h6')
      expect(result).not.toContain('<h1')
    })
  })

  describe('bold and italic', () => {
    it('renders bold text', () => {
      const result = markdownToHtml('**bold**', 'display')
      expect(result).toContain('<strong')
      expect(result).toContain('bold')
    })

    it('renders italic text', () => {
      const result = markdownToHtml('*italic*', 'display')
      expect(result).toContain('<em>')
      expect(result).toContain('italic')
    })

    it('renders bold+italic text', () => {
      const result = markdownToHtml('***both***', 'display')
      expect(result).toContain('<strong><em>both</em></strong>')
    })
  })

  describe('inline code', () => {
    it('renders inline code in display mode', () => {
      const result = markdownToHtml('use `const`', 'display')
      expect(result).toContain('<code')
      expect(result).toContain('const')
      expect(result).toContain('class=')
    })

    it('renders inline code in pdf mode', () => {
      const result = markdownToHtml('use `const`', 'pdf')
      expect(result).toContain('<code')
      expect(result).toContain('style=')
    })
  })

  describe('code blocks', () => {
    it('renders fenced code blocks in display mode', () => {
      const result = markdownToHtml('```\nconst x = 1\n```', 'display')
      expect(result).toContain('<pre')
      expect(result).toContain('const x = 1')
      expect(result).toContain('class=')
    })

    it('renders fenced code blocks in pdf mode', () => {
      const result = markdownToHtml('```\nconst x = 1\n```', 'pdf')
      expect(result).toContain('<pre')
      expect(result).toContain('style=')
    })
  })

  describe('links — XSS prevention', () => {
    it('renders https links', () => {
      const result = markdownToHtml('[click](https://example.com)', 'display')
      expect(result).toContain('<a')
      expect(result).toContain('href="https://example.com"')
      expect(result).toContain('click')
    })

    it('renders http links', () => {
      const result = markdownToHtml('[click](http://example.com)', 'pdf')
      expect(result).toContain('<a')
      expect(result).toContain('href="http://example.com"')
    })

    it('renders mailto links', () => {
      const result = markdownToHtml('[email](mailto:a@b.com)', 'display')
      expect(result).toContain('<a')
      expect(result).toContain('href="mailto:a@b.com"')
    })

    it('blocks javascript: protocol (XSS)', () => {
      const result = markdownToHtml('[xss](javascript:alert(1))', 'display')
      expect(result).not.toContain('<a')
      expect(result).not.toContain('javascript:')
      expect(result).toContain('xss')
    })

    it('blocks JavaScript: protocol case-insensitive', () => {
      const result = markdownToHtml('[xss](JavaScript:alert(1))', 'display')
      expect(result).not.toContain('<a')
      expect(result).toContain('xss')
    })

    it('blocks data: protocol', () => {
      const result = markdownToHtml('[xss](data:text/html,<script>)', 'display')
      expect(result).not.toContain('<a')
      expect(result).toContain('xss')
    })

    it('blocks vbscript: protocol', () => {
      const result = markdownToHtml('[xss](vbscript:MsgBox)', 'display')
      expect(result).not.toContain('<a')
      expect(result).toContain('xss')
    })

    it('blocks empty/relative URLs (no scheme)', () => {
      const result = markdownToHtml('[link](foo/bar)', 'display')
      expect(result).not.toContain('<a')
      expect(result).toContain('link')
    })
  })

  describe('blockquotes', () => {
    it('renders blockquotes in display mode', () => {
      const result = markdownToHtml('> quote', 'display')
      expect(result).toContain('<blockquote')
      expect(result).toContain('class=')
      expect(result).toContain('quote')
    })

    it('renders blockquotes in pdf mode', () => {
      const result = markdownToHtml('> quote', 'pdf')
      expect(result).toContain('<blockquote')
      expect(result).toContain('style=')
    })
  })

  describe('horizontal rules', () => {
    it('renders hr in display mode', () => {
      const result = markdownToHtml('---', 'display')
      expect(result).toContain('<hr')
    })

    it('renders hr in pdf mode', () => {
      const result = markdownToHtml('---', 'pdf')
      expect(result).toContain('<hr')
      expect(result).toContain('style=')
    })
  })

  describe('lists', () => {
    it('renders unordered lists in display mode', () => {
      const result = markdownToHtml('- item one\n- item two', 'display')
      expect(result).toContain('<li')
      expect(result).toContain('item one')
      expect(result).toContain('item two')
    })

    it('renders ordered lists in pdf mode', () => {
      const result = markdownToHtml('1. first\n2. second', 'pdf')
      expect(result).toContain('<li')
      expect(result).toContain('first')
    })
  })

  describe('default mode', () => {
    it('defaults to display mode when no mode specified', () => {
      const explicit = markdownToHtml('# Test', 'display')
      const defaultMode = markdownToHtml('# Test')
      expect(defaultMode).toBe(explicit)
    })
  })

  describe('both modes handle same markdown patterns', () => {
    const patterns = [
      '# Heading',
      '**bold**',
      '*italic*',
      '`code`',
      '```\nblock\n```',
      '[link](https://example.com)',
      '> quote',
      '---',
      '- item',
      '1. item'
    ]

    for (const pattern of patterns) {
      it(`both modes produce output for: ${pattern.replace(/\n/g, '\\n')}`, () => {
        const displayResult = markdownToHtml(pattern, 'display')
        const pdfResult = markdownToHtml(pattern, 'pdf')
        expect(displayResult.length).toBeGreaterThan(0)
        expect(pdfResult.length).toBeGreaterThan(0)
      })
    }
  })
})
