import type { PrismaClient } from '@goldos/database';

import { tenantScope } from '../../repositories/tenant-scope.js';

export interface InvoiceSearchFilters {
  invoiceNo?: string;
  qrCode?: string;
  barcode?: string;
  customerId?: string;
  customerPhone?: string;
  nationalId?: string;
  passportNumber?: string;
  taxNumber?: string;
  commercialRegistration?: string;
  salesOrderId?: string;
  paymentId?: string;
  employeeId?: string;
  cashierEmployeeId?: string;
  branchId?: string;
  assetId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  skip?: number;
  take?: number;
}

function customerIdentityFilter(filters: InvoiceSearchFilters) {
  const identity: Record<string, string> = {};
  if (filters.nationalId) identity.nationalId = filters.nationalId;
  if (filters.passportNumber) identity.passportNumber = filters.passportNumber;
  if (filters.taxNumber) identity.taxNumber = filters.taxNumber;
  if (filters.commercialRegistration)
    identity.commercialRegistration = filters.commercialRegistration;
  return Object.keys(identity).length > 0 ? identity : undefined;
}

export class InvoiceSearchService {
  constructor(private readonly prisma: PrismaClient) {}

  async search(tenantId: string, filters: InvoiceSearchFilters) {
    const customerIdentity = customerIdentityFilter(filters);
    const where = {
      ...tenantScope(tenantId),
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
      ...(filters.customerId ? { customerId: filters.customerId } : {}),
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.cashierEmployeeId ? { cashierEmployeeId: filters.cashierEmployeeId } : {}),
      ...(filters.salesOrderId ? { salesOrderId: filters.salesOrderId } : {}),
      ...(filters.invoiceNo
        ? { invoiceNo: { contains: filters.invoiceNo, mode: 'insensitive' as const } }
        : {}),
      ...(filters.qrCode ? { qrCode: filters.qrCode } : {}),
      ...(filters.barcode ? { barcode: filters.barcode } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            createdAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
      ...(filters.customerPhone || customerIdentity
        ? {
            customer: {
              ...(filters.customerPhone ? { phone: { contains: filters.customerPhone } } : {}),
              ...customerIdentity,
            },
          }
        : {}),
      ...(filters.paymentId
        ? { payments: { some: { id: filters.paymentId, deletedAt: null } } }
        : {}),
      ...(filters.assetId
        ? {
            items: {
              some: {
                deletedAt: null,
                inventoryItem: { assetId: filters.assetId },
              },
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: true, branch: true, salesOrder: true },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip,
        take: filters.take ?? 50,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total, skip: filters.skip ?? 0, take: filters.take ?? 50 };
  }
}
