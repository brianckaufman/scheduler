'use client';

import { format, addMinutes } from 'date-fns';
import type { Event } from '@/types';

interface FinalizedBannerProps {
  event: Event;
  isOrganizer: boolean;
  organizerToken: string | null;
  onUnfinalize: () => void;
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

export default function FinalizedBanner({ event, isOrganizer, organizerToken, onUnfinalize }: FinalizedBannerProps) {
  const start = new Date(event.finalized_time!);

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

  const handleUnfinalize = async () => {
    await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ finalized_time: null, organizer_token: organizerToken }),
    });
    onUnfinalize();
  };

  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-2xl p-4">
      <div className="text-center">
        <p className="text-sm font-semibold text-green-800">Time confirmed!</p>
        <p className="text-lg font-bold text-green-900 mt-1">
          {format(start, 'EEEE, MMM d')} at {format(start, 'h:mm a')}
        </p>
        {event.location && (
          <p className="text-sm text-green-700 mt-1">{event.location}</p>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <a
          href={getGoogleCalendarUrl(event)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2 px-3 bg-white border border-green-300 text-green-700 text-sm font-medium rounded-xl text-center hover:bg-green-50 transition-colors"
        >
          Google Calendar
        </a>
        <button
          type="button"
          onClick={handleDownloadICS}
          className="flex-1 py-2 px-3 bg-white border border-green-300 text-green-700 text-sm font-medium rounded-xl text-center hover:bg-green-50 transition-colors"
        >
          Download .ics
        </button>
      </div>
      {isOrganizer && (
        <button
          type="button"
          onClick={handleUnfinalize}
          className="w-full mt-2 py-1.5 text-xs text-green-600 hover:text-green-800 transition-colors"
        >
          Change time
        </button>
      )}
    </div>
  );
}
