import type { PaymentMethod } from '@goldos/database';

import type { AuditContext } from '../../services/audit.service.js';
import {
  buildBuybackRule,
  buildCustomerPaymentRule,
  buildExchangeRule,
  buildPurchaseRule,
  buildSalesInvoiceRule,
  buildSalesReturnFullRule,
  buildSalesReturnRule,
  buildSupplierPaymentRule,
} from '../engines/accounting-rule.engine.js';
import type { GoldCostRepository } from '../repositories/expense.repository.js';
import type { AccountingPostingService } from './accounting-posting.service.js';
import type { CustomerLedgerService, SupplierLedgerService } from './ledger.service.js';

function mapPaymentMethod(method: PaymentMethod): 'CASH' | 'CARD' | 'BANK' | 'CREDIT' {
  switch (method) {
    case 'CARD':
      return 'CARD';
    case 'BANK_TRANSFER':
    case 'CHEQUE':
      return 'BANK';
    case 'CASH':
      return 'CASH';
    default:
      return 'CASH';
  }
}

export class SalesAccountingIntegrationService {
  constructor(
    private readonly postingService: AccountingPostingService,
    private readonly customerLedgerService: CustomerLedgerService,
    private readonly goldCostRepository: GoldCostRepository,
  ) {}

  async postSaleInvoice(
    tenantId: string,
    params: {
      invoiceId: string;
      branchId: string;
      customerId?: string | null;
      totalAmount: number;
      taxAmount: number;
      cogsAmount: number;
      paymentMethod: PaymentMethod;
      entryDate: Date;
      isCredit?: boolean;
    },
    context?: AuditContext,
  ) {
    const rule = buildSalesInvoiceRule({
      totalAmount: params.totalAmount,
      taxAmount: params.taxAmount,
      cogsAmount: params.cogsAmount,
      paymentMethod: params.isCredit ? 'CREDIT' : mapPaymentMethod(params.paymentMethod),
    });

    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'SALES_INVOICE',
        referenceId: params.invoiceId,
        rule,
        customerId: params.customerId,
      },
      context,
    );

    if (params.customerId && params.isCredit) {
      await this.customerLedgerService.recordEntry(
        tenantId,
        {
          customerId: params.customerId,
          branchId: params.branchId,
          entryType: 'INVOICE',
          referenceType: 'invoice',
          referenceId: params.invoiceId,
          debit: params.totalAmount,
          credit: 0,
          entryDate: params.entryDate,
          journalEntryId: journal.id,
          description: 'Sales invoice',
        },
        context,
      );
    }

    return journal;
  }

  async postCustomerPayment(
    tenantId: string,
    params: {
      paymentId: string;
      customerId: string;
      branchId?: string | null;
      amount: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildCustomerPaymentRule({ amount: params.amount });
    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'PAYMENT',
        referenceId: params.paymentId,
        rule,
        customerId: params.customerId,
      },
      context,
    );

    await this.customerLedgerService.recordEntry(
      tenantId,
      {
        customerId: params.customerId,
        branchId: params.branchId,
        entryType: 'PAYMENT',
        referenceType: 'payment',
        referenceId: params.paymentId,
        debit: 0,
        credit: params.amount,
        entryDate: params.entryDate,
        journalEntryId: journal.id,
        description: 'Customer payment',
      },
      context,
    );

    return journal;
  }

  async postSalesReturn(
    tenantId: string,
    params: {
      returnId: string;
      branchId: string;
      customerId: string;
      refundAmount: number;
      taxAmount?: number;
      cogsAmount?: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule =
      (params.taxAmount ?? 0) > 0 || (params.cogsAmount ?? 0) > 0
        ? buildSalesReturnFullRule({
            refundAmount: params.refundAmount,
            taxAmount: params.taxAmount ?? 0,
            cogsAmount: params.cogsAmount ?? 0,
          })
        : buildSalesReturnRule({ refundAmount: params.refundAmount });
    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'SALES_RETURN',
        referenceId: params.returnId,
        rule,
        customerId: params.customerId,
      },
      context,
    );

    await this.customerLedgerService.recordEntry(
      tenantId,
      {
        customerId: params.customerId,
        branchId: params.branchId,
        entryType: 'REFUND',
        referenceType: 'sales_return',
        referenceId: params.returnId,
        debit: 0,
        credit: params.refundAmount,
        entryDate: params.entryDate,
        journalEntryId: journal.id,
        description: 'Sales return refund',
      },
      context,
    );

    return journal;
  }

  async postBuyback(
    tenantId: string,
    params: {
      buybackId: string;
      branchId: string;
      customerId: string;
      amount: number;
      entryDate: Date;
      goldCost?: {
        inventoryItemId?: string | null;
        productId?: string | null;
        weightGrams: number;
        karat: string;
        purity?: number | null;
        purchaseCost: number;
        makingCost?: number;
        stoneCost?: number;
        laborCost?: number;
      };
    },
    context?: AuditContext,
  ) {
    const rule = buildBuybackRule({ amount: params.amount });
    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'BUYBACK',
        referenceId: params.buybackId,
        rule,
        customerId: params.customerId,
      },
      context,
    );

    if (params.goldCost) {
      const totalCost =
        params.goldCost.purchaseCost +
        (params.goldCost.makingCost ?? 0) +
        (params.goldCost.stoneCost ?? 0) +
        (params.goldCost.laborCost ?? 0);

      await this.goldCostRepository.create(tenantId, {
        referenceType: 'buyback',
        referenceId: params.buybackId,
        weightGrams: params.goldCost.weightGrams,
        karat: params.goldCost.karat as never,
        purity: params.goldCost.purity,
        purchaseCost: params.goldCost.purchaseCost,
        makingCost: params.goldCost.makingCost ?? 0,
        stoneCost: params.goldCost.stoneCost ?? 0,
        laborCost: params.goldCost.laborCost ?? 0,
        totalCost,
        ...(params.goldCost.inventoryItemId
          ? { inventoryItem: { connect: { id: params.goldCost.inventoryItemId } } }
          : {}),
        ...(params.goldCost.productId
          ? { product: { connect: { id: params.goldCost.productId } } }
          : {}),
      });
    }

    return journal;
  }

  async postExchange(
    tenantId: string,
    params: {
      exchangeId: string;
      branchId: string;
      customerId: string;
      returnAmount: number;
      newSaleAmount: number;
      priceDifference: number;
      taxAmount?: number;
      cogsAmount?: number;
      paymentMethod?: 'CASH' | 'CARD' | 'BANK' | 'CREDIT';
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildExchangeRule({
      returnAmount: params.returnAmount,
      newSaleAmount: params.newSaleAmount,
      priceDifference: params.priceDifference,
      taxAmount: params.taxAmount,
      cogsAmount: params.cogsAmount,
      paymentMethod: params.paymentMethod,
    });

    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'SALES_EXCHANGE',
        referenceId: params.exchangeId,
        rule,
        customerId: params.customerId,
      },
      context,
    );

    if (params.priceDifference > 0) {
      await this.customerLedgerService.recordEntry(
        tenantId,
        {
          customerId: params.customerId,
          branchId: params.branchId,
          entryType: 'INVOICE',
          referenceType: 'sales_exchange',
          referenceId: params.exchangeId,
          debit: params.priceDifference,
          credit: 0,
          entryDate: params.entryDate,
          journalEntryId: journal.id,
          description: 'Exchange additional charge',
        },
        context,
      );
    } else if (params.priceDifference < 0) {
      await this.customerLedgerService.recordEntry(
        tenantId,
        {
          customerId: params.customerId,
          branchId: params.branchId,
          entryType: 'REFUND',
          referenceType: 'sales_exchange',
          referenceId: params.exchangeId,
          debit: 0,
          credit: Math.abs(params.priceDifference),
          entryDate: params.entryDate,
          journalEntryId: journal.id,
          description: 'Exchange refund',
        },
        context,
      );
    }

    return journal;
  }
}

