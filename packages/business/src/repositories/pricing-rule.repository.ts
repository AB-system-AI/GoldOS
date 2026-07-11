import type { PricingRuleType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class PricingRuleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.pricingRule.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.pricingRule.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: { type?: PricingRuleType; isActive?: boolean; skip?: number; take?: number },
  ) {
    return this.prisma.pricingRule.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      },
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.PricingRuleCreateInput, 'tenant'>) {
    return this.prisma.pricingRule.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.PricingRuleUpdateInput) {
    const result = await this.prisma.pricingRule.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.pricingRule.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
