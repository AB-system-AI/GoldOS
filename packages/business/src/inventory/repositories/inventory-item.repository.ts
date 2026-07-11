import type {
  InventoryLifecycleStage,
  InventoryStatus,
  Prisma,
  PrismaClient,
} from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from '../../repositories/tenant-scope.js';

const itemIncludes = {
  product: {
    include: {
      goldItem: true,
      diamondItem: true,
      gemstone: true,
      category: true,
      brand: true,
    },
  },
  branch: true,
  inventoryLot: true,
  warehouseZone: true,
  supplier: true,
} satisfies Prisma.InventoryItemInclude;

export class InventoryItemRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: itemIncludes,
    });
  }

  findByAssetId(tenantId: string, assetId: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { assetId, ...tenantScope(tenantId) },
      include: itemIncludes,
    });
  }

  findBySerialNumber(tenantId: string, serialNumber: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { serialNumber, ...tenantScope(tenantId) },
      include: itemIncludes,
    });
  }

  findByBarcode(tenantId: string, barcode: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { barcode, ...tenantScope(tenantId) },
      include: itemIncludes,
    });
  }

  findByQrCode(tenantId: string, qrCode: string) {
    return this.prisma.inventoryItem.findFirst({
      where: { qrCode, ...tenantScope(tenantId) },
      include: itemIncludes,
    });
  }

  findByCertificateNumber(tenantId: string, certificateNumber: string) {
    return this.prisma.inventoryItem.findFirst({
      where: {
        ...tenantScope(tenantId),
        product: {
          OR: [
            { diamondItem: { certificateNumber } },
            { certificates: { some: { certificateNo: certificateNumber, deletedAt: null } } },
          ],
        },
      },
      include: itemIncludes,
    });
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      productId?: string;
      inventoryLotId?: string;
      warehouseZoneId?: string;
      status?: InventoryStatus;
      lifecycleStage?: InventoryLifecycleStage;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.inventoryItem.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.productId ? { productId: filters.productId } : {}),
        ...(filters?.inventoryLotId ? { inventoryLotId: filters.inventoryLotId } : {}),
        ...(filters?.warehouseZoneId ? { warehouseZoneId: filters.warehouseZoneId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.lifecycleStage ? { lifecycleStage: filters.lifecycleStage } : {}),
        ...(filters?.search
          ? {
              OR: [
                { assetId: { contains: filters.search, mode: 'insensitive' } },
                { serialNumber: { contains: filters.search, mode: 'insensitive' } },
                { barcode: { contains: filters.search, mode: 'insensitive' } },
                { qrCode: { contains: filters.search, mode: 'insensitive' } },
                { rfidTag: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: itemIncludes,
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  search(
    tenantId: string,
    filters: {
      barcode?: string;
      qrCode?: string;
      assetId?: string;
      serialNumber?: string;
      certificateNumber?: string;
      branchId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const orConditions: Prisma.InventoryItemWhereInput[] = [];

    if (filters.barcode) orConditions.push({ barcode: filters.barcode });
    if (filters.qrCode) orConditions.push({ qrCode: filters.qrCode });
    if (filters.assetId) orConditions.push({ assetId: filters.assetId });
    if (filters.serialNumber) orConditions.push({ serialNumber: filters.serialNumber });
    if (filters.certificateNumber) {
      orConditions.push({
        product: {
          OR: [
            { diamondItem: { certificateNumber: filters.certificateNumber } },
            {
              certificates: { some: { certificateNo: filters.certificateNumber, deletedAt: null } },
            },
          ],
        },
      });
    }

    return this.prisma.inventoryItem.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(orConditions.length > 0 ? { OR: orConditions } : {}),
      },
      include: itemIncludes,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.take ?? 50,
    });
  }

  create(tenantId: string, data: Omit<Prisma.InventoryItemCreateInput, 'tenant'>) {
    return this.prisma.inventoryItem.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: itemIncludes,
    });
  }

  async update(tenantId: string, id: string, data: Prisma.InventoryItemUpdateInput) {
    const result = await this.prisma.inventoryItem.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.inventoryItem.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
