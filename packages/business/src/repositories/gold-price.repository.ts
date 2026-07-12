import type { GoldKarat, Prisma, PrismaClient } from '@goldos/database';

import { activeOnly, scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class GoldPriceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listCache(tenantId: string, currency = 'SAR') {
    return this.prisma.goldPriceCache.findMany({
      where: { ...tenantScope(tenantId), currency },
      orderBy: { karat: 'asc' },
    });
  }

  findCacheEntry(tenantId: string, karat: GoldKarat, currency = 'SAR') {
    return this.prisma.goldPriceCache.findFirst({
      where: { ...tenantScope(tenantId), karat, currency },
    });
  }

  upsertCache(
    tenantId: string,
    data: {
      karat: GoldKarat;
      pricePerGram: Prisma.Decimal | number | string;
      currency?: string;
      sourceId?: string | null;
      fetchedAt: Date;
      expiresAt?: Date | null;
      metadata?: Prisma.InputJsonValue;
    },
  ) {
    const currency = data.currency ?? 'SAR';
    return this.prisma.goldPriceCache.upsert({
      where: {
        tenantId_karat_currency: { tenantId, karat: data.karat, currency },
      },
      create: {
        tenantId,
        karat: data.karat,
        currency,
        pricePerGram: data.pricePerGram,
        sourceId: data.sourceId ?? null,
        fetchedAt: data.fetchedAt,
        expiresAt: data.expiresAt ?? null,
        metadata: data.metadata ?? {},
      },
      update: {
        pricePerGram: data.pricePerGram,
        sourceId: data.sourceId ?? null,
        fetchedAt: data.fetchedAt,
        expiresAt: data.expiresAt ?? null,
        isStale: false,
        metadata: data.metadata ?? {},
        deletedAt: null,
      },
    });
  }

  listActiveOverrides(tenantId: string, currency = 'SAR') {
    const now = new Date();
    return this.prisma.goldPriceOverride.findMany({
      where: {
        ...tenantScope(tenantId),
        currency,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  findOverrideById(tenantId: string, id: string) {
    return this.prisma.goldPriceOverride.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  createOverride(tenantId: string, data: Omit<Prisma.GoldPriceOverrideCreateInput, 'tenant'>) {
    return this.prisma.goldPriceOverride.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async updateOverride(tenantId: string, id: string, data: Prisma.GoldPriceOverrideUpdateInput) {
    const result = await this.prisma.goldPriceOverride.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findOverrideById(tenantId, id);
  }

  softDeleteOverride(tenantId: string, id: string) {
    return this.prisma.goldPriceOverride.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listHistory(tenantId: string, filters?: { karat?: GoldKarat; take?: number }) {
    return this.prisma.goldPriceHistory.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.karat ? { karat: filters.karat } : {}),
      },
      orderBy: { effectiveAt: 'desc' },
      take: filters?.take ?? 100,
    });
  }

  recordHistory(tenantId: string, data: Omit<Prisma.GoldPriceHistoryCreateInput, 'tenant'>) {
    return this.prisma.goldPriceHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  markHistoryNotCurrent(tenantId: string, karat: GoldKarat, currency = 'SAR') {
    return this.prisma.goldPriceHistory.updateMany({
      where: { ...tenantScope(tenantId), karat, currency, isCurrent: true },
      data: { isCurrent: false },
    });
  }

  listSources(tenantId: string) {
    return this.prisma.goldPriceSource.findMany({
      where: tenantScope(tenantId),
      include: { provider: true },
      orderBy: { priority: 'asc' },
    });
  }

  createSyncLog(tenantId: string | null, data: Omit<Prisma.GoldPriceSyncLogCreateInput, 'tenant'>) {
    return this.prisma.goldPriceSyncLog.create({
      data: {
        ...data,
        ...(tenantId ? { tenant: { connect: { id: tenantId } } } : {}),
      },
    });
  }

  listProviders() {
    return this.prisma.goldPriceProvider.findMany({
      where: { ...activeOnly(), isActive: true },
      orderBy: { priority: 'asc' },
    });
  }

  async listInventoryWeightByKarat(tenantId: string, karat: GoldKarat) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        product: { goldItem: { karat } },
      },
      select: {
        weightActual: true,
        product: { select: { goldItem: { select: { netWeight: true } } } },
      },
      take: 5000,
    });

    return items.map((item) => ({
      weight: Number(item.weightActual ?? item.product.goldItem?.netWeight ?? 0),
    }));
  }
}
