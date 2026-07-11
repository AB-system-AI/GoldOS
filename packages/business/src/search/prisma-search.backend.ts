import type { ISearchBackend } from './backend.interface.js';
import type { SearchRepository } from './search.repository.js';
import type { GlobalSearchHit, GlobalSearchQuery, SearchEntityType } from './types.js';

export class PrismaSearchBackend implements ISearchBackend {
  readonly backendCode = 'prisma';

  constructor(private readonly searchRepository: SearchRepository) {}

  async search(
    tenantId: string,
    query: GlobalSearchQuery,
    entityTypes: SearchEntityType[],
  ): Promise<GlobalSearchHit[]> {
    const indexed = await this.searchRepository.searchIndexed(tenantId, query, entityTypes);
    if (indexed.length > 0) {
      return indexed;
    }

    return this.searchRepository.searchLive(tenantId, query, entityTypes);
  }
}

/**
 * Placeholder for Elasticsearch / Meilisearch / OpenSearch integration.
 * Swap via DI without changing GlobalSearchService.
 */
export class ExternalSearchBackend implements ISearchBackend {
  readonly backendCode: string;

  constructor(backendCode: string) {
    this.backendCode = backendCode;
  }

  search(
    _tenantId: string,
    _query: GlobalSearchQuery,
    _entityTypes: SearchEntityType[],
  ): Promise<GlobalSearchHit[]> {
    return Promise.resolve([]);
  }
}
