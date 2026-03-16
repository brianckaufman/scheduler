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

    // Delete any existing files at this path before uploading
    const { data: existingFiles } = await supabase.storage
      .from(BUCKET)
      .list('', { search: path });

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles
        .filter((f) => f.name.startsWith(path))
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
      });

    if (uploadError) {
      console.error('Upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: storagePath,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
