/**
 * Input sanitization utilities.
 * Strips HTML tags, enforces length limits, and validates formats.
 */

/** Strip all HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Sanitize a text field: trim, strip HTML, enforce max length */
export function sanitizeText(input: string, maxLength: number = 200): string {
  return stripHtml(input).trim().slice(0, maxLength);
}

/** Validate that a string looks like a time (HH:MM) */
export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/** Validate that a string looks like a date (YYYY-MM-DD) */
export function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(Date.parse(date));
}

/** Validate timezone string */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validate a participant name: not empty, reasonable length, no HTML */
export function sanitizeName(input: string): string {
  return sanitizeText(input, 50);
}
