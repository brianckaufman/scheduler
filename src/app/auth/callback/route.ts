import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth + email-confirmation callback. Supabase redirects here with a `code`
 * that we exchange for a session. Used by Google sign-in and the email
 * confirmation / magic links.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // Where to send the user afterwards (defaults to their account page).
  const next = searchParams.get('next') ?? '/account';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/account'}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}
