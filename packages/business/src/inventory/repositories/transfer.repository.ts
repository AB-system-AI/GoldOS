import type { Prisma, PrismaClient, TransferStatus } from '@goldos/database';

import {
  activeOnly,
  scopedIdWhere,
  softDeleteData,
  tenantScope,
} from '../../repositories/tenant-scope.js';

export class TransferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.transfer.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        fromBranch: true,
        toBranch: true,
        requestedBy: true,
        approvedBy: true,
        rejectedBy: true,
        lines: { where: activeOnly(), include: { inventoryItem: true } },
      },
    });
  }

  findByTransferNo(tenantId: string, transferNo: string) {
    return this.prisma.transfer.findFirst({
      where: { transferNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      fromBranchId?: string;
      toBranchId?: string;
      status?: TransferStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.transfer.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.fromBranchId ? { fromBranchId: filters.fromBranchId } : {}),
        ...(filters?.toBranchId ? { toBranchId: filters.toBranchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: {
        fromBranch: true,
        toBranch: true,
        lines: { where: activeOnly() },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.TransferCreateInput, 'tenant'>) {
    return this.prisma.transfer.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { lines: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.TransferUpdateInput) {
    const result = await this.prisma.transfer.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.transfer.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  addLine(transferId: string, data: Omit<Prisma.TransferLineCreateInput, 'transfer'>) {
    return this.prisma.transferLine.create({
      data: { ...data, transfer: { connect: { id: transferId } } },
    });
  }

  softDeleteLine(transferId: string, lineId: string) {
    return this.prisma.transferLine.updateMany({
      where: { id: lineId, transferId, deletedAt: null },
      data: softDeleteData(),
    });
  }

  createApproval(tenantId: string, data: Omit<Prisma.InventoryApprovalCreateInput, 'tenant'>) {
    return this.prisma.inventoryApproval.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
