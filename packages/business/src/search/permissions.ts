import type { SearchEntityType } from './types.js';
import { SEARCH_ENTITY_TYPES } from './types.js';

export const SEARCH_ENTITY_VIEW_PERMISSION: Record<SearchEntityType, string> = {
  PRODUCT: 'tenant.inventory.view',
  CUSTOMER: 'tenant.crm.view',
  EMPLOYEE: 'tenant.hr.view',
  SUPPLIER: 'tenant.suppliers.view',
  INVOICE: 'tenant.finance.view',
  BRANCH: 'tenant.branches.view',
  WORKSHOP: 'tenant.hr.view',
  INVENTORY: 'tenant.inventory.view',
};

function hasViewPermission(permissions: string[], permission: string): boolean {
  if (permissions.includes(permission)) {
    return true;
  }

  const parts = permission.split('.');
  if (parts.length !== 3) {
    return false;
  }

  const scope = parts[0] ?? '';
  const module = parts[1] ?? '';
  const action = parts[2] ?? '';

  if (action !== 'view') {
    return false;
  }

  return (
    permissions.includes(`${scope}.${module}.manage`) ||
    permissions.includes(`${scope}.${module}.admin`) ||
    permissions.includes(`${scope}.admin`)
  );
}

export function resolveSearchEntityTypes(
  permissions: string[],
  requested?: SearchEntityType[],
): SearchEntityType[] {
  const allowed = SEARCH_ENTITY_TYPES.filter((entityType) =>
    hasViewPermission(permissions, SEARCH_ENTITY_VIEW_PERMISSION[entityType]),
  );

  if (!requested || requested.length === 0) {
    return allowed;
  }

  return requested.filter((entityType) => allowed.includes(entityType));
}

export function minimumSearchPermissions(): string[] {
  return [...new Set(Object.values(SEARCH_ENTITY_VIEW_PERMISSION))];
}
