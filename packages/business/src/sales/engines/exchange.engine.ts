import { calculateExchangeDifference } from './return.engine.js';

export interface ExchangeLineCalc {
  direction: 'RETURN' | 'NEW_SALE';
  amount: number;
  quantity?: number;
}

export interface ExchangeCalculation {
  returnAmount: number;
  newSaleAmount: number;
  priceDifference: number;
  refundAmount: number;
  additionalPayment: number;
  customerOwes: boolean;
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function calculateExchangeTotals(lines: ExchangeLineCalc[]): ExchangeCalculation {
  const returnAmount = roundMoney(
    lines
      .filter((l) => l.direction === 'RETURN')
      .reduce((sum, l) => sum + l.amount * (l.quantity ?? 1), 0),
  );
  const newSaleAmount = roundMoney(
    lines
      .filter((l) => l.direction === 'NEW_SALE')
      .reduce((sum, l) => sum + l.amount * (l.quantity ?? 1), 0),
  );

  const diff = calculateExchangeDifference(returnAmount, newSaleAmount);

  return {
    returnAmount,
    newSaleAmount,
    priceDifference: diff.priceDifference,
    refundAmount: diff.customerOwes ? 0 : Math.abs(diff.priceDifference),
    additionalPayment: diff.customerOwes ? diff.priceDifference : 0,
    customerOwes: diff.customerOwes,
  };
}
