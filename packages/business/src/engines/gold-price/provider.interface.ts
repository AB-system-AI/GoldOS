import type { GoldKarat } from '@goldos/database';

import type { ProviderResult } from './types.js';

export interface GoldPriceFetchContext {
  tenantId: string;
  currency?: string;
  karats?: GoldKarat[];
}

export interface IGoldPriceProvider {
  readonly code: string;
  readonly priority: number;

  fetchPrices(context: GoldPriceFetchContext): Promise<ProviderResult>;
}
