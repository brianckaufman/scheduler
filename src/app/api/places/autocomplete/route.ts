import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input')?.trim() ?? '';

  if (input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  // Prefer the dedicated server-side key (no referrer restriction).
  // Falls back to the NEXT_PUBLIC key if GOOGLE_PLACES_API_KEY isn't configured yet.
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Maps API not configured' }, { status: 503 });
  }

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
  url.searchParams.set('input', input);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('types', 'establishment|geocode');
  // Language hint — improves result quality
  url.searchParams.set('language', 'en');

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    const data = await res.json();
    return NextResponse.json({
      predictions: data.predictions ?? [],
      status: data.status,
    });
  } catch {
    return NextResponse.json({ predictions: [], error: 'Upstream error' }, { status: 502 });
  }
}
