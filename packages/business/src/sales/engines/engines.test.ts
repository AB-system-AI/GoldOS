import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateBuyback } from '../engines/buyback.engine.js';
import { calculateDiscount } from '../engines/discount.engine.js';
import { calculateInvoiceTotals } from '../engines/invoice.engine.js';
import { summarizePayments, validatePaymentAllocations } from '../engines/payment.engine.js';
import { calculateExchangeDifference, calculateReturnRefund } from '../engines/return.engine.js';
import { calculateLineTotals, calculateOrderTotals } from '../engines/sales-calculation.engine.js';

describe('sales-calculation.engine', () => {
  it('calculates jewelry line totals with gold and making charges', () => {
    const totals = calculateLineTotals({
      productId: 'p1',
      quantity: 1,
      unitPrice: 1000,
      goldValue: 5000,
      makingCharge: 800,
      stoneCost: 200,
      discount: 100,
      taxRate: 15,
    });

    assert.equal(totals.subtotal, 7000);
    assert.equal(totals.discount, 100);
    assert.equal(totals.taxAmount, 1035);
    assert.equal(totals.totalAmount, 7935);
  });

  it('aggregates order totals', () => {
    const totals = calculateOrderTotals(
      [
        { productId: 'p1', quantity: 1, unitPrice: 1000, discount: 50 },
        { productId: 'p2', quantity: 2, unitPrice: 500 },
      ],
      100,
    );

    assert.equal(totals.subtotal, 2000);
    assert.ok(totals.totalAmount > 0);
  });
});

describe('discount.engine', () => {
  it('flags manager approval for high percentage discounts', () => {
    const result = calculateDiscount({
      type: 'PERCENTAGE',
      value: 12,
      subtotal: 10000,
      maxEmployeePercent: 5,
    });

    assert.equal(result.requiresApproval, true);
    assert.equal(result.discountAmount, 1200);
  });

  it('allows employee discount within limit', () => {
    const result = calculateDiscount({
      type: 'PERCENTAGE',
      value: 3,
      subtotal: 10000,
    });

    assert.equal(result.requiresApproval, false);
    assert.equal(result.discountAmount, 300);
  });
});

describe('payment.engine', () => {
  it('supports split payments', () => {
    const summary = summarizePayments(100000, [
      { method: 'CASH', amount: 50000 },
      { method: 'CARD', amount: 50000 },
    ]);

    assert.equal(summary.paymentStatus, 'PAID');
    assert.equal(summary.amountDue, 0);
  });

  it('validates partial payments', () => {
    const validation = validatePaymentAllocations(100000, [{ method: 'CASH', amount: 50000 }]);
    assert.equal(validation.valid, true);
  });
});

describe('return.engine', () => {
  it('calculates refund totals', () => {
    const refund = calculateReturnRefund([
      { quantity: 1, refundAmount: 1500 },
      { quantity: 2, refundAmount: 500 },
    ]);
    assert.equal(refund, 2500);
  });

  it('calculates exchange price difference', () => {
    const diff = calculateExchangeDifference(2000, 3500);
    assert.equal(diff.priceDifference, 1500);
    assert.equal(diff.customerOwes, true);
  });
});

describe('buyback.engine', () => {
  it('evaluates buyback with purity adjustment', () => {
    const evaluation = evaluateBuyback({
      karat: 'K21',
      weightGrams: 10,
      purity: 0.875,
      pricePerGram: 400,
      offeredAmount: 3400,
    });

    assert.equal(evaluation.marketValue, 3500);
    assert.equal(evaluation.offeredAmount, 3400);
  });
});

describe('invoice.engine', () => {
  it('derives invoice payment status from allocations', () => {
    const totals = calculateInvoiceTotals({
      lines: [{ productId: 'p1', quantity: 1, unitPrice: 1000 }],
      payments: [
        { method: 'CASH', amount: 600 },
        { method: 'CARD', amount: 400 },
      ],
    });

    assert.equal(totals.paymentStatus, 'PAID');
    assert.equal(totals.amountDue, 0);
  });
});
