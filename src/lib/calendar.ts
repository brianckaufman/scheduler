import { addMinutes, addDays, parseISO } from 'date-fns';

export interface CalendarEvent {
  name: string;
  startISO: string;        // finalized_time
  durationMinutes: number;
  description?: string | null;
  location?: string | null; // already-resolved display label
  allDay?: boolean;
  // Inclusive end date ('yyyy-MM-dd') for an all-day range. Omit/null for a
  // single-day all-day event (defaults to the start day).
  endDateISO?: string | null;
}

/** ICS-format a UTC date: 20260619T180000Z */
function fmtUTC(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** ICS/Google all-day date, no time component: 20260619 */
function fmtDateOnly(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').slice(0, 8);
}

/** Escape text for an ICS field (commas, semicolons, newlines). */
function escIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/** Build a minimal VCALENDAR/VEVENT string suitable for a .ics attachment. */
export function buildICS(e: CalendarEvent): string {
  const start = new Date(e.startISO);
  const dtLines = e.allDay
    ? (() => {
        // All-day DTEND is exclusive per RFC 5545 — the day after the last day.
        const endDay = e.endDateISO ? parseISO(e.endDateISO) : start;
        const dtEnd = addDays(endDay, 1);
        return [`DTSTART;VALUE=DATE:${fmtDateOnly(start)}`, `DTEND;VALUE=DATE:${fmtDateOnly(dtEnd)}`];
      })()
    : (() => {
        const end = addMinutes(start, e.durationMinutes || 60);
        return [`DTSTART:${fmtUTC(start)}`, `DTEND:${fmtUTC(end)}`];
      })();
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WeGather//EN',
    'BEGIN:VEVENT',
    ...dtLines,
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
  const datesParam = e.allDay
    ? (() => {
        const endDay = e.endDateISO ? parseISO(e.endDateISO) : start;
        const dtEnd = addDays(endDay, 1); // exclusive end, same as ICS
        return `${fmtDateOnly(start)}/${fmtDateOnly(dtEnd)}`;
      })()
    : (() => {
        const end = addMinutes(start, e.durationMinutes || 60);
        return `${fmtUTC(start)}/${fmtUTC(end)}`;
      })();
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.name,
    dates: datesParam,
    ...(e.description ? { details: e.description } : {}),
    ...(e.location ? { location: e.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
