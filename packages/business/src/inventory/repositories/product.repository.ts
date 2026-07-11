import type { Prisma, PrismaClient, ProductStatus, ProductType } from '@goldos/database';

import {
  activeOnly,
  scopedIdWhere,
  softDeleteData,
  tenantScope,
} from '../../repositories/tenant-scope.js';

const productIncludes = {
  category: true,
  brand: true,
  collection: true,
  manufacturer: true,
  goldItem: true,
  diamondItem: true,
  gemstone: true,
  productTags: { where: activeOnly(), include: { tag: true } },
} satisfies Prisma.ProductInclude;

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: productIncludes,
    });
  }

  findBySku(tenantId: string, sku: string) {
    return this.prisma.product.findFirst({
      where: { sku, ...tenantScope(tenantId) },
      include: productIncludes,
    });
  }

  findByBarcode(tenantId: string, barcode: string) {
    return this.prisma.product.findFirst({
      where: { barcode, ...tenantScope(tenantId) },
      include: productIncludes,
    });
  }

  list(
    tenantId: string,
    filters?: {
      categoryId?: string;
      brandId?: string;
      collectionId?: string;
      type?: ProductType;
      status?: ProductStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.product.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.brandId ? { brandId: filters.brandId } : {}),
        ...(filters?.collectionId ? { collectionId: filters.collectionId } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { sku: { contains: filters.search, mode: 'insensitive' } },
                { barcode: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: productIncludes,
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.ProductCreateInput, 'tenant'>) {
    return this.prisma.product.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: productIncludes,
    });
  }

  async update(tenantId: string, id: string, data: Prisma.ProductUpdateInput) {
    const result = await this.prisma.product.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.product.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  async updateGoldItem(productId: string, data: Prisma.GoldItemUpdateInput) {
    const result = await this.prisma.goldItem.updateMany({
      where: { productId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.goldItem.findFirst({ where: { productId, deletedAt: null } });
  }

  async updateDiamondItem(productId: string, data: Prisma.DiamondItemUpdateInput) {
    const result = await this.prisma.diamondItem.updateMany({
      where: { productId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.diamondItem.findFirst({ where: { productId, deletedAt: null } });
  }

  async updateGemstone(productId: string, data: Prisma.GemstoneUpdateInput) {
    const result = await this.prisma.gemstone.updateMany({
      where: { productId, deletedAt: null },
      data,
    });
    if (result.count === 0) return null;
    return this.prisma.gemstone.findFirst({ where: { productId, deletedAt: null } });
  }
}
