import type { JournalEntryStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class JournalEntryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.journalEntry.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        lines: {
          where: { deletedAt: null },
          orderBy: { lineNo: 'asc' },
          include: { account: true },
        },
        branch: true,
        period: true,
        accountingTransaction: true,
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: JournalEntryStatus;
      referenceType?: string;
      referenceId?: string;
      fromDate?: Date;
      toDate?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.journalEntry.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.referenceType ? { referenceType: filters.referenceType as never } : {}),
        ...(filters?.referenceId ? { referenceId: filters.referenceId } : {}),
        ...(filters?.fromDate || filters?.toDate
          ? {
              entryDate: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      include: { lines: { where: { deletedAt: null } } },
      orderBy: [{ entryDate: 'desc' }, { journalNo: 'desc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.JournalEntryCreateInput, 'tenant'>) {
    return this.prisma.journalEntry.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.JournalEntryUpdateInput) {
    const result = await this.prisma.journalEntry.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  countByPeriodAndStatus(tenantId: string, periodId: string, status: JournalEntryStatus) {
    return this.prisma.journalEntry.count({
      where: { ...tenantScope(tenantId), periodId, status },
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.journalEntry.updateMany({
      where: { id, ...tenantScope(tenantId), status: 'DRAFT' },
      data: softDeleteData(),
    });
  }
}
