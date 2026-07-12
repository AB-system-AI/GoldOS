import type { SalesLineInput, SalesOrderTotals } from '../types/sales.types.js';
import { calculateOrderTotals } from './sales-calculation.engine.js';
import { summarizePayments } from './payment.engine.js';
import type { PaymentAllocation } from '../types/sales.types.js';

export interface InvoiceTotalsInput {
  lines: SalesLineInput[];
  orderDiscount?: number;
  payments?: PaymentAllocation[];
}

export interface InvoiceTotalsResult extends SalesOrderTotals {
  amountPaid: number;
  amountDue: number;
  paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'VOIDED';
}

export function calculateInvoiceTotals(input: InvoiceTotalsInput): InvoiceTotalsResult {
  const totals = calculateOrderTotals(input.lines, input.orderDiscount ?? 0);
  const paymentSummary = summarizePayments(totals.totalAmount, input.payments ?? []);

  return {
    ...totals,
    amountPaid: paymentSummary.amountPaid,
    amountDue: paymentSummary.amountDue,
    paymentStatus: paymentSummary.paymentStatus,
  };
}

export function buildPrintPayload(invoice: {
  invoiceNo: string;
  currency: string;
  subtotal: unknown;
  discountAmount: unknown;
  taxAmount: unknown;
  totalAmount: unknown;
  amountPaid: unknown;
  amountDue: unknown;
  issuedAt?: Date | null;
  customer?: { name: string; phone?: string | null } | null;
  branch?: { name: string; code: string } | null;
  items?: {
    lineNo: number;
    description: string;
    quantity: number;
    unitPrice: unknown;
    totalAmount: unknown;
  }[];
}) {
  return {
    invoiceNo: invoice.invoiceNo,
    currency: invoice.currency,
    issuedAt: invoice.issuedAt?.toISOString() ?? null,
    customer: invoice.customer
      ? { name: invoice.customer.name, phone: invoice.customer.phone ?? null }
      : null,
    branch: invoice.branch ? { name: invoice.branch.name, code: invoice.branch.code } : null,
    totals: {
      subtotal: Number(invoice.subtotal),
      discountAmount: Number(invoice.discountAmount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
    },
    items: (invoice.items ?? []).map((item) => ({
      lineNo: item.lineNo,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalAmount: Number(item.totalAmount),
    })),
    printable: true,
    pdfReady: false,
  };
}
