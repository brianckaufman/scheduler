'use client';

import { useState, useRef, useCallback } from 'react';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
  help?: string;
  accept?: string;
  aspectHint?: string;
}

export default function ImageUpload({
  value,
  onChange,
  folder,
  label,
  help,
  accept = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif',
  aspectHint,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError('');

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', folder);

        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const { url } = await res.json();
        onChange(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so re-uploading the same file triggers onChange
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {value ? (
        /* Preview state */
        <div className="flex items-start gap-4">
          <div className="relative group">
            <div className="w-24 h-24 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt={label}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-xs text-gray-400 truncate mb-2 max-w-xs" title={value}>
              {value}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M4.031 9.865" />
                </svg>
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Upload state */
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
            ${uploading ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-6 h-6 text-teal-500 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21zM10.5 8.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              <div>
                <p className="text-sm text-gray-600">
                  <span className="text-teal-600 font-medium">Click to upload</span> or drag and drop
                </p>
                {aspectHint && (
                  <p className="text-xs text-gray-400 mt-0.5">{aspectHint}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {help && !error && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}
