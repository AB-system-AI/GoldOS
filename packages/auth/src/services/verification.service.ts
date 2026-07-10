import { randomInt, timingSafeEqual } from 'crypto';

import {
  AUTH_EMAIL_VERIFY_TTL_SECONDS,
  AUTH_PASSWORD_RESET_TTL_SECONDS,
  AUTH_PHONE_VERIFY_TTL_SECONDS,
} from '../constants/index.js';
import {
  assertPasswordStrength,
  generateSecureToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from '../crypto/password.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { RateLimitService } from '../security/rate-limit.service.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { VerificationRepository } from '../repositories/verification.repository.js';
import type { SecurityRepository } from '../repositories/security.repository.js';
import type { SessionService } from './session.service.js';
import type { ClientInfo } from '../types/index.js';

export class VerificationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly verificationRepository: VerificationRepository,
    private readonly securityRepository: SecurityRepository,
    private readonly notificationService: NotificationService,
    private readonly rateLimitService: RateLimitService,
    private readonly sessionService: SessionService,
  ) {}

  async requestPasswordReset(email: string, tenantSlug: string, clientInfo?: ClientInfo) {
    await this.rateLimitService.enforcePasswordReset(clientInfo?.ipAddress ?? undefined, email);

    const tenant = await this.userRepository.findTenantBySlug(tenantSlug);
    if (!tenant) {
      return { sent: true };
    }

    const user = await this.userRepository.findByEmailAndTenant(email, tenant.id);
    if (!user) {
      return { sent: true };
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + AUTH_PASSWORD_RESET_TTL_SECONDS * 1000);

    await this.verificationRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
      ipAddress: clientInfo?.ipAddress,
    });

    await this.notificationService.sendPasswordReset({
      tenantId: tenant.id,
      userId: user.id,
      email: user.email,
      token,
      tenantSlug,
    });

    return { sent: true };
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    assertPasswordStrength(newPassword);
    const tokenHash = hashToken(token);
    const record = await this.verificationRepository.findPasswordResetByTokenHash(tokenHash);

    if (!record) {
      throw new AuthError(
        AuthErrorCodes.VERIFICATION_FAILED,
        'Invalid or expired password reset token',
      );
    }

    const recentHashes = await this.securityRepository.getRecentPasswordHashes(record.userId);
    for (const entry of recentHashes) {
      if (await verifyPassword(newPassword, entry.passwordHash)) {
        throw new AuthError(AuthErrorCodes.PASSWORD_REUSED, 'Password was used recently');
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await this.userRepository.updatePassword(record.userId, passwordHash);
    await this.securityRepository.addPasswordHistory(record.userId, passwordHash);
    await this.verificationRepository.markPasswordResetUsed(record.id);
    await this.securityRepository.unlockAccount(record.userId);
    await this.sessionService.revokeAllSessions(record.userId);

    return { reset: true };
  }

  async requestEmailVerification(userId: string) {
    await this.rateLimitService.enforceVerification(userId);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + AUTH_EMAIL_VERIFY_TTL_SECONDS * 1000);

    await this.verificationRepository.createEmailVerificationToken({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
    });

    await this.notificationService.sendEmailVerification({
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      token,
    });

    return { sent: true };
  }

  async confirmEmailVerification(token: string) {
    const tokenHash = hashToken(token);
    const record = await this.verificationRepository.findEmailVerificationByTokenHash(tokenHash);

    if (!record) {
      throw new AuthError(
        AuthErrorCodes.VERIFICATION_FAILED,
        'Invalid or expired email verification token',
      );
    }

    await this.userRepository.markEmailVerified(record.userId);
    await this.verificationRepository.markEmailVerified(record.id);

    return { verified: true };
  }

  async requestPhoneVerification(userId: string, phone: string) {
    await this.rateLimitService.enforceVerification(`${userId}:${phone}`);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthError(AuthErrorCodes.USER_NOT_FOUND, 'User not found');
    }

    const code = randomInt(100000, 1000000).toString();
    const codeHash = hashToken(code);
    const expiresAt = new Date(Date.now() + AUTH_PHONE_VERIFY_TTL_SECONDS * 1000);

    await this.verificationRepository.createPhoneVerificationToken({
      userId: user.id,
      phone,
      codeHash,
      expiresAt,
    });

    await this.notificationService.sendPhoneVerification({
      tenantId: user.tenantId,
      userId: user.id,
      phone,
      code,
    });

    return { sent: true };
  }

  async confirmPhoneVerification(userId: string, phone: string, code: string) {
    const record = await this.verificationRepository.findLatestPhoneVerification(userId, phone);

    if (!record) {
      throw new AuthError(
        AuthErrorCodes.VERIFICATION_FAILED,
        'Invalid or expired phone verification code',
      );
    }

    if (record.attempts >= record.maxAttempts) {
      throw new AuthError(
        AuthErrorCodes.VERIFICATION_FAILED,
        'Maximum verification attempts exceeded',
      );
    }

    const codeHash = hashToken(code);
    const storedHash = Buffer.from(record.codeHash);
    const providedHash = Buffer.from(codeHash);
    if (storedHash.length !== providedHash.length || !timingSafeEqual(storedHash, providedHash)) {
      await this.verificationRepository.incrementPhoneAttempts(record.id);
      throw new AuthError(AuthErrorCodes.VERIFICATION_FAILED, 'Invalid phone verification code');
    }

    await this.verificationRepository.markPhoneVerified(record.id);
    await this.userRepository.updatePhone(userId, phone);

    return { verified: true };
  }
}
