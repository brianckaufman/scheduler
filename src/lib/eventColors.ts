// Preset event accent colors — curated to complement the app and to keep
// enough contrast for white button text at the 500 level. The first is the
// app's default brand accent (used when an event has no color).
export const EVENT_COLOR_PRESETS: { hex: string; name: string }[] = [
  { hex: '#0373F6', name: 'Blue' },
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#7C3AED', name: 'Violet' },
  { hex: '#DB2777', name: 'Pink' },
  { hex: '#EA580C', name: 'Orange' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#0D9488', name: 'Teal' },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

/** Normalize/validate a hex color. Returns a lowercased #rrggbb or null. */
export function normalizeHex(input: string): string | null {
  let v = input.trim();
  if (!v) return null;
  if (!v.startsWith('#')) v = `#${v}`;
  // expand #rgb → #rrggbb
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return HEX_RE.test(v) ? v.toLowerCase() : null;
}
