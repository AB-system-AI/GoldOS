import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { SupplierRepository } from '../repositories/supplier.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, asJsonOptional, parseInput } from './validation.js';

const createSupplierSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  supplierNo: z.string().min(1).max(30),
  supplierType: z.enum(['LOCAL', 'INTERNATIONAL', 'MANUFACTURER', 'WORKSHOP']).optional(),
  name: z.string().min(1).max(255),
  contactName: z.string().max(150).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateSupplierSchema = createSupplierSchema.partial().omit({ supplierNo: true });

const contactSchema = z.object({
  name: z.string().min(1).max(150),
  title: z.string().max(100).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const categorySchema = z.object({
  code: z.string().min(1).max(30),
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export class SupplierService {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.supplierRepository.findById(tenantId, id), 'Supplier not found');
  }

  list(tenantId: string, filters?: Parameters<SupplierRepository['list']>[1]) {
    return this.supplierRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSupplierSchema, input);
    const existing = await this.supplierRepository.findBySupplierNo(tenantId, data.supplierNo);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Supplier number already exists');
    }

    const supplier = await this.supplierRepository.create(tenantId, {
      supplierNo: data.supplierNo,
      supplierType: data.supplierType,
      name: data.name,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      taxId: data.taxId ?? null,
      paymentTerms: data.paymentTerms ?? null,
      status: data.status,
      notes: data.notes ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
      ...(data.categoryId ? { category: { connect: { id: data.categoryId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'supplier',
      entityId: supplier.id,
      newValues: supplier,
      context,
    });

    return supplier;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.supplierRepository.findById(tenantId, id),
      'Supplier not found',
    );
    const data = parseInput(updateSupplierSchema, input);
    const supplier = await this.supplierRepository.update(tenantId, id, {
      supplierType: data.supplierType,
      name: data.name,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      taxId: data.taxId,
      paymentTerms: data.paymentTerms,
      status: data.status,
      notes: data.notes,
      metadata: asJsonOptional(data.metadata),
      ...(data.categoryId !== undefined
        ? data.categoryId
          ? { category: { connect: { id: data.categoryId } } }
          : { category: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'supplier',
      entityId: id,
      oldValues: existing,
      newValues: supplier,
      context,
    });

    return supplier;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.supplierRepository.findById(tenantId, id),
      'Supplier not found',
    );
    await this.supplierRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'supplier',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  listContacts(tenantId: string, supplierId: string) {
    return this.supplierRepository.listContacts(tenantId, supplierId);
  }

  async addContact(tenantId: string, supplierId: string, input: unknown, context?: AuditContext) {
    await assertFound(this.supplierRepository.findById(tenantId, supplierId), 'Supplier not found');
    const data = parseInput(contactSchema, input);
    const contact = await this.supplierRepository.addContact(tenantId, {
      supplier: { connect: { id: supplierId } },
      ...data,
    });
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'supplier_contact',
      entityId: contact.id,
      newValues: contact,
      context,
    });
    return contact;
  }

  listCategories(tenantId: string) {
    return this.supplierRepository.listCategories(tenantId);
  }

  async createCategory(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(categorySchema, input);
    const existing = await this.supplierRepository.findCategoryByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.ALREADY_EXISTS,
        'Supplier category code already exists',
      );
    }
    const category = await this.supplierRepository.createCategory(tenantId, data);
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'supplier_category',
      entityId: category.id,
      newValues: category,
      context,
    });
    return category;
  }
}
