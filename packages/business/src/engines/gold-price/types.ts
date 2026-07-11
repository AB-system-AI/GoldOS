import type { GoldKarat } from '@goldos/database';

export interface GoldPriceQuote {
  karat: GoldKarat;
  pricePerGram: number;
  currency: string;
  source: string;
  fetchedAt: Date;
  isOverride?: boolean;
}

export interface ProviderResult {
  providerCode: string;
  success: boolean;
  quotes: GoldPriceQuote[];
  error?: string;
  fetchedAt: Date;
}

export interface GoldPriceSyncResult {
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordsSynced: number;
  quotes: GoldPriceQuote[];
  providerCode?: string;
  errorMessage?: string;
}

export interface BranchGoldPricing {
  branchId: string;
  currency: string;
  quotes: GoldPriceQuote[];
  appliedAt: Date;
}

export interface GoldPriceCacheEntry {
  karat: GoldKarat;
  pricePerGram: number;
  currency: string;
  fetchedAt: Date;
  expiresAt: Date | null;
  isStale: boolean;
}
