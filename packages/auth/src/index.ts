/**
 * GoldOS Authentication Package
 */

export * from './constants/index.js';
export * from './types/index.js';
export type {
  AuthProviderAdapter,
  SessionStore,
  PermissionResolver,
  TwoFactorProvider,
  AuthService as AuthServiceContract,
} from './interfaces/index.js';
export * from './errors/index.js';
export * from './services/index.js';
export * from './guards/auth.guard.js';
export * from './guards/permission.guard.js';
export { createAuthContainer, type AuthContainer, type AuthContainerOptions } from './container.js';
export { RateLimiter } from './security/rate-limiter.js';
export type { RateLimitBackend, RateLimitResult } from './security/rate-limit-backend.js';
export { RateLimitService } from './security/rate-limit.service.js';
export { DatabaseRateLimitBackend } from './security/database-rate-limit-backend.js';
export { MemoryRateLimitBackend } from './security/memory-rate-limit-backend.js';
export { NotificationService } from './notifications/notification.service.js';
export type { EmailNotificationProvider, SmsNotificationProvider } from './notifications/types.js';
export { generateCsrfToken, validateCsrfToken } from './security/csrf.js';
export { parseClientInfo } from './security/client-info.js';
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  assertPasswordStrength,
  generateSecureToken,
  hashToken,
} from './crypto/password.js';
export {
  createAccessToken,
  verifyAccessToken,
  createRefreshToken,
  type AccessTokenPayload,
} from './crypto/token.js';
export { generateTotpSecret, verifyTotpCode, buildOtpAuthUri } from './crypto/totp.js';
