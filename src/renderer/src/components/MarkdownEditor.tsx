import React, { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Placeholder from '@tiptap/extension-placeholder'

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
  // Track whether updates are from external sync to avoid feedback loops
  const isExternalUpdate = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      ...(placeholder ? [Placeholder.configure({ placeholder })] : [])
    ],
    content: value || '',
    // Only set contentType when there's actual markdown content to parse
    ...(value ? { contentType: 'markdown' as const } : {}),
    immediatelyRender: false,
    onUpdate: ({ editor: e }) => {
      // Skip onChange if this update was triggered by our own setContent
      if (isExternalUpdate.current) {
        return
      }
      onChange(e.getMarkdown())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[inherit] [&_p]:my-1 [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0'
      }
    }
  })

  // Sync external value changes into the editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    const currentMarkdown = editor.getMarkdown()
    // Normalize: both empty string and undefined should match
    const normalizedValue = value ?? ''
    const normalizedCurrent = currentMarkdown ?? ''

    if (normalizedValue !== normalizedCurrent) {
      isExternalUpdate.current = true
      editor.commands.setContent(normalizedValue, {
        contentType: 'markdown',
        emitUpdate: false
      })
      isExternalUpdate.current = false
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
