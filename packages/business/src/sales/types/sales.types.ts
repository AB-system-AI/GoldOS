import type { DiscountType, GoldKarat, PaymentMethod, PaymentStatus } from '@goldos/database';

export interface SalesLineInput {
  productId: string;
  inventoryItemId?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  weight?: number | null;
  karat?: GoldKarat | null;
  makingCharge?: number;
  stoneCost?: number;
  goldValue?: number;
}

export interface SalesLineTotals {
  subtotal: number;
  discount: number;
  taxAmount: number;
  totalAmount: number;
  goldValue: number;
  makingCharge: number;
  stoneCost: number;
}

export interface SalesOrderTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface GoldRateQuote {
  karat: GoldKarat;
  pricePerGram: number;
  currency: string;
}

export interface PricingSnapshot {
  lines: (SalesLineTotals & { productId: string; inventoryItemId?: string | null })[];
  totals: SalesOrderTotals;
  goldRates?: GoldRateQuote[];
  appliedAt: string;
}

export interface PaymentAllocation {
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  notes?: string | null;
}

export interface PaymentSummary {
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
}

export interface DiscountRequest {
  type: DiscountType;
  value: number;
  subtotal: number;
  maxEmployeePercent?: number;
  customerGroupDiscountPercent?: number;
}

export interface DiscountResult {
  discountAmount: number;
  effectivePercent: number;
  requiresApproval: boolean;
}

export interface ReturnLineInput {
  invoiceItemId?: string | null;
  inventoryItemId?: string | null;
  quantity: number;
  refundAmount: number;
  reason?: string | null;
}

export interface BuybackEvaluation {
  karat: GoldKarat;
  weightGrams: number;
  purity?: number | null;
  pricePerGram: number;
  marketValue: number;
  offeredAmount: number;
}

export interface CartItem {
  inventoryItemId: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  weight?: number | null;
  karat?: GoldKarat | null;
  makingCharge?: number;
  stoneCost?: number;
}

export interface PosCart {
  customerId?: string | null;
  items: CartItem[];
  orderDiscount?: number;
  notes?: string | null;
}

export interface CustomerSalesSummary {
  customerId: string;
  totalSpent: number;
  orderCount: number;
  invoiceCount: number;
  returnCount: number;
  buybackCount: number;
  loyaltyPoints: number;
  lastPurchaseAt: Date | null;
}

export type SalesDocumentType =
  'ORDER' | 'INVOICE' | 'PAYMENT' | 'RETURN' | 'EXCHANGE' | 'BUYBACK' | 'POS_SESSION';
