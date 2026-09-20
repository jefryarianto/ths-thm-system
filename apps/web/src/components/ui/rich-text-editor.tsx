'use client';

import { useEditor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  disabled = false,
  className = '',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
  });

  return (
    <div
      className={`
        w-full min-h-[150px] px-4 py-2 border border-gray-300 rounded-lg
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
        ${className}
      `}
    >
      <EditorContent
        className="prose prose-sm max-w-none focus:outline-none"
        editor={editor}
      />
    </div>
  );
}
