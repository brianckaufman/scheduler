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

export function formatSlotTime(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'h:mm a');
}

export function formatSlotDate(isoString: string): string {
  const date = new Date(isoString);
  return format(date, 'EEE M/d');
}
