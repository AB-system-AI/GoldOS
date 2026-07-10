import type { RateLimitBackend, RateLimitResult } from './rate-limit-backend.js';

export type { RateLimitBackend, RateLimitResult };

export class RateLimiter {
  constructor(
    private readonly backend: RateLimitBackend,
    private readonly maxRequests: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): Promise<RateLimitResult> {
    return this.backend.check(key, this.maxRequests, this.windowMs);
  }

  reset(key: string): Promise<void> {
    return this.backend.reset(key);
  }
}
