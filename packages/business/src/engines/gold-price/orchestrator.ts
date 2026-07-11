import type { GoldPriceFetchContext, IGoldPriceProvider } from './provider.interface.js';
import type { GoldPriceQuote, ProviderResult } from './types.js';

const DEFAULT_KARATS = ['K18', 'K21', 'K22', 'K24'] as const;

export class GoldPriceOrchestrator {
  constructor(private readonly providers: IGoldPriceProvider[]) {}

  async fetchWithFallback(context: GoldPriceFetchContext): Promise<ProviderResult> {
    const sorted = [...this.providers].sort((a, b) => a.priority - b.priority);
    const errors: string[] = [];
    const karats = context.karats ?? [...DEFAULT_KARATS];
    const merged = new Map<string, GoldPriceQuote>();
    const sources = new Set<string>();

    for (const provider of sorted) {
      try {
        const result = await provider.fetchPrices({ ...context, karats });
        if (!result.success) {
          if (result.error) {
            errors.push(`${provider.code}: ${result.error}`);
          }
          continue;
        }

        for (const quote of result.quotes) {
          if (!merged.has(quote.karat)) {
            merged.set(quote.karat, quote);
            sources.add(quote.source);
          }
        }

        if (merged.size >= karats.length) {
          break;
        }
      } catch (error) {
        errors.push(
          `${provider.code}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    const quotes = karats
      .map((karat) => merged.get(karat))
      .filter((quote): quote is GoldPriceQuote => quote !== undefined);

    if (quotes.length === 0) {
      return {
        providerCode: 'none',
        success: false,
        quotes: [],
        error: errors.join('; ') || 'All providers failed',
        fetchedAt: new Date(),
      };
    }

    const [singleSource] = [...sources];
    const providerCode = sources.size === 1 && singleSource !== undefined ? singleSource : 'merged';

    return {
      providerCode,
      success: true,
      quotes,
      fetchedAt: new Date(),
      ...(quotes.length < karats.length
        ? {
            error: `Partial coverage: ${String(quotes.length)}/${String(karats.length)} karats`,
          }
        : {}),
    };
  }
}
