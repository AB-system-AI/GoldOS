import type { CustomerType, PartnerStatus, Prisma, PrismaClient } from '@goldos/database';

import { activeOnly, scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class CustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        customerGroup: true,
        phones: { where: activeOnly() },
        buybackHistory: { where: activeOnly(), orderBy: { occurredAt: 'desc' }, take: 20 },
        tradeInHistory: { where: activeOnly(), orderBy: { occurredAt: 'desc' }, take: 20 },
      },
    });
  }

  findByCustomerNo(tenantId: string, customerNo: string) {
    return this.prisma.customer.findFirst({
      where: { customerNo, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      customerGroupId?: string;
      status?: PartnerStatus;
      customerType?: CustomerType;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.customer.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.customerGroupId ? { customerGroupId: filters.customerGroupId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.customerType ? { customerType: filters.customerType } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { customerNo: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search } },
                { email: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.CustomerCreateInput, 'tenant'>) {
    return this.prisma.customer.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.CustomerUpdateInput) {
    const result = await this.prisma.customer.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.customer.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listPhones(tenantId: string, customerId: string) {
    return this.prisma.customerPhone.findMany({
      where: { customerId, ...tenantScope(tenantId), ...activeOnly() },
    });
  }

  addPhone(
    tenantId: string,
    data: { customerId: string; phone: string; label?: string | null; isPrimary?: boolean },
  ) {
    return this.prisma.customerPhone.create({
      data: {
        tenantId,
        customerId: data.customerId,
        phone: data.phone,
        label: data.label ?? null,
        isPrimary: data.isPrimary ?? false,
      },
    });
  }

  updatePhone(tenantId: string, id: string, data: Prisma.CustomerPhoneUpdateInput) {
    return this.prisma.customerPhone.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data,
    });
  }

  softDeletePhone(tenantId: string, id: string) {
    return this.prisma.customerPhone.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listBuybackHistory(tenantId: string, customerId: string) {
    return this.prisma.customerBuybackHistory.findMany({
      where: { customerId, ...tenantScope(tenantId) },
      orderBy: { occurredAt: 'desc' },
    });
  }

  addBuybackHistory(
    tenantId: string,
    data: Omit<Prisma.CustomerBuybackHistoryCreateInput, 'tenant'>,
  ) {
    return this.prisma.customerBuybackHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  listTradeInHistory(tenantId: string, customerId: string) {
    return this.prisma.customerTradeInHistory.findMany({
      where: { customerId, ...tenantScope(tenantId) },
      orderBy: { occurredAt: 'desc' },
    });
  }

  addTradeInHistory(
    tenantId: string,
    data: Omit<Prisma.CustomerTradeInHistoryCreateInput, 'tenant'>,
  ) {
    return this.prisma.customerTradeInHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  listPurchaseHistory(tenantId: string, customerId: string, take = 50) {
    return this.prisma.salesOrder.findMany({
      where: { customerId, ...tenantScope(tenantId) },
      include: {
        branch: true,
        lines: { where: activeOnly() },
      },
      orderBy: { orderDate: 'desc' },
      take,
    });
  }
}
