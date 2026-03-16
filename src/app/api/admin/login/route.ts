import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import {
  verifyPassword,
  setAdminSession,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginAttempts,
} from '@/lib/admin-auth';

export async function POST(request: Request) {
  try {
    // Get client IP for rate limiting
    const hdrs = await headers();
    const ip =
      hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      hdrs.get('x-real-ip') ||
      'unknown';

    // Check rate limit before processing
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      const retryMinutes = Math.ceil((rateCheck.retryAfterMs || 0) / 60000);
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${retryMinutes} minute${retryMinutes !== 1 ? 's' : ''}.` },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    if (!verifyPassword(password)) {
      recordFailedLogin(ip);
      // Generic error message (don't reveal whether the password field is close)
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Successful login: clear failed attempts and set session
    clearLoginAttempts(ip);
    await setAdminSession();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
