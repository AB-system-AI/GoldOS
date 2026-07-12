import type { GoldKarat } from '@goldos/database';

import type { GoldRateQuote, SalesLineInput } from '../types/sales.types.js';
import type { ImmutableExchangeRateSnapshot } from './exchange-rate-snapshot.engine.js';
import {
  money,
  moneyAdd,
  moneyMul,
  moneySub,
  moneyToString,
  roundMoney,
  sumMoney,
} from './money.engine.js';

export interface ImmutablePriceSnapshot {
  goldRates: GoldRateQuote[];
  exchangeRateSnapshot: ImmutableExchangeRateSnapshot;
  currency: string;
  premium?: string;
  lines: {
    productId: string;
    inventoryItemId?: string | null;
    quantity: number;
    unitPrice: string;
    discount: string;
    makingCharge: string;
    laborCharge: string;
    stoneCost: string;
    goldValue: string;
    taxAmount: string;
    totalAmount: string;
    netWeight?: string | null;
    grossWeight?: string | null;
    purity?: string | null;
    karat?: GoldKarat | null;
  }[];
  totals: {
    subtotal: string;
    discountAmount: string;
    taxAmount: string;
    totalAmount: string;
  };
  capturedAt: string;
}

export function buildPriceSnapshot(params: {
  lines: SalesLineInput[];
  goldRates: GoldRateQuote[];
  exchangeRateSnapshot: ImmutableExchangeRateSnapshot;
  currency: string;
  premium?: string | number;
  orderDiscount?: string | number;
}): ImmutablePriceSnapshot {
  const orderDiscount = roundMoney(params.orderDiscount ?? 0);
  const lineSnapshots = params.lines.map((line) => {
    const quantity = line.quantity;
    const discount = roundMoney(line.discount ?? 0);
    const makingCharge = roundMoney(line.makingCharge ?? 0);
    const laborCharge = money(0);
    const stoneCost = roundMoney(line.stoneCost ?? 0);
    const goldValue = roundMoney(line.goldValue ?? 0);
    const lineSubtotal = moneyMul(line.unitPrice, quantity);
    const taxAmount = line.taxRate
      ? roundMoney(moneyMul(lineSubtotal, line.taxRate).div(100))
      : money(0);
    const totalAmount = roundMoney(
      moneyAdd(moneySub(moneySub(lineSubtotal, discount), money(0)), makingCharge)
        .add(stoneCost)
        .add(taxAmount),
    );

    return {
      productId: line.productId,
      inventoryItemId: line.inventoryItemId,
      quantity,
      unitPrice: moneyToString(roundMoney(line.unitPrice)),
      discount: moneyToString(discount),
      makingCharge: moneyToString(makingCharge),
      laborCharge: moneyToString(laborCharge),
      stoneCost: moneyToString(stoneCost),
      goldValue: moneyToString(goldValue),
      taxAmount: moneyToString(taxAmount),
      totalAmount: moneyToString(totalAmount),
      netWeight: line.weight != null ? moneyToString(roundMoney(line.weight)) : null,
      grossWeight: line.weight != null ? moneyToString(roundMoney(line.weight)) : null,
      purity: null,
      karat: line.karat ?? null,
    };
  });

  const subtotal = roundMoney(
    sumMoney(lineSnapshots.map((l) => moneyMul(l.unitPrice, l.quantity))),
  );
  const lineDiscount = roundMoney(sumMoney(lineSnapshots.map((l) => l.discount)));
  const discountAmount = roundMoney(lineDiscount.add(orderDiscount));
  const taxAmount = roundMoney(sumMoney(lineSnapshots.map((l) => l.taxAmount)));
  const totalAmount = roundMoney(
    sumMoney(lineSnapshots.map((l) => l.totalAmount)).sub(orderDiscount),
  );

  return {
    goldRates: params.goldRates,
    exchangeRateSnapshot: params.exchangeRateSnapshot,
    currency: params.currency,
    premium: params.premium != null ? moneyToString(roundMoney(params.premium)) : undefined,
    lines: lineSnapshots,
    totals: {
      subtotal: moneyToString(subtotal),
      discountAmount: moneyToString(discountAmount),
      taxAmount: moneyToString(taxAmount),
      totalAmount: moneyToString(totalAmount),
    },
    capturedAt: new Date().toISOString(),
  };
}
