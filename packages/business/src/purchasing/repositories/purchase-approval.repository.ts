import type { Prisma, PrismaClient, PurchaseDocumentType } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseApprovalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForDocument(tenantId: string, documentType: PurchaseDocumentType, documentId: string) {
    return this.prisma.purchaseApproval.findMany({
      where: { tenantId, documentType, documentId },
      include: { approver: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listPending(
    tenantId: string,
    filters?: {
      documentType?: PurchaseDocumentType;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.purchaseApproval.findMany({
      where: {
        tenantId,
        status: 'PENDING',
        ...(filters?.documentType ? { documentType: filters.documentType } : {}),
      },
      include: { approver: true },
      orderBy: { createdAt: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  skipRemainingPending(
    tenantId: string,
    documentType: PurchaseDocumentType,
    documentId: string,
    exceptId: string,
  ) {
    return this.prisma.purchaseApproval.updateMany({
      where: {
        tenantId,
        documentType,
        documentId,
        status: 'PENDING',
        id: { not: exceptId },
      },
      data: { status: 'SKIPPED', decidedAt: new Date() },
    });
  }

  create(tenantId: string, data: Omit<Prisma.PurchaseApprovalCreateInput, 'tenant'>) {
    return this.prisma.purchaseApproval.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  update(id: string, data: Prisma.PurchaseApprovalUpdateInput) {
    return this.prisma.purchaseApproval.update({ where: { id }, data });
  }

  listConfigs(tenantId: string, branchId?: string | null) {
    return this.prisma.purchaseApprovalConfig.findMany({
      where: {
        ...tenantScope(tenantId),
        isActive: true,
        ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : {}),
      },
      orderBy: { minAmount: 'asc' },
    });
  }

  upsertConfig(tenantId: string, data: Omit<Prisma.PurchaseApprovalConfigCreateInput, 'tenant'>) {
    return this.prisma.purchaseApprovalConfig.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }
}
