import type { GoldKarat } from '@goldos/database';

import type { AuditContext } from '../../services/audit.service.js';
import type { InventoryItemService } from '../../inventory/services/inventory-item.service.js';
import type { GoldCostRepository } from '../../accounting/repositories/expense.repository.js';
import type { PurchaseAccountingIntegrationService } from '../../accounting/services/integration.service.js';
import type { PriceHistoryRepository } from '../../inventory/repositories/price-history.repository.js';

export interface ReceiptLineIntegrationInput {
  productId: string;
  branchId: string;
  warehouseZoneId?: string | null;
  supplierId: string;
  quantity: number;
  unitCost: number;
  weightGrams?: number | null;
  karat?: GoldKarat | null;
  goldRateAtPurchase?: number | null;
  performedById?: string | null;
  referenceType: string;
  referenceId: string;
}

export class PurchasingIntegrationService {
  constructor(
    private readonly inventoryItemService: InventoryItemService,
    private readonly goldCostRepository: GoldCostRepository,
    private readonly priceHistoryRepository: PriceHistoryRepository,
    private readonly purchaseAccountingIntegrationService?: PurchaseAccountingIntegrationService,
  ) {}

  async receiveLineToInventory(
    tenantId: string,
    line: ReceiptLineIntegrationInput,
    context?: AuditContext,
  ) {
    const items = [];
    for (let i = 0; i < line.quantity; i++) {
      const item = await this.inventoryItemService.receive(
        tenantId,
        {
          branchId: line.branchId,
          productId: line.productId,
          warehouseZoneId: line.warehouseZoneId,
          supplierId: line.supplierId,
          costPrice: line.unitCost,
          goldRateAtPurchase: line.goldRateAtPurchase,
          weightActual: line.weightGrams,
          performedById: line.performedById,
          metadata: {
            purchaseReferenceType: line.referenceType,
            purchaseReferenceId: line.referenceId,
          },
        },
        context,
      );

      if (!item) {
        continue;
      }

      await this.priceHistoryRepository.create(tenantId, {
        inventoryItem: { connect: { id: item.id } },
        priceType: 'PURCHASE_COST',
        amount: line.unitCost,
        currency: 'SAR',
        reason: 'Purchase receipt',
        ...(line.performedById ? { changedBy: { connect: { id: line.performedById } } } : {}),
      });

      if (line.weightGrams && line.karat) {
        await this.goldCostRepository.create(tenantId, {
          referenceType: line.referenceType,
          referenceId: line.referenceId,
          weightGrams: line.weightGrams,
          karat: line.karat,
          purchaseCost: line.unitCost,
          totalCost: line.unitCost,
          inventoryItem: { connect: { id: item.id } },
          product: { connect: { id: line.productId } },
        });
      }

      items.push(item);
    }
    return items;
  }

  async postGoodsReceiptAccounting(
    tenantId: string,
    params: {
      goodsReceiptId: string;
      supplierId: string;
      branchId: string;
      totalAmount: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    if (!this.purchaseAccountingIntegrationService) return null;
    return this.purchaseAccountingIntegrationService.postGoodsReceipt(tenantId, params, context);
  }

  async postPurchaseInvoiceAccounting(
    tenantId: string,
    params: {
      purchaseInvoiceId: string;
      supplierId: string;
      branchId: string;
      totalAmount: number;
      taxAmount?: number;
      entryDate: Date;
      linkedToGrn?: boolean;
    },
    context?: AuditContext,
  ) {
    if (!this.purchaseAccountingIntegrationService) return null;
    return this.purchaseAccountingIntegrationService.postPurchaseInvoice(tenantId, params, context);
  }

  async postPurchaseReturnAccounting(
    tenantId: string,
    params: {
      purchaseReturnId: string;
      supplierId: string;
      branchId: string;
      totalAmount: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    if (!this.purchaseAccountingIntegrationService) return null;
    return this.purchaseAccountingIntegrationService.postPurchaseReturn(tenantId, params, context);
  }

  async postSupplierPaymentAccounting(
    tenantId: string,
    params: {
      paymentId: string;
      supplierId: string;
      branchId?: string | null;
      amount: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    if (!this.purchaseAccountingIntegrationService) return null;
    return this.purchaseAccountingIntegrationService.postSupplierPayment(tenantId, params, context);
  }
}
