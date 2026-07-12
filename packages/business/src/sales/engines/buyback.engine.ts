import type { BuybackEvaluation, GoldRateQuote } from '../types/sales.types.js';
import type { GoldKarat } from '@goldos/database';

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function findGoldRate(quotes: GoldRateQuote[], karat: GoldKarat): number | null {
  const quote = quotes.find((entry) => entry.karat === karat);
  return quote ? quote.pricePerGram : null;
}

export function evaluateBuyback(params: {
  karat: GoldKarat;
  weightGrams: number;
  purity?: number | null;
  pricePerGram: number;
  offeredAmount?: number | null;
}): BuybackEvaluation {
  const purityFactor = params.purity && params.purity > 0 ? params.purity : 1;
  const effectiveWeight = roundMoney(params.weightGrams * purityFactor);
  const marketValue = roundMoney(effectiveWeight * params.pricePerGram);
  const offeredAmount =
    params.offeredAmount !== undefined && params.offeredAmount !== null
      ? roundMoney(params.offeredAmount)
      : marketValue;

  return {
    karat: params.karat,
    weightGrams: params.weightGrams,
    purity: params.purity ?? null,
    pricePerGram: params.pricePerGram,
    marketValue,
    offeredAmount,
  };
}

export function calculateBuybackProfit(salePrice: number, buybackCost: number): number {
  return roundMoney(salePrice - buybackCost);
}
