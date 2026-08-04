/** 30-minute-increment HH:MM options for a time-of-day <select>. */
export function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return options;
}

export function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export const TIME_OPTIONS = generateTimeOptions();

/** Add minutes to a HH:MM time string, wrapping at midnight. Returns HH:MM. */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
}

/**
 * Durations offered in the UI, in minutes. Fine-grained for short meetings,
 * coarser for long events — a party or conference doesn't need 15-minute
 * precision at the 8-hour mark.
 *
 * The DB's events_duration_valid CHECK allows anything in 1..1440 once
 * supabase-duration-range-migration.sql has been run; before that migration it
 * only permitted values up to 240, so anything longer is rejected on insert.
 */
export const ALLOWED_DURATIONS = [
  10, 15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 420, 480, 540, 600, 720,
];

/** Largest duration the DB accepts (a full day); the UI also stops at midnight. */
export const MAX_DURATION_MINUTES = 1440;

/** "45 min" / "2 hr" / "1.5 hr" — for duration pickers and end-time labels. */
export function formatDurationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hr`;
}

/**
 * End-time <select> options for a fixed event's time picker. Excludes
 * durations that would run past midnight — a timed event that spans days
 * should use all-day mode instead.
 */
export function enumDurationEndTimeOptions(startTime: string): { value: string; minutes: number; label: string }[] {
  const [sh, sm] = startTime.split(':').map(Number);
  const startMin = sh * 60 + sm;
  return ALLOWED_DURATIONS
    .filter((d) => startMin + d <= 24 * 60)
    .map((d) => {
      const endMin = startMin + d;
      const eh = Math.floor(endMin / 60);
      const em = endMin % 60;
      const value = `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
      return { value, minutes: d, label: `${formatTimeLabel(value)} (${formatDurationLabel(d)})` };
    });
}
