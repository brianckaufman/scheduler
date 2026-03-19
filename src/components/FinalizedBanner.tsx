'use client';

import { useState } from 'react';
import { format, addMinutes } from 'date-fns';
import type { Event } from '@/types';
import { firstName } from '@/lib/names';

interface FinalizedBannerProps {
  event: Event;
  isOrganizer: boolean;
  organizerToken: string | null;
  onUnfinalize: () => void;
  participantName?: string;
}

function generateICS(event: Event): string {
  const start = new Date(event.finalized_time!);
  const end = addMinutes(start, event.duration_minutes || 60);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${event.name}`,
    event.description ? `DESCRIPTION:${event.description}` : '',
    event.location ? `LOCATION:${event.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function getGoogleCalendarUrl(event: Event): string {
  const start = new Date(event.finalized_time!);
  const end = addMinutes(start, event.duration_minutes || 60);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${fmt(start)}/${fmt(end)}`,
    ...(event.description && { details: event.description }),
    ...(event.location && { location: event.location }),
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

function buildConfirmationText(event: Event): string {
  const start = new Date(event.finalized_time!);
  const end = addMinutes(start, event.duration_minutes || 60);

  const lines: string[] = [];
  lines.push(`${event.name} is confirmed!`);
  lines.push('');
  lines.push(`Date: ${format(start, 'EEEE, MMMM d, yyyy')}`);
  lines.push(`Time: ${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`);
  if (event.location) {
    lines.push(`Location: ${event.location}`);
  }

  return lines.join('\n');
}

export default function FinalizedBanner({ event, isOrganizer, organizerToken, onUnfinalize, participantName }: FinalizedBannerProps) {
  const start = new Date(event.finalized_time!);
  const [copied, setCopied] = useState(false);

  const handleDownloadICS = () => {
    const ics = generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.name.replace(/\s+/g, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyDetails = async () => {
    const text = buildConfirmationText(event);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnfinalize = async () => {
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_time: null, organizer_token: organizerToken }),
    });
    onUnfinalize();
  };

  return (
    <div className="animate-fade-in-scale mb-4 bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-green-800">
          {event.event_type === 'fixed' && participantName
            ? `${firstName(participantName)}, you're invited!`
            : 'Time confirmed!'}
        </p>
        <p className="text-lg font-bold text-green-900 mt-1">
          {format(start, 'EEEE, MMM d')} at {format(start, 'h:mm a')}
        </p>
        {event.location && (
          <p className="text-sm text-green-700 mt-1">{event.location}</p>
        )}
      </div>

      {/* Primary action: universal calendar add */}
      <button
        type="button"
        onClick={handleDownloadICS}
        className="w-full mt-3 py-2.5 px-4 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2"
      >
        <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        Add to Calendar
      </button>
      <p className="text-xs text-green-600 text-center mt-1">
        Works with Apple Calendar, Google Calendar, Outlook, and more
      </p>

      {/* Secondary: copy details to share */}
      <button
        type="button"
        onClick={handleCopyDetails}
        className={`w-full mt-2 py-2 px-4 border text-sm font-medium rounded-xl text-center transition-all duration-200 active:scale-[0.97] cursor-pointer flex items-center justify-center gap-2 ${
          copied
            ? 'bg-green-600 border-green-600 text-white'
            : 'bg-white border-green-300 text-green-700 hover:bg-green-50 hover:shadow-sm'
        }`}
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
            </svg>
            Copy event details
          </>
        )}
      </button>

      {isOrganizer && (
        <button
          type="button"
          onClick={handleUnfinalize}
          className="w-full mt-2 py-1.5 text-xs text-green-600 hover:text-green-800 transition-colors cursor-pointer"
        >
          Change time
        </button>
      )}
    </div>
  );
}
