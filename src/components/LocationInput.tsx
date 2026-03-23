'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { parseLocation, buildMapsUrl, buildMapsPlaceUrl, encodeLocation } from '@/lib/location';

type LocType = 'place' | 'virtual' | 'text';

interface Prediction {
  description: string;
  place_id: string;
  types?: string[];
  structured_formatting?: { main_text: string; secondary_text?: string };
}

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}

/** Detect the input type from an existing stored value. */
function detectType(raw: string): LocType {
  if (!raw) return 'place';
  const parsed = parseLocation(raw);
  if (parsed.type === 'place')   return 'place';
  if (parsed.type === 'virtual') return 'virtual';
  return 'text';
}

/** Extract sub-fields from an existing stored value. */
function extractFields(raw: string): { address: string; secondary: string; virtualLabel: string; virtualUrl: string; text: string } {
  const parsed = parseLocation(raw);
  if (parsed.type === 'place')   return { address: parsed.label, secondary: parsed.secondary ?? '', virtualLabel: '', virtualUrl: '', text: '' };
  if (parsed.type === 'virtual') return { address: '', secondary: '', virtualLabel: parsed.label === parsed.url ? '' : parsed.label, virtualUrl: parsed.url, text: '' };
  return { address: '', secondary: '', virtualLabel: '', virtualUrl: '', text: (parsed as { text: string }).text };
}

