import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  assertBillingQuantity,
  assertReceiptQuantity,
  calculateBillingStatus,
  calculatePurchaseTotals,
  calculateReceivedStatus,
} from '../engines/purchase-calculation.engine.js';
import { canAutoApprove, resolveApprovalSteps } from '../engines/approval.engine.js';
import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import { BusinessError } from '../../errors/business-error.js';

describe('purchase-calculation.engine', () => {
  it('calculates purchase totals', () => {
    const result = calculatePurchaseTotals([
      { quantity: 2, unitCost: 100 },
      { quantity: 1, unitCost: 50, taxRate: 0.15 },
    ]);
    assert.equal(result.subtotal, 250);
    assert.equal(result.taxAmount, 7.5);
    assert.equal(result.total, 257.5);
  });

  it('derives received status', () => {
    assert.equal(
      calculateReceivedStatus([
        { quantity: 10, receivedQty: 0 },
        { quantity: 5, receivedQty: 0 },
      ]),
      'APPROVED',
    );
    assert.equal(calculateReceivedStatus([{ quantity: 10, receivedQty: 5 }]), 'PARTIALLY_RECEIVED');
    assert.equal(calculateReceivedStatus([{ quantity: 10, receivedQty: 10 }]), 'RECEIVED');
  });

  it('derives billing status', () => {
    assert.equal(calculateBillingStatus(1000, 0), 'UNBILLED');
    assert.equal(calculateBillingStatus(1000, 400), 'PARTIALLY_BILLED');
    assert.equal(calculateBillingStatus(1000, 1000), 'BILLED');
  });

  it('blocks over-receipt', () => {
    assert.throws(() => {
      assertReceiptQuantity({ quantity: 10, receivedQty: 8 }, 3);
    }, BusinessError);
  });

  it('blocks over-billing', () => {
    assert.throws(() => {
      assertBillingQuantity({ quantity: 10, billedQty: 9 }, 2);
    }, BusinessError);
  });
});

describe('approval.engine', () => {
  it('resolves multi-level approval steps', () => {
    const steps = resolveApprovalSteps(50000, [
      { level: 'BRANCH_MANAGER', minAmount: 0, maxAmount: 100000, autoApproveBelow: null },
      { level: 'FINANCE', minAmount: 10000, maxAmount: null, autoApproveBelow: null },
    ]);
    assert.deepEqual(
      steps.map((s) => s.level),
      ['BRANCH_MANAGER', 'FINANCE'],
    );
  });

  it('auto approves below threshold', () => {
    const auto = canAutoApprove(500, [
      { level: 'AUTO', minAmount: 0, maxAmount: null, autoApproveBelow: 1000 },
    ]);
    assert.equal(auto, true);
  });

  it('uses default configs when none provided', () => {
    const steps = resolveApprovalSteps(5000, []);
    assert.ok(steps.length > 0);
    assert.equal(canAutoApprove(5000, []), true);
  });
});

describe('purchase-status.engine', () => {
  it('blocks invalid purchase order transitions', () => {
    assert.throws(() => {
      PurchaseStatusEngine.assertPurchaseOrderTransition('DRAFT', 'RECEIVED');
    }, BusinessError);
  });

  it('allows valid purchase order transitions', () => {
    assert.doesNotThrow(() => {
      PurchaseStatusEngine.assertPurchaseOrderTransition('DRAFT', 'SUBMITTED');
    });
  });
});
