export const AuthErrorCodes = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REUSE_DETECTED: 'TOKEN_REUSE_DETECTED',
  RATE_LIMITED: 'RATE_LIMITED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID: 'TWO_FACTOR_INVALID',
  TWO_FACTOR_NOT_ENABLED: 'TWO_FACTOR_NOT_ENABLED',
  INVITATION_NOT_FOUND: 'INVITATION_NOT_FOUND',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVITATION_CANCELLED: 'INVITATION_CANCELLED',
  INVITATION_ALREADY_ACCEPTED: 'INVITATION_ALREADY_ACCEPTED',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
  PASSWORD_TOO_WEAK: 'PASSWORD_TOO_WEAK',
  PASSWORD_REUSED: 'PASSWORD_REUSED',
  CSRF_INVALID: 'CSRF_INVALID',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = (typeof AuthErrorCodes)[keyof typeof AuthErrorCodes];

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;
  readonly details?: { field: string; code: string; message: string }[];

  constructor(
    code: AuthErrorCode,
    message: string,
    options?: {
      statusCode?: number;
      details?: { field: string; code: string; message: string }[];
      cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = options?.statusCode ?? AuthError.statusCodeFor(code);
    this.details = options?.details;
  }

  static statusCodeFor(code: AuthErrorCode): number {
    switch (code) {
      case AuthErrorCodes.INVALID_CREDENTIALS:
      case AuthErrorCodes.USER_NOT_FOUND:
      case AuthErrorCodes.INVALID_TOKEN:
      case AuthErrorCodes.TOKEN_REUSE_DETECTED:
      case AuthErrorCodes.TWO_FACTOR_INVALID:
      case AuthErrorCodes.VERIFICATION_FAILED:
        return 401;
      case AuthErrorCodes.PERMISSION_DENIED:
        return 403;
      case AuthErrorCodes.TENANT_NOT_FOUND:
      case AuthErrorCodes.SESSION_NOT_FOUND:
      case AuthErrorCodes.INVITATION_NOT_FOUND:
        return 404;
      case AuthErrorCodes.RATE_LIMITED:
      case AuthErrorCodes.ACCOUNT_LOCKED:
        return 429;
      case AuthErrorCodes.VALIDATION_ERROR:
      case AuthErrorCodes.PASSWORD_TOO_WEAK:
      case AuthErrorCodes.PASSWORD_REUSED:
      case AuthErrorCodes.CSRF_INVALID:
        return 400;
      case AuthErrorCodes.INVITATION_EXPIRED:
      case AuthErrorCodes.INVITATION_CANCELLED:
      case AuthErrorCodes.INVITATION_ALREADY_ACCEPTED:
      case AuthErrorCodes.SESSION_EXPIRED:
      case AuthErrorCodes.SESSION_REVOKED:
      case AuthErrorCodes.TOKEN_EXPIRED:
        return 410;
      default:
        return 400;
    }
  }
}
