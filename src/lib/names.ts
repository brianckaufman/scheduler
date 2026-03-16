/**
 * Name formatting utilities.
 *
 * The DB stores full names as "First Last". These helpers
 * format names for display throughout the app.
 */

/**
 * Format a full name for display: "First L."
 * - "Brian Kaufman" → "Brian K."
 * - "Brian" → "Brian"
 * - "Brian Lee Smith" → "Brian L."
 */
export function formatDisplayName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

/**
 * Extract first name from a full name.
 * "Brian Kaufman" → "Brian"
 */
export function firstName(fullName: string): string {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0];
}
