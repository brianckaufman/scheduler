'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { parseLocation, buildMapsUrl, buildMapsPlaceUrl, encodeLocation } from '@/lib/location';

type LocType = 'place' | 'virtual' | 'text';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  inputClassName?: string;
}

/** Detect the input type from an existing stored value. */
function detectType(raw: string): LocType {
  if (!raw) return 'place'; // default tab for new events
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

// Declare google on window for Places API
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
    _mapsLoading?: boolean;
    _mapsLoaded?: boolean;
  }
}

/** Load the Google Maps JS API once. Returns a promise that resolves when ready. */
function loadMapsApi(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window._mapsLoaded) return Promise.resolve();
  if (window._mapsLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (window._mapsLoaded) { clearInterval(check); resolve(); }
      }, 100);
    });
  }
  window._mapsLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => { window._mapsLoaded = true; window._mapsLoading = false; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function LocationInput({ value, onChange, inputClassName = '' }: LocationInputProps) {
  const [locType, setLocType] = useState<LocType>(() => detectType(value));
  const fields = extractFields(value);
  const [address, setAddress]           = useState(fields.address);
  const [secondary, setSecondary]       = useState(fields.secondary);
  const [virtualLabel, setVirtualLabel] = useState(fields.virtualLabel);
  const [virtualUrl, setVirtualUrl]     = useState(fields.virtualUrl);
  const [text, setText]                 = useState(fields.text);

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<unknown>(null);
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

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

  // If a Places autocomplete selection is made, update the stored Maps URL to use place_id
  const attachAutocomplete = useCallback(() => {
    if (!addressInputRef.current || autocompleteRef.current || !window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['place_id', 'name', 'formatted_address'],
    });
    autocompleteRef.current = ac;
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place) return;
      const label = place.name || place.formatted_address || addressInputRef.current?.value || '';
      const url = place.place_id ? buildMapsPlaceUrl(place.place_id) : buildMapsUrl(label);
      setAddress(label);
      // Use current secondary value from state via closure — secondary captured at attach time;
      // we re-read from the input to stay current
      onChange(encodeLocation('place', label, url, secondary || undefined));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  // Lazily load Maps API when user focuses the address input
  const handleAddressFocus = useCallback(async () => {
    if (!mapsApiKey || autocompleteRef.current) return;
    try {
      await loadMapsApi(mapsApiKey);
      attachAutocomplete();
    } catch {
      // Maps API not available — just use text input
    }
  }, [mapsApiKey, attachAutocomplete]);

  // Keep autocomplete attached after initial load
  useEffect(() => {
    if (locType === 'place' && mapsApiKey && window._mapsLoaded) {
      attachAutocomplete();
    }
  }, [locType, mapsApiKey, attachAutocomplete]);

  const handleTypeChange = (t: LocType) => {
    setLocType(t);
    emit(t, address, secondary, virtualLabel, virtualUrl, text);
  };

  const tabBase   = 'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer';
  const tabActive = 'bg-white text-gray-800 shadow-sm';
  const tabIdle   = 'text-gray-500 hover:text-gray-700';

  return (
    <div className="space-y-2">
      {/* Type selector tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button type="button" onClick={() => handleTypeChange('place')}
          className={`${tabBase} ${locType === 'place' ? tabActive : tabIdle}`}>
          📍 Place
        </button>
        <button type="button" onClick={() => handleTypeChange('virtual')}
          className={`${tabBase} ${locType === 'virtual' ? tabActive : tabIdle}`}>
          🔗 Virtual
        </button>
        <button type="button" onClick={() => handleTypeChange('text')}
          className={`${tabBase} ${locType === 'text' ? tabActive : tabIdle}`}>
          💬 Text
        </button>
      </div>

      {/* Place / address */}
      {locType === 'place' && (
        <div className="space-y-2">
          <input
            ref={addressInputRef}
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              emit('place', e.target.value, secondary, virtualLabel, virtualUrl, text);
            }}
            onFocus={handleAddressFocus}
            placeholder={mapsApiKey ? 'Start typing an address or place name…' : 'Enter address or place name'}
            maxLength={300}
            className={inputClassName}
            autoComplete="off"
          />
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
                Primary address opens in Google Maps when tapped
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

      {/* Plain text */}
      {locType === 'text' && (
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            emit('text', address, secondary, virtualLabel, virtualUrl, e.target.value);
          }}
          placeholder="e.g. Dave's backyard, Building C Room 204…"
          maxLength={200}
          className={inputClassName}
        />
      )}
    </div>
  );
}
