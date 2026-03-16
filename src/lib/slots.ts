import { parse, addMinutes, format } from 'date-fns';

export function generateSlots(
  dates: string[],
  timeStart: string,
  timeEnd: string,
  timezone: string
): string[] {
  const slots: string[] = [];

  for (const dateStr of dates) {
    const baseDate = parse(dateStr, 'yyyy-MM-dd', new Date());
    const [startH, startM] = timeStart.split(':').map(Number);
    const [endH, endM] = timeEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    for (let m = startMinutes; m < endMinutes; m += 30) {
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
