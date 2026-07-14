import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';

import { calculatePurchaseTotals } from '../engines/purchase-calculation.engine.js';
import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PurchaseRfqRepository } from '../repositories/purchase-rfq.repository.js';
import type { SupplierQuotationRepository } from '../repositories/supplier-quotation.repository.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  supplierId: z.string().uuid(),
  purchaseRfqId: z.string().uuid().optional().nullable(),
  validUntil: z.coerce.date().optional().nullable(),
  leadTimeDays: z.number().int().optional().nullable(),
  currency: z.string().length(3).optional(),
  notes: z.string().optional().nullable(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        description: z.string().optional().nullable(),
        quantity: z.number().int().min(1).default(1),
        unitCost: z.number().min(0),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export class SupplierQuotationService {
  constructor(
    private readonly supplierQuotationRepository: SupplierQuotationRepository,
    private readonly purchaseRfqRepository: PurchaseRfqRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(
      this.supplierQuotationRepository.findById(tenantId, id),
      'Supplier quotation not found',
    );
  }

  list(tenantId: string, filters?: Parameters<SupplierQuotationRepository['list']>[1]) {
    return this.supplierQuotationRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasSupplier(tenantId, data.supplierId),
      'Supplier not found in tenant',
    );

    const totals = calculatePurchaseTotals(
      data.lines.map((line) => ({
        quantity: line.quantity ?? 1,
        unitCost: line.unitCost,
      })),
    );
    const quotationNo = await this.documentNumberGenerator.next(tenantId, 'SQ', {
      branchId: data.branchId,
    });

    const quotation = await this.supplierQuotationRepository.create(tenantId, {
      quotationNo,
      status: 'DRAFT',
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      currency: data.currency ?? 'SAR',
      validUntil: data.validUntil ?? null,
      leadTimeDays: data.leadTimeDays ?? null,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      supplier: { connect: { id: data.supplierId } },
      ...(data.purchaseRfqId ? { purchaseRfq: { connect: { id: data.purchaseRfqId } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      const quantity = line.quantity ?? 1;
      await this.supplierQuotationRepository.createLine(quotation.id, {
        lineNo: index + 1,
        description: line.description ?? null,
        quantity,
        unitCost: line.unitCost,
        totalCost: quantity * line.unitCost,
        notes: line.notes ?? null,
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
      });
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'supplier_quotation',
      entityId: quotation.id,
      newValues: quotation,
      context,
    });

    return this.getById(tenantId, quotation.id);
  }

  async submit(tenantId: string, id: string, context?: AuditContext) {
    const quotation = await assertFound(
      this.supplierQuotationRepository.findById(tenantId, id),
      'Supplier quotation not found',
    );
    PurchaseStatusEngine.assertSupplierQuotationTransition(quotation.status, 'SUBMITTED');
    const updated = await this.supplierQuotationRepository.update(tenantId, id, {
      status: 'SUBMITTED',
    });

    if (quotation.purchaseRfqId) {
      const rfq = await this.purchaseRfqRepository.findById(tenantId, quotation.purchaseRfqId);
      if (rfq && ['SENT', 'DRAFT'].includes(rfq.status)) {
        PurchaseStatusEngine.assertPurchaseRfqTransition(rfq.status, 'QUOTED');
        await this.purchaseRfqRepository.update(tenantId, rfq.id, { status: 'QUOTED' });
      }
    }

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'supplier_quotation',
      entityId: id,
      newValues: { status: 'SUBMITTED' },
      context,
    });
    return updated;
  }

  async accept(tenantId: string, id: string, context?: AuditContext) {
    const quotation = await assertFound(
      this.supplierQuotationRepository.findById(tenantId, id),
      'Supplier quotation not found',
    );
    PurchaseStatusEngine.assertSupplierQuotationTransition(quotation.status, 'ACCEPTED');
    const updated = await this.supplierQuotationRepository.update(tenantId, id, {
      status: 'ACCEPTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'supplier_quotation',
      entityId: id,
      newValues: { status: 'ACCEPTED' },
      context,
    });
    return updated;
  }

  async reject(tenantId: string, id: string, context?: AuditContext) {
    const quotation = await assertFound(
      this.supplierQuotationRepository.findById(tenantId, id),
      'Supplier quotation not found',
    );
    PurchaseStatusEngine.assertSupplierQuotationTransition(quotation.status, 'REJECTED');
    const updated = await this.supplierQuotationRepository.update(tenantId, id, {
      status: 'REJECTED',
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'supplier_quotation',
      entityId: id,
      newValues: { status: 'REJECTED' },
      context,
    });
    return updated;
  }

  async compareForRfq(tenantId: string, purchaseRfqId: string) {
    const quotations = await this.supplierQuotationRepository.list(tenantId, {
      purchaseRfqId,
    });
    return quotations
      .filter((row) => ['SUBMITTED', 'ACCEPTED'].includes(row.status))
      .map((row) => ({
        id: row.id,
        quotationNo: row.quotationNo,
        supplierId: row.supplierId,
        supplierName: row.supplier.name,
        totalAmount: Number(row.totalAmount),
        leadTimeDays: row.leadTimeDays,
        validUntil: row.validUntil,
      }))
      .sort((a, b) => a.totalAmount - b.totalAmount);
  }
}
