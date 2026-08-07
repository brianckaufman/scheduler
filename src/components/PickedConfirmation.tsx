'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import ConfettiCelebration from '@/components/ConfettiCelebration';
import { CopyIcon, CalendarPlusIcon } from '@/components/ui/icons';
import { formatEventDateRange } from '@/lib/dateRange';
import { parseLocation, locationLabel } from '@/lib/location';
import { buildICS, googleCalendarUrl } from '@/lib/calendar';
import type { Event } from '@/types';

interface PickedConfirmationProps {
  /** The event with the newly-picked time already applied. */
  event: Event;
  finalizedTime: string;
  finalizedEndDate?: string | null;
  onClose: () => void;
}

/**
 * The payoff for picking a time. Previously the modal closed the instant the
 * organizer clicked Pick — while the save was still running — and the only
 * confirmation was a banner at the top of a page they'd scrolled away from.
 * Now the moment lands where their attention already is: confirmed, celebrated,
 * with the one thing they'll want next (a message to send the group).
 */
export default function PickedConfirmation({
  event,
  finalizedTime,
  finalizedEndDate,
  onClose,
}: PickedConfirmationProps) {
  const [copied, setCopied] = useState(false);

  const whenText = formatEventDateRange(finalizedTime, finalizedEndDate ?? null, !!event.all_day);
  const place = event.location ? locationLabel(parseLocation(event.location)) : null;

  const calendarEvent = {
    name: event.name,
    startISO: finalizedTime,
    durationMinutes: event.duration_minutes || 60,
    description: event.description,
    location: place,
    allDay: !!event.all_day,
    endDateISO: finalizedEndDate ?? null,
  };

  const shareText = [
    `Hey everyone! We've locked in a time for ${event.name}.`,
    '',
    `📅 ${whenText}`,
    ...(place ? [`📍 ${place}`] : []),
    '',
    typeof window !== 'undefined' ? window.location.href : '',
  ].join('\n');

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const downloadIcs = () => {
    const blob = new Blob([buildICS(calendarEvent)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 text-center animate-fade-in">
      <ConfettiCelebration />

      <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-[#1B4D3A] flex items-center justify-center mb-4 animate-fade-in-scale">
        <svg className="w-8 h-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" className="checkmark-draw" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-heading">It&apos;s official!</h2>
      <p className="text-sm text-muted mt-1">Everyone can see the time now.</p>

      <div className="mt-4 rounded-2xl border-2 border-green-300 dark:border-[#1E6B4C] bg-green-50 dark:bg-[#112D25] px-4 py-4">
        <p className="text-base font-bold text-heading">{whenText}</p>
        {place && <p className="text-sm text-secondary mt-1">{place}</p>}
      </div>

      <div className="mt-5 space-y-2">
        <Button variant="primary" accent="teal" size="lg" fullWidth onClick={copyMessage}>
          {copied ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied — paste it to your group
            </>
          ) : (
            <>
              <CopyIcon className="w-5 h-5" />
              Copy message for the group
            </>
          )}
        </Button>

        <div className="flex gap-2">
          <a
            href={googleCalendarUrl(calendarEvent)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl font-semibold py-3 px-4 text-sm min-h-[44px] bg-fill text-body border border-hairline hover:bg-fill2 transition-all active:scale-[0.97] cursor-pointer"
          >
            <CalendarPlusIcon className="w-4 h-4" />
            Google
          </a>
          <Button variant="secondary" onClick={downloadIcs} className="flex-1">
            <CalendarPlusIcon className="w-4 h-4" />
            Apple / Outlook
          </Button>
        </div>
      </div>

      <Button variant="outline" accent="teal" size="lg" fullWidth className="mt-4" onClick={onClose}>
        Done
      </Button>
    </div>
  );
}
