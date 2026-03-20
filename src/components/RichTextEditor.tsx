'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState, useCallback } from 'react';

// ── SVG icons ────────────────────────────────────────────────────────────────
const BoldIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" /><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </svg>
);
const ItalicIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
  </svg>
);
const LinkIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);
const BulletIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const OrderedIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
    <path d="M4 6h1v4" /><path d="M4 10h2" /><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1.5" />
  </svg>
);
const SparkleIcon = () => (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75z" />
    <path d="M19 3l.6 1.8 1.8.6-1.8.6L19 8l-.6-1.8-1.8-.6 1.8-.6z" />
  </svg>
);

// ── Toolbar button ────────────────────────────────────────────────────────────
function TBtn({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded-md transition-colors cursor-pointer ${
        active ? 'bg-gray-200 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Context passed to AI generator */
  eventContext?: {
    name?: string;
    eventType?: 'availability' | 'fixed';
    location?: string;
    description?: string;
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add more context, agenda, directions, or any extra info…',
  minHeight = 120,
  eventContext,
}: RichTextEditorProps) {
  const [aiOpen, setAiOpen]       = useState(false);
  const [aiPrompt, setAiPrompt]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, code: false, codeBlock: false,
        blockquote: false, horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-teal-600 underline hover:text-teal-700', target: '_blank', rel: 'noopener noreferrer' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose-editor px-3 py-2.5 text-sm text-gray-800 focus:outline-none leading-relaxed',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // Link prompt
  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url  = window.prompt('Enter URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  // AI generate
  const handleAiGenerate = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName:   eventContext?.name        ?? '',
          eventType:   eventContext?.eventType   ?? 'availability',
          location:    eventContext?.location    ?? '',
          description: eventContext?.description ?? '',
          prompt:      aiPrompt,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(d.error ?? 'Generation failed');
      }
      const { html } = await res.json() as { html: string };
      if (editor) {
        editor.commands.setContent(html);
        onChange(html);
      }
      setAiOpen(false);
      setAiPrompt('');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAiLoading(false);
    }
  };

  if (!editor) return null;

  const hasContent = editor.getText().trim().length > 0;

  return (
    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-400 focus-within:border-teal-400 transition-shadow bg-white">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <TBtn active={editor.isActive('bold')}       onClick={() => editor.chain().focus().toggleBold().run()}         title="Bold">    <BoldIcon /></TBtn>
        <TBtn active={editor.isActive('italic')}     onClick={() => editor.chain().focus().toggleItalic().run()}       title="Italic">  <ItalicIcon /></TBtn>
        <TBtn active={editor.isActive('link')}       onClick={setLink}                                                 title="Link">    <LinkIcon /></TBtn>
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}   title="Bullet list">   <BulletIcon /></TBtn>
        <TBtn active={editor.isActive('orderedList')}onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"> <OrderedIcon /></TBtn>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setAiOpen((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            aiOpen ? 'bg-violet-100 text-violet-700' : 'text-violet-600 hover:bg-violet-50'
          }`}
        >
          <SparkleIcon />
          Write with AI
        </button>
      </div>

      {/* ── AI panel ── */}
      {aiOpen && (
        <div className="border-b border-violet-100 bg-violet-50 px-3 py-3 space-y-2">
          <p className="text-xs text-violet-700 font-medium">
            Describe what to include, or leave blank to auto-generate from your event details.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Include parking info, what to bring, dress code…"
            rows={2}
            className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-violet-200 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-none"
          />
          {aiError && <p className="text-xs text-red-500">{aiError}</p>}
          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={handleAiGenerate}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {aiLoading ? (
                <>
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Writing…
                </>
              ) : (
                <><SparkleIcon />{hasContent ? 'Rewrite' : 'Generate'}</>
              )}
            </button>
            <button type="button" onClick={() => { setAiOpen(false); setAiPrompt(''); setAiError(''); }}
              className="px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Editor ── */}
      <EditorContent editor={editor} />
    </div>
  );
}
