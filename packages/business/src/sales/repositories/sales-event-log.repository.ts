import type { Prisma, PrismaClient, SalesEventType } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class SalesEventLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(tenantId: string, data: Omit<Prisma.SalesEventLogCreateInput, 'tenant'>) {
    return this.prisma.salesEventLog.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      eventType?: SalesEventType;
      referenceType?: string;
      referenceId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.salesEventLog.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.eventType ? { eventType: filters.eventType } : {}),
        ...(filters?.referenceType ? { referenceType: filters.referenceType } : {}),
        ...(filters?.referenceId ? { referenceId: filters.referenceId } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }
}
