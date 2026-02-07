'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Underline, List, Eye, PenLine } from 'lucide-react'

interface RichTextAreaProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    minHeight?: string
    disabled?: boolean
    className?: string
}

// Render markdown-style text to HTML
export function renderFormattedText(text: string): string {
    if (!text) return ''

    let html = text
        // Convert **bold** to <strong>
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Convert *italic* to <em>
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Keep <u>underline</u> as is (already HTML)
        // Convert bullet points
        .replace(/^• /gm, '<li>')
        .replace(/\n/g, '<br>')

    return html
}

// Component to display formatted content
export function FormattedContent({ content, className = '' }: { content: string, className?: string }) {
    if (!content) return null

    const html = renderFormattedText(content)

    return (
        <div
            className={`prose prose-sm max-w-none ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}

// Rich text editor with toolbar
export default function RichTextArea({
    value,
    onChange,
    placeholder = 'Enter text...',
    minHeight = '80px',
    disabled = false,
    className = ''
}: RichTextAreaProps) {
    const [isPreview, setIsPreview] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const insertFormat = (before: string, after: string = '') => {
        const textarea = textareaRef.current
        if (!textarea || disabled) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)

        const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
        onChange(newText)

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
        }, 0)
    }

    const insertBullet = () => {
        const textarea = textareaRef.current
        if (!textarea || disabled) return

        const start = textarea.selectionStart
        const beforeCursor = value.substring(0, start)
        const lineStart = beforeCursor.lastIndexOf('\n') + 1

        const newText = value.substring(0, lineStart) + '• ' + value.substring(lineStart)
        onChange(newText)

        setTimeout(() => {
            textarea.focus()
        }, 0)
    }

    if (disabled) {
        return <FormattedContent content={value} className={className} />
    }

    return (
        <div className={`border rounded-lg overflow-hidden bg-white ${className}`}>
            <div className="flex items-center justify-between p-1.5 bg-gray-50 border-b">
                <div className="flex items-center gap-0.5">
                    {!isPreview && (
                        <>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gray-200"
                                onClick={() => insertFormat('**', '**')}
                                title="Bold (wrap with **)"
                            >
                                <Bold className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gray-200"
                                onClick={() => insertFormat('*', '*')}
                                title="Italic (wrap with *)"
                            >
                                <Italic className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gray-200"
                                onClick={() => insertFormat('<u>', '</u>')}
                                title="Underline"
                            >
                                <Underline className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-gray-200"
                                onClick={insertBullet}
                                title="Bullet Point"
                            >
                                <List className="h-3.5 w-3.5" />
                            </Button>
                        </>
                    )}
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                    onClick={() => setIsPreview(!isPreview)}
                    title={isPreview ? "Switch to Edit Mode" : "Switch to Preview Mode"}
                >
                    {isPreview ? (
                        <>
                            <PenLine className="h-3.5 w-3.5 mr-1.5" />
                            Edit
                        </>
                    ) : (
                        <>
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            Preview
                        </>
                    )}
                </Button>
            </div>
            {isPreview ? (
                <div
                    className="w-full p-2 text-sm overflow-auto"
                    style={{ minHeight }}
                >
                    <FormattedContent content={value || '<span class="text-gray-400 italic">No content to preview</span>'} />
                </div>
            ) : (
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-2 resize-none focus:outline-none text-sm"
                    style={{ minHeight }}
                />
            )}
        </div>
    )
}
