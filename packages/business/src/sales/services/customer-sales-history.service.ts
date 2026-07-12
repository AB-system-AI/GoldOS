import type { PrismaClient } from '@goldos/database';

import { assertFound } from '../../services/validation.js';
import type { CustomerRepository } from '../../repositories/customer.repository.js';
import type { LoyaltyRepository } from '../repositories/loyalty.repository.js';
import type { CustomerSalesSummary } from '../types/sales.types.js';

export class CustomerSalesHistoryService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly customerRepository: CustomerRepository,
    private readonly loyaltyRepository: LoyaltyRepository,
  ) {}

  async getHistory(tenantId: string, customerId: string) {
    await assertFound(this.customerRepository.findById(tenantId, customerId), 'Customer not found');

    const [orders, invoices, returns, buybacks, loyalty] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { tenantId, customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { branch: true, lines: true },
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, customerId, deletedAt: null },
        orderBy: { issuedAt: 'desc' },
        take: 50,
        include: { branch: true, items: true, payments: true },
      }),
      this.prisma.salesReturn.findMany({
        where: { tenantId, customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { invoice: true },
      }),
      this.prisma.buybackTransaction.findMany({
        where: { tenantId, customerId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.loyaltyRepository.findByCustomer(tenantId, customerId),
    ]);

    const summary = await this.getSummary(tenantId, customerId);

    return {
      summary,
      orders,
      invoices,
      returns,
      buybacks,
      loyalty,
    };
  }

  async getSummary(tenantId: string, customerId: string): Promise<CustomerSalesSummary> {
    const customer = await assertFound(
      this.customerRepository.findById(tenantId, customerId),
      'Customer not found',
    );

    const [orderCount, invoiceCount, returnCount, buybackCount, lastInvoice] = await Promise.all([
      this.prisma.salesOrder.count({ where: { tenantId, customerId, deletedAt: null } }),
      this.prisma.invoice.count({ where: { tenantId, customerId, deletedAt: null } }),
      this.prisma.salesReturn.count({ where: { tenantId, customerId, deletedAt: null } }),
      this.prisma.buybackTransaction.count({ where: { tenantId, customerId, deletedAt: null } }),
      this.prisma.invoice.findFirst({
        where: { tenantId, customerId, deletedAt: null, status: { in: ['ISSUED', 'COMPLETED'] } },
        orderBy: { issuedAt: 'desc' },
        select: { issuedAt: true },
      }),
    ]);

    const loyalty = await this.loyaltyRepository.findByCustomer(tenantId, customerId);

    return {
      customerId,
      totalSpent: Number(customer.totalSpent),
      orderCount,
      invoiceCount,
      returnCount,
      buybackCount,
      loyaltyPoints: loyalty ? Number(loyalty.pointsBalance) : customer.loyaltyPoints,
      lastPurchaseAt: lastInvoice?.issuedAt ?? null,
    };
  }

  async searchAssetSalesHistory(tenantId: string, inventoryItemId: string) {
    const lines = await this.prisma.salesOrderLine.findMany({
      where: {
        inventoryItemId,
        salesOrder: { tenantId, deletedAt: null },
        deletedAt: null,
      },
      include: {
        salesOrder: { include: { customer: true, branch: true } },
        product: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { sales: lines };
  }
}
