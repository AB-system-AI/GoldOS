import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';

export interface PurchaseLineInput {
  quantity: number;
  unitCost: number;
  taxRate?: number;
}

export interface PurchaseLineTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function calculateLineTotal(line: PurchaseLineInput): number {
  return roundMoney(line.quantity * line.unitCost);
}

export function calculatePurchaseTotals(
  lines: PurchaseLineInput[],
  defaultTaxRate = 0,
): PurchaseLineTotals {
  let subtotal = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const lineSubtotal = calculateLineTotal(line);
    const rate = line.taxRate ?? defaultTaxRate;
    subtotal += lineSubtotal;
    taxAmount += roundMoney(lineSubtotal * rate);
  }

  return {
    subtotal: roundMoney(subtotal),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(subtotal + taxAmount),
  };
}

export function calculateReceivedStatus(
  lines: { quantity: number; receivedQty: number }[],
): 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' {
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const receivedQty = lines.reduce((sum, line) => sum + line.receivedQty, 0);

  if (receivedQty <= 0) return 'APPROVED';
  if (receivedQty >= totalQty) return 'RECEIVED';
  return 'PARTIALLY_RECEIVED';
}

export function calculateBillingStatus(
  totalAmount: number,
  invoicedAmount: number,
): 'UNBILLED' | 'PARTIALLY_BILLED' | 'BILLED' {
  if (invoicedAmount <= 0) return 'UNBILLED';
  if (invoicedAmount >= totalAmount) return 'BILLED';
  return 'PARTIALLY_BILLED';
}

export function assertReceiptQuantity(
  poLine: { quantity: number; receivedQty: number },
  incomingQty: number,
): void {
  if (incomingQty <= 0) {
    throw new BusinessError(
      BusinessErrorCodes.VALIDATION_ERROR,
      'Receipt quantity must be positive',
    );
  }
  if (poLine.receivedQty + incomingQty > poLine.quantity) {
    throw new BusinessError(
      BusinessErrorCodes.CONFLICT,
      `Over-receipt: received ${String(poLine.receivedQty + incomingQty)} exceeds ordered ${String(poLine.quantity)}`,
    );
  }
}

export function assertBillingQuantity(
  poLine: { quantity: number; billedQty: number },
  incomingQty: number,
): void {
  if (incomingQty <= 0) {
    throw new BusinessError(
      BusinessErrorCodes.VALIDATION_ERROR,
      'Billing quantity must be positive',
    );
  }
  if (poLine.billedQty + incomingQty > poLine.quantity) {
    throw new BusinessError(
      BusinessErrorCodes.CONFLICT,
      `Over-billing: billed ${String(poLine.billedQty + incomingQty)} exceeds ordered ${String(poLine.quantity)}`,
    );
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}
