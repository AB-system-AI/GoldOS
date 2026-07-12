import type { PaymentMethod, PrismaClient } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext } from '../../services/audit.service.js';
import type { LockEngine } from '../../inventory/engines/lock.engine.js';
import type { ReservationService } from '../../inventory/services/reservation.service.js';
import type { SalesAccountingIntegrationService } from '../../accounting/services/integration.service.js';
import type { DiscountApprovalService } from './discount-approval.service.js';
import type { InvoiceService } from './invoice.service.js';
import type { LoyaltyService } from './loyalty.service.js';
import type { PaymentService } from './payment.service.js';
import type { SalesNotificationService } from './sales-notification.service.js';
import type { SalesOrderRepository } from '../repositories/sales-order.repository.js';
import type { SalesOrderService } from './sales-order.service.js';

export interface CheckoutParams {
  tenantId: string;
  orderId: string;
  branchId: string;
  customerId: string;
  employeeId?: string | null;
  cashierEmployeeId?: string | null;
  payments?: {
    method: string;
    amount: number;
    reference?: string | null;
  }[];
  loyaltyPointsToRedeem?: number;
  discountPercent?: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  completeSale?: boolean;
}

export class CheckoutOrchestratorService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly salesOrderRepository: SalesOrderRepository,
    private readonly salesOrderService: SalesOrderService,
    private readonly invoiceService: InvoiceService,
    private readonly paymentService: PaymentService,
    private readonly discountApprovalService: DiscountApprovalService,
    private readonly loyaltyService: LoyaltyService,
    private readonly lockEngine: LockEngine,
    private readonly reservationService: ReservationService,
    private readonly salesNotificationService: SalesNotificationService,
    private readonly salesAccountingIntegrationService?: SalesAccountingIntegrationService,
  ) {}

  async execute(params: CheckoutParams, context?: AuditContext) {
    const order = await this.salesOrderRepository.findById(params.tenantId, params.orderId);
    if (!order) {
      throw new BusinessError(BusinessErrorCodes.NOT_FOUND, 'Sales order not found');
    }

    if (order.discountPending) {
      const blocked = await this.discountApprovalService.isCheckoutBlocked(
        params.tenantId,
        'sales_order',
        order.id,
      );
      if (blocked) {
        throw new BusinessError(
          BusinessErrorCodes.CONFLICT,
          'Checkout blocked pending discount approval',
        );
      }
    }

    if (params.discountPercent && params.discountPercent > 0) {
      const enforcement = await this.discountApprovalService.evaluateAndEnforce(
        params.tenantId,
        {
          branchId: params.branchId,
          referenceType: 'sales_order',
          referenceId: order.id,
          discountType: params.discountType ?? 'PERCENTAGE',
          requestedValue: params.discountPercent,
          subtotal: Number(order.subtotal),
          requestedById: params.employeeId,
        },
        context,
      );
      if (!enforcement.approved) {
        await this.salesOrderRepository.update(params.tenantId, order.id, {
          discountPending: true,
        });
        throw new BusinessError(
          BusinessErrorCodes.CONFLICT,
          'Discount requires manager approval before checkout',
        );
      }
    }

    const lockIds: string[] = [];
    try {
      return await this.prisma.$transaction(async () => {
        for (const line of order.lines) {
          if (!line.inventoryItemId) continue;
          const locked = await this.lockEngine.isLocked(params.tenantId, line.inventoryItemId);
          if (locked && !order.reservationId) {
            throw new BusinessError(
              BusinessErrorCodes.CONFLICT,
              `Inventory item ${line.inventoryItemId} is locked`,
            );
          }
          const lock = await this.lockEngine.acquire({
            tenantId: params.tenantId,
            inventoryItemId: line.inventoryItemId,
            lockType: 'SALE',
            referenceType: 'sales_order',
            referenceId: order.id,
            lockedById: params.cashierEmployeeId ?? params.employeeId,
            reason: `Checkout lock for order ${order.orderNo}`,
          });
          lockIds.push(lock.id);
        }

        if (order.reservationId) {
          await this.reservationService.release(params.tenantId, order.reservationId, context);
          await this.lockEngine.releaseByReference(
            params.tenantId,
            'reservation',
            order.reservationId,
          );
        }

        await this.salesOrderRepository.update(params.tenantId, order.id, {
          checkoutLockedAt: new Date(),
          ...(params.cashierEmployeeId
            ? { cashier: { connect: { id: params.cashierEmployeeId } } }
            : {}),
        });

        if (order.status === 'DRAFT') {
          await this.salesOrderService.confirm(params.tenantId, order.id, context);
        }

        const invoice = await this.invoiceService.createFromOrder(
          params.tenantId,
          {
            salesOrderId: order.id,
            employeeId: params.cashierEmployeeId ?? params.employeeId,
          },
          context,
        );

        const qrCode = `INV:${invoice.invoiceNo}:${invoice.id}`;
        const barcode = invoice.invoiceNo;
        await this.invoiceService.issue(params.tenantId, invoice.id, {}, context);

        if (this.salesAccountingIntegrationService) {
          const cogsAmount = order.lines.reduce(
            (sum, line) => sum + Number(line.unitPrice) * line.quantity,
            0,
          );
          const primaryPayment = (params.payments?.[0]?.method ?? 'CASH') as PaymentMethod;
          const isCredit = !params.payments?.length;

          await this.salesAccountingIntegrationService.postSaleInvoice(
            params.tenantId,
            {
              invoiceId: invoice.id,
              branchId: params.branchId,
              customerId: params.customerId,
              totalAmount: Number(order.totalAmount),
              taxAmount: Number(order.taxAmount),
              cogsAmount,
              paymentMethod: primaryPayment,
              entryDate: new Date(),
              isCredit,
            },
            context,
          );
        }

        if (params.payments && params.payments.length > 0) {
          await this.paymentService.createBatch(
            params.tenantId,
            {
              invoiceId: invoice.id,
              branchId: params.branchId,
              employeeId: params.cashierEmployeeId ?? params.employeeId,
              payments: params.payments.map((p) => ({
                method: p.method as PaymentMethod,
                amount: p.amount,
                reference: p.reference,
              })),
            },
            context,
          );
        }

        if (params.loyaltyPointsToRedeem && params.loyaltyPointsToRedeem > 0) {
          await this.loyaltyService.redeem(
            params.tenantId,
            {
              customerId: params.customerId,
              points: params.loyaltyPointsToRedeem,
              referenceType: 'sales_order',
              referenceId: order.id,
            },
            context,
          );
        }

        if (params.completeSale !== false) {
          await this.salesOrderService.complete(params.tenantId, order.id, context);
          await this.loyaltyService.earnOnSale(
            params.tenantId,
            params.customerId,
            Number(order.totalAmount),
            { type: 'sales_order', id: order.id },
            context,
          );
        }

        for (const lockId of lockIds) {
          await this.lockEngine.release(params.tenantId, lockId);
        }

        await this.salesNotificationService.emit({
          tenantId: params.tenantId,
          branchId: params.branchId,
          eventType: 'SALE_COMPLETED',
          referenceType: 'sales_order',
          referenceId: order.id,
          title: 'Sale completed',
          body: `Order ${order.orderNo} completed`,
        });

        await this.salesNotificationService.emit({
          tenantId: params.tenantId,
          branchId: params.branchId,
          eventType: 'INVOICE_ISSUED',
          referenceType: 'invoice',
          referenceId: invoice.id,
          title: 'Invoice issued',
          body: `Invoice ${invoice.invoiceNo} issued`,
          payload: { qrCode, barcode },
        });

        return {
          order: await this.salesOrderService.getById(params.tenantId, order.id),
          invoice: await this.invoiceService.getById(params.tenantId, invoice.id),
        };
      });
    } catch (error) {
      for (const lockId of lockIds) {
        try {
          await this.lockEngine.release(params.tenantId, lockId);
        } catch {
          // best-effort rollback
        }
      }
      throw error;
    }
  }
}
