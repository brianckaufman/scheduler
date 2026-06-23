import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
const ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'assets';
const KINDS = ['logo', 'photo'] as const;

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

/** Organizer-authorized per-event image upload (logo or hero photo). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });

  const { allowed } = checkRateLimit(getIp(request), 'event-upload', { limit: 30, windowSeconds: 3600 });
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file') as File | null;
  const kind = String(form.get('kind') || '');
  const organizerToken = String(form.get('organizer_token') || '');

  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 });
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: 'Invalid kind (logo or photo)' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type. Allowed: ${ALLOWED_EXT.join(', ')}` }, { status: 400 });
  }
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXT.includes(ext)) {
    return NextResponse.json({ error: 'Invalid file extension' }, { status: 400 });
  }

  // Verify the requester is the event organizer.
  const supabase = await createClient();
  const { data: ev } = await supabase.from('events').select('organizer_token').eq('id', id).single();
  if (!ev || ev.organizer_token !== organizerToken) {
    return NextResponse.json({ error: 'Only the organizer can do this' }, { status: 403 });
  }

  const admin = createAdminClient();
  const folder = `events/${id}`;
  const storagePath = `${folder}/${kind}.${ext}`;

  // Remove any prior file for this kind (any extension) so we don't orphan it.
  const { data: existing } = await admin.storage.from(BUCKET).list(folder);
  if (existing?.length) {
    const stale = existing
      .filter((f) => f.name.replace(/\.[^.]+$/, '') === kind)
      .map((f) => `${folder}/${f.name}`);
    if (stale.length) await admin.storage.from(BUCKET).remove(stale);
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: true, cacheControl: '300' });
  if (uploadError) {
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(storagePath);
  return NextResponse.json({ url: `${urlData.publicUrl}?v=${Date.now()}`, kind });
}
