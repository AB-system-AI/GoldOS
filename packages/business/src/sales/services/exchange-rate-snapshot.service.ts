import type { BranchGoldPricing } from '../../engines/gold-price/types.js';
import type { CurrencyRepository } from '../../repositories/currency.repository.js';
import type { ExchangeRateRepository } from '../../repositories/exchange-rate.repository.js';
import { buildExchangeRateSnapshot } from '../engines/exchange-rate-snapshot.engine.js';

export class ExchangeRateSnapshotService {
  constructor(
    private readonly currencyRepository: CurrencyRepository,
    private readonly exchangeRateRepository: ExchangeRateRepository,
  ) {}

  async buildSnapshot(params: {
    tenantId: string;
    branchId: string;
    currencyCode: string;
    goldPricing: BranchGoldPricing;
    manualOverride?: boolean;
    manualRate?: string | number | null;
  }) {
    const currencyCode = params.currencyCode.toUpperCase();
    const baseCurrency = 'SAR';

    if (params.manualOverride && params.manualRate != null) {
      return buildExchangeRateSnapshot({
        currencyCode,
        baseCurrency,
        exchangeRate: params.manualRate,
        goldPricing: params.goldPricing,
        branchId: params.branchId,
        pricingSource: 'MANUAL',
        providerName: 'MANUAL_OVERRIDE',
        manualOverride: true,
      });
    }

    if (currencyCode === baseCurrency) {
      return buildExchangeRateSnapshot({
        currencyCode,
        baseCurrency,
        exchangeRate: 1,
        goldPricing: params.goldPricing,
        branchId: params.branchId,
        pricingSource: 'AUTOMATIC',
        providerName: 'SYSTEM',
        manualOverride: false,
      });
    }

    const currency = await this.currencyRepository.findByCode(currencyCode);
    if (!currency) {
      return buildExchangeRateSnapshot({
        currencyCode,
        baseCurrency,
        exchangeRate: 1,
        goldPricing: params.goldPricing,
        branchId: params.branchId,
        pricingSource: 'MOCK',
        providerName: 'MOCK',
        manualOverride: false,
      });
    }

    const latest = await this.exchangeRateRepository.findLatest(
      params.tenantId,
      currency.id,
      baseCurrency,
    );

    return buildExchangeRateSnapshot({
      currencyCode,
      baseCurrency,
      exchangeRate: latest ? String(latest.rate) : 1,
      goldPricing: params.goldPricing,
      branchId: params.branchId,
      pricingSource: latest ? 'AUTOMATIC' : 'MOCK',
      providerName: latest?.source ?? 'MOCK',
      manualOverride: false,
    });
  }
}
