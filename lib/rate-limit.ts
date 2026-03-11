/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-instance serverless (Vercel).
 * For multi-instance, use Vercel KV or Upstash Redis.
 */

interface Bucket {
  tokens: number;
  refillAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000; // prevent unbounded growth

/**
 * Check if a request is allowed under the rate limit.
 * @param key   Unique identifier (e.g. IP or userId)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns `{ allowed: true }` or `{ allowed: false, retryAfterMs }`
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  // New or expired bucket
  if (!bucket || now >= bucket.refillAt) {
    // Prune if too many buckets
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (now >= b.refillAt) buckets.delete(k);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { tokens: limit - 1, refillAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.tokens <= 0) {
    return { allowed: false, retryAfterMs: bucket.refillAt - now };
  }

  bucket.tokens--;
  return { allowed: true };
}

/**
 * Extract client IP from Next.js request headers.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}
