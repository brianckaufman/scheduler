import { parse, format } from 'date-fns';

/** Step size (in minutes) between selectable start times based on event duration. */
export function getSlotStep(durationMinutes: number): number {
  if (durationMinutes <= 15) return 15;
  if (durationMinutes <= 120) return 30;
  return 60;
}

export function generateSlots(
  dates: string[],
  timeStart: string,
  timeEnd: string,
  timezone: string,
  durationMinutes = 30
): string[] {
  const slots: string[] = [];
  const step = getSlotStep(durationMinutes);

  for (const dateStr of dates) {
    const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    const [startH, startM] = timeStart.split(':').map(Number);
    const [endH, endM] = timeEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Only generate slots where the full duration fits within the window
    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += step) {
      const slotDate = new Date(baseDate);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);
      slots.push(slotDate.toISOString());
    }
  }

  return slots;
}

/**
 * Convert a local date+time string in a given IANA timezone to a UTC Date.
 * Uses the Intl.DateTimeFormat trick: format the naive-UTC date in the target
 * timezone, measure the drift, then apply the inverse offset. Works in both
 * server and browser contexts (Intl.DateTimeFormat is universal).
 */
export function zonedToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const localRepr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(naiveUtc);
  const localDate = new Date(localRepr.replace(' ', 'T') + 'Z');
  const offset = naiveUtc.getTime() - localDate.getTime();
  return new Date(naiveUtc.getTime() + offset);
}

/**
 * Reverse of zonedToUtc: format a UTC instant as separate date/time strings
 * ('yyyy-MM-dd' / 'HH:mm') as they read in a given IANA timezone. Used to
 * pre-fill an edit form from a stored finalized_time without drifting a day
 * off for organizers browsing from a different timezone than the event's.
 */
export function utcToZoned(date: Date, tz: string): { dateStr: string; timeStr: string } {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(date); // "YYYY-MM-DD HH:MM:SS"
  const [dateStr, timeStr] = parts.split(' ');
  return { dateStr, timeStr: timeStr.slice(0, 5) };
}

/**
 * One slot key per calendar day, at midnight in the event's timezone,
 * UTC-normalized via zonedToUtc — unlike generateSlots (which uses the
 * viewer's local browser time), whole-day slots need every participant to
 * agree on what "Aug 1" means regardless of where they're browsing from.
 */
export function generateAllDaySlots(dates: string[], timezone: string): string[] {
  return dates.map((dateStr) => zonedToUtc(dateStr, '00:00', timezone).toISOString());
}

export function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'h:mm a');
}

export function formatSlotDate(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'EEE M/d');
}
