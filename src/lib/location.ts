/**
 * Location field encoding
 *
 * Three formats stored in the DB `location` TEXT column:
 *
 *  1. Plain text:  "Dave's backyard"
 *  2. Linked:      "Display Label@@https://..."
 *     – Place/address:  URL is a Google Maps link
 *     – Virtual meeting: URL is Zoom/Meet/Teams/etc.
 *  3. Legacy bare URL (backwards compat): "https://..."
 *
 * The `@@` separator was chosen because it can't appear in
 * normal prose or URLs.
 */

const SEP = '@@';

export type ParsedLocation =
  | { type: 'place';   label: string; url: string; secondary?: string }
  | { type: 'virtual'; label: string; url: string }
  | { type: 'text';    text: string };

/** Parse a raw DB location string into a typed structure. */
export function parseLocation(raw: string | null | undefined): ParsedLocation {
  if (!raw?.trim()) return { type: 'text', text: '' };

  const sepIdx = raw.indexOf(SEP);
  if (sepIdx > 0) {
    const label     = raw.slice(0, sepIdx).trim();
    const remainder = raw.slice(sepIdx + SEP.length).trim();
    if (remainder) {
      const isGoogle = remainder.includes('google.com/maps') || remainder.includes('maps.google.com');
      if (isGoogle) {
        // Support optional secondary location: "Label@@MapsURL@@Secondary"
        const secIdx = remainder.indexOf(SEP);
        if (secIdx >= 0) {
          const url       = remainder.slice(0, secIdx).trim();
          const secondary = remainder.slice(secIdx + SEP.length).trim();
          return { type: 'place', label, url, secondary: secondary || undefined };
        }
        return { type: 'place', label, url: remainder };
      }
      return { type: 'virtual', label, url: remainder };
    }
  }

  // Legacy: bare URL stored directly
  if (/^https?:\/\//i.test(raw)) {
    return { type: 'virtual', label: raw, url: raw };
  }

  return { type: 'text', text: raw };
}

/**
 * Normalizes a stored place label for clean display:
 *  - Business name (first segment doesn't start with a digit): show just the name
 *  - Street address (first segment starts with a digit): show "street, city" only
 * Handles legacy labels stored as full Google Places descriptions.
 */
export function normalizePlaceLabel(label: string): string {
  const firstComma = label.indexOf(',');
  if (firstComma === -1) return label;
  const firstPart = label.slice(0, firstComma).trim();
  if (/^\d/.test(firstPart)) {
    // Street address — include city (up to second comma)
    const secondComma = label.indexOf(',', firstComma + 1);
    return secondComma === -1 ? firstPart : label.slice(0, secondComma).trim();
  }
  // Business name — just the name before the first comma
  return firstPart;
}

/** Return the human-readable display label for any ParsedLocation variant. */
export function locationLabel(loc: ParsedLocation): string {
  if (loc.type === 'text') return loc.text;
  if (loc.type === 'place') return normalizePlaceLabel(loc.label);
  return loc.label;
}

/** Build a Google Maps search URL from an address string. */
export function buildMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/** Build a Google Maps place URL from a place_id. */
export function buildMapsPlaceUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}

/**
 * Encode back into the DB string format.
 *   type='text'    → raw text
 *   type='place'   → "address@@maps_url" or "address@@maps_url@@secondary"
 *   type='virtual' → "label@@url"  (or bare url if label empty / equals url)
 */
export function encodeLocation(
  type: 'text' | 'place' | 'virtual',
  label: string,
  url?: string,
  secondary?: string,
): string {
  if (type === 'text' || !url?.trim()) return label;
  const l = label.trim();
  const u = url.trim();
  const s = secondary?.trim();
  // If label is empty or identical to url, store bare url for cleanliness
  if (!l || l === u) return u;
  return s ? `${l}${SEP}${u}${SEP}${s}` : `${l}${SEP}${u}`;
}
