import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseLocation, locationLabel } from '@/lib/location';
import { geocodeAddress } from '@/lib/geocode';

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

/**
 * Static map image proxy — keeps the Google key server-side, geocodes the venue
 * lazily (caching lat/lng on the event), and returns a branded static map.
 * Any miss (no key, virtual/empty location, geocode fail) → 404 so the client
 * just hides the map module.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return new NextResponse(null, { status: 400 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return new NextResponse(null, { status: 404 });

  const supabase = await createClient();
  const { data: ev } = await supabase
    .from('events').select('location, lat, lng, color').eq('id', id).single();
  if (!ev) return new NextResponse(null, { status: 404 });

  const parsed = parseLocation(ev.location);
  if (parsed.type === 'virtual' || !ev.location) return new NextResponse(null, { status: 404 });

  let lat = ev.lat as number | null;
  let lng = ev.lng as number | null;

  if (lat == null || lng == null) {
    const geo = await geocodeAddress(locationLabel(parsed));
    if (!geo) return new NextResponse(null, { status: 404 });
    lat = geo.lat; lng = geo.lng;
    // Cache for next time (best-effort).
    try { await createAdminClient().from('events').update({ lat, lng }).eq('id', id); } catch { /* ignore */ }
  }

  const pin = ((ev.color as string | null) || '#0373F6').replace('#', '0x');
  const mapUrl =
    `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}` +
    `&zoom=15&size=600x280&scale=2&maptype=roadmap` +
    `&markers=color:${pin}%7C${lat},${lng}&key=${key}`;

  const img = await fetch(mapUrl);
  if (!img.ok) return new NextResponse(null, { status: 404 });
  const body = await img.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': img.headers.get('content-type') || 'image/png',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
