import type {
  InvitationAuditAction,
  InvitationStatus,
  Prisma,
  PrismaClient,
} from '@goldos/database';

export class InvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: {
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    createdById: string;
    branchId?: string | null;
    roleId?: string | null;
    phone?: string | null;
    jobTitle?: string | null;
    employeeId?: string | null;
    expiresAt: Date;
  }) {
    return this.prisma.employeeInvitation.create({
      data: {
        tenantId: data.tenantId,
        email: data.email.toLowerCase(),
        firstName: data.firstName,
        lastName: data.lastName,
        createdById: data.createdById,
        branchId: data.branchId ?? null,
        roleId: data.roleId ?? null,
        phone: data.phone ?? null,
        jobTitle: data.jobTitle ?? null,
        employeeId: data.employeeId ?? null,
        expiresAt: data.expiresAt,
        status: 'PENDING',
      },
      include: { role: true, branch: true },
    });
  }

  findById(id: string, tenantId: string) {
    return this.prisma.employeeInvitation.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { role: true, branch: true, employee: true },
    });
  }

  listByTenant(tenantId: string) {
    return this.prisma.employeeInvitation.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { role: true, branch: true },
    });
  }

  createToken(data: {
    invitationId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.invitationToken.create({
      data,
    });
  }

  findByTokenHash(tokenHash: string) {
    return this.prisma.invitationToken.findFirst({
      where: {
        tokenHash,
        deletedAt: null,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        invitation: {
          include: { role: true, branch: true, employee: true, tenant: true },
        },
      },
    });
  }

  markTokenUsed(tokenId: string, ipAddress?: string | null, userAgent?: string | null) {
    return this.prisma.invitationToken.update({
      where: { id: tokenId },
      data: {
        usedAt: new Date(),
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  }

  updateStatus(
    invitationId: string,
    status: InvitationStatus,
    extra?: {
      acceptedById?: string;
      acceptedAt?: Date;
      cancelledById?: string;
      cancelledAt?: Date;
      lastSentAt?: Date;
      resendCount?: number;
      employeeId?: string;
    },
  ) {
    return this.prisma.employeeInvitation.update({
      where: { id: invitationId },
      data: {
        status,
        ...extra,
      },
    });
  }

  createAuditLog(data: {
    tenantId: string;
    invitationId: string;
    action: InvitationAuditAction;
    performedById?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.invitationAuditLog.create({
      data: {
        tenantId: data.tenantId,
        invitationId: data.invitationId,
        action: data.action,
        performedById: data.performedById ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}
