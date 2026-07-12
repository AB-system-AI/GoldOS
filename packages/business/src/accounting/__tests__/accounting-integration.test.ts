import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSalesInvoiceRule } from '../engines/accounting-rule.engine.js';
import { validateJournalBalance } from '../engines/journal.engine.js';

describe('accounting integration logic', () => {
  it('sale completion produces balanced accounting entries', () => {
    const rule = buildSalesInvoiceRule({
      totalAmount: 100000,
      taxAmount: 15000,
      cogsAmount: 60000,
      paymentMethod: 'CASH',
    });

    const lines = rule.lines.map((line, index) => ({
      accountId: `account-${String(index)}`,
      debit: line.debit ?? 0,
      credit: line.credit ?? 0,
    }));

    const validation = validateJournalBalance(lines);
    assert.equal(validation.valid, true);
    assert.equal(validation.totalDebit, validation.totalCredit);
    assert.equal(validation.totalDebit, 160000);
  });

  it('credit sale records receivable debit', () => {
    const rule = buildSalesInvoiceRule({
      totalAmount: 40000,
      taxAmount: 0,
      cogsAmount: 0,
      paymentMethod: 'CREDIT',
    });

    const arLine = rule.lines.find((l) => l.accountCode === '1200');
    assert.ok(arLine);
    assert.equal(arLine.debit, 40000);
  });

  it('expense posting is always double-entry', () => {
    const rule = buildSalesInvoiceRule({
      totalAmount: 5000,
      taxAmount: 0,
      cogsAmount: 3000,
      paymentMethod: 'CASH',
    });

    const debit = rule.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const credit = rule.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    assert.equal(debit, credit);
  });
});
