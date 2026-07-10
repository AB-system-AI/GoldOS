import { randomUUID } from 'crypto';

import type { PrismaClient, RevokedRefreshTokenReason, SessionStatus } from '@goldos/database';

export class SessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    tenantId: string;
    userId: string;
    tokenHash: string;
    tokenFamilyId?: string;
    expiresAt: Date;
    deviceId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    pendingTwoFactor?: boolean;
  }) {
    return this.prisma.session.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        tokenHash: data.tokenHash,
        tokenFamilyId: data.tokenFamilyId ?? randomUUID(),
        expiresAt: data.expiresAt,
        deviceId: data.deviceId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        pendingTwoFactor: data.pendingTwoFactor ?? false,
        status: 'ACTIVE',
        lastActiveAt: new Date(),
      },
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.session.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        user: {
          include: {
            role: true,
            userBranches: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  findRevokedToken(tokenHash: string) {
    return this.prisma.revokedRefreshToken.findUnique({
      where: { tokenHash },
      include: {
        session: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  findById(sessionId: string) {
    return this.prisma.session.findFirst({
      where: { id: sessionId, deletedAt: null },
      include: {
        user: {
          include: {
            role: true,
            userBranches: { where: { deletedAt: null } },
          },
        },
      },
    });
  }

  listActiveForUser(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  countActiveForUser(userId: string) {
    return this.prisma.session.count({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
    });
  }

  touch(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { lastActiveAt: new Date() },
    });
  }

  revoke(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { status: 'REVOKED' satisfies SessionStatus },
    });
  }

  revokeAllForUser(userId: string) {
    return this.prisma.session.updateMany({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      data: { status: 'REVOKED' },
    });
  }

  revokeByTokenFamily(tokenFamilyId: string) {
    return this.prisma.session.updateMany({
      where: {
        tokenFamilyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      data: { status: 'REVOKED' },
    });
  }

  clearPendingTwoFactor(sessionId: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { pendingTwoFactor: false },
    });
  }

  rotateToken(input: {
    sessionId: string;
    previousTokenHash: string;
    newTokenHash: string;
    reason: RevokedRefreshTokenReason;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.session.findFirst({
        where: {
          id: input.sessionId,
          tokenHash: input.previousTokenHash,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (!session) {
        return null;
      }

      await tx.revokedRefreshToken.create({
        data: {
          sessionId: session.id,
          tokenHash: input.previousTokenHash,
          reason: input.reason,
        },
      });

      return tx.session.update({
        where: { id: session.id },
        data: {
          tokenHash: input.newTokenHash,
          rotatedAt: new Date(),
          lastActiveAt: new Date(),
        },
        include: {
          user: {
            include: {
              role: true,
              userBranches: { where: { deletedAt: null } },
            },
          },
        },
      });
    });
  }

  recordRevokedToken(input: {
    sessionId: string;
    tokenHash: string;
    reason: RevokedRefreshTokenReason;
  }) {
    return this.prisma.revokedRefreshToken.upsert({
      where: { tokenHash: input.tokenHash },
      create: {
        sessionId: input.sessionId,
        tokenHash: input.tokenHash,
        reason: input.reason,
      },
      update: {
        reason: input.reason,
        revokedAt: new Date(),
      },
    });
  }

  revokeOldestActiveForUser(userId: string, keep: number) {
    return this.prisma.session.findMany({
      where: {
        userId,
        deletedAt: null,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: 'asc' },
      skip: keep,
      select: { id: true },
    });
  }
}
