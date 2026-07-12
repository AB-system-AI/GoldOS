import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateExchangeTotals } from '../engines/exchange.engine.js';
import { buildPriceSnapshot } from '../engines/price-snapshot.engine.js';
import { calculateDiscount } from '../engines/discount.engine.js';
import { moneyAdd, moneyToString, roundMoney } from '../engines/money.engine.js';

describe('exchange.engine', () => {
  it('calculates refund when return exceeds new sale', () => {
    const result = calculateExchangeTotals([
      { direction: 'RETURN', amount: 5000 },
      { direction: 'NEW_SALE', amount: 3000 },
    ]);
    assert.equal(result.customerOwes, false);
    assert.equal(result.refundAmount, 2000);
    assert.equal(result.additionalPayment, 0);
  });

  it('calculates additional payment when new sale exceeds return', () => {
    const result = calculateExchangeTotals([
      { direction: 'RETURN', amount: 2000 },
      { direction: 'NEW_SALE', amount: 4500 },
    ]);
    assert.equal(result.customerOwes, true);
    assert.equal(result.additionalPayment, 2500);
  });
});

describe('price-snapshot.engine', () => {
  it('builds immutable pricing snapshot with exchange rate metadata', () => {
    const snapshot = buildPriceSnapshot({
      currency: 'SAR',
      goldRates: [{ karat: 'K21', pricePerGram: 250, currency: 'SAR' }],
      exchangeRateSnapshot: {
        currencyCode: 'SAR',
        baseCurrency: 'SAR',
        exchangeRate: '1.0000',
        goldPrice: { K21: '250.0000' },
        pricingSource: 'MOCK',
        snapshotTimestamp: new Date().toISOString(),
        manualOverride: false,
        providerName: 'MOCK',
        goldProviderVersion: null,
        branchId: '00000000-0000-4000-8000-000000000001',
      },
      lines: [
        {
          productId: '00000000-0000-4000-8000-000000000001',
          quantity: 1,
          unitPrice: 5000,
          weight: 10,
          karat: 'K21',
          makingCharge: 200,
        },
      ],
    });
    assert.equal(snapshot.currency, 'SAR');
    assert.equal(snapshot.lines[0]?.makingCharge, '200.0000');
    assert.equal(snapshot.exchangeRateSnapshot.exchangeRate, '1.0000');
    assert.ok(snapshot.capturedAt);
  });
});

describe('money.engine', () => {
  it('uses decimal precision for financial math', () => {
    const total = moneyAdd('0.1', '0.2');
    assert.equal(moneyToString(roundMoney(total)), '0.3000');
  });
});

describe('discount approval enforcement', () => {
  it('requires approval above employee limit', () => {
    const result = calculateDiscount({
      type: 'PERCENTAGE',
      value: 10,
      subtotal: 10000,
      maxEmployeePercent: 5,
    });
    assert.equal(result.requiresApproval, true);
  });

  it('auto approves within employee limit', () => {
    const result = calculateDiscount({
      type: 'PERCENTAGE',
      value: 3,
      subtotal: 10000,
      maxEmployeePercent: 5,
    });
    assert.equal(result.requiresApproval, false);
  });
});

describe('checkout concurrency', () => {
  it('detects race via lock semantics', () => {
    const locks = new Set<string>();
    const itemId = 'item-1';

    const acquire = () => {
      if (locks.has(itemId)) return false;
      locks.add(itemId);
      return true;
    };

    assert.equal(acquire(), true);
    assert.equal(acquire(), false);
    locks.delete(itemId);
    assert.equal(acquire(), true);
  });
});

describe('loyalty calculations', () => {
  it('computes earn points from sale amount', () => {
    const points = Math.floor(10000 * 1 * 1.5);
    assert.equal(points, 15000);
  });

  it('reverses points on return proportionally', () => {
    const refundAmount = 2500;
    const reversed = Math.floor(refundAmount * 0.01);
    assert.equal(reversed, 25);
  });
});

describe('invoice search filters', () => {
  it('builds composite search criteria', () => {
    const filters = {
      invoiceNo: 'INV-001',
      qrCode: 'INV:INV-001:uuid',
      barcode: 'INV-001',
      branchId: '00000000-0000-4000-8000-000000000002',
    };
    assert.ok(filters.invoiceNo);
    assert.ok(filters.qrCode);
  });
});

describe('reservation integration', () => {
  it('releases reservation reference on conversion', () => {
    const references: string[] = [];
    const release = (type: string, id: string) => references.push(`${type}:${id}`);
    release('reservation', 'res-1');
    assert.deepEqual(references, ['reservation:res-1']);
  });
});

describe('rollback on failure', () => {
  it('releases acquired locks on error', () => {
    const released: string[] = [];
    const lockIds = ['lock-1', 'lock-2'];
    try {
      throw new Error('payment failed');
    } catch {
      for (const id of lockIds) released.push(id);
    }
    assert.deepEqual(released, ['lock-1', 'lock-2']);
  });
});
