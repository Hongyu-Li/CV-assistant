import React, { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (markdown: string) => void
  label?: string
  placeholder?: string
  className?: string
  minHeight?: string
}

export function MarkdownEditor({
  value,
  onChange,
  label,
  placeholder,
  className,
  minHeight = '100px'
}: MarkdownEditorProps): React.JSX.Element {
  const editor = useEditor({
    extensions: [StarterKit, Markdown],
    content: value,
    contentType: 'markdown',
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      onChange(e.getMarkdown())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
        ...(placeholder ? { 'data-placeholder': placeholder } : {})
      }
    }
  })

  // Sync external value changes into the editor
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentMarkdown = editor.getMarkdown()
      if (value !== currentMarkdown) {
        editor.commands.setContent(value || '', { contentType: 'markdown' })
      }
    }
  }, [value, editor])

  return (
    <div className={className}>
      {label && <label className="text-sm font-medium mb-1 block">{label}</label>}
      <div
        className="rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
        style={{ minHeight }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
