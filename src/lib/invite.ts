import { format } from 'date-fns';
import { firstName } from './names';
import { parseLocation, locationLabel } from './location';
import { formatEventDateRange } from './dateRange';
import type { Event } from '@/types';

/**
 * Builds a friendly invite/share text message for an event.
 * Used by ShareLink (Copy Invite button) and the RSVP confirmation modal.
 */
export function buildInviteText(event: Event, url?: string): string {
  // url is optional: include it for clipboard copy (so the pasted text has the
  // link), but OMIT it for navigator.share — that passes the URL in its own
  // `url` field, so embedding it in the text too yields a DOUBLE link preview.
  const tail = url ? `\n${url}` : '';

  // "Let Brian know…" when we have the organizer's name, else "Let us know…".
  const letKnow = event.organizer_name
    ? `Let ${firstName(event.organizer_name)} know if you can make it:`
    : `Let us know if you can make it:`;

  if (event.event_type === 'fixed' && event.finalized_time) {
    const dateLine = formatEventDateRange(event.finalized_time, event.finalized_end_date, !!event.all_day, { includeTime: false });
    const lines = [
      `You're invited! 🎉`,
      ``,
      event.name,
      `📅 ${dateLine}`,
      ...(!event.all_day ? [`⏰ ${format(new Date(event.finalized_time), 'h:mm a')}`] : []),
      ...(event.location ? [`📍 ${locationLabel(parseLocation(event.location))}`] : []),
      ``,
      letKnow,
      ...(url ? [url] : []),
    ];
    return lines.join('\n');
  }

  if (event.event_type === 'fixed') {
    return `You're invited to "${event.name}". ${letKnow}${tail}`;
  }

  // Availability event
  const organizer = event.organizer_name
    ? `${firstName(event.organizer_name)} is`
    : `We're`;
  return `${organizer} trying to find a time for "${event.name}". Tap when you're free (takes ~10 seconds):${tail}`;
}
