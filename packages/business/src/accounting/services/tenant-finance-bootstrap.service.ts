import type { ExpenseCategoryType } from '@goldos/database';

import type { AuditContext, AuditService } from '../../services/audit.service.js';
import type { ExpenseCategoryRepository } from '../repositories/expense.repository.js';
import type { ChartOfAccountService } from './chart-of-account.service.js';
import { logAccountingAudit } from './audit.helper.js';

const DEFAULT_EXPENSE_CATEGORIES: {
  code: string;
  name: string;
  categoryType: ExpenseCategoryType;
  accountCode: string;
}[] = [
  { code: 'RENT', name: 'Rent', categoryType: 'RENT', accountCode: '6100' },
  { code: 'SALARY', name: 'Salary', categoryType: 'SALARIES', accountCode: '6100' },
  { code: 'ELECTRICITY', name: 'Electricity', categoryType: 'ELECTRICITY', accountCode: '6100' },
  { code: 'INTERNET', name: 'Internet', categoryType: 'INTERNET', accountCode: '6100' },
  { code: 'TRANSPORT', name: 'Transport', categoryType: 'TRANSPORT', accountCode: '6100' },
  { code: 'MAINTENANCE', name: 'Maintenance', categoryType: 'MAINTENANCE', accountCode: '6100' },
  { code: 'MARKETING', name: 'Marketing', categoryType: 'MARKETING', accountCode: '6100' },
  { code: 'TAXES', name: 'Taxes', categoryType: 'TAXES', accountCode: '6100' },
  { code: 'INSURANCE', name: 'Insurance', categoryType: 'INSURANCE', accountCode: '6100' },
  { code: 'MISC', name: 'Miscellaneous', categoryType: 'MISCELLANEOUS', accountCode: '6100' },
];

export class TenantFinanceBootstrapService {
  constructor(
    private readonly chartOfAccountService: ChartOfAccountService,
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  async seedTenantFinance(tenantId: string, context?: AuditContext) {
    const accounts = await this.chartOfAccountService.seedDefaults(tenantId, context);
    const categories = await this.seedExpenseCategories(tenantId, context);

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'tenant_finance_bootstrap',
      entityId: tenantId,
      newValues: { accounts: accounts.length, categories: categories.length },
      context,
    });

    return { accounts, categories };
  }

  async seedExpenseCategories(tenantId: string, context?: AuditContext) {
    const created = [];

    for (const category of DEFAULT_EXPENSE_CATEGORIES) {
      const existing = await this.categoryRepository.list(tenantId, {
        categoryType: category.categoryType,
      });
      if (existing.some((row) => row.code === category.code)) {
        continue;
      }

      const account = await this.chartOfAccountService.getByCode(tenantId, category.accountCode);
      const row = await this.categoryRepository.create(tenantId, {
        code: category.code,
        name: category.name,
        categoryType: category.categoryType,
        isActive: true,
        ...(account ? { defaultAccount: { connect: { id: account.id } } } : {}),
      });
      created.push(row);
    }

    if (created.length > 0) {
      await logAccountingAudit(this.auditService, {
        tenantId,
        action: 'CREATE',
        entityType: 'expense_category_seed',
        entityId: tenantId,
        newValues: { count: created.length },
        context,
      });
    }

    return created;
  }
}
