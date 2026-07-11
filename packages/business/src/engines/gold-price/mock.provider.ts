import type { GoldKarat } from '@goldos/database';

import type { GoldPriceFetchContext, IGoldPriceProvider } from './provider.interface.js';
import type { GoldPriceQuote, ProviderResult } from './types.js';

const DEFAULT_KARATS: GoldKarat[] = ['K18', 'K21', 'K22', 'K24'];

const MOCK_PRICES_SAR: Record<GoldKarat, number> = {
  K8: 95,
  K9: 107,
  K14: 167,
  K18: 214,
  K21: 250,
  K22: 262,
  K24: 285,
};

export class MockGoldPriceProvider implements IGoldPriceProvider {
  readonly code = 'mock';
  readonly priority = 100;

  fetchPrices(context: GoldPriceFetchContext): Promise<ProviderResult> {
    const currency = context.currency ?? 'SAR';
    const karats = context.karats ?? DEFAULT_KARATS;
    const fetchedAt = new Date();

    const quotes: GoldPriceQuote[] = karats.map((karat) => ({
      karat,
      pricePerGram: MOCK_PRICES_SAR[karat],
      currency,
      source: this.code,
      fetchedAt,
    }));

    return Promise.resolve({
      providerCode: this.code,
      success: true,
      quotes,
      fetchedAt,
    });
  }
}
