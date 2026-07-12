import { z } from 'zod';

import type { AccountType } from '@goldos/database';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { defaultNormalBalance } from '../engines/balance.engine.js';
import type { ChartOfAccountRepository } from '../repositories/chart-of-account.repository.js';
import { logAccountingAudit } from './audit.helper.js';

const DEFAULT_ACCOUNTS: {
  code: string;
  name: string;
  accountType: AccountType;
  isSystem: boolean;
  isDefault: boolean;
}[] = [
  { code: '1100', name: 'Cash on Hand', accountType: 'ASSET', isSystem: true, isDefault: true },
  { code: '1110', name: 'Bank Account', accountType: 'ASSET', isSystem: true, isDefault: true },
  { code: '1120', name: 'Card Receivables', accountType: 'ASSET', isSystem: true, isDefault: true },
  {
    code: '1200',
    name: 'Accounts Receivable',
    accountType: 'ASSET',
    isSystem: true,
    isDefault: true,
  },
  { code: '1300', name: 'Inventory - Gold', accountType: 'ASSET', isSystem: true, isDefault: true },
  { code: '1310', name: 'Work in Progress', accountType: 'ASSET', isSystem: true, isDefault: true },
  { code: '1320', name: 'Finished Goods', accountType: 'ASSET', isSystem: true, isDefault: true },
  {
    code: '2100',
    name: 'Accounts Payable',
    accountType: 'LIABILITY',
    isSystem: true,
    isDefault: true,
  },
  { code: '2300', name: 'VAT Payable', accountType: 'LIABILITY', isSystem: true, isDefault: true },
  { code: '3100', name: 'Owner Equity', accountType: 'EQUITY', isSystem: true, isDefault: true },
  { code: '4100', name: 'Sales Revenue', accountType: 'REVENUE', isSystem: true, isDefault: true },
  {
    code: '4200',
    name: 'Making Charges Revenue',
    accountType: 'REVENUE',
    isSystem: true,
    isDefault: true,
  },
  {
    code: '5100',
    name: 'Cost of Goods Sold',
    accountType: 'COGS',
    isSystem: true,
    isDefault: true,
  },
  {
    code: '5200',
    name: 'Inventory Loss & Write-off',
    accountType: 'EXPENSE',
    isSystem: true,
    isDefault: true,
  },
  {
    code: '6100',
    name: 'Operating Expenses',
    accountType: 'EXPENSE',
    isSystem: true,
    isDefault: true,
  },
];

const createSchema = z.object({
  code: z.string().min(2).max(30),
  name: z.string().min(2).max(150),
  accountType: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COGS']),
  branchId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  normalBalance: z.enum(['DEBIT', 'CREDIT']).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial().omit({ code: true });

export class ChartOfAccountService {
  constructor(
    private readonly repository: ChartOfAccountRepository,
    private readonly auditService: AuditService,
  ) {}

  list(tenantId: string, filters?: Parameters<ChartOfAccountRepository['list']>[1]) {
    return this.repository.list(tenantId, filters);
  }

  getById(tenantId: string, id: string) {
    return this.repository.findById(tenantId, id);
  }

  getByCode(tenantId: string, code: string) {
    return this.repository.findByCode(tenantId, code);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createSchema, input);
    const existing = await this.repository.findByCode(tenantId, data.code);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Account code already exists');
    }

    const account = await this.repository.create(tenantId, {
      code: data.code,
      name: data.name,
      accountType: data.accountType,
      normalBalance: data.normalBalance ?? defaultNormalBalance(data.accountType),
      isActive: data.isActive ?? true,
      description: data.description,
      ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
      ...(data.parentId ? { parent: { connect: { id: data.parentId } } } : {}),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'chart_of_account',
      entityId: account.id,
      newValues: account,
      context,
    });

    return account;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(this.repository.findById(tenantId, id), 'Account not found');
    if (existing.isSystem) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'System accounts cannot be modified');
    }

    const data = parseInput(updateSchema, input);
    const account = await this.repository.update(tenantId, id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.accountType !== undefined ? { accountType: data.accountType } : {}),
      ...(data.normalBalance !== undefined ? { normalBalance: data.normalBalance } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.branchId !== undefined
        ? data.branchId
          ? { branch: { connect: { id: data.branchId } } }
          : { branch: { disconnect: true } }
        : {}),
      ...(data.parentId !== undefined
        ? data.parentId
          ? { parent: { connect: { id: data.parentId } } }
          : { parent: { disconnect: true } }
        : {}),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'UPDATE',
      entityType: 'chart_of_account',
      entityId: id,
      oldValues: existing,
      newValues: account,
      context,
    });

    return account;
  }

  async seedDefaults(tenantId: string, context?: AuditContext) {
    const created = [];
    for (const account of DEFAULT_ACCOUNTS) {
      const existing = await this.repository.findByCode(tenantId, account.code);
      if (!existing) {
        const row = await this.repository.create(tenantId, {
          code: account.code,
          name: account.name,
          accountType: account.accountType,
          normalBalance: defaultNormalBalance(account.accountType),
          isSystem: account.isSystem,
          isDefault: account.isDefault,
          isActive: true,
        });
        created.push(row);
      }
    }

    if (created.length > 0) {
      await logAccountingAudit(this.auditService, {
        tenantId,
        action: 'CREATE',
        entityType: 'chart_of_account_seed',
        entityId: tenantId,
        newValues: { count: created.length },
        context,
      });
    }

    return created;
  }
}
