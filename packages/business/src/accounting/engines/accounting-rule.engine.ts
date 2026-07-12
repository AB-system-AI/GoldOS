import type { AccountingReferenceType } from '@goldos/database';

export interface AccountingRuleLine {
  accountCode: string;
  debit?: number;
  credit?: number;
  description?: string;
}

export interface AccountingRuleResult {
  referenceType: AccountingReferenceType;
  description: string;
  lines: AccountingRuleLine[];
}

export function buildSalesInvoiceRule(params: {
  totalAmount: number;
  taxAmount: number;
  cogsAmount: number;
  paymentMethod: 'CASH' | 'CARD' | 'BANK' | 'CREDIT';
  revenueAccountCode?: string;
  cogsAccountCode?: string;
  inventoryAccountCode?: string;
  taxAccountCode?: string;
  cashAccountCode?: string;
  arAccountCode?: string;
}): AccountingRuleResult {
  const revenue = params.totalAmount - params.taxAmount;
  const lines: AccountingRuleLine[] = [];

  if (params.paymentMethod === 'CREDIT') {
    lines.push({
      accountCode: params.arAccountCode ?? '1200',
      debit: params.totalAmount,
      description: 'Accounts receivable',
    });
  } else {
    const cashCode =
      params.paymentMethod === 'BANK'
        ? '1110'
        : params.paymentMethod === 'CARD'
          ? '1120'
          : (params.cashAccountCode ?? '1100');
    lines.push({
      accountCode: cashCode,
      debit: params.totalAmount,
      description: 'Payment received',
    });
  }

  lines.push({
    accountCode: params.revenueAccountCode ?? '4100',
    credit: revenue,
    description: 'Sales revenue',
  });

  if (params.taxAmount > 0) {
    lines.push({
      accountCode: params.taxAccountCode ?? '2300',
      credit: params.taxAmount,
      description: 'VAT payable',
    });
  }

  if (params.cogsAmount > 0) {
    lines.push(
      {
        accountCode: params.cogsAccountCode ?? '5100',
        debit: params.cogsAmount,
        description: 'Cost of goods sold',
      },
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        credit: params.cogsAmount,
        description: 'Inventory reduction',
      },
    );
  }

  return {
    referenceType: 'SALES_INVOICE',
    description: 'Sales invoice posting',
    lines,
  };
}

export function buildPurchaseRule(params: {
  totalAmount: number;
  inventoryAccountCode?: string;
  payableAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'PURCHASE_ORDER',
    description: 'Purchase order posting',
    lines: [
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        debit: params.totalAmount,
        description: 'Inventory received',
      },
      {
        accountCode: params.payableAccountCode ?? '2100',
        credit: params.totalAmount,
        description: 'Supplier payable',
      },
    ],
  };
}

export function buildSupplierPaymentRule(params: {
  amount: number;
  payableAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'PAYMENT',
    description: 'Supplier payment',
    lines: [
      {
        accountCode: params.payableAccountCode ?? '2100',
        debit: params.amount,
        description: 'Reduce supplier payable',
      },
      {
        accountCode: params.cashAccountCode ?? '1100',
        credit: params.amount,
        description: 'Cash/bank payment',
      },
    ],
  };
}

export function buildBuybackRule(params: {
  amount: number;
  inventoryAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'BUYBACK',
    description: 'Gold buyback posting',
    lines: [
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        debit: params.amount,
        description: 'Inventory from buyback',
      },
      {
        accountCode: params.cashAccountCode ?? '1100',
        credit: params.amount,
        description: 'Cash paid to customer',
      },
    ],
  };
}

export function buildExpenseRule(params: {
  amount: number;
  expenseAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'EXPENSE',
    description: 'Expense posting',
    lines: [
      {
        accountCode: params.expenseAccountCode ?? '6100',
        debit: params.amount,
        description: 'Expense recognized',
      },
      {
        accountCode: params.cashAccountCode ?? '1100',
        credit: params.amount,
        description: 'Cash payment',
      },
    ],
  };
}

export function buildCustomerPaymentRule(params: {
  amount: number;
  cashAccountCode?: string;
  arAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'PAYMENT',
    description: 'Customer payment',
    lines: [
      {
        accountCode: params.cashAccountCode ?? '1100',
        debit: params.amount,
        description: 'Payment received',
      },
      {
        accountCode: params.arAccountCode ?? '1200',
        credit: params.amount,
        description: 'Reduce receivable',
      },
    ],
  };
}

export function buildSalesReturnRule(params: {
  refundAmount: number;
  revenueAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'SALES_RETURN',
    description: 'Sales return posting',
    lines: [
      {
        accountCode: params.revenueAccountCode ?? '4100',
        debit: params.refundAmount,
        description: 'Revenue reversal',
      },
      {
        accountCode: params.cashAccountCode ?? '1100',
        credit: params.refundAmount,
        description: 'Refund paid',
      },
    ],
  };
}

