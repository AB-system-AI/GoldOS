import type { InventoryApprovalStatus, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere } from '../../repositories/tenant-scope.js';

export class DiscountApprovalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.discountApproval.findFirst({
      where: { id, tenantId },
      include: { requester: true, approver: true, branch: true },
    });
  }

  findPendingByReference(tenantId: string, referenceType: string, referenceId: string) {
    return this.prisma.discountApproval.findFirst({
      where: {
        tenantId,
        referenceType,
        referenceId,
        status: 'PENDING',
      },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      status?: InventoryApprovalStatus;
      referenceType?: string;
      referenceId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.discountApproval.findMany({
      where: {
        tenantId,
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.referenceType ? { referenceType: filters.referenceType } : {}),
        ...(filters?.referenceId ? { referenceId: filters.referenceId } : {}),
      },
      include: { requester: true, approver: true },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.DiscountApprovalCreateInput, 'tenant'>) {
    return this.prisma.discountApproval.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.DiscountApprovalUpdateInput) {
    const result = await this.prisma.discountApproval.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}
