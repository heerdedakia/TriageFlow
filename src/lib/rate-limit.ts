interface Bucket {
  tokens: number;
  lastRefill: number;
}

const cache = new Map<string, Bucket>();
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60000; // Clean up once a minute

/**
 * Token bucket rate limiter.
 * Refills tokens linearly over windowMs.
 */
export function rateLimit(
  ip: string,
  options: { max: number; windowMs: number; cost?: number }
): { success: boolean; remaining: number } {
  const now = Date.now();
  const cost = options.cost ?? 1;

  // Periodic cleanup of stale entries to avoid memory leaks
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    cache.forEach((bucket, key) => {
      if (now - bucket.lastRefill > options.windowMs) {
        cache.delete(key);
      }
    });
    lastCleanup = now;
  }

  let bucket = cache.get(ip);

  if (!bucket) {
    bucket = {
      tokens: options.max,
      lastRefill: now,
    };
  } else {
    // Calculate refilled tokens
    const elapsed = now - bucket.lastRefill;
    const refillRate = options.max / options.windowMs;
    const refilledTokens = elapsed * refillRate;
    
    bucket.tokens = Math.min(options.max, bucket.tokens + refilledTokens);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    cache.set(ip, bucket);
    return {
      success: true,
      remaining: Math.floor(bucket.tokens),
    };
  }

  cache.set(ip, bucket);
  return {
    success: false,
    remaining: Math.floor(bucket.tokens),
  };
}
