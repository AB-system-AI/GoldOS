import { z } from 'zod';

import type { GoldKarat } from '@goldos/database';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import type { GoldPriceRepository } from '../../repositories/gold-price.repository.js';
import { parseInput } from '../../services/validation.js';
import { ManualGoldPriceProvider } from './manual.provider.js';
import { MockGoldPriceProvider } from './mock.provider.js';
import { GoldPriceOrchestrator } from './orchestrator.js';
import type { BranchGoldPricing, GoldPriceCacheEntry, GoldPriceSyncResult } from './types.js';
import type { IGoldPriceProvider } from './provider.interface.js';

const overrideSchema = z.object({
  karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']),
  pricePerGram: z.number().positive().optional().nullable(),
  spreadBps: z.number().int().optional().nullable(),
  currency: z.string().length(3).default('SAR'),
  reason: z.string().optional().nullable(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional().nullable(),
  sourceId: z.string().uuid().optional().nullable(),
});

const syncSchema = z.object({
  currency: z.string().length(3).optional(),
  karats: z.array(z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24'])).optional(),
});

const CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_KARATS: GoldKarat[] = ['K18', 'K21', 'K22', 'K24'];

export class GoldPriceEngineService {
  private readonly memoryCache = new Map<
    string,
    { expiresAt: number; quotes: GoldPriceCacheEntry[] }
  >();

  constructor(
    private readonly goldPriceRepository: GoldPriceRepository,
    private readonly auditService: AuditService,
  ) {}

  private async buildOrchestrator(): Promise<GoldPriceOrchestrator> {
    const dbProviders = await this.goldPriceRepository.listProviders();
    const manualProvider = new ManualGoldPriceProvider(this.goldPriceRepository);
    const mockProvider = new MockGoldPriceProvider();
    const providers: IGoldPriceProvider[] = [];

    for (const provider of dbProviders) {
      if (provider.code === 'manual') {
        providers.push(manualProvider);
      } else if (provider.code === 'mock' && provider.isActive) {
        providers.push(mockProvider);
      }
    }

    if (providers.length === 0) {
      providers.push(manualProvider, mockProvider);
    }

    return new GoldPriceOrchestrator(providers);
  }

  private async requireProviderConnect(code: string) {
    const providers = await this.goldPriceRepository.listProviders();
    const provider =
      providers.find((entry) => entry.code === code) ??
      providers.find((entry) => entry.code === 'manual') ??
      providers[0];
    if (!provider) {
      throw new Error('No gold price provider configured');
    }
    return { provider: { connect: { id: provider.id } } };
  }

  async syncPrices(
    tenantId: string,
    input?: unknown,
    context?: AuditContext,
  ): Promise<GoldPriceSyncResult> {
    const options = input === undefined ? {} : parseInput(syncSchema, input);
    const currency = options.currency ?? 'SAR';
    const karats = options.karats ?? DEFAULT_KARATS;
    const startedAt = new Date();

    try {
      const orchestrator = await this.buildOrchestrator();
      const result = await orchestrator.fetchWithFallback({
        tenantId,
        currency,
        karats,
      });

      if (!result.success) {
        await this.goldPriceRepository
          .createSyncLog(tenantId, {
            ...(await this.requireProviderConnect('manual')),
            status: 'FAILED',
            errorMessage: result.error ?? 'All providers failed',
            startedAt,
            completedAt: new Date(),
          })
          .catch(() => undefined);

        return {
          status: 'FAILED',
          recordsSynced: 0,
          quotes: [],
          errorMessage: result.error,
        };
      }

      const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
      const isPartial = result.quotes.length < karats.length;

      for (const quote of result.quotes) {
        await this.goldPriceRepository.upsertCache(tenantId, {
          karat: quote.karat,
          pricePerGram: quote.pricePerGram,
          currency: quote.currency,
          fetchedAt: quote.fetchedAt,
          expiresAt,
          metadata: { source: quote.source, isOverride: quote.isOverride ?? false },
        });

        await this.goldPriceRepository.markHistoryNotCurrent(tenantId, quote.karat, quote.currency);
        await this.goldPriceRepository.recordHistory(tenantId, {
          karat: quote.karat,
          pricePerGram: quote.pricePerGram,
          currency: quote.currency,
          source: quote.source,
          effectiveAt: quote.fetchedAt,
          isCurrent: true,
        });
      }

      this.memoryCache.set(`${tenantId}:${currency}`, {
        expiresAt: expiresAt.getTime(),
        quotes: result.quotes.map((q) => ({
          karat: q.karat,
          pricePerGram: q.pricePerGram,
          currency: q.currency,
          fetchedAt: q.fetchedAt,
          expiresAt,
          isStale: false,
        })),
      });

      const completedAt = new Date();
      await this.goldPriceRepository
        .createSyncLog(tenantId, {
          ...(await this.requireProviderConnect(
            result.providerCode === 'merged' ? 'manual' : result.providerCode,
          )),
          status: isPartial ? 'PARTIAL' : 'SUCCESS',
          recordsSynced: result.quotes.length,
          startedAt,
          completedAt,
          durationMs: completedAt.getTime() - startedAt.getTime(),
          ...(result.error ? { errorMessage: result.error } : {}),
        })
        .catch(() => undefined);

      await this.auditService.log({
        tenantId,
        action: 'UPDATE',
        entityType: 'gold_price_cache',
        newValues: { recordsSynced: result.quotes.length, provider: result.providerCode },
        context,
      });

      return {
        status: isPartial ? 'PARTIAL' : 'SUCCESS',
        recordsSynced: result.quotes.length,
        quotes: result.quotes,
        providerCode: result.providerCode,
        ...(result.error ? { errorMessage: result.error } : {}),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed';
      await this.goldPriceRepository
        .createSyncLog(tenantId, {
          ...(await this.requireProviderConnect('manual')),
          status: 'FAILED',
          errorMessage: message,
          startedAt,
          completedAt: new Date(),
        })
        .catch(() => undefined);

      return {
        status: 'FAILED',
        recordsSynced: 0,
        quotes: [],
        errorMessage: message,
      };
    }
  }

  async getCachedPrices(tenantId: string, currency = 'SAR'): Promise<GoldPriceCacheEntry[]> {
    const cacheKey = `${tenantId}:${currency}`;
    const mem = this.memoryCache.get(cacheKey);
    if (mem && mem.expiresAt > Date.now()) {
      return mem.quotes;
    }

    const dbCache = await this.goldPriceRepository.listCache(tenantId, currency);
    return dbCache.map((entry) => ({
      karat: entry.karat,
      pricePerGram: Number(entry.pricePerGram),
      currency: entry.currency,
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.expiresAt,
      isStale: entry.isStale,
    }));
  }

  async createOverride(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(overrideSchema, input);
    const override = await this.goldPriceRepository.createOverride(tenantId, {
      karat: data.karat,
      pricePerGram: data.pricePerGram ?? null,
      spreadBps: data.spreadBps ?? null,
      currency: data.currency,
      reason: data.reason ?? null,
      effectiveFrom: data.effectiveFrom ?? new Date(),
      effectiveTo: data.effectiveTo ?? null,
      ...(data.sourceId ? { source: { connect: { id: data.sourceId } } } : {}),
    });

    const currency = data.currency ?? 'SAR';
    this.memoryCache.delete(`${tenantId}:${currency}`);

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'gold_price_override',
      entityId: override.id,
      newValues: override,
      context,
    });

    return override;
  }

  listOverrides(tenantId: string, currency = 'SAR') {
    return this.goldPriceRepository.listActiveOverrides(tenantId, currency);
  }

  listHistory(tenantId: string, karat?: GoldKarat) {
    return this.goldPriceRepository.listHistory(tenantId, { karat });
  }

  async getBranchPricing(
    tenantId: string,
    branchId: string,
    currency = 'SAR',
  ): Promise<BranchGoldPricing> {
    const quotes = await this.getCachedPrices(tenantId, currency);
    return {
      branchId,
      currency,
      quotes: quotes.map((q) => ({
        karat: q.karat,
        pricePerGram: q.pricePerGram,
        currency: q.currency,
        source: 'cache',
        fetchedAt: q.fetchedAt,
      })),
      appliedAt: new Date(),
    };
  }
}
