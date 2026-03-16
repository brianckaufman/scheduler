import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico', 'gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'assets';

export async function POST(request: Request) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const path = formData.get('path') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Path is required (e.g., "og-image", "favicon", "logo")' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const storagePath = `${path}.${ext}`;

    // Delete ALL existing files that match this path prefix (any extension)
    // This ensures replacing e.g. og.png with og.jpg doesn't leave the old .png behind
    const { data: allFiles } = await supabase.storage
      .from(BUCKET)
      .list('');

    if (allFiles && allFiles.length > 0) {
      const filesToDelete = allFiles
        .filter((f) => {
          // Match files where the name (minus extension) equals the path
          const nameWithoutExt = f.name.replace(/\.[^.]+$/, '');
          return nameWithoutExt === path;
        })
        .map((f) => f.name);

      if (filesToDelete.length > 0) {
        await supabase.storage.from(BUCKET).remove(filesToDelete);
      }
    }

    // Upload the new file
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
        cacheControl: '300', // 5 min cache instead of default 1 hour
      });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL with cache-busting param
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    const cacheBustedUrl = `${urlData.publicUrl}?v=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: cacheBustedUrl,
      path: storagePath,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
