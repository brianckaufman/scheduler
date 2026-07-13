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
 * The events_duration_valid DB CHECK constraint only allows this fixed enum —
 * not an arbitrary bounded range. Any UI offering a duration/end-time pick
 * for a fixed (timed) event must stay within this set or the insert/update
 * fails.
 */
export const ALLOWED_DURATIONS = [10, 15, 30, 45, 60, 90, 120, 180, 240];

/**
 * End-time <select> options for a fixed event's time picker, constrained to
 * durations the DB actually allows (see ALLOWED_DURATIONS) — every value
 * returned here is safe to submit. Excludes durations that would cross
 * midnight into the next day.
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
      const durLabel = d < 60 ? `${d} min` : d % 60 === 0 ? `${d / 60} hr` : `${Math.floor(d / 60)}.5 hr`;
      return { value, minutes: d, label: `${formatTimeLabel(value)} (${durLabel})` };
    });
}
