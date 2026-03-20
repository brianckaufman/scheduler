import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Vercel Cron: runs daily to delete events older than 90 days with no recent activity.
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * *" }] }

const CRON_SECRET = process.env.CRON_SECRET;
const TTL_DAYS = 90;

export async function GET(request: NextRequest) {
  // Require Authorization header matching CRON_SECRET env var
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TTL_DAYS);

  // Find events older than TTL_DAYS that are not finalized
  // (finalized events are kept — they're the record of a real meeting)
  const { data: staleEvents, error: fetchError } = await supabase
    .from('events')
    .select('id, slug, name, created_at')
    .lt('created_at', cutoff.toISOString())
    .is('finalized_time', null);

  if (fetchError) {
    console.error('Cron cleanup fetch error:', fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!staleEvents || staleEvents.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'No stale events found.' });
  }

  const ids = staleEvents.map((e) => e.id);

  // Cascade: slots → participants → events
  await supabase.from('availability_slots').delete().in('event_id', ids);
  await supabase.from('participants').delete().in('event_id', ids);
  const { error: deleteError } = await supabase.from('events').delete().in('id', ids);

  if (deleteError) {
    console.error('Cron cleanup delete error:', deleteError.message);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  console.log(`Cron cleanup: deleted ${ids.length} stale events older than ${TTL_DAYS} days.`);
  return NextResponse.json({ deleted: ids.length, ttl_days: TTL_DAYS });
}
