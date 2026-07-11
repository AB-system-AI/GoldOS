import type { Prisma, PrismaClient } from '@goldos/database';

import {
  activeOnly,
  scopedIdWhere,
  softDeleteData,
  tenantScope,
} from '../../repositories/tenant-scope.js';

export class ProductTagRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.productTag.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByName(tenantId: string, name: string) {
    return this.prisma.productTag.findFirst({
      where: { name, ...tenantScope(tenantId) },
    });
  }

  list(tenantId: string, filters?: { search?: string; skip?: number; take?: number }) {
    return this.prisma.productTag.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.search ? { name: { contains: filters.search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.ProductTagCreateInput, 'tenant'>) {
    return this.prisma.productTag.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ProductTagUpdateInput) {
    const result = await this.prisma.productTag.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.productTag.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listAssignments(tenantId: string, productId: string) {
    return this.prisma.productTagAssignment.findMany({
      where: { productId, ...tenantScope(tenantId), ...activeOnly() },
      include: { tag: true },
    });
  }

  assignTag(tenantId: string, productId: string, tagId: string) {
    return this.prisma.productTagAssignment.upsert({
      where: { productId_tagId: { productId, tagId } },
      create: {
        tenantId,
        productId,
        tagId,
      },
      update: { deletedAt: null },
    });
  }

  unassignTag(tenantId: string, productId: string, tagId: string) {
    return this.prisma.productTagAssignment.updateMany({
      where: { productId, tagId, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