export default function LocationInput({ value, onChange, inputClassName = '' }: LocationInputProps) {
  const [locType, setLocType]           = useState<LocType>(() => detectType(value));
  const fields = extractFields(value);
  const [address, setAddress]           = useState(fields.address);
  const [secondary, setSecondary]       = useState(fields.secondary);
  const [virtualLabel, setVirtualLabel] = useState(fields.virtualLabel);
  const [virtualUrl, setVirtualUrl]     = useState(fields.virtualUrl);
  const [text, setText]                 = useState(fields.text);

  const [predictions, setPredictions]   = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex]   = useState(-1);
  const [fetching, setFetching]         = useState(false);
  const [dropdownPos, setDropdownPos]   = useState<{ top: number; left: number; width: number } | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef   = useRef<HTMLDivElement>(null);
  const mapsApiKey   = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  /** Measure the input wrapper and store its page-relative position for the portal. */
  const updateDropdownPos = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setDropdownPos({
      top:   rect.bottom + window.scrollY + 4,
      left:  rect.left   + window.scrollX,
      width: rect.width,
    });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Emit the encoded value whenever sub-fields change
  const emit = useCallback((type: LocType, a: string, sec: string, vl: string, vu: string, t: string) => {
    switch (type) {
      case 'place':
        onChange(a ? encodeLocation('place', a, buildMapsUrl(a), sec || undefined) : '');
        break;
      case 'virtual':
        onChange(vu ? encodeLocation('virtual', vl, vu) : '');
        break;
      case 'text':
        onChange(t);
        break;
    }
  }, [onChange]);

  // Fetch autocomplete predictions via our own API route (avoids referrer/CSP issues)
  const fetchPredictions = useCallback(async (input: string) => {
    if (!mapsApiKey || input.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setFetching(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      const preds = data.predictions ?? [];
      setPredictions(preds);
      if (preds.length > 0) {
        updateDropdownPos();
        setShowDropdown(true);
      } else {
        setShowDropdown(false);
      }
    } catch {
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setFetching(false);
    }
  }, [mapsApiKey, updateDropdownPos]);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setActiveIndex(-1);
    emit('place', val, secondary, virtualLabel, virtualUrl, text);
    // Debounce API calls
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 280);
  };

  const handleSelectPrediction = (p: Prediction) => {
    const mainText = p.structured_formatting?.main_text ?? p.description;
    const secondaryText = p.structured_formatting?.secondary_text ?? '';
    const isEstablishment = p.types?.some(t =>
      ['establishment', 'point_of_interest', 'food', 'restaurant', 'bar', 'store', 'lodging'].includes(t)
    );
    // For businesses: just the name. For addresses: name + city (first segment of secondary).
    const city = secondaryText.split(',')[0]?.trim() ?? '';
    const label = isEstablishment || !city ? mainText : `${mainText}, ${city}`;
    const url   = buildMapsPlaceUrl(p.place_id);
    setAddress(label);
    onChange(encodeLocation('place', label, url, secondary || undefined));
    setPredictions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  const handleAddressKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || predictions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelectPrediction(predictions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleTypeChange = (t: LocType) => {
    setLocType(t);
    setPredictions([]);
    setShowDropdown(false);
    emit(t, address, secondary, virtualLabel, virtualUrl, text);
  };

  const tabBase   = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5';
  const tabActive = 'bg-white text-gray-800 shadow-sm';
  const tabIdle   = 'text-gray-500 hover:text-gray-700';

  return (
    <div className="space-y-2">
      {/* Type selector tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button type="button" onClick={() => handleTypeChange('place')}
          className={`${tabBase} ${locType === 'place' ? tabActive : tabIdle}`}>
          {/* Map pin — links to Google Maps */}
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          Address
        </button>
        <button type="button" onClick={() => handleTypeChange('virtual')}
          className={`${tabBase} ${locType === 'virtual' ? tabActive : tabIdle}`}>
          {/* Monitor screen — virtual/online meeting */}
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          Virtual
        </button>
        <button type="button" onClick={() => handleTypeChange('text')}
          className={`${tabBase} ${locType === 'text' ? tabActive : tabIdle}`}>
          {/* Building — a venue described in plain text */}
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V7l7-4 7 4v14" />
            <path d="M9 21v-4h6v4" />
            <path d="M9 11h.01M15 11h.01M9 15h.01M15 15h.01" />
          </svg>
          Place
        </button>
      </div>

      {/* Address tab */}
      {locType === 'place' && (
        <div className="space-y-2">
          {/* Address input with autocomplete dropdown */}
          <div ref={wrapperRef} className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={handleAddressKeyDown}
              onFocus={() => { if (predictions.length > 0) { updateDropdownPos(); setShowDropdown(true); } }}
              placeholder="Start typing an address or place name…"
              maxLength={300}
              className={inputClassName}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showDropdown}
            />

            {/* Spinner while fetching */}
            {fetching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              </div>
            )}

            {/* Suggestions dropdown — rendered in a portal so it escapes
                any parent overflow:hidden / stacking context in the form */}
            {showDropdown && predictions.length > 0 && dropdownPos && typeof document !== 'undefined' &&
              createPortal(
                <ul
                  style={{
                    position: 'absolute',
                    top:   dropdownPos.top,
                    left:  dropdownPos.left,
                    width: dropdownPos.width,
                    zIndex: 9999,
                  }}
                  className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
                >
                  {predictions.map((p, i) => (
                    <li key={p.place_id}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); handleSelectPrediction(p); }}
                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors cursor-pointer ${
                          i === activeIndex ? 'bg-violet-50 text-violet-900' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                          <circle cx="12" cy="9" r="2.5" />
                        </svg>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate font-medium">{p.structured_formatting?.main_text ?? p.description}</span>
                          {p.structured_formatting?.secondary_text && (
                            <span className="truncate text-xs text-gray-400 font-normal">{p.structured_formatting.secondary_text}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>,
                document.body
              )
            }
          </div>

          {/* Secondary location */}
          {address && (
            <>
              <input
                type="text"
                value={secondary}
                onChange={(e) => {
                  setSecondary(e.target.value);
                  emit('place', address, e.target.value, virtualLabel, virtualUrl, text);
                }}
                placeholder="Room, suite, floor, or directions once there (optional)"
                maxLength={150}
                className={inputClassName}
              />
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Tapping the address opens Google Maps
              </p>
            </>
          )}
        </div>
      )}

      {/* Virtual meeting link */}
      {locType === 'virtual' && (
        <div className="space-y-2">
          <input
            type="url"
            value={virtualUrl}
            onChange={(e) => {
              setVirtualUrl(e.target.value);
              emit('virtual', address, secondary, virtualLabel, e.target.value, text);
            }}
            placeholder="https://zoom.us/j/… or any meeting URL"
            maxLength={500}
            className={inputClassName}
          />
          <input
            type="text"
            value={virtualLabel}
            onChange={(e) => {
              setVirtualLabel(e.target.value);
              emit('virtual', address, secondary, e.target.value, virtualUrl, text);
            }}
            placeholder="Label (optional) — e.g. Zoom Meeting, Google Meet"
            maxLength={100}
            className={inputClassName}
          />
          {virtualUrl && (
            <p className="flex items-center gap-1 text-xs text-gray-400">
              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Opens in a new tab when tapped
            </p>
          )}
        </div>
      )}

      {/* Plain text / named place */}
      {locType === 'text' && (
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emit('text', address, secondary, virtualLabel, virtualUrl, e.target.value);
          }}
          placeholder="e.g. Dave's backyard, The Grand Ballroom, Rooftop Terrace…"
          maxLength={200}
          className={inputClassName}
        />
      )}
    </div>
  );
}
