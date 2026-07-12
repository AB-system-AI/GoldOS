import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@goldos/database';
import { describe, it } from 'node:test';

import { createBusinessContainer } from '../../../container.js';
import { validateJournalBalance } from '../../engines/journal.engine.js';
import {
  buildExchangeRule,
  buildInventoryAdjustmentRule,
  buildPurchaseRule,
  buildRepairCompletionRule,
  buildSalesReturnFullRule,
} from '../../engines/accounting-rule.engine.js';
import {
  createTestPrisma,
  resolveTestDatabaseUrl,
  withRollback,
} from '../../../sales/__tests__/db/test-db.js';

const databaseUrl = resolveTestDatabaseUrl();

if (databaseUrl) {
  describe('accounting database integration', () => {
    const prisma = createTestPrisma();

    async function seedAccountingFixture(tx: PrismaClient) {
      const tenant = await tx.tenant.create({
        data: {
          slug: `acct-${randomUUID().slice(0, 8)}`,
          name: 'Accounting Tenant',
          status: 'ACTIVE',
        },
      });

      const organization = await tx.organization.create({
        data: {
          tenantId: tenant.id,
          code: 'ORG1',
          name: 'Accounting Org',
          legalName: 'Accounting Org LLC',
        },
      });

      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          organizationId: organization.id,
          code: 'BR1',
          name: 'Main Branch',
        },
      });

      const supplier = await tx.supplier.create({
        data: {
          tenantId: tenant.id,
          supplierNo: `SUP-${randomUUID().slice(0, 8)}`,
          name: 'Gold Supplier',
        },
      });

      const customer = await tx.customer.create({
        data: {
          tenantId: tenant.id,
          customerNo: `C-${randomUUID().slice(0, 8)}`,
          name: 'Gold Customer',
          phone: '0500000099',
        },
      });

      const container = createBusinessContainer({ prisma: tx });
      await container.tenantFinanceBootstrapService.seedTenantFinance(tenant.id);

      return { tenant, branch, supplier, customer, container };
    }

    it('purchase complete posts balanced journal and supplier ledger', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, branch, supplier, container } = await seedAccountingFixture(tx);

        const order = await tx.purchaseOrder.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            supplierId: supplier.id,
            orderNo: `PO-${randomUUID().slice(0, 8)}`,
            status: 'APPROVED',
            orderDate: new Date(),
            totalAmount: 50000,
            subtotal: 50000,
          },
        });

        await container.purchaseOrderService.complete(tenant.id, order.id, {}, undefined);

        const transaction = await tx.accountingTransaction.findFirst({
          where: { tenantId: tenant.id, referenceType: 'PURCHASE_ORDER', referenceId: order.id },
          include: { journalEntry: { include: { lines: true } } },
        });

        assert.ok(transaction);
        assert.equal(transaction.journalEntry.status, 'POSTED');

        const validation = validateJournalBalance(
          transaction.journalEntry.lines.map((line) => ({
            accountId: line.accountId,
            debit: Number(line.debit),
            credit: Number(line.credit),
          })),
        );
        assert.equal(validation.valid, true);

        const ledger = await tx.supplierLedgerEntry.findFirst({
          where: { tenantId: tenant.id, referenceId: order.id },
        });
        assert.ok(ledger);
        assert.equal(Number(ledger.debit), 50000);
      });
    });

    it('expense approval posts journal entry', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, branch, container } = await seedAccountingFixture(tx);

        const expense = await container.expenseAccountingService.createExpense(tenant.id, {
          expenseNo: `EXP-${randomUUID().slice(0, 8)}`,
          category: 'RENT',
          amount: 2500,
          description: 'Monthly rent',
          expenseDate: new Date(),
          branchId: branch.id,
        });

        await container.expenseAccountingService.approveAndPost(
          tenant.id,
          expense.id,
          {},
          undefined,
        );

        const transaction = await tx.accountingTransaction.findFirst({
          where: { tenantId: tenant.id, referenceType: 'EXPENSE', referenceId: expense.id },
        });
        assert.ok(transaction);
      });
    });

    it('cash movement posts balanced journal', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, branch, container } = await seedAccountingFixture(tx);

        const cashRegister = await tx.cashRegister.create({
          data: {
            tenantId: tenant.id,
            branchId: branch.id,
            name: 'Main Register',
            code: 'REG1',
          },
        });

        const shift = await container.cashRegisterService.openShift(tenant.id, {
          branchId: branch.id,
          cashRegisterId: cashRegister.id,
          employeeId: (
            await tx.employee.create({
              data: {
                tenantId: tenant.id,
                employeeNo: `E-${randomUUID().slice(0, 8)}`,
                firstName: 'Cashier',
                lastName: 'One',
                status: 'ACTIVE',
              },
            })
          ).id,
          openingBalance: 1000,
        });

        await container.cashRegisterService.recordMovement(tenant.id, {
          branchId: branch.id,
          cashRegisterId: cashRegister.id,
          shiftId: shift.id,
          movementType: 'DEPOSIT',
          amount: 500,
          description: 'Cash deposit',
        });

        const movement = await tx.cashMovement.findFirst({
          where: { tenantId: tenant.id, shiftId: shift.id, movementType: 'DEPOSIT' },
        });
        assert.ok(movement);
        const movementId = movement.id;

        const transaction = await tx.accountingTransaction.findFirst({
          where: { tenantId: tenant.id, referenceType: 'CASH_MOVEMENT', referenceId: movementId },
        });
        assert.ok(transaction);
      });
    });

    it('bank deposit posts journal entry', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, container } = await seedAccountingFixture(tx);

        const bank = await tx.bank.create({
          data: {
            tenantId: tenant.id,
            name: 'Main Bank',
            accountName: 'Operating Account',
            accountNumber: '1234567890',
            currency: 'SAR',
          },
        });

        await container.bankAccountingService.createTransaction(tenant.id, {
          bankId: bank.id,
          transactionType: 'DEPOSIT',
          amount: 10000,
          description: 'Bank deposit',
        });

        const bankTx = await tx.bankTransaction.findFirst({
          where: { tenantId: tenant.id, bankId: bank.id },
        });
        assert.ok(bankTx);
        const bankTxId = bankTx.id;

        const transaction = await tx.accountingTransaction.findFirst({
          where: { tenantId: tenant.id, referenceType: 'BANK_TRANSACTION', referenceId: bankTxId },
        });
        assert.ok(transaction);
      });
    });

    it('ledger query returns export-ready general ledger', async () => {
      await withRollback(prisma, async (tx) => {
        const { tenant, container } = await seedAccountingFixture(tx);
        const cashAccount = await container.chartOfAccountService.getByCode(tenant.id, '1100');
        assert.ok(cashAccount);
        const accountId = cashAccount.id;

        const result = await container.ledgerQueryService.query(tenant.id, {
          type: 'general-ledger',
          accountId,
        });

        assert.equal(result.exportReady, true);
        assert.equal(result.type, 'general-ledger');
      });
    });
  });
}

