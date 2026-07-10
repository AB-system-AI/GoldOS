import type { RateLimitBackend, RateLimitResult } from './rate-limit-backend.js';

interface RateLimitEntry {
  timestamps: number[];
}

export class MemoryRateLimitBackend implements RateLimitBackend {
  private readonly store = new Map<string, RateLimitEntry>();

  check(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const entry = this.store.get(key) ?? { timestamps: [] };

    entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);

    if (entry.timestamps.length >= maxRequests) {
      const oldest = entry.timestamps[0] ?? now;
      this.store.set(key, entry);
      return Promise.resolve({
        allowed: false,
        remaining: 0,
        resetAt: new Date(oldest + windowMs),
      });
    }

    entry.timestamps.push(now);
    this.store.set(key, entry);

    return Promise.resolve({
      allowed: true,
      remaining: maxRequests - entry.timestamps.length,
      resetAt: new Date(now + windowMs),
    });
  }

  reset(key: string): Promise<void> {
    this.store.delete(key);
    return Promise.resolve();
  }
}
