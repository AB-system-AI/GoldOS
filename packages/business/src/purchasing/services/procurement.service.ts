import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext } from '../../services/audit.service.js';
import type { PurchaseRequestService } from './purchase-request.service.js';
import type { PurchaseRfqService } from './purchase-rfq.service.js';
import type { SupplierQuotationService } from './supplier-quotation.service.js';
import type { PurchaseOrderService } from '../../accounting/services/purchase-order.service.js';
import type { GoodsReceiptService } from './goods-receipt.service.js';
import type { PurchaseInvoiceService } from './purchase-invoice.service.js';
import type { PurchaseRfqRepository } from '../repositories/purchase-rfq.repository.js';
import type { PurchaseOrderRepository } from '../../accounting/repositories/purchase-order.repository.js';

export class ProcurementService {
  constructor(
    private readonly purchaseRequestService: PurchaseRequestService,
    private readonly purchaseRfqService: PurchaseRfqService,
    private readonly supplierQuotationService: SupplierQuotationService,
    private readonly purchaseOrderService: PurchaseOrderService,
    private readonly goodsReceiptService: GoodsReceiptService,
    private readonly purchaseInvoiceService: PurchaseInvoiceService,
    private readonly purchaseRfqRepository: PurchaseRfqRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
  ) {}

  async getWorkflowStatus(tenantId: string, purchaseRequestId: string) {
    const [request, rfqs, orders] = await Promise.all([
      this.purchaseRequestService.getById(tenantId, purchaseRequestId),
      this.purchaseRfqRepository.list(tenantId, { purchaseRequestId }),
      this.purchaseOrderRepository.list(tenantId, { purchaseRequestId }),
    ]);

    return { purchaseRequest: request, rfqs, orders };
  }

  async convertRequestToRfq(
    tenantId: string,
    purchaseRequestId: string,
    input: {
      title: string;
      supplierIds?: string[];
      createdById?: string | null;
    },
    context?: AuditContext,
  ) {
    const request = await this.purchaseRequestService.getById(tenantId, purchaseRequestId);
    if (request.status !== 'APPROVED') {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Purchase request must be approved before converting to RFQ',
      );
    }
    const rfq = await this.purchaseRfqService.create(
      tenantId,
      {
        branchId: request.branchId,
        purchaseRequestId,
        title: input.title,
        createdById: input.createdById,
        supplierIds: input.supplierIds,
        lines: request.lines.map((line) => ({
          productId: line.productId,
          description: line.description,
          quantity: line.quantity,
          notes: line.notes,
        })),
      },
      context,
    );

    await this.purchaseRequestService.markConverted(tenantId, purchaseRequestId, context);

    return rfq;
  }

  async convertQuotationToPo(
    tenantId: string,
    supplierQuotationId: string,
    context?: AuditContext,
  ) {
    const quotation = await this.supplierQuotationService.getById(tenantId, supplierQuotationId);
    await this.supplierQuotationService.accept(tenantId, supplierQuotationId, context);

    let purchaseRequestId: string | null = null;
    if (quotation.purchaseRfqId) {
      const rfq = await this.purchaseRfqRepository.findById(tenantId, quotation.purchaseRfqId);
      purchaseRequestId = rfq?.purchaseRequestId ?? null;
    }

    return this.purchaseOrderService.create(
      tenantId,
      {
        branchId: quotation.branchId,
        supplierId: quotation.supplierId,
        purchaseRequestId,
        purchaseRfqId: quotation.purchaseRfqId,
        supplierQuotationId: quotation.id,
        lines: quotation.lines
          .filter((line): line is typeof line & { productId: string } => Boolean(line.productId))
          .map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            unitCost: Number(line.unitCost),
            notes: line.notes,
          })),
      },
      context,
    );
  }

  compareQuotations(tenantId: string, purchaseRfqId: string) {
    return this.supplierQuotationService.compareForRfq(tenantId, purchaseRfqId);
  }
}
