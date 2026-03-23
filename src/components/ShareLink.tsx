'use client';

import { useState, useEffect } from 'react';
import { useCopy } from '@/contexts/CopyContext';
import { buildInviteText } from '@/lib/invite';
import type { Event } from '@/types';

interface ShareLinkProps {
  event: Event;
  isOrganizer?: boolean;
}

export default function ShareLink({ event, isOrganizer }: ShareLinkProps) {
  const copy = useCopy();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  const url = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
  }, []);

  const inviteText = buildInviteText(event, url);

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteText;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: event.name, text: inviteText, url });
        return;
      } catch { /* cancelled */ }
    }
    await handleCopyInvite();
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleCopyInvite}
          className="py-2.5 px-4 text-sm font-medium rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path className="checkmark-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Invite
            </>
          )}
        </button>
        <button
          onClick={canShare ? handleShare : handleCopyInvite}
          className="py-2.5 px-4 text-sm font-medium rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.97]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {copy.share.share}
        </button>
      </div>
      {isOrganizer && (
        <p className="text-xs text-gray-400 text-center">
          {copy.share.share_prompt}
        </p>
      )}
    </div>
  );
}
