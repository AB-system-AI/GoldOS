import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { CustomerRepository } from '../repositories/customer.repository.js';
import type { EntityOwnershipRepository } from '../repositories/entity-ownership.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, assertTenantRef, asJsonOptional, parseInput } from './validation.js';

const createCustomerSchema = z.object({
  customerGroupId: z.string().uuid().optional().nullable(),
  customerNo: z.string().min(1).max(30),
  customerType: z.enum(['INDIVIDUAL', 'COMPANY', 'VIP', 'WALK_IN']).optional(),
  name: z.string().min(1).max(255),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().min(1).max(30),
  phoneSecondary: z.string().max(30).optional().nullable(),
  idNumber: z.string().max(50).optional().nullable(),
  nationalId: z.string().max(50).optional().nullable(),
  passportNumber: z.string().max(50).optional().nullable(),
  taxNumber: z.string().max(50).optional().nullable(),
  commercialRegistration: z.string().max(50).optional().nullable(),
  tier: z.string().max(20).optional(),
  isWalkIn: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateCustomerSchema = createCustomerSchema.partial().omit({ customerNo: true });

function resolveNationalId(data: {
  nationalId?: string | null;
  idNumber?: string | null;
}): string | null {
  const nationalId = data.nationalId?.trim() ?? data.idNumber?.trim() ?? null;
  return nationalId && nationalId.length > 0 ? nationalId : null;
}

const phoneSchema = z.object({
  phone: z.string().min(1).max(30),
  label: z.string().max(50).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.customerRepository.findById(tenantId, id), 'Customer not found');
  }

  list(tenantId: string, filters?: Parameters<CustomerRepository['list']>[1]) {
    return this.customerRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createCustomerSchema, input);
    const existing = await this.customerRepository.findByCustomerNo(tenantId, data.customerNo);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Customer number already exists');
    }

    if (data.customerGroupId) {
      const customerGroupId = data.customerGroupId;
      await assertTenantRef(
        () => this.entityOwnershipRepository.hasCustomerGroup(tenantId, customerGroupId),
        'Customer group not found in tenant',
      );
    }

    const customer = await this.customerRepository.create(tenantId, {
      customerNo: data.customerNo,
      customerType: data.customerType,
      name: data.name,
      email: data.email ?? null,
      phone: data.phone,
      phoneSecondary: data.phoneSecondary ?? null,
      idNumber: resolveNationalId(data),
      nationalId: resolveNationalId(data),
      passportNumber: data.passportNumber?.trim() ?? null,
      taxNumber: data.taxNumber?.trim() ?? null,
      commercialRegistration: data.commercialRegistration?.trim() ?? null,
      tier: data.tier,
      isWalkIn: data.isWalkIn,
      status: data.status,
      notes: data.notes ?? null,
      tags: data.tags,
      metadata: asJsonOptional(data.metadata) ?? {},
      ...(data.customerGroupId ? { customerGroup: { connect: { id: data.customerGroupId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'customer',
      entityId: customer.id,
      newValues: customer,
      context,
    });

    return customer;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.customerRepository.findById(tenantId, id),
      'Customer not found',
    );
    const data = parseInput(updateCustomerSchema, input);

    const customer = await this.customerRepository.update(tenantId, id, {
      customerType: data.customerType,
      name: data.name,
      email: data.email,
      phone: data.phone,
      phoneSecondary: data.phoneSecondary,
      ...(data.idNumber !== undefined || data.nationalId !== undefined
        ? {
            idNumber: resolveNationalId(data),
            nationalId: resolveNationalId(data),
          }
        : {}),
      passportNumber: data.passportNumber?.trim() ?? data.passportNumber,
      taxNumber: data.taxNumber?.trim() ?? data.taxNumber,
      commercialRegistration: data.commercialRegistration?.trim() ?? data.commercialRegistration,
      tier: data.tier,
      isWalkIn: data.isWalkIn,
      status: data.status,
      notes: data.notes,
      tags: data.tags,
      metadata: asJsonOptional(data.metadata),
      ...(data.customerGroupId !== undefined
        ? data.customerGroupId
          ? { customerGroup: { connect: { id: data.customerGroupId } } }
          : { customerGroup: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'customer',
      entityId: id,
      oldValues: existing,
      newValues: customer,
      context,
    });

    return customer;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.customerRepository.findById(tenantId, id),
      'Customer not found',
    );
    await this.customerRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'customer',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  listPhones(tenantId: string, customerId: string) {
    return this.customerRepository.listPhones(tenantId, customerId);
  }

  async addPhone(tenantId: string, customerId: string, input: unknown, context?: AuditContext) {
    await assertFound(this.customerRepository.findById(tenantId, customerId), 'Customer not found');
    const data = parseInput(phoneSchema, input);
    const phone = await this.customerRepository.addPhone(tenantId, { customerId, ...data });
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'customer_phone',
      entityId: phone.id,
      newValues: phone,
      context,
    });
    return phone;
  }

  listBuybackHistory(tenantId: string, customerId: string) {
    return this.customerRepository.listBuybackHistory(tenantId, customerId);
  }

  listTradeInHistory(tenantId: string, customerId: string) {
    return this.customerRepository.listTradeInHistory(tenantId, customerId);
  }

  listPurchaseHistory(tenantId: string, customerId: string, take?: number) {
    return this.customerRepository.listPurchaseHistory(tenantId, customerId, take);
  }
}
