import { addMinutes } from 'date-fns';

export interface CalendarEvent {
  name: string;
  startISO: string;        // finalized_time
  durationMinutes: number;
  description?: string | null;
  location?: string | null; // already-resolved display label
}

/** ICS-format a UTC date: 20260619T180000Z */
function fmtUTC(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Escape text for an ICS field (commas, semicolons, newlines). */
function escIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Build a minimal VCALENDAR/VEVENT string suitable for a .ics attachment. */
export function buildICS(e: CalendarEvent): string {
  const start = new Date(e.startISO);
  const end = addMinutes(start, e.durationMinutes || 60);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WeGather//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmtUTC(start)}`,
    `DTEND:${fmtUTC(end)}`,
    `SUMMARY:${escIcs(e.name)}`,
    e.description ? `DESCRIPTION:${escIcs(e.description)}` : '',
    e.location ? `LOCATION:${escIcs(e.location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

/** Build a Google Calendar "add event" template URL. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const start = new Date(e.startISO);
  const end = addMinutes(start, e.durationMinutes || 60);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.name,
    dates: `${fmtUTC(start)}/${fmtUTC(end)}`,
    ...(e.description ? { details: e.description } : {}),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
