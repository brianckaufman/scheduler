import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings, deepMerge } from '@/lib/settings';
import type { SiteSettings } from '@/types/settings';

// GET: fetch current settings (merged with defaults)
export async function GET() {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT: update settings
export async function PUT(request: Request) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates = body.settings as Partial<SiteSettings>;

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch existing settings from DB and deep-merge updates into them
    const { data: existing } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    const currentSettings = (existing?.settings || {}) as Record<string, unknown>;
    const mergedSettings = deepMerge(currentSettings, updates);

    const { error } = await supabase
      .from('site_settings')
      .upsert(
        { id: 1, settings: mergedSettings, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) {
      console.error('Failed to update settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    // Bust Next.js server component cache so all pages pick up new settings
    // Using 'layout' type invalidates the root layout + all child pages
    revalidatePath('/', 'layout');

    // Return the fully merged settings (with defaults filled in)
    const finalSettings = await getSettings();
    return NextResponse.json({ settings: finalSettings });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
