import type { GoldKarat } from '@goldos/database';

import type { GoldPriceRepository } from '../../repositories/gold-price.repository.js';
import type { GoldPriceFetchContext, IGoldPriceProvider } from './provider.interface.js';
import type { GoldPriceQuote } from './types.js';

const DEFAULT_KARATS: GoldKarat[] = ['K18', 'K21', 'K22', 'K24'];

export class ManualGoldPriceProvider implements IGoldPriceProvider {
  readonly code = 'manual';
  readonly priority = 0;

  constructor(private readonly goldPriceRepository: GoldPriceRepository) {}

  async fetchPrices(context: GoldPriceFetchContext) {
    const currency = context.currency ?? 'SAR';
    const karats = context.karats ?? DEFAULT_KARATS;
    const overrides = await this.goldPriceRepository.listActiveOverrides(
      context.tenantId,
      currency,
    );
    const fetchedAt = new Date();
    const quotes: GoldPriceQuote[] = [];

    for (const karat of karats) {
      const override = overrides.find((o) => o.karat === karat);
      if (!override) {
        continue;
      }

      if (override.pricePerGram !== null) {
        quotes.push({
          karat,
          pricePerGram: Number(override.pricePerGram),
          currency,
          source: this.code,
          fetchedAt,
          isOverride: true,
        });
        continue;
      }

      if (override.spreadBps !== null) {
        const cache = await this.goldPriceRepository.findCacheEntry(
          context.tenantId,
          karat,
          currency,
        );
        if (cache) {
          const base = Number(cache.pricePerGram);
          quotes.push({
            karat,
            pricePerGram: base * (1 + override.spreadBps / 10_000),
            currency,
            source: this.code,
            fetchedAt,
            isOverride: true,
          });
        }
      }
    }

    return {
      providerCode: this.code,
      success: quotes.length > 0,
      quotes,
      fetchedAt,
      ...(quotes.length === 0 ? { error: 'No manual overrides found' } : {}),
    };
  }
}
