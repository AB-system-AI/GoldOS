import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, parseInput } from '../../services/validation.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';

import { PurchaseStatusEngine } from '../engines/purchase-status.engine.js';
import type { PurchasingDocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PurchaseRfqRepository } from '../repositories/purchase-rfq.repository.js';

const createSchema = z.object({
  branchId: z.string().uuid(),
  purchaseRequestId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdById: z.string().uuid().optional().nullable(),
  supplierIds: z.array(z.string().uuid()).optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid().optional().nullable(),
        description: z.string().optional().nullable(),
        quantity: z.number().int().min(1).default(1),
        notes: z.string().optional().nullable(),
      }),
    )
    .min(1),
});

export class PurchaseRfqService {
  constructor(
    private readonly purchaseRfqRepository: PurchaseRfqRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: PurchasingDocumentNumberGenerator,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.purchaseRfqRepository.findById(tenantId, id), 'Purchase RFQ not found');
  }

  list(tenantId: string, filters?: Parameters<PurchaseRfqRepository['list']>[1]) {
    return this.purchaseRfqRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    const rfqNo = await this.documentNumberGenerator.next(tenantId, 'RFQ', {
      branchId: data.branchId,
    });
    const rfq = await this.purchaseRfqRepository.create(tenantId, {
      rfqNo,
      status: 'DRAFT',
      title: data.title,
      dueDate: data.dueDate ?? null,
      notes: data.notes ?? null,
      branch: { connect: { id: data.branchId } },
      ...(data.purchaseRequestId
        ? { purchaseRequest: { connect: { id: data.purchaseRequestId } } }
        : {}),
      ...(data.createdById ? { createdBy: { connect: { id: data.createdById } } } : {}),
    });

    for (const [index, line] of data.lines.entries()) {
      await this.purchaseRfqRepository.createLine(rfq.id, {
        lineNo: index + 1,
        description: line.description ?? null,
        quantity: line.quantity,
        notes: line.notes ?? null,
        ...(line.productId ? { product: { connect: { id: line.productId } } } : {}),
      });
    }

    if (data.supplierIds) {
      for (const supplierId of data.supplierIds) {
        await assertTenantRef(
          () => this.entityOwnershipRepository.hasSupplier(tenantId, supplierId),
          'Supplier not found in tenant',
        );
        await this.purchaseRfqRepository.addSupplier(tenantId, rfq.id, supplierId);
      }
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_rfq',
      entityId: rfq.id,
      newValues: rfq,
      context,
    });

    return this.getById(tenantId, rfq.id);
  }

  async send(tenantId: string, id: string, context?: AuditContext) {
    const rfq = await assertFound(
      this.purchaseRfqRepository.findById(tenantId, id),
      'Purchase RFQ not found',
    );
    PurchaseStatusEngine.assertPurchaseRfqTransition(rfq.status, 'SENT');
    await this.purchaseRfqRepository.markSuppliersSent(id);
    const updated = await this.purchaseRfqRepository.update(tenantId, id, { status: 'SENT' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_rfq',
      entityId: id,
      newValues: { status: 'SENT' },
      context,
    });
    return updated;
  }

  async close(tenantId: string, id: string, context?: AuditContext) {
    const rfq = await assertFound(
      this.purchaseRfqRepository.findById(tenantId, id),
      'Purchase RFQ not found',
    );
    PurchaseStatusEngine.assertPurchaseRfqTransition(rfq.status, 'CLOSED');
    const updated = await this.purchaseRfqRepository.update(tenantId, id, { status: 'CLOSED' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_rfq',
      entityId: id,
      newValues: { status: 'CLOSED' },
      context,
    });
    return updated;
  }

  async cancel(tenantId: string, id: string, context?: AuditContext) {
    const rfq = await assertFound(
      this.purchaseRfqRepository.findById(tenantId, id),
      'Purchase RFQ not found',
    );
    PurchaseStatusEngine.assertPurchaseRfqTransition(rfq.status, 'CANCELLED');
    const updated = await this.purchaseRfqRepository.update(tenantId, id, { status: 'CANCELLED' });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'purchase_rfq',
      entityId: id,
      newValues: { status: 'CANCELLED' },
      context,
    });
    return updated;
  }
}
