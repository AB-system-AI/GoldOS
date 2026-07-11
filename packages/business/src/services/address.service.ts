import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { AddressRepository } from '../repositories/address.repository.js';
import type { EntityOwnershipRepository } from '../repositories/entity-ownership.repository.js';
import { assertFound, assertTenantRef, parseInput } from './validation.js';

const createAddressSchema = z.object({
  addressableType: z.enum([
    'ORGANIZATION',
    'BRANCH',
    'CUSTOMER',
    'SUPPLIER',
    'MANUFACTURER',
    'EMPLOYEE',
    'USER',
  ]),
  addressableId: z.string().uuid(),
  cityId: z.string().uuid().optional().nullable(),
  label: z.string().max(50).optional().nullable(),
  line1: z.string().min(1).max(255),
  line2: z.string().max(255).optional().nullable(),
  postalCode: z.string().max(20).optional().nullable(),
  countryCode: z.string().length(2),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema
  .omit({ addressableType: true, addressableId: true })
  .partial();

export class AddressService {
  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.addressRepository.findById(tenantId, id), 'Address not found');
  }

  listForEntity(tenantId: string, addressableType: string, addressableId: string) {
    return this.addressRepository.listForEntity(
      tenantId,
      addressableType as Parameters<AddressRepository['listForEntity']>[1],
      addressableId,
    );
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createAddressSchema, input);

    await assertTenantRef(
      () =>
        this.entityOwnershipRepository.hasAddressable(
          tenantId,
          data.addressableType,
          data.addressableId,
        ),
      'Addressable entity not found in tenant',
    );

    if (data.isPrimary) {
      await this.addressRepository.clearPrimaryForEntity(
        tenantId,
        data.addressableType,
        data.addressableId,
      );
    }

    const address = await this.addressRepository.create(tenantId, {
      addressableType: data.addressableType,
      addressableId: data.addressableId,
      line1: data.line1,
      line2: data.line2 ?? null,
      postalCode: data.postalCode ?? null,
      countryCode: data.countryCode.toUpperCase(),
      label: data.label ?? null,
      isPrimary: data.isPrimary ?? false,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      ...(data.cityId ? { city: { connect: { id: data.cityId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'address',
      entityId: address.id,
      newValues: address,
      context,
    });

    return address;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.addressRepository.findById(tenantId, id),
      'Address not found',
    );
    const data = parseInput(updateAddressSchema, input);

    if (data.isPrimary) {
      await this.addressRepository.clearPrimaryForEntity(
        tenantId,
        existing.addressableType,
        existing.addressableId,
        id,
      );
    }

    const address = await assertFound(
      this.addressRepository.update(tenantId, id, {
        ...data,
        ...(data.countryCode ? { countryCode: data.countryCode.toUpperCase() } : {}),
        ...(data.cityId !== undefined
          ? data.cityId
            ? { city: { connect: { id: data.cityId } } }
            : { city: { disconnect: true } }
          : {}),
      }),
      'Address not found',
    );

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'address',
      entityId: id,
      oldValues: existing,
      newValues: address,
      context,
    });

    return address;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.addressRepository.findById(tenantId, id),
      'Address not found',
    );
    await this.addressRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'address',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
