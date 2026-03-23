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
  | { type: 'place';   label: string; url: string }
  | { type: 'virtual'; label: string; url: string }
  | { type: 'text';    text: string };

/** Parse a raw DB location string into a typed structure. */
export function parseLocation(raw: string | null | undefined): ParsedLocation {
  if (!raw?.trim()) return { type: 'text', text: '' };

  const sepIdx = raw.indexOf(SEP);
  if (sepIdx > 0) {
    const label = raw.slice(0, sepIdx).trim();
    const url   = raw.slice(sepIdx + SEP.length).trim();
    if (url) {
      const isGoogle = url.includes('google.com/maps') || url.includes('maps.google.com');
      return isGoogle
        ? { type: 'place',   label, url }
        : { type: 'virtual', label, url };
    }
  }

  // Legacy: bare URL stored directly
  if (/^https?:\/\//i.test(raw)) {
    return { type: 'virtual', label: raw, url: raw };
  }

  return { type: 'text', text: raw };
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
 *   type='place'   → "address@@maps_url"
 *   type='virtual' → "label@@url"  (or bare url if label empty / equals url)
 */
export function encodeLocation(
  type: 'text' | 'place' | 'virtual',
  label: string,
  url?: string,
): string {
  if (type === 'text' || !url?.trim()) return label;
  const l = label.trim();
  const u = url.trim();
  // If label is empty or identical to url, store bare url for cleanliness
  if (!l || l === u) return u;
  return `${l}${SEP}${u}`;
}
