import type { Prisma, PrismaClient, TaxRuleType } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class TaxRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.taxRule.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.taxRule.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  findDefault(tenantId: string) {
    return this.prisma.taxRule.findFirst({
      where: { ...tenantScope(tenantId), isDefault: true, isActive: true },
    });
  }

  list(
    tenantId: string,
    filters?: { type?: TaxRuleType; isActive?: boolean; skip?: number; take?: number },
  ) {
    return this.prisma.taxRule.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.TaxRuleCreateInput, 'tenant'>) {
    return this.prisma.taxRule.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.TaxRuleUpdateInput) {
    const result = await this.prisma.taxRule.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.taxRule.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  clearDefault(tenantId: string, exceptId?: string) {
    return this.prisma.taxRule.updateMany({
      where: {
        ...tenantScope(tenantId),
        isDefault: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  }
}
