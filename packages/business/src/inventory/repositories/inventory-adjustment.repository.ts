import type { InventoryApprovalStatus, Prisma, PrismaClient } from '@goldos/database';

import {
  activeOnly,
  scopedIdWhere,
  softDeleteData,
  tenantScope,
} from '../../repositories/tenant-scope.js';

export class InventoryAdjustmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.inventoryAdjustment.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        branch: true,
        requestedBy: true,
        approvedBy: true,
        lines: { where: activeOnly(), include: { inventoryItem: true } },
      },
    });
  }

  findByAdjustmentNo(tenantId: string, adjustmentNo: string) {
    return this.prisma.inventoryAdjustment.findFirst({
      where: { adjustmentNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: InventoryApprovalStatus;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.inventoryAdjustment.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
      },
      include: { lines: { where: activeOnly() } },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryAdjustmentCreateInput, 'tenant'>) {
    return this.prisma.inventoryAdjustment.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.InventoryAdjustmentUpdateInput) {
    const result = await this.prisma.inventoryAdjustment.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.inventoryAdjustment.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  addLine(
    adjustmentId: string,
    data: Omit<Prisma.InventoryAdjustmentLineCreateInput, 'adjustment'>,
  ) {
    return this.prisma.inventoryAdjustmentLine.create({
      data: { ...data, adjustment: { connect: { id: adjustmentId } } },
    });
  }

  createApproval(tenantId: string, data: Omit<Prisma.InventoryApprovalCreateInput, 'tenant'>) {
    return this.prisma.inventoryApproval.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
