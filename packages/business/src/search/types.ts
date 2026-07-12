export const SEARCH_ENTITY_TYPES = [
  'PRODUCT',
  'CUSTOMER',
  'EMPLOYEE',
  'SUPPLIER',
  'INVOICE',
  'SALES_ORDER',
  'BRANCH',
  'WORKSHOP',
  'INVENTORY',
] as const;

export type SearchEntityType = (typeof SEARCH_ENTITY_TYPES)[number];

export interface GlobalSearchQuery {
  query: string;
  entityTypes?: SearchEntityType[];
  branchId?: string;
  limit?: number;
  offset?: number;
}

export interface GlobalSearchHit {
  entityType: SearchEntityType;
  entityId: string;
  title: string;
  subtitle?: string;
  branchId?: string;
  metadata?: Record<string, unknown>;
  score: number;
}

export interface GlobalSearchFacet {
  entityType: SearchEntityType;
  count: number;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  tookMs: number;
  results: GlobalSearchHit[];
  facets: GlobalSearchFacet[];
  backend: string;
}

export interface GlobalSearchContext {
  tenantId: string;
  permissions: string[];
}
