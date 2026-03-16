import { cookies } from 'next/headers';
import { createHmac } from 'crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  return process.env.ADMIN_PASSWORD || '';
}

// Create a signed session token
function createToken(): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac('sha256', getSecret())
    .update(timestamp)
    .digest('hex')
    .slice(0, 16);
  return `${timestamp}.${hmac}`;
}

// Verify a session token
function verifyToken(token: string): boolean {
  const [timestamp, sig] = token.split('.');
  if (!timestamp || !sig) return false;

  // Check token is less than 24 hours old
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > SESSION_DURATION * 1000) return false;

  const expected = createHmac('sha256', getSecret())
    .update(timestamp)
    .digest('hex')
    .slice(0, 16);
  return sig === expected;
}

export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return false;
  return verifyToken(session.value);
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
