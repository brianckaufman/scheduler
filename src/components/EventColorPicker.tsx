'use client';

import { useState } from 'react';
import { EVENT_COLOR_PRESETS, normalizeHex } from '@/lib/eventColors';

const RAINBOW =
  'conic-gradient(from 90deg, #ef4444, #f59e0b, #84cc16, #06b6d4, #3b82f6, #8b5cf6, #ec4899, #ef4444)';

/**
 * Low-noise event accent picker: a "default" option, a curated preset palette,
 * and a custom color entered as a hex value (with an optional visual swatch).
 * Value is a #hex string ('' = app default).
 */
export default function EventColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const current = normalizeHex(value);
  const isPreset = EVENT_COLOR_PRESETS.some((p) => p.hex.toLowerCase() === current);
  const [customOpen, setCustomOpen] = useState<boolean>(!!current && !isPreset);
  const ring = 'ring-2 ring-offset-2 ring-offset-surface ring-strong';

  return (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">
        Event color <span className="text-faint font-normal">(optional)</span>
      </label>

      {/* Padding gives the selection ring room so it isn't clipped by the
          surrounding overflow-hidden (the "More options" slide-down). */}
      <div className="flex flex-wrap items-center gap-2 p-1.5">
        {/* Default (app accent) */}
        <button
          type="button"
          title="Default"
          onClick={() => { onChange(''); setCustomOpen(false); }}
          className={`w-7 h-7 rounded-full bg-subtle border border-strong flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${!current ? ring : ''}`}
        >
          <svg className="w-3.5 h-3.5 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M5 19L19 5" />
          </svg>
        </button>

        {EVENT_COLOR_PRESETS.map((p) => (
          <button
            key={p.hex}
            type="button"
            title={p.name}
            onClick={() => { onChange(p.hex); setCustomOpen(false); }}
            style={{ backgroundColor: p.hex }}
            className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 ${current === p.hex.toLowerCase() ? ring : ''}`}
          />
        ))}

        {/* Custom — rainbow when unset, the chosen color when set. Opens a hex field. */}
        <button
          type="button"
          title="Custom color"
          onClick={() => setCustomOpen((o) => !o)}
          className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 border border-strong ${current && !isPreset ? ring : ''}`}
          style={current && !isPreset ? { backgroundColor: current } : { background: RAINBOW }}
        />
      </div>

      {customOpen && (
        <div className="flex items-center gap-2 mt-1 px-1.5">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => { const n = normalizeHex(value); if (n) onChange(n); }}
            placeholder="#0373F6"
            maxLength={7}
            spellCheck={false}
            autoCapitalize="none"
            className="w-28 px-3 py-2 rounded-lg border border-hairline bg-surface text-heading text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          {/* Optional visual picker / live preview swatch */}
          <label
            className="relative w-9 h-9 rounded-lg border border-strong overflow-hidden cursor-pointer shrink-0"
            style={{ backgroundColor: current || '#0373F6' }}
            title="Pick visually"
          >
            <input
              type="color"
              value={current || '#0373F6'}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
      )}

      <p className="text-xs text-faint mt-1.5">Tints buttons and highlights on your event page.</p>
    </div>
  );
}
