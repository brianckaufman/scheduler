'use client';

import { useState } from 'react';
import { firstName } from '@/lib/names';
import Button from '@/components/ui/Button';
import type { Event } from '@/types';

interface GuestDoneCardProps {
  event: Event;
  participantId: string;
  participantName: string;
  /** How many times/days the guest has saved (availability), or 0 for RSVP use. */
  savedCount: number;
  /** 'times' | 'days' for availability grids; 'rsvp' for the fixed-event view. */
  mode: 'times' | 'days' | 'rsvp';
  /** RSVP answer, only for mode='rsvp'. */
  rsvpStatus?: 'yes' | 'maybe' | 'no';
  onShowHow: () => void;
}

/**
 * The persistent "you're done" moment. Replaces a 3-second toast with a card
 * that stays on screen: confirms what the guest did, tells them exactly what
 * happens next, and (for availability) offers email notification when the
 * final time is picked. Changing an answer is explained, not hidden.
 */
export default function GuestDoneCard({
  event,
  participantId,
  participantName,
  savedCount,
  mode,
  rsvpStatus,
  onShowHow,
}: GuestDoneCardProps) {
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const organizer = firstName(event.organizer_name || 'the organizer');
  const isRsvp = mode === 'rsvp';
  const unit = mode === 'times' ? 'time' : 'day';

  const heading = isRsvp
    ? rsvpStatus === 'yes'
      ? `You're in, ${firstName(participantName)}! 🎉`
      : rsvpStatus === 'maybe'
        ? `Reply saved, ${firstName(participantName)}`
        : `Reply saved, ${firstName(participantName)}`
    : `You're done, ${firstName(participantName)}! ✅`;

  const detail = isRsvp
    ? rsvpStatus === 'yes'
      ? `${organizer} can see you're going. If anything changes, come back and tap a different answer anytime.`
      : rsvpStatus === 'maybe'
        ? `${organizer} knows you might make it. When you're sure, come back and tap Going or Can't make it.`
        : `${organizer} knows you can't make it. Changed your mind? Come back and update your answer anytime.`
    : `You marked ${savedCount} ${unit}${savedCount === 1 ? '' : 's'} and everything is saved. ${organizer} will pick the final ${mode === 'times' ? 'time' : 'days'} once everyone has replied — it will appear right here on this page.`;

  const changeHint = isRsvp
    ? null
    : `Need to change something? Tap the ${unit}s below and press Save again.`;

  const saveEmail = async () => {
    const e = email.trim();
    if (!e) return;
    setEmailState('saving');
    try {
      const res = await fetch(`/api/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: event.id, email: e }),
      });
      setEmailState(res.ok ? 'saved' : 'error');
    } catch {
      setEmailState('error');
    }
  };

  return (
    <div className="animate-fade-in mb-4 rounded-2xl border border-green-200 dark:border-[#123428] bg-green-50 dark:bg-[#112D25] p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="checkmark-draw" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-green-800 dark:text-green-300">{heading}</p>
          <p className="text-sm text-green-800/90 dark:text-green-200/90 mt-1 leading-relaxed">{detail}</p>
          {changeHint && (
            <p className="text-xs text-green-700/80 dark:text-green-300/70 mt-2 leading-relaxed">{changeHint}</p>
          )}

          {/* Email capture — availability only, until saved */}
          {!isRsvp && emailState !== 'saved' && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-1.5">
                Want an email when {organizer} picks the {mode === 'times' ? 'time' : 'days'}?
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-green-300 dark:border-[#1A4A38] bg-surface text-sm text-heading placeholder-faint focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Button
                  variant="primary"
                  accent="neutral"
                  onClick={saveEmail}
                  loading={emailState === 'saving'}
                  disabled={!email.trim()}
                  className="!bg-green-600 hover:!bg-green-700 !text-white shrink-0"
                >
                  Notify me
                </Button>
              </div>
              {emailState === 'error' && (
                <p className="text-xs text-red-500 mt-1">That email didn&apos;t look right — try again.</p>
              )}
            </div>
          )}
          {!isRsvp && emailState === 'saved' && (
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mt-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              We&apos;ll email you when it&apos;s decided.
            </p>
          )}

          <button
            type="button"
            onClick={onShowHow}
            className="mt-3 text-xs font-medium text-green-700 dark:text-green-300 underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            How does this work?
          </button>
        </div>
      </div>
    </div>
  );
}
