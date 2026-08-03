'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { CopyIcon, ShareIcon } from '@/components/ui/icons';

interface SuccessStepProps {
  slug: string;
  eventName: string;
  eventType: 'availability' | 'fixed';
  accent: 'social' | 'teal';
  onGoToEvent: () => void;
}

/**
 * The moment the old flow never had: a full-screen "it worked — now share the
 * link" step with giant copy/share buttons and a plain-language explanation of
 * what happens next.
 */
export default function SuccessStep({ slug, eventName, eventType, accent, onGoToEvent }: SuccessStepProps) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/e/${slug}` : `/e/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the URL is visible to copy by hand */ }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: eventName, url });
        return;
      } catch { /* user cancelled — fall through to copy */ }
    }
    handleCopy();
  };

  const nextSteps = eventType === 'fixed'
    ? ['Send this link to your guests', 'They tap it and reply yes, maybe, or no', 'Watch the replies come in on your event page']
    : ['Send this link to your group', 'Everyone taps the times they’re free', 'You pick the time that works for the most people'];

  return (
    <div className="text-center">
      <ConfettiCelebration />
      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-[#112D25] flex items-center justify-center mb-5 animate-fade-in-scale">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="checkmark-draw" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-heading">Your event is ready!</h1>
      <p className="text-sm text-muted mt-2 leading-relaxed">
        There&apos;s just one thing left to do: share the link.
      </p>

      <div className="mt-6 px-4 py-3 rounded-xl border-2 border-hairline bg-surface text-sm text-secondary font-mono break-all select-all">
        {url}
      </div>

      <div className="mt-4 space-y-3">
        <Button variant="primary" accent={accent} size="lg" fullWidth onClick={handleCopy}>
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <CopyIcon className="w-5 h-5" />
              Copy the link
            </>
          )}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={handleShare}>
          <ShareIcon className="w-5 h-5" />
          Share another way…
        </Button>
      </div>

      <div className="mt-8 text-left bg-surface rounded-2xl border border-hairline p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-faint mb-3">What happens next</p>
        <ol className="space-y-3">
          {nextSteps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center ${accent === 'teal' ? 'bg-teal-500' : 'bg-social-500'}`}>
                {i + 1}
              </span>
              <span className="text-sm text-body leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6">
        <Button variant="outline" accent={accent} size="lg" fullWidth onClick={onGoToEvent}>
          Go to my event →
        </Button>
      </div>
    </div>
  );
}
