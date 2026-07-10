export type TenantId = string & { readonly __brand: 'TenantId' };
export type BranchId = string & { readonly __brand: 'BranchId' };
export type UserId = string & { readonly __brand: 'UserId' };

export type TenantStatus =
  'pending' | 'onboarding' | 'active' | 'suspended' | 'cancelled' | 'deleted';

export type BranchType = 'retail' | 'warehouse' | 'workshop';

export function asTenantId(value: string): TenantId {
  return value as TenantId;
}

export function asBranchId(value: string): BranchId {
  return value as BranchId;
}

export function asUserId(value: string): UserId {
  return value as UserId;
}
