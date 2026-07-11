import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { CurrencyRepository } from '../repositories/currency.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, parseInput } from './validation.js';

const createCurrencySchema = z.object({
  code: z.string().length(3),
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  decimals: z.number().int().min(0).max(8).optional(),
  isActive: z.boolean().optional(),
});

const updateCurrencySchema = createCurrencySchema.partial().omit({ code: true });

export class CurrencyService {
  constructor(
    private readonly currencyRepository: CurrencyRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(id: string) {
    return assertFound(this.currencyRepository.findById(id), 'Currency not found');
  }

  getByCode(code: string) {
    return assertFound(this.currencyRepository.findByCode(code), 'Currency not found');
  }

  list(filters?: Parameters<CurrencyRepository['list']>[0]) {
    return this.currencyRepository.list(filters);
  }

  async create(input: unknown, context?: AuditContext & { tenantId: string }) {
    const data = parseInput(createCurrencySchema, input);
    const existing = await this.currencyRepository.findByCode(data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Currency code already exists');
    }

    const currency = await this.currencyRepository.create({
      code: data.code.toUpperCase(),
      name: data.name,
      symbol: data.symbol,
      decimals: data.decimals,
      isActive: data.isActive,
    });

    if (context?.tenantId) {
      await this.auditService.log({
        tenantId: context.tenantId,
        action: 'CREATE',
        entityType: 'currency',
        entityId: currency.id,
        newValues: currency,
        context,
      });
    }

    return currency;
  }

  async update(id: string, input: unknown, context?: AuditContext & { tenantId: string }) {
    const existing = await assertFound(this.currencyRepository.findById(id), 'Currency not found');
    const data = parseInput(updateCurrencySchema, input);
    const currency = await this.currencyRepository.update(id, data);

    if (context?.tenantId) {
      await this.auditService.log({
        tenantId: context.tenantId,
        action: 'UPDATE',
        entityType: 'currency',
        entityId: id,
        oldValues: existing,
        newValues: currency,
        context,
      });
    }

    return currency;
  }
}
