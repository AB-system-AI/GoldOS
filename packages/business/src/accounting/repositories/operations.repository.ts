import type { Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, tenantScope } from '../../repositories/tenant-scope.js';

export class ManufacturingOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.manufacturingOrder.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true, workshop: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ManufacturingOrderUpdateInput) {
    const result = await this.prisma.manufacturingOrder.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}

export class RepairOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.repairOrder.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { branch: true, customer: true, workshop: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.RepairOrderUpdateInput) {
    const result = await this.prisma.repairOrder.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }
}