describe('accounting rule balance hardening', () => {
  it('purchase rule is balanced', () => {
    const rule = buildPurchaseRule({ totalAmount: 10000 });
    const validation = validateJournalBalance(
      rule.lines.map((line, index) => ({
        accountId: String(index),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
    );
    assert.equal(validation.valid, true);
  });

  it('return full rule is balanced', () => {
    const rule = buildSalesReturnFullRule({ refundAmount: 1000, taxAmount: 150, cogsAmount: 600 });
    const validation = validateJournalBalance(
      rule.lines.map((line, index) => ({
        accountId: String(index),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
    );
    assert.equal(validation.valid, true);
  });

  it('exchange rule is balanced', () => {
    const rule = buildExchangeRule({
      returnAmount: 5000,
      newSaleAmount: 8000,
      priceDifference: 3000,
      cogsAmount: 2000,
      taxAmount: 400,
    });
    const validation = validateJournalBalance(
      rule.lines.map((line, index) => ({
        accountId: String(index),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
    );
    assert.equal(validation.valid, true);
  });

  it('inventory adjustment rule is balanced', () => {
    const rule = buildInventoryAdjustmentRule({ amount: 1500, isIncrease: false });
    const validation = validateJournalBalance(
      rule.lines.map((line, index) => ({
        accountId: String(index),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
    );
    assert.equal(validation.valid, true);
  });

  it('repair completion rule is balanced', () => {
    const rule = buildRepairCompletionRule({
      revenueAmount: 2000,
      laborCost: 500,
      partsCost: 300,
    });
    const validation = validateJournalBalance(
      rule.lines.map((line, index) => ({
        accountId: String(index),
        debit: line.debit ?? 0,
        credit: line.credit ?? 0,
      })),
    );
    assert.equal(validation.valid, true);
  });
});
