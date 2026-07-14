import type { PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class SupplierPerformanceService {
  constructor(private readonly prisma: PrismaClient) {}

  async getPerformance(tenantId: string, supplierId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, ...tenantScope(tenantId) },
      include: {
        performanceMetrics: { orderBy: { periodEnd: 'desc' }, take: 12 },
        purchaseOrders: {
          where: tenantScope(tenantId),
          orderBy: { orderDate: 'desc' },
          take: 50,
        },
        goodsReceipts: {
          where: { status: 'RECEIVED', ...tenantScope(tenantId) },
          orderBy: { receiptDate: 'desc' },
          take: 50,
        },
        purchaseReturns: {
          where: tenantScope(tenantId),
          orderBy: { returnDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!supplier) return null;

    const orderById = new Map(supplier.purchaseOrders.map((row) => [row.id, row]));
    const totalOrders = supplier.purchaseOrders.length;
    const totalSpend = supplier.purchaseOrders.reduce(
      (sum, row) => sum + Number(row.totalAmount),
      0,
    );
    const returnCount = supplier.purchaseReturns.length;
    const onTimeReceipts = supplier.goodsReceipts.filter((row) => {
      const order = row.purchaseOrderId ? orderById.get(row.purchaseOrderId) : undefined;
      return order?.expectedDate ? row.receiptDate <= order.expectedDate : true;
    }).length;

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        rating: supplier.rating ? Number(supplier.rating) : null,
        isPreferred: supplier.isPreferred,
        isBlacklisted: supplier.isBlacklisted,
        leadTimeDays: supplier.leadTimeDays,
        deliverySlaDays: supplier.deliverySlaDays,
        outstandingBalance: Number(supplier.outstandingBalance),
        creditLimit: supplier.creditLimit ? Number(supplier.creditLimit) : null,
      },
      metrics: {
        totalOrders,
        totalSpend,
        returnCount,
        returnRate: totalOrders > 0 ? returnCount / totalOrders : 0,
        onTimeDeliveryRate:
          supplier.goodsReceipts.length > 0 ? onTimeReceipts / supplier.goodsReceipts.length : null,
        snapshots: supplier.performanceMetrics,
      },
    };
  }

  async recordMonthlySnapshot(tenantId: string, supplierId: string) {
    const performance = await this.getPerformance(tenantId, supplierId);
    if (!performance) return null;

    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const existing = await this.prisma.supplierPerformanceMetric.findFirst({
      where: {
        tenantId,
        supplierId,
        periodStart,
        periodEnd,
      },
    });

    const data = {
      totalOrders: performance.metrics.totalOrders,
      totalAmount: performance.metrics.totalSpend,
      onTimeDeliveries: performance.metrics.onTimeDeliveryRate
        ? Math.round(performance.metrics.onTimeDeliveryRate * performance.metrics.totalOrders)
        : 0,
      lateDeliveries: performance.metrics.onTimeDeliveryRate
        ? performance.metrics.totalOrders -
          Math.round(performance.metrics.onTimeDeliveryRate * performance.metrics.totalOrders)
        : 0,
      avgLeadTimeDays: performance.supplier.leadTimeDays,
      qualityScore: performance.supplier.rating,
      returnRate: performance.metrics.returnRate,
    };

    if (existing) {
      return this.prisma.supplierPerformanceMetric.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.supplierPerformanceMetric.create({
      data: {
        tenant: { connect: { id: tenantId } },
        supplier: { connect: { id: supplierId } },
        periodStart,
        periodEnd,
        ...data,
      },
    });
  }

  async rankSuppliers(tenantId: string) {
    const suppliers = await this.prisma.supplier.findMany({
      where: { ...tenantScope(tenantId), status: 'ACTIVE', isBlacklisted: false },
      include: {
        purchaseOrders: { where: tenantScope(tenantId) },
        purchaseReturns: { where: tenantScope(tenantId) },
      },
    });

    return suppliers
      .map((supplier) => {
        const totalSpend = supplier.purchaseOrders.reduce(
          (sum, row) => sum + Number(row.totalAmount),
          0,
        );
        const returnRate =
          supplier.purchaseOrders.length > 0
            ? supplier.purchaseReturns.length / supplier.purchaseOrders.length
            : 0;
        const score =
          (supplier.rating ? Number(supplier.rating) : 3) * 20 -
          returnRate * 30 +
          (supplier.isPreferred ? 10 : 0);

        return {
          supplierId: supplier.id,
          name: supplier.name,
          rating: supplier.rating ? Number(supplier.rating) : null,
          isPreferred: supplier.isPreferred,
          totalSpend,
          orderCount: supplier.purchaseOrders.length,
          returnRate,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  async leadTimeReport(tenantId: string) {
    const quotations = await this.prisma.supplierQuotation.findMany({
      where: { ...tenantScope(tenantId), status: 'ACCEPTED', leadTimeDays: { not: null } },
      include: { supplier: true },
      orderBy: { leadTimeDays: 'asc' },
    });

    return quotations.map((row) => ({
      supplierId: row.supplierId,
      supplierName: row.supplier.name,
      quotationNo: row.quotationNo,
      leadTimeDays: row.leadTimeDays,
      totalAmount: Number(row.totalAmount),
    }));
  }
}
