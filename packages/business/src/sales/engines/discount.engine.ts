import type { DiscountRequest, DiscountResult } from '../types/sales.types.js';

const DEFAULT_MAX_EMPLOYEE_PERCENT = 5;

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function calculateDiscount(request: DiscountRequest): DiscountResult {
  const maxEmployeePercent = request.maxEmployeePercent ?? DEFAULT_MAX_EMPLOYEE_PERCENT;
  let discountAmount = 0;
  let effectivePercent = 0;

  if (request.type === 'FIXED') {
    discountAmount = roundMoney(Math.min(request.value, request.subtotal));
    effectivePercent =
      request.subtotal > 0 ? roundMoney((discountAmount / request.subtotal) * 100) : 0;
  } else {
    effectivePercent = request.value;
    discountAmount = roundMoney((request.subtotal * request.value) / 100);
  }

  if (
    request.customerGroupDiscountPercent &&
    request.customerGroupDiscountPercent > effectivePercent
  ) {
    effectivePercent = request.customerGroupDiscountPercent;
    discountAmount = roundMoney((request.subtotal * effectivePercent) / 100);
  }

  const requiresApproval = effectivePercent > maxEmployeePercent;

  return {
    discountAmount,
    effectivePercent,
    requiresApproval,
  };
}

export function validateDiscountLimit(
  effectivePercent: number,
  maxEmployeePercent = DEFAULT_MAX_EMPLOYEE_PERCENT,
): boolean {
  return effectivePercent <= maxEmployeePercent;
}
