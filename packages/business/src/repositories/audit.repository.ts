import type { AuditAction, Prisma, PrismaClient } from '@goldos/database';

import { tenantScope } from './tenant-scope.js';

export class AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: Prisma.AuditLogCreateInput) {
    return this.prisma.auditLog.create({ data });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      action?: AuditAction;
      userId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.entityType ? { entityType: filters.entityType } : {}),
        ...(filters?.entityId ? { entityId: filters.entityId } : {}),
        ...(filters?.action ? { action: filters.action } : {}),
        ...(filters?.userId ? { userId: filters.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }
}
