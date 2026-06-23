// WCAG contrast helpers — power the brand-color guardrail (§1.1 of the brief).
// Never ship an unreadable brand/text combination.

function hexToRgb(hex: string): [number, number, number] | null {
  let v = hex.trim().replace(/^#/, '');
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(v)) return null;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function relLuminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** Contrast ratio (1–21) between two hex colors. */
export function contrastRatio(hex1: string, hex2: string): number {
  const a = hexToRgb(hex1), b = hexToRgb(hex2);
  if (!a || !b) return 1;
  const l1 = relLuminance(a), l2 = relLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const INK = '#171A2B';

/** Readable text color (white or ink) for a given background. */
export function readableTextOn(bgHex: string, ink: string = INK): '#FFFFFF' | string {
  return contrastRatio(bgHex, '#FFFFFF') >= contrastRatio(bgHex, ink) ? '#FFFFFF' : ink;
}

/** Does white text pass WCAG AA on this background? (4.5:1 normal, 3:1 large.) */
export function passesOnWhite(bgHex: string, large = false): boolean {
  return contrastRatio(bgHex, '#FFFFFF') >= (large ? 3 : 4.5);
}

/** Guardrail result for a host-chosen brand color used as a button background. */
export function brandButtonGuard(bgHex: string): { textColor: string; warn: boolean } {
  const textColor = readableTextOn(bgHex);
  // Warn if even the better of white/ink can't clear AA for normal text.
  const best = Math.max(contrastRatio(bgHex, '#FFFFFF'), contrastRatio(bgHex, INK));
  return { textColor, warn: best < 4.5 };
}
