import type { BranchGoldPricing } from '../../engines/gold-price/types.js';
import { moneyToString, roundMoney } from './money.engine.js';

export interface ImmutableExchangeRateSnapshot {
  currencyCode: string;
  baseCurrency: string;
  exchangeRate: string;
  goldPrice: Record<string, string>;
  pricingSource: 'AUTOMATIC' | 'MANUAL' | 'MOCK';
  snapshotTimestamp: string;
  manualOverride: boolean;
  providerName: string;
  goldProviderVersion: string | null;
  branchId: string;
}

export function buildExchangeRateSnapshot(params: {
  currencyCode: string;
  baseCurrency: string;
  exchangeRate: string | number;
  goldPricing: BranchGoldPricing;
  branchId: string;
  pricingSource: ImmutableExchangeRateSnapshot['pricingSource'];
  providerName: string;
  manualOverride: boolean;
}): ImmutableExchangeRateSnapshot {
  const goldPrice: Record<string, string> = {};
  for (const quote of params.goldPricing.quotes) {
    goldPrice[quote.karat] = moneyToString(roundMoney(quote.pricePerGram));
  }

  const goldProviderVersion = params.goldPricing.quotes[0]?.source ?? null;

  return {
    currencyCode: params.currencyCode.toUpperCase(),
    baseCurrency: params.baseCurrency.toUpperCase(),
    exchangeRate: moneyToString(roundMoney(params.exchangeRate)),
    goldPrice,
    pricingSource: params.pricingSource,
    snapshotTimestamp: new Date().toISOString(),
    manualOverride: params.manualOverride,
    providerName: params.providerName,
    goldProviderVersion,
    branchId: params.branchId,
  };
}
