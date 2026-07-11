import type { MediaType, Prisma, PrismaClient } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

export type MediaEntityType = 'product' | 'inventory_item';

export class MediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.media.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: { file: true },
    });
  }

  listForEntity(tenantId: string, entityType: MediaEntityType, entityId: string) {
    return this.prisma.media.findMany({
      where: {
        ...tenantScope(tenantId),
        entityType,
        entityId,
      },
      include: { file: true },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
  }

  create(
    tenantId: string,
    data: {
      fileId: string;
      type: MediaType;
      entityType: MediaEntityType;
      entityId: string;
      altText?: string | null;
      sortOrder?: number;
      isPrimary?: boolean;
    },
  ) {
    return this.prisma.media.create({
      data: {
        tenant: { connect: { id: tenantId } },
        file: { connect: { id: data.fileId } },
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        altText: data.altText ?? null,
        sortOrder: data.sortOrder ?? 0,
        isPrimary: data.isPrimary ?? false,
      },
      include: { file: true },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.MediaUpdateInput) {
    const result = await this.prisma.media.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.media.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  async clearPrimaryForEntity(tenantId: string, entityType: MediaEntityType, entityId: string) {
    return this.prisma.media.updateMany({
      where: { ...tenantScope(tenantId), entityType, entityId, isPrimary: true },
      data: { isPrimary: false },
    });
  }
}
