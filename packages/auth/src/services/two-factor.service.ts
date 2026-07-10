import { AUTH_LOCKOUT_DURATION_SECONDS, AUTH_MAX_LOGIN_ATTEMPTS } from '../constants/index.js';
import { buildOtpAuthUri, generateTotpSecret, verifyTotpCode } from '../crypto/totp.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { SecurityRepository } from '../repositories/security.repository.js';
import type { SessionService } from './session.service.js';
import type { PermissionService } from './permission.service.js';
import type { TokenPair } from '../types/index.js';

export class TwoFactorService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly securityRepository: SecurityRepository,
    private readonly sessionService: SessionService,
    private readonly permissionService: PermissionService,
  ) {}

  async setup(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const secret = generateTotpSecret();
    await this.userRepository.enableTwoFactor(userId, secret);

    return {
      secret,
      uri: buildOtpAuthUri(secret, user.email),
    };
  }

  async verify(userId: string, code: string) {
    const user = await this.userRepository.findById(userId);
    if (!user?.twoFactorSecret) {
      throw new AuthError(
        AuthErrorCodes.TWO_FACTOR_NOT_ENABLED,
        'Two-factor authentication is not enabled',
      );
    }

    const valid = verifyTotpCode(user.twoFactorSecret, code);
    if (!valid) {
      throw new AuthError(AuthErrorCodes.TWO_FACTOR_INVALID, 'Invalid two-factor code');
    }

    return { verified: true };
  }

  async disable(userId: string, code: string) {
    await this.verify(userId, code);
    await this.userRepository.disableTwoFactor(userId);
    return { disabled: true };
  }

  async verifyLoginChallenge(
    sessionId: string,
    code: string,
    refreshToken: string,
  ): Promise<{
    tokens: TokenPair;
    user: ReturnType<PermissionService['mapUser']>;
    sessionId: string;
  }> {
    const { user: sessionUser } = await this.sessionService.validateSession(refreshToken, {
      allowPendingTwoFactor: true,
    });
    const dbSession = await this.sessionService.validateSessionById(sessionId, {
      allowPendingTwoFactor: true,
    });

    if (sessionUser.id !== dbSession.user.id) {
      throw new AuthError(AuthErrorCodes.INVALID_TOKEN, 'Session mismatch');
    }

    const user = dbSession.user;

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AuthError(
        AuthErrorCodes.TWO_FACTOR_NOT_ENABLED,
        'Two-factor authentication is not enabled',
      );
    }

    const valid = verifyTotpCode(user.twoFactorSecret, code);
    if (!valid) {
      throw new AuthError(AuthErrorCodes.TWO_FACTOR_INVALID, 'Invalid two-factor code');
    }

    await this.sessionService.clearPendingTwoFactor(sessionId);

    const permissions = await this.permissionService.resolvePermissions(user.id, user.role.id);
    const authUser = this.permissionService.mapUser(user, permissions);

    const tokens = await this.sessionService.issueTokensForSession(
      sessionId,
      { id: user.id, email: user.email, tenantId: user.tenantId },
      refreshToken,
    );

    await this.sessionService.touchSession(sessionId);

    return { tokens, user: authUser, sessionId };
  }

  async checkAccountLock(userId: string) {
    const lock = await this.securityRepository.findActiveAccountLock(userId);
    if (lock) {
      throw new AuthError(AuthErrorCodes.ACCOUNT_LOCKED, 'Account is locked', { statusCode: 429 });
    }
  }

  async handleFailedLogin(userId: string) {
    const since = new Date(Date.now() - AUTH_LOCKOUT_DURATION_SECONDS * 1000);
    const failedCount = await this.securityRepository.countRecentFailedAttempts(userId, since);

    if (failedCount + 1 >= AUTH_MAX_LOGIN_ATTEMPTS) {
      await this.securityRepository.createAccountLock({
        userId,
        reason: 'FAILED_ATTEMPTS',
        lockedUntil: new Date(Date.now() + AUTH_LOCKOUT_DURATION_SECONDS * 1000),
        notes: 'Automatic lockout after failed login attempts',
      });
    }
  }
}
