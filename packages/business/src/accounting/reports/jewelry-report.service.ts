import type { PrismaClient } from '@goldos/database';

export class JewelryReportService {
  constructor(private readonly prisma: PrismaClient) {}

  async goldInventoryValue(tenantId: string, filters?: { branchId?: string }) {
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['AVAILABLE', 'RESERVED'] },
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      },
      include: { product: { include: { goldItem: true } } },
      take: 1000,
    });

    const totalValue = items.reduce((sum, item) => sum + Number(item.costPrice ?? 0), 0);
    const totalWeight = items.reduce(
      (sum, item) => sum + Number(item.weightActual ?? item.product.goldItem?.netWeight ?? 0),
      0,
    );

    return {
      itemCount: items.length,
      totalValue,
      totalWeight,
      items: items.map((item) => ({
        assetId: item.assetId,
        costPrice: Number(item.costPrice ?? 0),
        weight: Number(item.weightActual ?? item.product.goldItem?.netWeight ?? 0),
        karat: item.product.goldItem?.karat,
      })),
    };
  }

  async goldProfit(
    tenantId: string,
    filters?: { branchId?: string; fromDate?: Date; toDate?: Date },
  ) {
    const costs = await this.prisma.goldCostRecord.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters?.fromDate || filters?.toDate
          ? {
              createdAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      take: 1000,
    });

    const totalCost = costs.reduce((s, c) => s + Number(c.totalCost), 0);
    const totalWeight = costs.reduce((s, c) => s + Number(c.weightGrams), 0);

    return {
      recordCount: costs.length,
      totalCost,
      totalWeight,
      averageCostPerGram: totalWeight > 0 ? totalCost / totalWeight : 0,
    };
  }

  async branchProfitability(tenantId: string) {
    const balances = await this.prisma.accountBalance.findMany({
      where: { tenantId, branchId: { not: null } },
      include: { account: true, branch: true },
    });

    const byBranch = new Map<string, { branchName: string; revenue: number; expenses: number }>();

    for (const row of balances) {
      if (!row.branchId || !row.branch) continue;
      const current = byBranch.get(row.branchId) ?? {
        branchName: row.branch.name,
        revenue: 0,
        expenses: 0,
      };

      if (row.account.accountType === 'REVENUE') {
        current.revenue += Number(row.balance);
      }
      if (row.account.accountType === 'EXPENSE' || row.account.accountType === 'COGS') {
        current.expenses += Number(row.balance);
      }

      byBranch.set(row.branchId, current);
    }

    return Array.from(byBranch.entries()).map(([branchId, data]) => ({
      branchId,
      ...data,
      profit: data.revenue - data.expenses,
    }));
  }

  async makingProfit(
    tenantId: string,
    filters?: { branchId?: string; fromDate?: Date; toDate?: Date },
  ) {
    const journals = await this.prisma.journalLine.findMany({
      where: {
        account: { code: '4200', tenantId },
        journalEntry: {
          status: 'POSTED',
          deletedAt: null,
          tenantId,
          ...(filters?.branchId ? { branchId: filters.branchId } : {}),
          ...(filters?.fromDate || filters?.toDate
            ? {
                entryDate: {
                  ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                  ...(filters.toDate ? { lte: filters.toDate } : {}),
                },
              }
            : {}),
        },
      },
      include: { journalEntry: true, account: true },
      take: 5000,
    });

    const revenue = journals.reduce((s, l) => s + Number(l.credit) - Number(l.debit), 0);
    return { makingRevenue: revenue, transactionCount: journals.length };
  }

  async employeeSalesPerformance(
    tenantId: string,
    filters?: { branchId?: string; fromDate?: Date; toDate?: Date },
  ) {
    const orders = await this.prisma.salesOrder.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'COMPLETED',
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.fromDate || filters?.toDate
          ? {
              completedAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      select: {
        employeeId: true,
        sellerEmployeeId: true,
        cashierEmployeeId: true,
        totalAmount: true,
        employee: { select: { id: true, firstName: true, lastName: true } },
      },
      take: 5000,
    });

    const byEmployee = new Map<
      string,
      { employeeName: string; salesCount: number; salesTotal: number }
    >();

    for (const order of orders) {
      const employeeId = order.sellerEmployeeId ?? order.employeeId ?? order.cashierEmployeeId;
      if (!employeeId) continue;
      const name = order.employee
        ? `${order.employee.firstName} ${order.employee.lastName}`
        : employeeId;
      const current = byEmployee.get(employeeId) ?? {
        employeeName: name,
        salesCount: 0,
        salesTotal: 0,
      };
      current.salesCount += 1;
      current.salesTotal += Number(order.totalAmount);
      byEmployee.set(employeeId, current);
    }

    return Array.from(byEmployee.entries())
      .map(([employeeId, data]) => ({ employeeId, ...data }))
      .sort((a, b) => b.salesTotal - a.salesTotal);
  }

  async goldCostAnalysis(
    tenantId: string,
    filters?: { branchId?: string; fromDate?: Date; toDate?: Date },
  ) {
    const records = await this.prisma.goldCostRecord.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(filters?.fromDate || filters?.toDate
          ? {
              createdAt: {
                ...(filters.fromDate ? { gte: filters.fromDate } : {}),
                ...(filters.toDate ? { lte: filters.toDate } : {}),
              },
            }
          : {}),
      },
      take: 5000,
    });

    const byKarat = new Map<
      string,
      { weight: number; purchaseCost: number; makingCost: number; laborCost: number }
    >();
    for (const record of records) {
      const karat = record.karat;
      const current = byKarat.get(karat) ?? {
        weight: 0,
        purchaseCost: 0,
        makingCost: 0,
        laborCost: 0,
      };
      current.weight += Number(record.weightGrams);
      current.purchaseCost += Number(record.purchaseCost);
      current.makingCost += Number(record.makingCost);
      current.laborCost += Number(record.laborCost);
      byKarat.set(karat, current);
    }

    return {
      recordCount: records.length,
      byKarat: Array.from(byKarat.entries()).map(([karat, data]) => ({
        karat,
        ...data,
        totalCost: data.purchaseCost + data.makingCost + data.laborCost,
        avgCostPerGram:
          data.weight > 0
            ? (data.purchaseCost + data.makingCost + data.laborCost) / data.weight
            : 0,
      })),
    };
  }
}
