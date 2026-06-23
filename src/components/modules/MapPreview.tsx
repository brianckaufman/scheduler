'use client';

import { useState } from 'react';
import { parseLocation, locationLabel, buildMapsUrl } from '@/lib/location';
import { PinIcon } from '../ui/icons';

/**
 * Static map for a physical venue, with a brand pin + venue chip; tap →
 * directions. Self-hides if the map can't load (no key / geocode miss / virtual
 * event) so the layout reflows cleanly.
 */
export default function MapPreview({ eventId, location }: { eventId: string; location: string }) {
  const [failed, setFailed] = useState(false);
  const parsed = parseLocation(location);
  if (failed || parsed.type === 'virtual') return null;

  const label = locationLabel(parsed);

  return (
    <a
      href={buildMapsUrl(label)}
      target="_blank"
      rel="noopener noreferrer"
      className="block relative rounded-card overflow-hidden border border-hairline-soft"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/events/${eventId}/map`}
        alt=""
        onError={() => setFailed(true)}
        className="w-full h-[160px] object-cover"
      />
      <div className="absolute left-2 bottom-2 flex items-center gap-1.5 rounded-chip bg-surface/90 backdrop-blur px-2.5 py-1.5 shadow-card max-w-[80%]">
        <PinIcon className="w-3.5 h-3.5 text-icon-fg shrink-0" />
        <span className="text-xs font-semibold text-body truncate">{label}</span>
      </div>
    </a>
  );
}
