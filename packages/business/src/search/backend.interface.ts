import type { GlobalSearchHit, GlobalSearchQuery, SearchEntityType } from './types.js';

export interface ISearchBackend {
  readonly backendCode: string;
  search(
    tenantId: string,
    query: GlobalSearchQuery,
    entityTypes: SearchEntityType[],
  ): Promise<GlobalSearchHit[]>;
}
