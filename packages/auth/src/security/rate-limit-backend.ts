export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface RateLimitBackend {
  check(key: string, maxRequests: number, windowMs: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}
