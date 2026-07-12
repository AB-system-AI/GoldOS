import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBuybackRule,
  buildExpenseRule,
  buildSalesInvoiceRule,
  buildSupplierPaymentRule,
} from '../engines/accounting-rule.engine.js';
import { computeAccountBalance, defaultNormalBalance } from '../engines/balance.engine.js';
import { canClosePeriod, canReopenPeriod } from '../engines/financial-period.engine.js';
import { assertBalancedJournal, validateJournalBalance } from '../engines/journal.engine.js';

describe('journal.engine', () => {
  it('validates balanced double-entry journal', () => {
    const result = validateJournalBalance([
      { accountId: 'a1', debit: 1000, credit: 0 },
      { accountId: 'a2', debit: 0, credit: 1000 },
    ]);
    assert.equal(result.valid, true);
    assert.equal(result.totalDebit, 1000);
    assert.equal(result.totalCredit, 1000);
  });

  it('rejects unbalanced journal', () => {
    const result = validateJournalBalance([
      { accountId: 'a1', debit: 1000, credit: 0 },
      { accountId: 'a2', debit: 0, credit: 500 },
    ]);
    assert.equal(result.valid, false);
  });

  it('assertBalancedJournal throws on invalid entries', () => {
    assert.throws(() => {
      assertBalancedJournal([{ accountId: 'a1', debit: 100, credit: 0 }]);
    });
  });
});

describe('balance.engine', () => {
  it('computes debit-normal account balance', () => {
    const balance = computeAccountBalance({
      normalBalance: 'DEBIT',
      debitTotal: 1500,
      creditTotal: 500,
    });
    assert.equal(balance, 1000);
  });

  it('computes credit-normal account balance', () => {
    const balance = computeAccountBalance({
      normalBalance: 'CREDIT',
      debitTotal: 200,
      creditTotal: 1200,
    });
    assert.equal(balance, 1000);
  });

  it('assigns default normal balance by account type', () => {
    assert.equal(defaultNormalBalance('ASSET'), 'DEBIT');
    assert.equal(defaultNormalBalance('REVENUE'), 'CREDIT');
  });
});

describe('accounting-rule.engine', () => {
  it('builds sales invoice with revenue, tax, and COGS lines', () => {
    const rule = buildSalesInvoiceRule({
      totalAmount: 11500,
      taxAmount: 1500,
      cogsAmount: 8000,
      paymentMethod: 'CASH',
    });
    const totalDebit = rule.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = rule.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    assert.equal(totalDebit, totalCredit);
    assert.equal(rule.referenceType, 'SALES_INVOICE');
  });

  it('builds buyback inventory and cash lines', () => {
    const rule = buildBuybackRule({ amount: 5000 });
    assert.equal(rule.lines.length, 2);
    assert.equal(rule.lines[0]?.debit, 5000);
  });

  it('builds expense debit and cash credit', () => {
    const rule = buildExpenseRule({ amount: 2500 });
    assert.equal(rule.lines[0]?.debit, 2500);
    assert.equal(rule.lines[1]?.credit, 2500);
  });

  it('builds supplier payment rule', () => {
    const rule = buildSupplierPaymentRule({ amount: 10000 });
    const debit = rule.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const credit = rule.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    assert.equal(debit, credit);
  });
});

describe('financial-period.engine', () => {
  it('blocks close when draft journals exist', () => {
    const result = canClosePeriod({ status: 'OPEN', draftJournalCount: 2 });
    assert.equal(result.allowed, false);
  });

  it('allows reopen with permission', () => {
    const result = canReopenPeriod({ status: 'CLOSED', hasPermission: true });
    assert.equal(result.allowed, true);
  });
});
