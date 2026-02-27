import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

// Mock tiptap modules since jsdom doesn't support contenteditable well
vi.mock('@tiptap/react', () => {
  const mockEditor = {
    getMarkdown: vi.fn(() => '# Hello'),
    commands: { setContent: vi.fn() },
    isDestroyed: false,
    on: vi.fn(),
    off: vi.fn()
  }
  return {
    useEditor: vi.fn(() => mockEditor),
    EditorContent: vi.fn(({ editor }: { editor: unknown }) => (
      <div data-testid="editor-content">{editor ? 'Editor loaded' : 'No editor'}</div>
    ))
  }
})

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn() }
}))

vi.mock('@tiptap/markdown', () => ({
  Markdown: { configure: vi.fn() }
}))

describe('MarkdownEditor Component', () => {
  it('renders the editor', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('renders with a label when provided', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} label="Summary" />)
    expect(screen.getByText('Summary')).toBeInTheDocument()
  })

  it('renders with placeholder when provided', () => {
    render(<MarkdownEditor value="" onChange={vi.fn()} placeholder="Enter text..." />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <MarkdownEditor value="" onChange={vi.fn()} className="custom-class" />
    )
    expect(container.querySelector('.custom-class')).toBeInTheDocument()
  })
})