export function buildSalesReturnFullRule(params: {
  refundAmount: number;
  taxAmount: number;
  cogsAmount: number;
  revenueAccountCode?: string;
  taxAccountCode?: string;
  cogsAccountCode?: string;
  inventoryAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  const revenue = params.refundAmount - params.taxAmount;
  const lines: AccountingRuleLine[] = [
    {
      accountCode: params.revenueAccountCode ?? '4100',
      debit: revenue,
      description: 'Revenue reversal',
    },
    {
      accountCode: params.cashAccountCode ?? '1100',
      credit: params.refundAmount,
      description: 'Refund paid',
    },
  ];

  if (params.taxAmount > 0) {
    lines.push({
      accountCode: params.taxAccountCode ?? '2300',
      debit: params.taxAmount,
      description: 'Tax reversal',
    });
  }

  if (params.cogsAmount > 0) {
    lines.push(
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        debit: params.cogsAmount,
        description: 'Inventory restored',
      },
      {
        accountCode: params.cogsAccountCode ?? '5100',
        credit: params.cogsAmount,
        description: 'COGS reversal',
      },
    );
  }

  return {
    referenceType: 'SALES_RETURN',
    description: 'Sales return with tax and COGS reversal',
    lines,
  };
}

export function buildExchangeRule(params: {
  returnAmount: number;
  newSaleAmount: number;
  taxAmount?: number;
  cogsAmount?: number;
  priceDifference: number;
  paymentMethod?: 'CASH' | 'CARD' | 'BANK' | 'CREDIT';
}): AccountingRuleResult {
  const lines: AccountingRuleLine[] = [];
  const tax = params.taxAmount ?? 0;
  const cogs = params.cogsAmount ?? 0;
  const newRevenue = params.newSaleAmount - tax;

  if (params.returnAmount > 0) {
    lines.push(
      {
        accountCode: '4100',
        debit: params.returnAmount,
        description: 'Exchange return revenue reversal',
      },
      {
        accountCode: '1300',
        debit: cogs,
        description: 'Inventory restored from exchange return',
      },
      {
        accountCode: '5100',
        credit: cogs,
        description: 'COGS reversal on exchange return',
      },
    );
  }

  if (params.newSaleAmount > 0) {
    const cashCode =
      params.paymentMethod === 'BANK' ? '1110' : params.paymentMethod === 'CARD' ? '1120' : '1100';
    if (params.priceDifference > 0 && params.paymentMethod !== 'CREDIT') {
      lines.push({
        accountCode: cashCode,
        debit: params.priceDifference,
        description: 'Additional payment on exchange',
      });
    }
    lines.push(
      { accountCode: '4100', credit: newRevenue, description: 'Exchange new sale revenue' },
      { accountCode: '5100', debit: cogs, description: 'COGS on exchange sale' },
      { accountCode: '1300', credit: cogs, description: 'Inventory reduction on exchange sale' },
    );
    if (tax > 0) {
      lines.push({ accountCode: '2300', credit: tax, description: 'VAT on exchange sale' });
    }
    if (params.priceDifference < 0) {
      lines.push({
        accountCode: cashCode,
        credit: Math.abs(params.priceDifference),
        description: 'Refund on exchange',
      });
    }
  }

  return {
    referenceType: 'SALES_EXCHANGE',
    description: 'Sales exchange posting',
    lines,
  };
}

export function buildInventoryAdjustmentRule(params: {
  amount: number;
  isIncrease: boolean;
  lossAccountCode?: string;
  inventoryAccountCode?: string;
}): AccountingRuleResult {
  if (params.isIncrease) {
    return {
      referenceType: 'INVENTORY_ADJUSTMENT',
      description: 'Inventory increase adjustment',
      lines: [
        {
          accountCode: params.inventoryAccountCode ?? '1300',
          debit: params.amount,
          description: 'Inventory increase',
        },
        {
          accountCode: params.lossAccountCode ?? '5200',
          credit: params.amount,
          description: 'Adjustment gain',
        },
      ],
    };
  }

  return {
    referenceType: 'INVENTORY_ADJUSTMENT',
    description: 'Inventory decrease adjustment',
    lines: [
      {
        accountCode: params.lossAccountCode ?? '5200',
        debit: params.amount,
        description: 'Inventory loss/expense',
      },
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        credit: params.amount,
        description: 'Inventory reduction',
      },
    ],
  };
}

export function buildGoldRevaluationRule(params: {
  adjustmentAmount: number;
  isIncrease: boolean;
  inventoryAccountCode?: string;
  revaluationAccountCode?: string;
}): AccountingRuleResult {
  const abs = Math.abs(params.adjustmentAmount);
  const lines: AccountingRuleLine[] = params.isIncrease
    ? [
        {
          accountCode: params.inventoryAccountCode ?? '1300',
          debit: abs,
          description: 'Gold inventory revaluation increase',
        },
        {
          accountCode: params.revaluationAccountCode ?? '4200',
          credit: abs,
          description: 'Revaluation gain',
        },
      ]
    : [
        {
          accountCode: params.revaluationAccountCode ?? '5200',
          debit: abs,
          description: 'Revaluation loss',
        },
        {
          accountCode: params.inventoryAccountCode ?? '1300',
          credit: abs,
          description: 'Gold inventory revaluation decrease',
        },
      ];

  return {
    referenceType: 'GOLD_PRICE_ADJUSTMENT',
    description: 'Gold price revaluation',
    lines,
  };
}

