import {
  AUTH_RATE_LIMIT_LOGIN_MAX,
  AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_PASSWORD_RESET_MAX,
  AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_REFRESH_MAX,
  AUTH_RATE_LIMIT_REFRESH_WINDOW_SECONDS,
  AUTH_RATE_LIMIT_VERIFICATION_MAX,
  AUTH_RATE_LIMIT_VERIFICATION_WINDOW_SECONDS,
} from '../constants/index.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { RateLimitBackend } from '../security/rate-limit-backend.js';
import { RateLimiter } from '../security/rate-limiter.js';

export class RateLimitService {
  private readonly loginLimiter: RateLimiter;
  private readonly refreshLimiter: RateLimiter;
  private readonly passwordResetLimiter: RateLimiter;
  private readonly verificationLimiter: RateLimiter;

  constructor(backend: RateLimitBackend) {
    this.loginLimiter = new RateLimiter(
      backend,
      AUTH_RATE_LIMIT_LOGIN_MAX,
      AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS * 1000,
    );
    this.refreshLimiter = new RateLimiter(
      backend,
      AUTH_RATE_LIMIT_REFRESH_MAX,
      AUTH_RATE_LIMIT_REFRESH_WINDOW_SECONDS * 1000,
    );
    this.passwordResetLimiter = new RateLimiter(
      backend,
      AUTH_RATE_LIMIT_PASSWORD_RESET_MAX,
      AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS * 1000,
    );
    this.verificationLimiter = new RateLimiter(
      backend,
      AUTH_RATE_LIMIT_VERIFICATION_MAX,
      AUTH_RATE_LIMIT_VERIFICATION_WINDOW_SECONDS * 1000,
    );
  }

  async enforceLogin(ipAddress: string | undefined, email: string): Promise<void> {
    await this.enforce(this.loginLimiter, `login:${ipAddress ?? 'unknown'}:${email.toLowerCase()}`);
  }

  async enforceRefresh(ipAddress: string | undefined): Promise<void> {
    await this.enforce(this.refreshLimiter, `refresh:${ipAddress ?? 'unknown'}`);
  }

  async enforcePasswordReset(ipAddress: string | undefined, email: string): Promise<void> {
    await this.enforce(
      this.passwordResetLimiter,
      `password-reset:${ipAddress ?? 'unknown'}:${email.toLowerCase()}`,
    );
  }

  async enforceVerification(actorKey: string): Promise<void> {
    await this.enforce(this.verificationLimiter, `verification:${actorKey}`);
  }

  private async enforce(limiter: RateLimiter, key: string): Promise<void> {
    const result = await limiter.check(key);
    if (!result.allowed) {
      throw new AuthError(AuthErrorCodes.RATE_LIMITED, 'Too many requests', {
        statusCode: 429,
      });
    }
  }
}
