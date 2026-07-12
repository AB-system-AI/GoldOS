import type { ReturnLineInput } from '../types/sales.types.js';

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function calculateReturnRefund(lines: ReturnLineInput[]): number {
  return roundMoney(lines.reduce((sum, line) => sum + line.refundAmount * line.quantity, 0));
}

export function calculateExchangeDifference(
  returnRefund: number,
  newSaleTotal: number,
): { priceDifference: number; customerOwes: boolean } {
  const priceDifference = roundMoney(newSaleTotal - returnRefund);
  return {
    priceDifference,
    customerOwes: priceDifference > 0,
  };
}