export function buildCashMovementRule(params: {
  amount: number;
  movementType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'SHORTAGE' | 'OVERAGE';
  cashAccountCode?: string;
  offsetAccountCode?: string;
}): AccountingRuleResult {
  const cash = params.cashAccountCode ?? '1100';
  const offset = params.offsetAccountCode ?? '3100';

  if (params.movementType === 'DEPOSIT' || params.movementType === 'OVERAGE') {
    return {
      referenceType: 'CASH_MOVEMENT',
      description: `Cash ${params.movementType.toLowerCase()}`,
      lines: [
        { accountCode: cash, debit: params.amount, description: 'Cash increase' },
        { accountCode: offset, credit: params.amount, description: 'Cash offset' },
      ],
    };
  }

  return {
    referenceType: 'CASH_MOVEMENT',
    description: `Cash ${params.movementType.toLowerCase()}`,
    lines: [
      { accountCode: offset, debit: params.amount, description: 'Cash offset' },
      { accountCode: cash, credit: params.amount, description: 'Cash decrease' },
    ],
  };
}

export function buildBankTransactionRule(params: {
  amount: number;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  bankAccountCode?: string;
  cashAccountCode?: string;
}): AccountingRuleResult {
  const bank = params.bankAccountCode ?? '1110';
  const cash = params.cashAccountCode ?? '1100';

  if (params.transactionType === 'DEPOSIT') {
    return {
      referenceType: 'BANK_TRANSACTION',
      description: 'Bank deposit',
      lines: [
        { accountCode: bank, debit: params.amount, description: 'Bank deposit' },
        { accountCode: cash, credit: params.amount, description: 'Cash to bank' },
      ],
    };
  }

  if (params.transactionType === 'WITHDRAWAL') {
    return {
      referenceType: 'BANK_TRANSACTION',
      description: 'Bank withdrawal',
      lines: [
        { accountCode: cash, debit: params.amount, description: 'Cash from bank' },
        { accountCode: bank, credit: params.amount, description: 'Bank withdrawal' },
      ],
    };
  }

  return {
    referenceType: 'BANK_TRANSACTION',
    description: 'Bank transfer',
    lines: [
      { accountCode: bank, debit: params.amount, description: 'Bank transfer in' },
      { accountCode: cash, credit: params.amount, description: 'Bank transfer out' },
    ],
  };
}

export function buildManufacturingCompletionRule(params: {
  wipAmount: number;
  finishedGoodsAmount: number;
  wipAccountCode?: string;
  finishedGoodsAccountCode?: string;
}): AccountingRuleResult {
  return {
    referenceType: 'MANUFACTURING_ORDER',
    description: 'Manufacturing completion',
    lines: [
      {
        accountCode: params.finishedGoodsAccountCode ?? '1320',
        debit: params.finishedGoodsAmount,
        description: 'Finished goods produced',
      },
      {
        accountCode: params.wipAccountCode ?? '1310',
        credit: params.wipAmount,
        description: 'WIP consumed',
      },
    ],
  };
}

export function buildRepairCompletionRule(params: {
  revenueAmount: number;
  laborCost: number;
  partsCost: number;
  cashAccountCode?: string;
  revenueAccountCode?: string;
  expenseAccountCode?: string;
  inventoryAccountCode?: string;
  cogsAccountCode?: string;
}): AccountingRuleResult {
  const lines: AccountingRuleLine[] = [
    {
      accountCode: params.cashAccountCode ?? '1100',
      debit: params.revenueAmount,
      description: 'Repair payment received',
    },
    {
      accountCode: params.revenueAccountCode ?? '4200',
      credit: params.revenueAmount,
      description: 'Repair revenue',
    },
  ];

  if (params.partsCost > 0) {
    lines.push(
      {
        accountCode: params.cogsAccountCode ?? '5100',
        debit: params.partsCost,
        description: 'Repair parts cost',
      },
      {
        accountCode: params.inventoryAccountCode ?? '1300',
        credit: params.partsCost,
        description: 'Parts inventory used',
      },
    );
  }

  if (params.laborCost > 0) {
    lines.push(
      {
        accountCode: params.expenseAccountCode ?? '6100',
        debit: params.laborCost,
        description: 'Repair labor cost',
      },
      {
        accountCode: params.revenueAccountCode ?? '4200',
        credit: params.laborCost,
        description: 'Labor offset against revenue',
      },
    );
  }

  return {
    referenceType: 'REPAIR_ORDER',
    description: 'Repair order completion',
    lines,
  };
}
