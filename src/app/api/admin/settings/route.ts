import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings } from '@/lib/settings';
import type { SiteSettings } from '@/types/settings';

// GET: fetch current settings
export async function GET() {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT: update settings (partial update, deep merged)
export async function PUT(request: NextRequest) {
  try {
    const authed = await isAdminAuthenticated();
    if (!authed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates: Partial<SiteSettings> = await request.json();

    // Get current settings from DB
    const supabase = createAdminClient();
    const { data: existing } = await supabase
      .from('site_settings')
      .select('settings')
      .eq('id', 1)
      .single();

    // Merge updates into existing settings
    const currentSettings = (existing?.settings || {}) as Record<string, unknown>;
    const mergedSettings = { ...currentSettings };

    for (const [section, values] of Object.entries(updates)) {
      if (typeof values === 'object' && values !== null) {
        mergedSettings[section] = {
          ...((currentSettings[section] as Record<string, unknown>) || {}),
          ...values,
        };
      }
    }

    const { error } = await supabase
      .from('site_settings')
      .upsert({
        id: 1,
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to save settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
