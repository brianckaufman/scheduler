'use client';

import { useEffect, useRef, useCallback } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

interface ToolbarButton {
  command: string;
  arg?: string;
  icon: string;
  title: string;
  isBlock?: boolean;
}

const TOOLBAR: (ToolbarButton | 'sep')[] = [
  { command: 'bold', icon: 'B', title: 'Bold' },
  { command: 'italic', icon: 'I', title: 'Italic' },
  { command: 'underline', icon: 'U', title: 'Underline' },
  'sep',
  { command: 'formatBlock', arg: 'h2', icon: 'H2', title: 'Heading 2', isBlock: true },
  { command: 'formatBlock', arg: 'h3', icon: 'H3', title: 'Heading 3', isBlock: true },
  { command: 'formatBlock', arg: 'p', icon: '¶', title: 'Paragraph', isBlock: true },
  'sep',
  { command: 'insertUnorderedList', icon: '≡', title: 'Bullet List' },
  { command: 'insertOrderedList', icon: '1.', title: 'Numbered List' },
  'sep',
  { command: 'createLink', icon: '🔗', title: 'Insert Link' },
  { command: 'unlink', icon: '✂', title: 'Remove Link' },
  'sep',
  { command: 'removeFormat', icon: '✕', title: 'Clear Formatting' },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  minHeight = 300,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalUpdate = useRef(false);

  // Sync external value → editor (only when value changes from outside)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    // Don't overwrite while user is typing
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) {
      isInternalUpdate.current = true;
      el.innerHTML = value || '';
      isInternalUpdate.current = false;
    }
  }, [value]);

  const handleInput = useCallback(() => {
    if (isInternalUpdate.current) return;
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  const execCommand = useCallback((command: string, arg?: string) => {
    if (command === 'createLink') {
      const url = prompt('Enter URL:', 'https://');
      if (!url) return;
      document.execCommand('createLink', false, url);
      // Make links open in new tab
      const selection = window.getSelection();
      if (selection?.anchorNode?.parentElement?.tagName === 'A') {
        (selection.anchorNode.parentElement as HTMLAnchorElement).target = '_blank';
        (selection.anchorNode.parentElement as HTMLAnchorElement).rel = 'noopener noreferrer';
      }
    } else {
      document.execCommand(command, false, arg);
    }
    editorRef.current?.focus();
    handleInput();
  }, [handleInput]);

  const isActive = (command: string, arg?: string) => {
    try {
      if (arg) {
        return document.queryCommandValue(command) === arg;
      }
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-transparent transition-shadow">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {TOOLBAR.map((item, i) => {
          if (item === 'sep') {
            return <div key={`sep-${i}`} className="w-px h-5 bg-gray-200 mx-1" />;
          }
          const active = isActive(item.command, item.arg);
          return (
            <button
              key={item.command + (item.arg || '')}
              type="button"
              title={item.title}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur
                execCommand(item.command, item.arg);
              }}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-teal-100 text-teal-700'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              } ${item.command === 'bold' ? 'font-bold' : ''} ${item.command === 'italic' ? 'italic' : ''} ${item.command === 'underline' ? 'underline' : ''}`}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder}
        className="px-4 py-3 text-sm text-gray-900 focus:outline-none prose prose-sm max-w-none
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_a]:text-teal-600 [&_a]:underline
          [&_p]:my-1
          empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
        style={{ minHeight }}
      />
    </div>
  );
}
