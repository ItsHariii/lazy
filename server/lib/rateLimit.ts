type Bucket = { tokens: number; lastRefill: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(opts: {
  key: string;
  capacity: number;
  refillPerMs: number;
}): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(opts.key) ?? { tokens: opts.capacity, lastRefill: now };
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerMs);
  b.lastRefill = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    buckets.set(opts.key, b);
    return { ok: true, retryAfterSec: 0 };
  }
  buckets.set(opts.key, b);
  const need = 1 - b.tokens;
  const ms = need / opts.refillPerMs;
  return { ok: false, retryAfterSec: Math.ceil(ms / 1000) };
}

export function perHour(route: string, ip: string, perHour: number) {
  return rateLimit({
    key: `${route}:${ip}`,
    capacity: perHour,
    refillPerMs: perHour / (60 * 60 * 1000),
  });
}
