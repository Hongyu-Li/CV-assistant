import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MarkdownEditor } from './MarkdownEditor'

// Mock tiptap modules since jsdom doesn't support contenteditable well
type TiptapOnUpdateArg = { editor: { getMarkdown: () => string } }

type MockEditor = {
  getMarkdown: ReturnType<typeof vi.fn<() => string>>
  commands: {
    setContent: ReturnType<typeof vi.fn<(content: string, emitUpdate?: boolean) => void>>
  }
  isDestroyed: boolean
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
}

let lastUseEditorConfig: { onUpdate?: (args: TiptapOnUpdateArg) => void } | null = null
let tiptapMockEditor: MockEditor | null = null
let currentMarkdown = '# Hello'

vi.mock('@tiptap/react', () => {
  const useEditor = vi.fn(
    (config?: { onUpdate?: (args: TiptapOnUpdateArg) => void }): MockEditor => {
      lastUseEditorConfig = config ?? null

      currentMarkdown = '# Hello'
      tiptapMockEditor = {
        getMarkdown: vi.fn<() => string>(() => currentMarkdown),
        commands: {
          setContent: vi.fn<(content: string, emitUpdate?: boolean) => void>((content: string) => {
            currentMarkdown = content
            lastUseEditorConfig?.onUpdate?.({
              editor: { getMarkdown: (): string => currentMarkdown }
            })
          })
        },
        isDestroyed: false,
        on: vi.fn(),
        off: vi.fn()
      }
      return tiptapMockEditor
    }
  )

  return {
    useEditor,
    EditorContent: vi.fn(({ editor }: { editor: unknown }): React.ReactElement => {
      return <div data-testid="editor-content">{editor ? 'Editor loaded' : 'No editor'}</div>
    })
  }
})

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn() }
}))

vi.mock('@tiptap/markdown', () => ({
  Markdown: { configure: vi.fn() }
}))

describe('MarkdownEditor Component', () => {
  beforeEach((): void => {
    lastUseEditorConfig = null
    tiptapMockEditor = null
    currentMarkdown = '# Hello'
    vi.clearAllMocks()
  })

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

  it('calls onChange when editor updates normally', (): void => {
    const onChange = vi.fn()
    render(<MarkdownEditor value="" onChange={onChange} />)

    expect(lastUseEditorConfig?.onUpdate).toBeDefined()
    const onUpdate = lastUseEditorConfig!.onUpdate!
    const editor = { getMarkdown: (): string => '# From update' }

    onUpdate({ editor })
    expect(onChange).toHaveBeenCalledWith('# From update')
  })

  it('skips onChange when isExternalUpdate is true during setContent', (): void => {
    const onChange = vi.fn()
    const { rerender } = render(<MarkdownEditor value="# Hello" onChange={onChange} />)
    rerender(<MarkdownEditor value="## New content" onChange={onChange} />)

    expect(tiptapMockEditor?.commands.setContent).toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })
})
