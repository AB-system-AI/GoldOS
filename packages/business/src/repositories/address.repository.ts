import type { AddressableType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class AddressRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.address.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { city: { include: { country: true } } },
    });
  }

  listForEntity(tenantId: string, addressableType: AddressableType, addressableId: string) {
    return this.prisma.address.findMany({
      where: {
        addressableType,
        addressableId,
        ...tenantScope(tenantId),
      },
      include: { city: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  create(tenantId: string, data: Omit<Prisma.AddressCreateInput, 'tenant'>) {
    return this.prisma.address.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { city: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.AddressUpdateInput) {
    const result = await this.prisma.address.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.address.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  clearPrimaryForEntity(
    tenantId: string,
    addressableType: AddressableType,
    addressableId: string,
    exceptId?: string,
  ) {
    return this.prisma.address.updateMany({
      where: {
        addressableType,
        addressableId,
        ...tenantScope(tenantId),
        isPrimary: true,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  }
}
