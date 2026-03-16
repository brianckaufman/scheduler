import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settings';

/**
 * Dynamic /favicon.ico route.
 *
 * Browsers always request /favicon.ico regardless of <link rel="icon"> tags.
 * This route redirects to the admin-uploaded favicon from Supabase storage.
 * If none is set, returns a 204 No Content (invisible, no console 404 errors).
 */
export async function GET() {
  const settings = await getSettings();
  const faviconUrl = settings.seo.favicon;

  if (faviconUrl) {
    // Strip cache-bust param for the redirect (browser will cache the redirect target)
    const cleanUrl = faviconUrl.split('?')[0];
    return NextResponse.redirect(cleanUrl, {
      status: 302, // temporary redirect so it re-checks on each visit
    });
  }

  // No favicon configured — return empty response (avoids 404 in console)
  return new NextResponse(null, { status: 204 });
}
