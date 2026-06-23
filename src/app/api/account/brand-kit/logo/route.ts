import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const BUCKET = 'assets';

/** Authenticated: upload the account brand-kit logo. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }
  const file = form.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXT.includes(ext)) return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });

  const admin = createAdminClient();
  const folder = 'brand-kits';
  const storagePath = `${folder}/${user.id}.${ext}`;

  const { data: existing } = await admin.storage.from(BUCKET).list(folder);
  if (existing?.length) {
    const stale = existing.filter((f) => f.name.replace(/\.[^.]+$/, '') === user.id).map((f) => `${folder}/${f.name}`);
    if (stale.length) await admin.storage.from(BUCKET).remove(stale);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: true, cacheControl: '300' });
  if (uploadError) return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({ url: `${urlData.publicUrl}?v=${Date.now()}` });
}
