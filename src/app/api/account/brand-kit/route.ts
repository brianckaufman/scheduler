import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeHex } from '@/lib/eventColors';

/** The signed-in user's brand kit (account-level defaults). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data } = await supabase.from('brand_kits').select('*').eq('user_id', user.id).maybeSingle();
  return NextResponse.json({ brandKit: data ?? null });
}

/** Create/update the signed-in user's brand kit. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const row = {
    user_id: user.id,
    brand_color: typeof body.brand_color === 'string' ? normalizeHex(body.brand_color) : null,
    icon_bg: typeof body.icon_bg === 'string' ? normalizeHex(body.icon_bg) : null,
    icon_fg: typeof body.icon_fg === 'string' ? normalizeHex(body.icon_fg) : null,
    logo_url: typeof body.logo_url === 'string' && body.logo_url ? body.logo_url : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('brand_kits')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ brandKit: data });
}
