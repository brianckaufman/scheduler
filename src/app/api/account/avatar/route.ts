import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX = 4 * 1024 * 1024; // 4 MB
const BUCKET = 'assets';

/** Upload (or replace) the signed-in user's profile avatar. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Use a PNG, JPG, WebP, or GIF image.' }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: 'Image must be under 4 MB.' }, { status: 400 });

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : file.type === 'image/gif' ? 'gif' : 'jpg';
  const path = `avatars/${user.id}.${ext}`;

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Cache-bust so the new image shows immediately.
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbErr } = await admin
    .from('profiles')
    .upsert({ id: user.id, avatar_url: avatarUrl }, { onConflict: 'id' });
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ avatar_url: avatarUrl });
}

/** Remove the avatar. */
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  await admin.from('profiles').upsert({ id: user.id, avatar_url: null }, { onConflict: 'id' });
  return NextResponse.json({ avatar_url: null });
}
