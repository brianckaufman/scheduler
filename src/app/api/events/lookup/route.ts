import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Lightweight endpoint to check if an event exists and get its current status.
 * Used by the ReturningUserBanner to validate saved events and refresh finalized status.
 * Returns only non-sensitive fields.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug || typeof slug !== 'string' || slug.length > 50) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('name, finalized_time')
    .eq('slug', slug)
    .single();

  if (error) {
    // PGRST116 = "no rows returned" → genuine not-found
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    // Any other error (connection failure, misconfiguration, etc.) → 500
    return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({
    name: data.name,
    finalized_time: data.finalized_time,
  });
}
