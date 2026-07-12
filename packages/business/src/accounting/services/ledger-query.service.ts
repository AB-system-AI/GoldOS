import type { CustomerLedgerService, SupplierLedgerService } from './ledger.service.js';
import type { FinancialReportService } from '../reports/financial-report.service.js';

export class LedgerQueryService {
  constructor(
    private readonly financialReportService: FinancialReportService,
    private readonly customerLedgerService: CustomerLedgerService,
    private readonly supplierLedgerService: SupplierLedgerService,
  ) {}

  async query(
    tenantId: string,
    params: {
      type: 'general-ledger' | 'account-statement' | 'customer-ledger' | 'supplier-ledger';
      accountId?: string;
      customerId?: string;
      supplierId?: string;
      branchId?: string;
      fromDate?: Date;
      toDate?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    const pagination = { skip: params.skip ?? 0, take: params.take ?? 100 };

    switch (params.type) {
      case 'general-ledger': {
        if (!params.accountId) {
          throw new Error('accountId is required for general-ledger');
        }
        const report = await this.financialReportService.generalLedger(tenantId, params.accountId, {
          fromDate: params.fromDate,
          toDate: params.toDate,
        });
        const skip = pagination.skip;
        const take = pagination.take;
        const lines = report.lines.slice(skip, skip + take);
        return {
          type: params.type,
          exportReady: true,
          pagination: { skip, take, total: report.lines.length },
          data: { account: report.account, lines },
        };
      }
      case 'account-statement': {
        if (!params.accountId) {
          throw new Error('accountId is required for account-statement');
        }
        const report = await this.financialReportService.accountStatement(
          tenantId,
          params.accountId,
        );
        return { type: params.type, exportReady: true, pagination: null, data: report };
      }
      case 'customer-ledger': {
        if (!params.customerId) {
          throw new Error('customerId is required for customer-ledger');
        }
        const [statement, entries] = await Promise.all([
          this.customerLedgerService.getStatement(tenantId, params.customerId),
          this.customerLedgerService.list(tenantId, params.customerId, {
            branchId: params.branchId,
            ...pagination,
          }),
        ]);
        return { type: params.type, exportReady: true, pagination, data: { statement, entries } };
      }
      case 'supplier-ledger': {
        if (!params.supplierId) {
          throw new Error('supplierId is required for supplier-ledger');
        }
        const [statement, entries] = await Promise.all([
          this.supplierLedgerService.getStatement(tenantId, params.supplierId),
          this.supplierLedgerService.list(tenantId, params.supplierId, pagination),
        ]);
        return { type: params.type, exportReady: true, pagination, data: { statement, entries } };
      }
      default:
        throw new Error('Unsupported ledger type');
    }
  }
}
