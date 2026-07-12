import type { LedgerEntryType, Prisma, PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class CustomerLedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    customerId: string,
    filters?: { branchId?: string; entryType?: LedgerEntryType; skip?: number; take?: number },
  ) {
    return this.prisma.customerLedgerEntry.findMany({
      where: {
        ...tenantScope(tenantId),
        customerId,
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.entryType ? { entryType: filters.entryType } : {}),
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  getLatestBalance(tenantId: string, customerId: string) {
    return this.prisma.customerLedgerEntry.findFirst({
      where: { ...tenantScope(tenantId), customerId },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(tenantId: string, data: Omit<Prisma.CustomerLedgerEntryCreateInput, 'tenant'>) {
    return this.prisma.customerLedgerEntry.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}

export class SupplierLedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(
    tenantId: string,
    supplierId: string,
    filters?: { branchId?: string; entryType?: LedgerEntryType; skip?: number; take?: number },
  ) {
    return this.prisma.supplierLedgerEntry.findMany({
      where: {
        ...tenantScope(tenantId),
        supplierId,
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.entryType ? { entryType: filters.entryType } : {}),
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  getLatestBalance(tenantId: string, supplierId: string) {
    return this.prisma.supplierLedgerEntry.findFirst({
      where: { ...tenantScope(tenantId), supplierId },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(tenantId: string, data: Omit<Prisma.SupplierLedgerEntryCreateInput, 'tenant'>) {
    return this.prisma.supplierLedgerEntry.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
