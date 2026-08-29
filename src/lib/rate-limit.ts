const WINDOW_MS = 60_000;
const MAX = 60;
const hits = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(ip: string): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= MAX) {
    return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  }
  entry.count += 1;
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}
