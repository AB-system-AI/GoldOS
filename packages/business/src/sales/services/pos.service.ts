import { z } from 'zod';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, assertTenantRef, asJson, parseInput } from '../../services/validation.js';
import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { EntityOwnershipRepository } from '../../repositories/entity-ownership.repository.js';
import type { InventorySearchService } from '../../inventory/services/inventory-search.service.js';
import type { DocumentNumberGenerator } from '../engines/document-number.generator.js';
import type { PosSessionRepository } from '../repositories/pos-session.repository.js';
import type { CartItem, PosCart } from '../types/sales.types.js';
import type { CheckoutOrchestratorService } from './checkout-orchestrator.service.js';
import type { SalesOrderService } from './sales-order.service.js';
import type { SalesNotificationService } from './sales-notification.service.js';

const openSessionSchema = z.object({
  branchId: z.string().uuid(),
  employeeId: z.string().uuid().optional().nullable(),
  cashRegisterId: z.string().uuid().optional().nullable(),
});

const updateCartSchema = z.object({
  cart: z.object({
    customerId: z.string().uuid().optional().nullable(),
    items: z.array(
      z.object({
        inventoryItemId: z.string().uuid(),
        productId: z.string().uuid(),
        description: z.string(),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().min(0),
        discount: z.number().min(0).optional(),
        weight: z.number().optional().nullable(),
        karat: z.enum(['K8', 'K9', 'K14', 'K18', 'K21', 'K22', 'K24']).optional().nullable(),
        makingCharge: z.number().optional(),
        stoneCost: z.number().optional(),
      }),
    ),
    orderDiscount: z.number().min(0).optional(),
    notes: z.string().optional().nullable(),
  }),
});

const checkoutSchema = z.object({
  customerId: z.string().uuid(),
  organizationId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid().optional().nullable(),
  payments: z
    .array(
      z.object({
        method: z.enum([
          'CASH',
          'CARD',
          'BANK_TRANSFER',
          'CHEQUE',
          'MOBILE_WALLET',
          'GOLD_EXCHANGE',
          'STORE_CREDIT',
          'OTHER',
        ]),
        amount: z.number().positive(),
        reference: z.string().optional().nullable(),
      }),
    )
    .optional(),
  completeSale: z.boolean().default(true),
});

export class PosService {
  constructor(
    private readonly posSessionRepository: PosSessionRepository,
    private readonly entityOwnershipRepository: EntityOwnershipRepository,
    private readonly documentNumberGenerator: DocumentNumberGenerator,
    private readonly inventorySearchService: InventorySearchService,
    private readonly salesOrderService: SalesOrderService,
    private readonly checkoutOrchestratorService: CheckoutOrchestratorService,
    private readonly salesNotificationService: SalesNotificationService,
    private readonly auditService: AuditService,
  ) {}

  getSession(tenantId: string, id: string) {
    return assertFound(this.posSessionRepository.findById(tenantId, id), 'POS session not found');
  }

  listSessions(tenantId: string, filters?: Parameters<PosSessionRepository['list']>[1]) {
    return this.posSessionRepository.list(tenantId, filters);
  }

