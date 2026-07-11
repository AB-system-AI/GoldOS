import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { ExchangeRateRepository } from '../repositories/exchange-rate.repository.js';
import { assertFound, parseInput } from './validation.js';

const createExchangeRateSchema = z.object({
  currencyId: z.string().uuid(),
  baseCurrency: z.string().length(3).default('SAR'),
  rate: z.union([z.number().positive(), z.string()]),
  effectiveAt: z.coerce.date(),
  source: z.string().max(50).optional().nullable(),
  providerId: z.string().uuid().optional().nullable(),
});

export class ExchangeRateService {
  constructor(
    private readonly exchangeRateRepository: ExchangeRateRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string | null, id: string) {
    return assertFound(
      this.exchangeRateRepository.findById(tenantId, id),
      'Exchange rate not found',
    );
  }

  getLatest(tenantId: string | null, currencyId: string, baseCurrency = 'SAR') {
    return this.exchangeRateRepository.findLatest(tenantId, currencyId, baseCurrency);
  }

  list(tenantId: string | null, filters?: Parameters<ExchangeRateRepository['list']>[1]) {
    return this.exchangeRateRepository.list(tenantId, filters);
  }

  async create(
    tenantId: string | null,
    input: unknown,
    context?: AuditContext & { tenantId: string },
  ) {
    const data = parseInput(createExchangeRateSchema, input);
    const rate = await this.exchangeRateRepository.create(tenantId, {
      currency: { connect: { id: data.currencyId } },
      baseCurrency: (data.baseCurrency ?? 'SAR').toUpperCase(),
      rate: data.rate,
      effectiveAt: data.effectiveAt,
      source: data.source ?? null,
      ...(data.providerId ? { provider: { connect: { id: data.providerId } } } : {}),
    });

    const auditTenantId = tenantId ?? context?.tenantId;
    if (auditTenantId) {
      await this.auditService.log({
        tenantId: auditTenantId,
        action: 'CREATE',
        entityType: 'exchange_rate',
        entityId: rate.id,
        newValues: rate,
        context,
      });
    }

    return rate;
  }

  listCache(tenantId: string | null) {
    return this.exchangeRateRepository.listCache(tenantId);
  }
}
