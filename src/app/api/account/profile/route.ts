import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Update the signed-in user's display name. */
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const display_name =
    typeof body.display_name === 'string' ? body.display_name.trim().slice(0, 50) : '';

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: user.id, display_name: display_name || null }, { onConflict: 'id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, display_name: display_name || null });
}
