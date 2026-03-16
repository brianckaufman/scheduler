'use client';

import { useState } from 'react';

interface ShareLinkProps {
  eventName: string;
}

export default function ShareLink({ eventName }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: `When can you meet for "${eventName}"? Tap your availability:`,
          url,
        });
      } catch {
        // User cancelled
      }
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCopy}
        className="flex-1 py-2 px-4 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {copied ? 'Copied!' : 'Copy Link'}
      </button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          onClick={handleShare}
          className="py-2 px-4 text-sm font-medium rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors"
        >
          Share
        </button>
      )}
    </div>
  );
}
