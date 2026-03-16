import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 60 * 60 * 24; // 24 hours

// ── Rate limiting for login attempts ────────────────────────────
// Tracks failed attempts per IP. Resets after the window expires.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes after max attempts

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, AttemptRecord>();

// Clean up stale entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts) {
    if (now - record.firstAttempt > WINDOW_MS && now > record.lockedUntil) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if an IP is currently rate-limited.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record) return { allowed: true };

  // Currently locked out?
  if (record.lockedUntil > now) {
    return { allowed: false, retryAfterMs: record.lockedUntil - now };
  }

  // Window expired? Reset.
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  // Under the limit?
  if (record.count < MAX_ATTEMPTS) return { allowed: true };

  // Just hit the limit -- lock them out
  record.lockedUntil = now + LOCKOUT_MS;
  return { allowed: false, retryAfterMs: LOCKOUT_MS };
}

/**
 * Record a failed login attempt for an IP.
 */
export function recordFailedLogin(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, lockedUntil: 0 });
  } else {
    record.count++;
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS;
    }
  }
}

/**
 * Clear failed attempts for an IP (on successful login).
 */
export function clearLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// ── Helpers ─────────────────────────────────────────────────────

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

// Verify a session token (timing-safe comparison)
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

  // Timing-safe comparison to prevent timing attacks
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Verify the admin password using timing-safe comparison.
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  // Pad to equal length for timingSafeEqual (requires same-length buffers)
  const maxLen = Math.max(password.length, adminPassword.length);
  const a = Buffer.alloc(maxLen, 0);
  const b = Buffer.alloc(maxLen, 0);
  Buffer.from(password).copy(a);
  Buffer.from(adminPassword).copy(b);

  // Both length must match AND content must match
  return password.length === adminPassword.length && timingSafeEqual(a, b);
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
