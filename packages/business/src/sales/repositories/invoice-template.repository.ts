import type { InvoiceTemplateType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export class InvoiceTemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.invoiceTemplate.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true, logoFile: true },
    });
  }

  findDefault(tenantId: string, templateType: InvoiceTemplateType, branchId?: string | null) {
    return this.prisma.invoiceTemplate.findFirst({
      where: {
        ...tenantScope(tenantId),
        templateType,
        isActive: true,
        isDefault: true,
        ...(branchId ? { OR: [{ branchId }, { branchId: null }] } : { branchId: null }),
      },
      include: { logoFile: true },
      orderBy: { branchId: 'desc' },
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      templateType?: InvoiceTemplateType;
      isActive?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.invoiceTemplate.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.templateType ? { templateType: filters.templateType } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      include: { branch: true, logoFile: true },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InvoiceTemplateCreateInput, 'tenant'>) {
    return this.prisma.invoiceTemplate.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.InvoiceTemplateUpdateInput) {
    const result = await this.prisma.invoiceTemplate.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.invoiceTemplate.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
