import { AUTH_PASSWORD_HISTORY_LIMIT } from '../constants/index.js';
import type { AccountLockReason, LoginAttemptResult, Prisma, PrismaClient } from '@goldos/database';

export class SecurityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  recordLoginAttempt(data: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    result: LoginAttemptResult;
    failureReason?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    countryCode?: string | null;
    city?: string | null;
    browser?: string | null;
    operatingSystem?: string | null;
    deviceType?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    geo?: Record<string, unknown> | null;
  }) {
    return this.prisma.loginAttempt.create({
      data: {
        tenantId: data.tenantId ?? undefined,
        userId: data.userId ?? undefined,
        email: data.email ?? undefined,
        result: data.result,
        failureReason: data.failureReason ?? undefined,
        ipAddress: data.ipAddress ?? undefined,
        userAgent: data.userAgent ?? undefined,
        countryCode: data.countryCode ?? undefined,
        city: data.city ?? undefined,
        browser: data.browser ?? undefined,
        operatingSystem: data.operatingSystem ?? undefined,
        deviceType: data.deviceType ?? undefined,
        requestId: data.requestId ?? undefined,
        correlationId: data.correlationId ?? undefined,
        geo: data.geo ? (data.geo as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  recordFailedLogin(data: {
    tenantId?: string | null;
    userId?: string | null;
    email?: string | null;
    failureReason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    countryCode?: string | null;
    city?: string | null;
    browser?: string | null;
    operatingSystem?: string | null;
    deviceType?: string | null;
    requestId?: string | null;
    correlationId?: string | null;
    geo?: Record<string, unknown> | null;
  }) {
    return this.prisma.failedLoginHistory.create({
      data: {
        tenantId: data.tenantId ?? undefined,
        userId: data.userId ?? undefined,
        email: data.email ?? undefined,
        failureReason: data.failureReason,
        ipAddress: data.ipAddress ?? undefined,
        userAgent: data.userAgent ?? undefined,
        countryCode: data.countryCode ?? undefined,
        city: data.city ?? undefined,
        browser: data.browser ?? undefined,
        operatingSystem: data.operatingSystem ?? undefined,
        deviceType: data.deviceType ?? undefined,
        requestId: data.requestId ?? undefined,
        correlationId: data.correlationId ?? undefined,
        geo: data.geo ? (data.geo as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  countRecentFailedAttempts(userId: string, since: Date) {
    return this.prisma.loginAttempt.count({
      where: {
        userId,
        result: 'FAILED',
        createdAt: { gte: since },
        deletedAt: null,
      },
    });
  }

  findActiveAccountLock(userId: string) {
    return this.prisma.accountLock.findFirst({
      where: {
        userId,
        deletedAt: null,
        unlockedAt: null,
        OR: [{ lockedUntil: null }, { lockedUntil: { gt: new Date() } }],
      },
      orderBy: { lockedAt: 'desc' },
    });
  }

  createAccountLock(data: {
    userId: string;
    reason: AccountLockReason;
    lockedUntil?: Date | null;
    lockedById?: string | null;
    notes?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const lock = await tx.accountLock.create({ data });
      await tx.user.update({
        where: { id: data.userId },
        data: { status: 'LOCKED' },
      });
      return lock;
    });
  }

  unlockAccount(userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.accountLock.updateMany({
        where: {
          userId,
          deletedAt: null,
          unlockedAt: null,
        },
        data: { unlockedAt: new Date() },
      });
      await tx.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    });
  }

  addPasswordHistory(userId: string, passwordHash: string) {
    return this.prisma.passwordHistory.create({
      data: { userId, passwordHash },
    });
  }

  getRecentPasswordHashes(userId: string, limit = AUTH_PASSWORD_HISTORY_LIMIT) {
    return this.prisma.passwordHistory.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { passwordHash: true },
    });
  }
}
