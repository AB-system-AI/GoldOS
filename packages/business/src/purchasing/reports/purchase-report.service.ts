import type { PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export class PurchaseReportService {
  constructor(private readonly prisma: PrismaClient) {}

  async purchaseSummary(tenantId: string, filters?: { branchId?: string; from?: Date; to?: Date }) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.from || filters?.to
          ? {
              orderDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: { supplier: true, lines: true },
    });

    const totalAmount = orders.reduce((sum, row) => sum + Number(row.totalAmount), 0);
    const byStatus = orders.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      orderCount: orders.length,
      totalAmount,
      byStatus,
      orders: orders.map((row) => ({
        id: row.id,
        orderNo: row.orderNo,
        supplierName: row.supplier.name,
        status: row.status,
        totalAmount: Number(row.totalAmount),
        orderDate: row.orderDate,
      })),
    };
  }

  async openPurchaseOrders(tenantId: string, branchId?: string) {
    return this.prisma.purchaseOrder.findMany({
      where: {
        ...tenantScope(tenantId),
        status: { in: ['APPROVED', 'PARTIALLY_RECEIVED', 'SUBMITTED'] },
        ...(branchId ? { branchId } : {}),
      },
      include: { supplier: true, lines: true },
      orderBy: { expectedDate: 'asc' },
    });
  }

  async purchaseAging(tenantId: string) {
    const invoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        ...tenantScope(tenantId),
        status: { in: ['APPROVED', 'PARTIALLY_PAID'] },
      },
      include: { supplier: true },
    });

    const now = Date.now();
    return invoices.map((row) => {
      const due = row.dueDate ? row.dueDate.getTime() : row.invoiceDate.getTime();
      const daysPastDue = Math.max(0, Math.floor((now - due) / 86_400_000));
      return {
        invoiceId: row.id,
        invoiceNo: row.invoiceNo,
        supplierName: row.supplier.name,
        totalAmount: Number(row.totalAmount),
        paidAmount: Number(row.paidAmount),
        outstanding: Number(row.totalAmount) - Number(row.paidAmount),
        daysPastDue,
      };
    });
  }

  async receivingReport(tenantId: string, filters?: { from?: Date; to?: Date }) {
    return this.prisma.goodsReceipt.findMany({
      where: {
        ...tenantScope(tenantId),
        status: 'RECEIVED',
        ...(filters?.from || filters?.to
          ? {
              receiptDate: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: { supplier: true, purchaseOrder: true, lines: true },
      orderBy: { receiptDate: 'desc' },
    });
  }

  async goldPurchaseAnalysis(tenantId: string, filters?: { from?: Date; to?: Date }) {
    const records = await this.prisma.goldCostRecord.findMany({
      where: {
        ...tenantScope(tenantId),
        referenceType: { in: ['goods_receipt', 'purchase_order'] },
        ...(filters?.from || filters?.to
          ? {
              createdAt: {
                ...(filters.from ? { gte: filters.from } : {}),
                ...(filters.to ? { lte: filters.to } : {}),
              },
            }
          : {}),
      },
      include: { product: true, inventoryItem: true },
    });

    const totalWeight = records.reduce((sum, row) => sum + Number(row.weightGrams), 0);
    const totalCost = records.reduce((sum, row) => sum + Number(row.totalCost), 0);

    return {
      recordCount: records.length,
      totalWeightGrams: totalWeight,
      totalCost,
      averageCostPerGram: totalWeight > 0 ? totalCost / totalWeight : 0,
      records,
    };
  }
}
