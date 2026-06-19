import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function isUUID(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Whether the current user has saved a given event: ?event_id=... */
export async function GET(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ saved: false, authed: false });
  const eventId = new URL(request.url).searchParams.get('event_id');
  if (!isUUID(eventId)) return NextResponse.json({ saved: false, authed: true });
  const { data } = await supabase
    .from('saved_events').select('event_id').eq('user_id', user.id).eq('event_id', eventId).maybeSingle();
  return NextResponse.json({ saved: !!data, authed: true });
}

/** Save / bookmark an event to the user's account. */
export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { event_id } = await request.json().catch(() => ({}));
  if (!isUUID(event_id)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const { error } = await supabase
    .from('saved_events')
    .upsert({ user_id: user.id, event_id }, { onConflict: 'user_id,event_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: true });
}

/** Remove a saved event. */
export async function DELETE(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { event_id } = await request.json().catch(() => ({}));
  if (!isUUID(event_id)) return NextResponse.json({ error: 'Invalid event' }, { status: 400 });

  const { error } = await supabase
    .from('saved_events')
    .delete()
    .eq('user_id', user.id)
    .eq('event_id', event_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved: false });
}
