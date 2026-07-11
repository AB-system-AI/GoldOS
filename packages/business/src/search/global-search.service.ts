import { z } from 'zod';

import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { parseInput } from '../services/validation.js';
import type { ISearchBackend } from './backend.interface.js';
import { resolveSearchEntityTypes } from './permissions.js';
import { SEARCH_ENTITY_TYPES } from './types.js';
import type {
  GlobalSearchContext,
  GlobalSearchFacet,
  GlobalSearchQuery,
  GlobalSearchResponse,
  SearchEntityType,
} from './types.js';

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  types: z.array(z.enum(SEARCH_ENTITY_TYPES)).optional(),
  branchId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export class GlobalSearchService {
  constructor(private readonly backend: ISearchBackend) {}

  async search(context: GlobalSearchContext, input: unknown): Promise<GlobalSearchResponse> {
    const data = parseInput(searchQuerySchema, input);
    const allowedTypes = resolveSearchEntityTypes(context.permissions, data.types);

    if (allowedTypes.length === 0) {
      throw new BusinessError(
        BusinessErrorCodes.FORBIDDEN,
        'No searchable entity types permitted for this user',
      );
    }

    const query: GlobalSearchQuery = {
      query: data.q,
      entityTypes: allowedTypes,
      branchId: data.branchId,
      limit: data.limit,
      offset: data.offset,
    };

    const startedAt = Date.now();
    const hits = await this.backend.search(context.tenantId, query, allowedTypes);
    const sorted = sortHits(hits).slice(0, query.limit ?? 20);
    const facets = buildFacets(sorted);

    return {
      query: data.q,
      total: sorted.length,
      tookMs: Date.now() - startedAt,
      results: sorted,
      facets,
      backend: this.backend.backendCode,
    };
  }
}

function sortHits(hits: GlobalSearchResponse['results']) {
  return [...hits].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.title.localeCompare(right.title);
  });
}

function buildFacets(hits: GlobalSearchResponse['results']): GlobalSearchFacet[] {
  const counts = new Map<SearchEntityType, number>();
  for (const hit of hits) {
    counts.set(hit.entityType, (counts.get(hit.entityType) ?? 0) + 1);
  }
  return [...counts.entries()].map(([entityType, count]) => ({ entityType, count }));
}