export class PurchaseAccountingIntegrationService {
  constructor(
    private readonly postingService: AccountingPostingService,
    private readonly supplierLedgerService: SupplierLedgerService,
  ) {}

  async postPurchaseOrder(
    tenantId: string,
    params: {
      purchaseOrderId: string;
      supplierId: string;
      branchId: string;
      totalAmount: number;
      entryDate: Date;
    },
    context?: AuditContext,
  ) {
    const rule = buildPurchaseRule({ totalAmount: params.totalAmount });
    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'PURCHASE_ORDER',
        referenceId: params.purchaseOrderId,
        rule,
        supplierId: params.supplierId,
      },
      context,
    );

    await this.supplierLedgerService.recordEntry(tenantId, {
      supplierId: params.supplierId,
      branchId: params.branchId,
      entryType: 'PURCHASE',
      referenceType: 'purchase_order',
      referenceId: params.purchaseOrderId,
      debit: params.totalAmount,
      credit: 0,
      entryDate: params.entryDate,
      journalEntryId: journal.id,
      description: 'Supplier purchase',
    });

    return journal;
  }

  async postSupplierPayment(
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
    const rule = buildSupplierPaymentRule({ amount: params.amount });
    const journal = await this.postingService.postFromRule(
      tenantId,
      {
        branchId: params.branchId,
        entryDate: params.entryDate,
        referenceType: 'PAYMENT',
        referenceId: params.paymentId,
        rule,
        supplierId: params.supplierId,
      },
      context,
    );

    await this.supplierLedgerService.recordEntry(tenantId, {
      supplierId: params.supplierId,
      branchId: params.branchId,
      entryType: 'SUPPLIER_PAYMENT',
      referenceType: 'supplier_payment',
      referenceId: params.paymentId,
      debit: 0,
      credit: params.amount,
      entryDate: params.entryDate,
      journalEntryId: journal.id,
      description: 'Supplier payment',
    });

    return journal;
  }
}
