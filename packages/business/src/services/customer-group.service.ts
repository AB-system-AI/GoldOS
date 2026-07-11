import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { CustomerGroupRepository } from '../repositories/customer-group.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, parseInput } from './validation.js';

const createCustomerGroupSchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  discountBps: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

export class CustomerGroupService {
  constructor(
    private readonly customerGroupRepository: CustomerGroupRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.customerGroupRepository.findById(tenantId, id),
      'Customer group not found',
    );
  }

  list(tenantId: string, filters?: Parameters<CustomerGroupRepository['list']>[1]) {
    return this.customerGroupRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createCustomerGroupSchema, input);
    const existing = await this.customerGroupRepository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.ALREADY_EXISTS,
        'Customer group code already exists',
      );
    }

    const group = await this.customerGroupRepository.create(tenantId, data);

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'customer_group',
      entityId: group.id,
      newValues: group,
      context,
    });

    return group;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.customerGroupRepository.findById(tenantId, id),
      'Customer group not found',
    );
    const data = parseInput(updateCustomerGroupSchema, input);
    const group = await this.customerGroupRepository.update(tenantId, id, data);

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'customer_group',
      entityId: id,
      oldValues: existing,
      newValues: group,
      context,
    });

    return group;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.customerGroupRepository.findById(tenantId, id),
      'Customer group not found',
    );
    await this.customerGroupRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'customer_group',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
