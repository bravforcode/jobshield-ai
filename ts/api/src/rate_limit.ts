// In-memory token-bucket rate limiter. Simple, per-process, no external
// dependencies. Resets per window. For a single-process Bun.serve this is
// sufficient; for multi-process deploys, swap with a Redis-backed limiter.
//
// This is intentionally not a true global rate limiter — it tracks per-IP
// and per-key strings. For an open hackathon demo with CORS *, the goal
// is to prevent the obvious "curl-loop to death" pattern, not to defend
// against a determined attacker.

interface Bucket {
  count: number;
  resetAt: number; // unix ms
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Max requests per window. Default 120. */
  max: number;
  /** Window size in ms. Default 60_000 (1 minute). */
  windowMs: number;
}

const DEFAULT: RateLimitConfig = {
  max: Number(process.env.RATE_LIMIT_MAX ?? 120),
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
};

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetMs: number; // ms until the current window resets
}

/** Charge one request against the key. Returns ok=false if the bucket
 *  is over capacity for the current window. */
export function charge(key: string, config: RateLimitConfig = DEFAULT): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const remaining = Math.max(0, config.max - bucket.count);
  return {
    ok: bucket.count <= config.max,
    remaining,
    resetMs: bucket.resetAt - now,
  };
}

/** Best-effort key derivation. X-Forwarded-For is trusted only because
 *  this is a local demo — for a real deployment, validate or strip. */
export function clientKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (!xff) return "local";
  const first = xff.split(",")[0];
  if (first === undefined) return "local";
  return first.trim();
}

/** For tests: clear all buckets. */
export function _reset(): void {
  buckets.clear();
}
