import { format, parseISO, isSameDay } from 'date-fns';

/**
 * Prose date/time for a finalized event — timed ("Wed, Aug 3 at 2:00 PM"),
 * single all-day ("Wed, Aug 3"), or an all-day range ("Aug 2 – Aug 4").
 * Used everywhere a finalized time gets formatted for display/share text/ICS
 * summaries, so the timed-vs-single-day-vs-range branching lives in one place.
 */
export function formatEventDateRange(
  startISO: string,
  endDateISO: string | null | undefined,
  allDay: boolean,
  opts: { withWeekday?: boolean; includeTime?: boolean } = {}
): string {
  const start = new Date(startISO);
  const withWeekday = opts.withWeekday ?? true;
  const includeTime = opts.includeTime ?? true;
  const dayFmt = withWeekday ? 'EEE, MMM d' : 'MMM d';

  if (!allDay) {
    const dateLabel = format(start, withWeekday ? 'EEEE, MMMM d' : 'MMMM d');
    return includeTime ? `${dateLabel} at ${format(start, 'h:mm a')}` : dateLabel;
  }

  const end = endDateISO ? parseISO(endDateISO) : start;
  if (isSameDay(start, end)) {
    return format(start, withWeekday ? 'EEEE, MMMM d' : 'MMMM d');
  }

  // Same month: "Aug 2 – 4". Different months: "Aug 30 – Sep 2".
  const sameMonth = format(start, 'MMM') === format(end, 'MMM') && format(start, 'yyyy') === format(end, 'yyyy');
  const startLabel = format(start, dayFmt);
  const endLabel = sameMonth ? format(end, 'd') : format(end, dayFmt);
  return `${startLabel} – ${endLabel}`;
}
