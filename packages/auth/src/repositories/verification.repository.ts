import type { PrismaClient, VerificationTokenStatus } from '@goldos/database';

export class VerificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
  }) {
    return this.prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        ipAddress: data.ipAddress ?? null,
        status: 'PENDING',
      },
    });
  }

  findPasswordResetByTokenHash(tokenHash: string) {
    return this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  markPasswordResetUsed(tokenId: string) {
    return this.prisma.passwordResetToken.update({
      where: { id: tokenId },
      data: { status: 'VERIFIED' satisfies VerificationTokenStatus, usedAt: new Date() },
    });
  }

  createEmailVerificationToken(data: {
    userId: string;
    email: string;
    tokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.emailVerificationToken.create({
      data: {
        userId: data.userId,
        email: data.email.toLowerCase(),
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      },
    });
  }

  findEmailVerificationByTokenHash(tokenHash: string) {
    return this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  markEmailVerified(tokenId: string) {
    return this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
  }

  createPhoneVerificationToken(data: {
    userId: string;
    phone: string;
    codeHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.phoneVerificationToken.create({
      data: {
        userId: data.userId,
        phone: data.phone,
        codeHash: data.codeHash,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      },
    });
  }

  findLatestPhoneVerification(userId: string, phone: string) {
    return this.prisma.phoneVerificationToken.findFirst({
      where: {
        userId,
        phone,
        deletedAt: null,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  incrementPhoneAttempts(tokenId: string) {
    return this.prisma.phoneVerificationToken.update({
      where: { id: tokenId },
      data: { attempts: { increment: 1 } },
    });
  }

  markPhoneVerified(tokenId: string) {
    return this.prisma.phoneVerificationToken.update({
      where: { id: tokenId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
  }
}
