'use client';

import { EVENT_COLOR_PRESETS, normalizeHex } from '@/lib/eventColors';

/**
 * Low-noise event accent picker: a "default" option, a curated preset palette,
 * and a native custom-color swatch. Value is a #hex string ('' = app default).
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
  const ringClass = 'ring-2 ring-offset-2 ring-offset-surface ring-strong';

  return (
    <div>
      <label className="block text-sm font-medium text-body mb-1.5">
        Event color <span className="text-faint font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {/* Default (app accent) */}
        <button
          type="button"
          title="Default"
          onClick={() => onChange('')}
          className={`w-7 h-7 rounded-full bg-subtle border border-strong flex items-center justify-center cursor-pointer transition-transform hover:scale-110 ${!current ? ringClass : ''}`}
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
            onClick={() => onChange(p.hex)}
            style={{ backgroundColor: p.hex }}
            className={`w-7 h-7 rounded-full cursor-pointer transition-transform hover:scale-110 ${current === p.hex.toLowerCase() ? ringClass : ''}`}
          />
        ))}

        {/* Custom hex — native color input styled as a swatch */}
        <label
          title="Custom color"
          className={`relative w-7 h-7 rounded-full cursor-pointer overflow-hidden flex items-center justify-center border border-strong transition-transform hover:scale-110 ${current && !isPreset ? ringClass : ''}`}
          style={current && !isPreset ? { backgroundColor: current } : undefined}
        >
          {!(current && !isPreset) && (
            <svg className="w-3.5 h-3.5 text-faint pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6-6 3 3-6 6H9v-3z" />
            </svg>
          )}
          <input
            type="color"
            value={current || '#0373F6'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </label>
      </div>
      <p className="text-xs text-faint mt-1.5">Tints buttons and highlights on your event page.</p>
    </div>
  );
}
