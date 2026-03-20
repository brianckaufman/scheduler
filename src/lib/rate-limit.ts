/**
 * Simple in-memory rate limiter for API routes.
 * Tracks requests by IP address with a sliding window.
 *
 * Limitation: Vercel runs multiple serverless function instances in parallel,
 * so this store is not shared across instances — each instance has its own counter.
 * This catches burst abuse within a single instance but not distributed abuse.
 *
 * To upgrade for production scale, replace this store with Vercel KV (Redis):
 *   https://vercel.com/docs/storage/vercel-kv
 * Use `kv.incr` + `kv.expire` for atomic, cross-instance rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export function checkRateLimit(
  ip: string,
  action: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${action}:${ip}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // First request or window expired — start fresh
    const resetAt = now + options.windowSeconds * 1000;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt };
  }

  if (entry.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: options.limit - entry.count, resetAt: entry.resetAt };
}
