'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';

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
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Add more context, agenda, directions, or any extra info…',
  minHeight = 120,
}: RichTextEditorProps) {
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

  if (!editor) return null;

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
      </div>

      {/* ── Editor ── */}
      <EditorContent editor={editor} />
    </div>
  );
}
