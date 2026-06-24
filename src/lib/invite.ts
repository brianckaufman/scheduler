import { format, addMinutes } from 'date-fns';
import { firstName } from './names';
import { parseLocation, locationLabel } from './location';
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

  if (event.event_type === 'fixed' && event.finalized_time) {
    const start = new Date(event.finalized_time);
    const end = addMinutes(start, event.duration_minutes || 60);
    const lines = [
      `You're invited! 🎉`,
      ``,
      event.name,
      `📅 ${format(start, 'EEEE, MMMM d')}`,
      `⏰ ${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
      ...(event.location ? [`📍 ${locationLabel(parseLocation(event.location))}`] : []),
      ``,
      `Let us know if you can make it:`,
      ...(url ? [url] : []),
    ];
    return lines.join('\n');
  }

  if (event.event_type === 'fixed') {
    return `You're invited to "${event.name}". Let us know if you can make it:${tail}`;
  }

  // Availability event
  const organizer = event.organizer_name
    ? `${firstName(event.organizer_name)} is`
    : `We're`;
  return `${organizer} trying to find a time for "${event.name}". Tap when you're free (takes ~10 seconds):${tail}`;
}
