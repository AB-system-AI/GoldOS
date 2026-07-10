import { AUTH_BCRYPT_DUMMY_HASH } from '../constants/index.js';
import { verifyPassword } from '../crypto/password.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { RateLimitService } from '../security/rate-limit.service.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { SessionService } from './session.service.js';
import type { PermissionService } from './permission.service.js';
import type { SecurityEventService } from './security-event.service.js';
import type { TwoFactorService } from './two-factor.service.js';
import type { DeviceService } from './device.service.js';
import type {
  AuthCredentials,
  AuthContext,
  AuthUser,
  ClientInfo,
  LoginResult,
  TokenPair,
} from '../types/index.js';
import { verifyAccessToken } from '../crypto/token.js';

export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly permissionService: PermissionService,
    private readonly securityEventService: SecurityEventService,
    private readonly twoFactorService: TwoFactorService,
    private readonly deviceService: DeviceService,
    private readonly rateLimitService: RateLimitService,
    private readonly authSecret: string,
  ) {}

  async login(
    credentials: AuthCredentials,
    clientInfo?: ClientInfo,
    requestId?: string,
  ): Promise<LoginResult> {
    await this.rateLimitService.enforceLogin(clientInfo?.ipAddress ?? undefined, credentials.email);

    if (!credentials.tenantSlug) {
      throw new AuthError(AuthErrorCodes.VALIDATION_ERROR, 'Tenant slug is required');
    }

    const tenant = await this.userRepository.findTenantBySlug(credentials.tenantSlug);
    if (!tenant) {
      throw new AuthError(AuthErrorCodes.TENANT_NOT_FOUND, 'Tenant not found');
    }

    const user = await this.userRepository.findByEmailAndTenant(credentials.email, tenant.id);

    if (!user?.passwordHash) {
      await verifyPassword(credentials.password, AUTH_BCRYPT_DUMMY_HASH);
      await this.securityEventService.recordFailedLogin({
        tenantId: tenant.id,
        email: credentials.email,
        eventType: 'login',
        failureReason: 'invalid_credentials',
        ...this.clientFields(clientInfo),
        requestId,
      });
      throw new AuthError(AuthErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    await this.twoFactorService.checkAccountLock(user.id);

    if (user.status === 'LOCKED' || user.status === 'INACTIVE') {
      await this.securityEventService.recordLoginAttempt({
        tenantId: tenant.id,
        userId: user.id,
        email: user.email,
        eventType: 'login',
        result: 'BLOCKED',
        failureReason: 'account_inactive',
        ...this.clientFields(clientInfo),
        requestId,
      });
      throw new AuthError(AuthErrorCodes.ACCOUNT_INACTIVE, 'Account is not active');
    }

    const passwordValid = await verifyPassword(credentials.password, user.passwordHash);
    if (!passwordValid) {
      await this.twoFactorService.handleFailedLogin(user.id);
      await this.securityEventService.recordFailedLogin({
        tenantId: tenant.id,
        userId: user.id,
        email: user.email,
        eventType: 'login',
        failureReason: 'invalid_password',
        ...this.clientFields(clientInfo),
        requestId,
      });
      throw new AuthError(AuthErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    const device = clientInfo
      ? await this.deviceService.registerOrUpdate(tenant.id, user.id, clientInfo)
      : null;

    await this.sessionService.enforceConcurrentLimit(user.id);

    if (user.twoFactorEnabled) {
      const { session, tokens } = await this.sessionService.createSession({
        user,
        clientInfo,
        rememberMe: credentials.rememberMe,
        deviceId: device?.id ?? null,
        pendingTwoFactor: true,
      });

      await this.securityEventService.recordLoginAttempt({
        tenantId: tenant.id,
        userId: user.id,
        email: user.email,
        eventType: 'login',
        result: 'SUCCESS',
        failureReason: 'two_factor_required',
        ...this.clientFields(clientInfo),
        requestId,
      });

      return {
        type: 'two_factor_required',
        challenge: {
          sessionId: session.id,
          method: 'totp',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        refreshToken: tokens.refreshToken,
      };
    }

    const { session, tokens } = await this.sessionService.createSession({
      user,
      clientInfo,
      rememberMe: credentials.rememberMe,
      deviceId: device?.id ?? null,
    });

    await this.userRepository.updateLastLogin(user.id);
    await this.securityEventService.recordLoginAttempt({
      tenantId: tenant.id,
      userId: user.id,
      email: user.email,
      eventType: 'login',
      result: 'SUCCESS',
      ...this.clientFields(clientInfo),
      requestId,
    });

    const permissions = await this.permissionService.resolvePermissions(user.id, user.role.id);
    const authUser = this.permissionService.mapUser(user, permissions);

    return {
      type: 'success',
      tokens,
      user: authUser,
      sessionId: session.id,
    };
  }

  async completeTwoFactorLogin(
    sessionId: string,
    code: string,
    refreshToken: string,
    clientInfo?: ClientInfo,
    requestId?: string,
  ) {
    const { tokens, user } = await this.twoFactorService.verifyLoginChallenge(
      sessionId,
      code,
      refreshToken,
    );

    await this.userRepository.updateLastLogin(user.id);
    await this.securityEventService.recordLoginAttempt({
      tenantId: user.tenantId,
      userId: user.id,
      email: user.email,
      eventType: 'login_2fa',
      result: 'SUCCESS',
      ...this.clientFields(clientInfo),
      requestId,
    });

    return { tokens, user, sessionId };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionService.revokeSession(sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionService.revokeAllSessions(userId);
  }

  async refresh(
    refreshToken: string,
    clientInfo?: ClientInfo,
  ): Promise<{
    tokens: TokenPair;
    user: AuthUser;
    sessionId: string;
  }> {
    await this.rateLimitService.enforceRefresh(clientInfo?.ipAddress ?? undefined);

    const rotated = await this.sessionService.rotateRefreshToken(refreshToken);

    const permissions = await this.permissionService.resolvePermissions(
      rotated.user.id,
      rotated.user.role.id,
    );
    const authUser = this.permissionService.mapUser(rotated.user, permissions);

    return {
      tokens: rotated.tokens,
      user: authUser,
      sessionId: rotated.session.id,
    };
  }

  getMe(context: AuthContext): AuthUser {
    return context.user;
  }

  async resolveContextFromAccessToken(
    accessToken: string,
    refreshToken?: string | null,
  ): Promise<AuthContext | null> {
    try {
      const payload = await verifyAccessToken(accessToken, this.authSecret);

      if (refreshToken) {
        const { session, user } = await this.sessionService.validateSession(refreshToken);
        if (session.id !== payload.sessionId) {
          return null;
        }

        const permissions = await this.permissionService.resolvePermissions(user.id, user.role.id);
        const authUser = this.permissionService.mapUser(user, permissions);

        return {
          user: authUser,
          session,
          tenantId: session.tenantId,
          branchId: session.branchId,
          permissions,
        };
      }

      const dbSession = await this.sessionService.validateSessionById(payload.sessionId);
      const permissions = await this.permissionService.resolvePermissions(
        dbSession.user.id,
        dbSession.user.role.id,
      );
      const authUser = this.permissionService.mapUser(dbSession.user, permissions);
      const branchId = this.permissionService.getDefaultBranchId(dbSession.user.userBranches);

      const session = {
        id: dbSession.id,
        userId: authUser.id,
        tenantId: authUser.tenantId,
        branchId,
        roles: authUser.roles,
        permissions,
        platformRole: null,
        status: 'active' as const,
        expiresAt: dbSession.expiresAt,
        createdAt: dbSession.createdAt,
        lastActiveAt: dbSession.lastActiveAt ?? dbSession.createdAt,
        pendingTwoFactor: dbSession.pendingTwoFactor,
      };

      return {
        user: authUser,
        session,
        tenantId: authUser.tenantId,
        branchId,
        permissions,
      };
    } catch {
      return null;
    }
  }

  private clientFields(clientInfo?: ClientInfo) {
    return {
      ipAddress: clientInfo?.ipAddress ?? null,
      userAgent: clientInfo?.userAgent ?? null,
      countryCode: clientInfo?.countryCode ?? null,
      city: clientInfo?.city ?? null,
      browser: clientInfo?.browser ?? null,
      operatingSystem: clientInfo?.operatingSystem ?? null,
      deviceType: clientInfo?.deviceType ?? null,
    };
  }
}
