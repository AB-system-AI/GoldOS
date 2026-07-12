import type { SalesLineInput, SalesLineTotals, SalesOrderTotals } from '../types/sales.types.js';
import {
  money,
  moneyAdd,
  moneyDiv,
  moneyMin,
  moneyMul,
  moneySub,
  moneyToNumber,
  roundMoney,
} from './money.engine.js';

export function calculateLineTotals(line: SalesLineInput): SalesLineTotals {
  const quantity = line.quantity > 0 ? line.quantity : 1;
  const goldValue = roundMoney(moneyMul(line.goldValue ?? 0, quantity));
  const makingCharge = roundMoney(moneyMul(line.makingCharge ?? 0, quantity));
  const stoneCost = roundMoney(moneyMul(line.stoneCost ?? 0, quantity));
  const subtotal = roundMoney(
    moneyAdd(moneyAdd(moneyMul(line.unitPrice, quantity), goldValue), makingCharge).add(stoneCost),
  );
  const discount = roundMoney(moneyMin(line.discount ?? 0, subtotal));
  const taxable = roundMoney(moneySub(subtotal, discount));
  const taxAmount = roundMoney(moneyDiv(moneyMul(taxable, line.taxRate ?? 0), 100));
  const totalAmount = roundMoney(moneyAdd(taxable, taxAmount));

  return {
    subtotal: moneyToNumber(subtotal),
    discount: moneyToNumber(discount),
    taxAmount: moneyToNumber(taxAmount),
    totalAmount: moneyToNumber(totalAmount),
    goldValue: moneyToNumber(goldValue),
    makingCharge: moneyToNumber(makingCharge),
    stoneCost: moneyToNumber(stoneCost),
  };
}

export function calculateOrderTotals(lines: SalesLineInput[], orderDiscount = 0): SalesOrderTotals {
  const lineTotals = lines.map(calculateLineTotals);
  const subtotal = roundMoney(
    lineTotals.reduce((sum, line) => moneyAdd(sum, line.subtotal), money(0)),
  );
  const lineDiscounts = roundMoney(
    lineTotals.reduce((sum, line) => moneyAdd(sum, line.discount), money(0)),
  );
  const taxAmount = roundMoney(
    lineTotals.reduce((sum, line) => moneyAdd(sum, line.taxAmount), money(0)),
  );
  const gross = roundMoney(
    lineTotals.reduce((sum, line) => moneyAdd(sum, line.totalAmount), money(0)).sub(lineDiscounts),
  );
  const discountAmount = roundMoney(
    moneyMin(moneyAdd(orderDiscount, lineDiscounts), moneyAdd(subtotal, taxAmount)),
  );
  const netAfterOrderDiscount = roundMoney(moneySub(gross, orderDiscount));
  const fallbackTotal = roundMoney(moneySub(moneyAdd(subtotal, taxAmount), discountAmount));
  const totalAmount = netAfterOrderDiscount.greaterThan(0) ? netAfterOrderDiscount : fallbackTotal;

  return {
    subtotal: moneyToNumber(subtotal),
    discountAmount: moneyToNumber(discountAmount),
    taxAmount: moneyToNumber(taxAmount),
    totalAmount: moneyToNumber(totalAmount),
  };
}

export function calculateGoldValue(weightGrams: number, pricePerGram: number): number {
  return moneyToNumber(roundMoney(moneyMul(weightGrams, pricePerGram)));
}