  async openSession(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(openSessionSchema, input);
    await assertTenantRef(
      () => this.entityOwnershipRepository.hasBranch(tenantId, data.branchId),
      'Branch not found in tenant',
    );

    if (data.employeeId) {
      const existing = await this.posSessionRepository.findOpenForEmployee(
        tenantId,
        data.employeeId,
        data.branchId,
      );
      if (existing) {
        return existing;
      }
    }

    const sessionNo = await this.documentNumberGenerator.next(tenantId, 'POS_SESSION', {
      branchId: data.branchId,
    });

    const session = await this.posSessionRepository.create(tenantId, {
      sessionNo,
      status: 'OPEN',
      cartData: {},
      branch: { connect: { id: data.branchId } },
      ...(data.employeeId ? { employee: { connect: { id: data.employeeId } } } : {}),
      ...(data.cashRegisterId ? { cashRegister: { connect: { id: data.cashRegisterId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'pos_session',
      entityId: session.id,
      newValues: session,
      context,
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: data.branchId,
      eventType: 'POS_SESSION_OPENED',
      referenceType: 'pos_session',
      referenceId: session.id,
      title: 'POS session opened',
      body: `Session ${session.sessionNo} opened`,
    });

    return session;
  }

  async updateCart(tenantId: string, sessionId: string, input: unknown, context?: AuditContext) {
    const session = await assertFound(
      this.posSessionRepository.findById(tenantId, sessionId),
      'POS session not found',
    );
    if (session.status !== 'OPEN' && session.status !== 'PARKED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Session is not editable');
    }

    const data = parseInput(updateCartSchema, input);
    const updated = await this.posSessionRepository.update(tenantId, sessionId, {
      cartData: asJson(data.cart),
      status: 'OPEN',
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'pos_session',
      entityId: sessionId,
      newValues: { action: 'update_cart', itemCount: data.cart.items.length },
      context,
    });

    return updated;
  }

  async closeSession(tenantId: string, sessionId: string, context?: AuditContext) {
    const session = await assertFound(
      this.posSessionRepository.findById(tenantId, sessionId),
      'POS session not found',
    );
    if (session.status === 'CLOSED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Session already closed');
    }

    const updated = await this.posSessionRepository.update(tenantId, sessionId, {
      status: 'CLOSED',
      closedAt: new Date(),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'pos_session',
      entityId: sessionId,
      newValues: { action: 'close' },
      context,
    });

    await this.salesNotificationService.emit({
      tenantId,
      branchId: session.branchId,
      eventType: 'POS_SESSION_CLOSED',
      referenceType: 'pos_session',
      referenceId: sessionId,
      title: 'POS session closed',
      body: `Session ${session.sessionNo} closed`,
    });

    return updated;
  }

  searchProducts(tenantId: string, input: unknown) {
    return this.inventorySearchService.search(tenantId, input);
  }

  async checkout(tenantId: string, sessionId: string, input: unknown, context?: AuditContext) {
    const session = await assertFound(
      this.posSessionRepository.findById(tenantId, sessionId),
      'POS session not found',
    );
    if (session.status === 'CLOSED') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Session is closed');
    }

    const data = parseInput(checkoutSchema, input);
    const cart = (session.cartData as PosCart | null) ?? { items: [] };
    const items: CartItem[] = cart.items;

    if (items.length === 0) {
      throw new BusinessError(BusinessErrorCodes.VALIDATION_ERROR, 'Cart is empty');
    }

    await this.posSessionRepository.update(tenantId, sessionId, { status: 'CHECKOUT' });

    const order = await this.salesOrderService.create(
      tenantId,
      {
        branchId: session.branchId,
        customerId: data.customerId,
        organizationId: data.organizationId,
        employeeId: data.employeeId ?? session.employeeId,
        posSessionId: session.id,
        lines: items.map((item) => ({
          productId: item.productId,
          inventoryItemId: item.inventoryItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          weight: item.weight,
          karat: item.karat,
          makingCharge: item.makingCharge,
          stoneCost: item.stoneCost,
        })),
        orderDiscount: cart.orderDiscount,
        notes: cart.notes,
      },
      context,
    );

    const checkoutResult = await this.checkoutOrchestratorService.execute(
      {
        tenantId,
        orderId: order.id,
        branchId: session.branchId,
        customerId: data.customerId,
        employeeId: data.employeeId ?? session.employeeId,
        payments: data.payments,
        completeSale: data.completeSale,
      },
      context,
    );

    await this.posSessionRepository.update(tenantId, sessionId, {
      status: 'CLOSED',
      closedAt: new Date(),
      cartData: {},
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'pos_checkout',
      entityId: sessionId,
      newValues: { orderId: order.id, invoiceId: checkoutResult.invoice.id },
      context,
    });

    return {
      session: await this.getSession(tenantId, sessionId),
      order: checkoutResult.order,
      invoice: checkoutResult.invoice,
    };
  }
}
