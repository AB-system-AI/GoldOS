import type { RateLimitRepository } from '../repositories/rate-limit.repository.js';
import type { RateLimitBackend, RateLimitResult } from './rate-limit-backend.js';

export class DatabaseRateLimitBackend implements RateLimitBackend {
  constructor(private readonly repository: RateLimitRepository) {}

  async check(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = new Date(now - windowMs);

    await this.repository.purgeExpiredEvents(key, windowStart);

    const count = await this.repository.countRecentEvents(key, windowStart);

    if (count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + windowMs),
      };
    }

    await this.repository.recordEvent(key);

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      resetAt: new Date(now + windowMs),
    };
  }

  async reset(key: string): Promise<void> {
    await this.repository.purgeExpiredEvents(key, new Date());
  }
}
