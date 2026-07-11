/**
 * GoldOS Business Package
 */

export * from './errors/index.js';
export * from './services/index.js';
export {
  createBusinessContainer,
  type BusinessContainer,
  type BusinessContainerOptions,
} from './container.js';
export {
  GlobalSearchService,
  PrismaSearchBackend,
  ExternalSearchBackend,
  SearchRepository,
  SEARCH_ENTITY_TYPES,
  SEARCH_ENTITY_VIEW_PERMISSION,
  minimumSearchPermissions,
  resolveSearchEntityTypes,
  type GlobalSearchResponse,
  type GlobalSearchHit,
  type GlobalSearchQuery,
  type GlobalSearchContext,
  type SearchEntityType,
  type ISearchBackend,
} from './search/index.js';
export type {
  GoldPriceQuote,
  ProviderResult,
  GoldPriceSyncResult,
  BranchGoldPricing,
  GoldPriceCacheEntry,
  GoldPriceFetchContext,
  IGoldPriceProvider,
} from './engines/gold-price/index.js';
export {
  GoldPriceEngineService,
  GoldPriceOrchestrator,
  ManualGoldPriceProvider,
  MockGoldPriceProvider,
} from './engines/gold-price/index.js';
