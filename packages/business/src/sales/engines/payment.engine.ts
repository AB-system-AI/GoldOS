import type { PaymentAllocation, PaymentSummary } from '../types/sales.types.js';

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function summarizePayments(
  totalAmount: number,
  payments: PaymentAllocation[],
): PaymentSummary {
  const amountPaid = roundMoney(payments.reduce((sum, payment) => sum + payment.amount, 0));
  const amountDue = roundMoney(Math.max(totalAmount - amountPaid, 0));

  let paymentStatus: PaymentSummary['paymentStatus'] = 'UNPAID';
  if (amountPaid <= 0) {
    paymentStatus = 'UNPAID';
  } else if (amountDue > 0) {
    paymentStatus = 'PARTIAL';
  } else {
    paymentStatus = 'PAID';
  }

  return { totalAmount, amountPaid, amountDue, paymentStatus };
}

export function validatePaymentAllocations(
  totalAmount: number,
  payments: PaymentAllocation[],
): { valid: boolean; message?: string } {
  if (payments.length === 0) {
    return { valid: false, message: 'At least one payment is required' };
  }

  for (const payment of payments) {
    if (payment.amount <= 0) {
      return { valid: false, message: 'Payment amounts must be positive' };
    }
  }

  const summary = summarizePayments(totalAmount, payments);
  if (summary.amountPaid > roundMoney(totalAmount + 0.0001)) {
    return { valid: false, message: 'Total payments exceed invoice amount' };
  }

  return { valid: true };
}
