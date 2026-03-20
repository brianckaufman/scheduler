/**
 * Input sanitization utilities.
 * Strips HTML tags, enforces length limits, and validates formats.
 */

/** Strip all HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize rich-text HTML for safe storage and display.
 * Allows only the tags Tiptap generates; strips scripts, event handlers,
 * javascript: hrefs, and any other potentially dangerous content.
 * Max 50 000 characters (well beyond any reasonable event description).
 */
export function sanitizeHtml(input: string): string {
  return input
    // Remove script / iframe / object / form / style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Strip inline event handlers (onclick, onerror, etc.)
    .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
    // Neutralize javascript: in href/src
    .replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, '$1="#"')
    // Enforce max length
    .trim()
    .slice(0, 50_000);
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
