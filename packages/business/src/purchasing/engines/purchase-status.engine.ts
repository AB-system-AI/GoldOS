import type {
  GoodsReceiptStatus,
  PurchaseInvoiceStatus,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  PurchaseReturnStatus,
  PurchaseRfqStatus,
  SupplierQuotationStatus,
} from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';

const PURCHASE_REQUEST_TRANSITIONS: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['CONVERTED', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  CONVERTED: [],
};

const PURCHASE_RFQ_TRANSITIONS: Record<PurchaseRfqStatus, PurchaseRfqStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['QUOTED', 'CLOSED', 'CANCELLED'],
  QUOTED: ['CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

const SUPPLIER_QUOTATION_TRANSITIONS: Record<SupplierQuotationStatus, SupplierQuotationStatus[]> = {
  DRAFT: ['SUBMITTED', 'EXPIRED'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};

const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'CLOSED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED', 'CLOSED'],
  RECEIVED: ['CLOSED'],
  CANCELLED: [],
  CLOSED: [],
};

const GOODS_RECEIPT_TRANSITIONS: Record<GoodsReceiptStatus, GoodsReceiptStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

const PURCHASE_INVOICE_TRANSITIONS: Record<PurchaseInvoiceStatus, PurchaseInvoiceStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'CANCELLED'],
  APPROVED: ['PARTIALLY_PAID', 'PAID', 'VOIDED'],
  PARTIALLY_PAID: ['PAID', 'VOIDED'],
  PAID: [],
  VOIDED: [],
  CANCELLED: [],
};

const PURCHASE_RETURN_TRANSITIONS: Record<PurchaseReturnStatus, PurchaseReturnStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function assertStatusTransition<T extends string>(
  current: T,
  next: T,
  transitions: Record<T, T[]>,
  entityLabel: string,
): void {
  const allowed = transitions[current];
  if (!allowed.includes(next)) {
    throw new BusinessError(
      BusinessErrorCodes.CONFLICT,
      `${entityLabel} cannot transition from ${current} to ${next}`,
    );
  }
}

export const PurchaseStatusEngine = {
  assertPurchaseRequestTransition(current: PurchaseRequestStatus, next: PurchaseRequestStatus) {
    assertStatusTransition(current, next, PURCHASE_REQUEST_TRANSITIONS, 'Purchase request');
  },
  assertPurchaseRfqTransition(current: PurchaseRfqStatus, next: PurchaseRfqStatus) {
    assertStatusTransition(current, next, PURCHASE_RFQ_TRANSITIONS, 'Purchase RFQ');
  },
  assertSupplierQuotationTransition(
    current: SupplierQuotationStatus,
    next: SupplierQuotationStatus,
  ) {
    assertStatusTransition(current, next, SUPPLIER_QUOTATION_TRANSITIONS, 'Supplier quotation');
  },
  assertPurchaseOrderTransition(current: PurchaseOrderStatus, next: PurchaseOrderStatus) {
    assertStatusTransition(current, next, PURCHASE_ORDER_TRANSITIONS, 'Purchase order');
  },
  assertGoodsReceiptTransition(current: GoodsReceiptStatus, next: GoodsReceiptStatus) {
    assertStatusTransition(current, next, GOODS_RECEIPT_TRANSITIONS, 'Goods receipt');
  },
  assertPurchaseInvoiceTransition(current: PurchaseInvoiceStatus, next: PurchaseInvoiceStatus) {
    assertStatusTransition(current, next, PURCHASE_INVOICE_TRANSITIONS, 'Purchase invoice');
  },
  assertPurchaseReturnTransition(current: PurchaseReturnStatus, next: PurchaseReturnStatus) {
    assertStatusTransition(current, next, PURCHASE_RETURN_TRANSITIONS, 'Purchase return');
  },
};
