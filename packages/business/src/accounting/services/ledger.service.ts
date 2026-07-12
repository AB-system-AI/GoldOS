import type { PrismaClient } from '@goldos/database';

import type { AuditContext } from '../../services/audit.service.js';
import { moneyAdd, moneySub } from '../../sales/engines/money.engine.js';
import type {
  CustomerLedgerRepository,
  SupplierLedgerRepository,
} from '../repositories/ledger.repository.js';

export class CustomerLedgerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerRepository: CustomerLedgerRepository,
  ) {}

  list(
    tenantId: string,
    customerId: string,
    filters?: Parameters<CustomerLedgerRepository['list']>[2],
  ) {
    return this.ledgerRepository.list(tenantId, customerId, filters);
  }

  async recordEntry(
    tenantId: string,
    params: {
      customerId: string;
      branchId?: string | null;
      entryType: 'INVOICE' | 'PAYMENT' | 'REFUND' | 'CREDIT_NOTE' | 'ADJUSTMENT';
      referenceType: string;
      referenceId: string;
      debit: number;
      credit: number;
      currency?: string;
      description?: string | null;
      entryDate: Date;
      journalEntryId?: string | null;
    },
    _context?: AuditContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.customerLedgerEntry.findFirst({
        where: { tenantId, customerId: params.customerId },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      });

      const priorBalance = latest ? Number(latest.runningBalance) : 0;
      const runningBalance = moneySub(moneyAdd(priorBalance, params.debit), params.credit);

      const entry = await tx.customerLedgerEntry.create({
        data: {
          tenant: { connect: { id: tenantId } },
          customer: { connect: { id: params.customerId } },
          entryType: params.entryType,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          debit: params.debit,
          credit: params.credit,
          runningBalance: runningBalance.toNumber(),
          currency: params.currency ?? 'SAR',
          description: params.description,
          entryDate: params.entryDate,
          ...(params.branchId ? { branch: { connect: { id: params.branchId } } } : {}),
          ...(params.journalEntryId
            ? { journalEntry: { connect: { id: params.journalEntryId } } }
            : {}),
        },
      });

      await tx.customer.update({
        where: { id: params.customerId },
        data: { outstandingBalance: runningBalance.toNumber() },
      });

      return entry;
    });
  }

  async getStatement(tenantId: string, customerId: string) {
    const entries = await this.ledgerRepository.list(tenantId, customerId, { take: 500 });
    const latest = await this.ledgerRepository.getLatestBalance(tenantId, customerId);
    return {
      entries,
      outstandingBalance: latest ? Number(latest.runningBalance) : 0,
      totalEntries: entries.length,
    };
  }
}

export class SupplierLedgerService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly ledgerRepository: SupplierLedgerRepository,
  ) {}

  list(
    tenantId: string,
    supplierId: string,
    filters?: Parameters<SupplierLedgerRepository['list']>[2],
  ) {
    return this.ledgerRepository.list(tenantId, supplierId, filters);
  }

  async recordEntry(
    tenantId: string,
    params: {
      supplierId: string;
      branchId?: string | null;
      entryType: 'PURCHASE' | 'SUPPLIER_PAYMENT' | 'ADJUSTMENT';
      referenceType: string;
      referenceId: string;
      debit: number;
      credit: number;
      currency?: string;
      description?: string | null;
      entryDate: Date;
      journalEntryId?: string | null;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const latest = await tx.supplierLedgerEntry.findFirst({
        where: { tenantId, supplierId: params.supplierId },
        orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      });

      const priorBalance = latest ? Number(latest.runningBalance) : 0;
      const runningBalance = moneySub(moneyAdd(priorBalance, params.debit), params.credit);

      const entry = await tx.supplierLedgerEntry.create({
        data: {
          tenant: { connect: { id: tenantId } },
          supplier: { connect: { id: params.supplierId } },
          entryType: params.entryType,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          debit: params.debit,
          credit: params.credit,
          runningBalance: runningBalance.toNumber(),
          currency: params.currency ?? 'SAR',
          description: params.description,
          entryDate: params.entryDate,
          ...(params.branchId ? { branch: { connect: { id: params.branchId } } } : {}),
          ...(params.journalEntryId
            ? { journalEntry: { connect: { id: params.journalEntryId } } }
            : {}),
        },
      });

      await tx.supplier.update({
        where: { id: params.supplierId },
        data: { outstandingBalance: runningBalance.toNumber() },
      });

      return entry;
    });
  }

  async getStatement(tenantId: string, supplierId: string) {
    const entries = await this.ledgerRepository.list(tenantId, supplierId, { take: 500 });
    const latest = await this.ledgerRepository.getLatestBalance(tenantId, supplierId);
    return {
      entries,
      outstandingBalance: latest ? Number(latest.runningBalance) : 0,
      totalEntries: entries.length,
    };
  }
}
