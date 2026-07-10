import {
  AUTH_ACCESS_TOKEN_TTL_SECONDS,
  AUTH_MAX_CONCURRENT_SESSIONS,
  AUTH_REFRESH_TOKEN_TTL_SECONDS,
  AUTH_REMEMBER_ME_TTL_SECONDS,
  AUTH_SESSION_IDLE_TIMEOUT_SECONDS,
  AUTH_SESSION_MAX_AGE_SECONDS,
} from '../constants/index.js';
import { createAccessToken, createRefreshToken, hashToken } from '../crypto/token.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { SessionRepository } from '../repositories/session.repository.js';
import type { AuthSession, ClientInfo, TokenPair } from '../types/index.js';
import { asTenantId, asUserId } from '@goldos/types/tenant';
import type { SecurityEventService } from './security-event.service.js';
import type { PermissionService } from './permission.service.js';

type SessionUser = NonNullable<Awaited<ReturnType<SessionRepository['findByTokenHash']>>>['user'];

export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly permissionService: PermissionService,
    private readonly securityEventService: SecurityEventService,
    private readonly authSecret: string,
  ) {}

  async createSession(input: {
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      tenantId: string;
      emailVerifiedAt: Date | null;
      twoFactorEnabled: boolean;
      phone: string | null;
      status: string;
      role: { id: string; code: string };
      userBranches: { branchId: string; isDefault: boolean }[];
    };
    clientInfo?: ClientInfo;
    rememberMe?: boolean;
    deviceId?: string | null;
    pendingTwoFactor?: boolean;
  }): Promise<{ session: AuthSession; tokens: TokenPair; refreshToken: string }> {
    const refreshToken = createRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const ttlSeconds = input.rememberMe
      ? AUTH_REMEMBER_ME_TTL_SECONDS
      : AUTH_REFRESH_TOKEN_TTL_SECONDS;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const dbSession = await this.sessionRepository.create({
      tenantId: input.user.tenantId,
      userId: input.user.id,
      tokenHash,
      expiresAt,
      deviceId: input.deviceId ?? null,
      ipAddress: input.clientInfo?.ipAddress ?? null,
      userAgent: input.clientInfo?.userAgent ?? null,
      pendingTwoFactor: input.pendingTwoFactor ?? false,
    });

    const session = await this.mapDbSession(dbSession, input.user, input.pendingTwoFactor ?? false);

    const accessToken = await createAccessToken(
      {
        sub: input.user.id,
        tenantId: input.user.tenantId,
        sessionId: dbSession.id,
        email: input.user.email,
      },
      this.authSecret,
    );

    const tokens: TokenPair = {
      accessToken,
      refreshToken,
      expiresIn: AUTH_ACCESS_TOKEN_TTL_SECONDS,
    };

    return { session, tokens, refreshToken };
  }

  async validateSession(
    refreshToken: string,
    options?: { allowPendingTwoFactor?: boolean },
  ): Promise<{
    session: AuthSession;
    user: SessionUser;
  }> {
    const tokenHash = hashToken(refreshToken);
    const dbSession = await this.sessionRepository.findByTokenHash(tokenHash);

    if (!dbSession) {
      throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found');
    }

    await this.enforceIdleTimeout(dbSession);
    this.assertSessionActive(dbSession, options?.allowPendingTwoFactor ?? false);

    const session = await this.mapDbSession(dbSession, dbSession.user, dbSession.pendingTwoFactor);

    return { session, user: dbSession.user };
  }

  async rotateRefreshToken(refreshToken: string): Promise<{
    session: AuthSession;
    user: SessionUser;
    tokens: TokenPair;
    refreshToken: string;
  }> {
    const tokenHash = hashToken(refreshToken);
    const dbSession = await this.sessionRepository.findByTokenHash(tokenHash);

    if (dbSession) {
      await this.enforceIdleTimeout(dbSession);
      this.assertSessionActive(dbSession, false);

      const newRefreshToken = createRefreshToken();
      const newTokenHash = hashToken(newRefreshToken);

      const rotated = await this.sessionRepository.rotateToken({
        sessionId: dbSession.id,
        previousTokenHash: tokenHash,
        newTokenHash,
        reason: 'ROTATED',
      });

      if (!rotated) {
        throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found');
      }

      const session = await this.mapDbSession(rotated, rotated.user, false);
      const accessToken = await createAccessToken(
        {
          sub: rotated.user.id,
          tenantId: rotated.user.tenantId,
          sessionId: rotated.id,
          email: rotated.user.email,
        },
        this.authSecret,
      );

      return {
        session,
        user: rotated.user,
        refreshToken: newRefreshToken,
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
          expiresIn: AUTH_ACCESS_TOKEN_TTL_SECONDS,
        },
      };
    }

    const revoked = await this.sessionRepository.findRevokedToken(tokenHash);
    if (revoked) {
      await this.handleRefreshTokenReuse(revoked.session);
      throw new AuthError(AuthErrorCodes.TOKEN_REUSE_DETECTED, 'Refresh token reuse detected', {
        statusCode: 401,
      });
    }

    throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found');
  }

  private async handleRefreshTokenReuse(session: {
    id: string;
    userId: string;
    tokenFamilyId: string;
    user: { id: string; tenantId: string; email: string };
  }): Promise<void> {
    await this.sessionRepository.revokeByTokenFamily(session.tokenFamilyId);
    await this.sessionRepository.revokeAllForUser(session.userId);

    await this.securityEventService.recordLoginAttempt({
      tenantId: session.user.tenantId,
      userId: session.user.id,
      email: session.user.email,
      eventType: 'refresh',
      result: 'BLOCKED',
      failureReason: 'refresh_token_reuse',
    });
  }

  async validateSessionById(sessionId: string, options?: { allowPendingTwoFactor?: boolean }) {
    const dbSession = await this.sessionRepository.findById(sessionId);
    if (!dbSession) {
      throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found');
    }

    if (dbSession.status !== 'ACTIVE' || dbSession.expiresAt < new Date()) {
      throw new AuthError(AuthErrorCodes.SESSION_NOT_FOUND, 'Session not found');
    }

    await this.enforceIdleTimeout(dbSession);
    this.assertSessionActive(dbSession, options?.allowPendingTwoFactor ?? false);
    return dbSession;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.sessionRepository.revokeAllForUser(userId);
  }

  async enforceConcurrentLimit(userId: string, max = AUTH_MAX_CONCURRENT_SESSIONS): Promise<void> {
    const count = await this.sessionRepository.countActiveForUser(userId);
    if (count >= max) {
      const toRevoke = await this.sessionRepository.revokeOldestActiveForUser(userId, max - 1);
      await Promise.all(toRevoke.map((s: { id: string }) => this.sessionRepository.revoke(s.id)));
    }
  }

  async touchSession(sessionId: string): Promise<void> {
    await this.sessionRepository.touch(sessionId);
  }

  async clearPendingTwoFactor(sessionId: string): Promise<void> {
    await this.sessionRepository.clearPendingTwoFactor(sessionId);
  }

  async listSessions(userId: string) {
    return this.sessionRepository.listActiveForUser(userId);
  }

  async issueTokensForSession(
    sessionId: string,
    user: {
      id: string;
      email: string;
      tenantId: string;
    },
    refreshToken: string,
  ): Promise<TokenPair> {
    const accessToken = await createAccessToken(
      {
        sub: user.id,
        tenantId: user.tenantId,
        sessionId,
        email: user.email,
      },
      this.authSecret,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  private async enforceIdleTimeout(dbSession: {
    id: string;
    lastActiveAt: Date | null;
    createdAt: Date;
  }): Promise<void> {
    const idleLimit = AUTH_SESSION_IDLE_TIMEOUT_SECONDS * 1000;
    const lastActive = dbSession.lastActiveAt ?? dbSession.createdAt;
    if (Date.now() - lastActive.getTime() > idleLimit) {
      await this.sessionRepository.revoke(dbSession.id);
      throw new AuthError(AuthErrorCodes.SESSION_EXPIRED, 'Session idle timeout exceeded');
    }
  }

  private assertSessionActive(
    dbSession: {
      expiresAt: Date;
      status: string;
      lastActiveAt: Date | null;
      createdAt: Date;
      pendingTwoFactor: boolean;
    },
    allowPendingTwoFactor: boolean,
  ): void {
    if (dbSession.expiresAt < new Date()) {
      throw new AuthError(AuthErrorCodes.SESSION_EXPIRED, 'Session has expired');
    }

    if (dbSession.status === 'REVOKED') {
      throw new AuthError(AuthErrorCodes.SESSION_REVOKED, 'Session has been revoked');
    }

    const maxAgeLimit = AUTH_SESSION_MAX_AGE_SECONDS * 1000;
    if (Date.now() - dbSession.createdAt.getTime() > maxAgeLimit) {
      throw new AuthError(AuthErrorCodes.SESSION_EXPIRED, 'Session maximum age exceeded');
    }

    if (dbSession.pendingTwoFactor && !allowPendingTwoFactor) {
      throw new AuthError(
        AuthErrorCodes.TWO_FACTOR_REQUIRED,
        'Two-factor authentication required',
        {
          statusCode: 401,
        },
      );
    }
  }

  private async mapDbSession(
    dbSession: {
      id: string;
      userId: string;
      tenantId: string;
      expiresAt: Date;
      createdAt: Date;
      lastActiveAt: Date | null;
      pendingTwoFactor: boolean;
    },
    user: {
      id: string;
      role: { id: string; code: string };
      userBranches: { branchId: string; isDefault: boolean }[];
    },
    pendingTwoFactor: boolean,
  ): Promise<AuthSession> {
    const permissions = await this.permissionService.resolvePermissions(user.id, user.role.id);

    const branchId = this.permissionService.getDefaultBranchId(user.userBranches);

    return {
      id: dbSession.id,
      userId: asUserId(dbSession.userId),
      tenantId: asTenantId(dbSession.tenantId),
      branchId,
      roles: [user.role.code as AuthSession['roles'][number]],
      permissions,
      platformRole: null,
      status: 'active',
      expiresAt: dbSession.expiresAt,
      createdAt: dbSession.createdAt,
      lastActiveAt: dbSession.lastActiveAt ?? dbSession.createdAt,
      pendingTwoFactor,
    };
  }
}
