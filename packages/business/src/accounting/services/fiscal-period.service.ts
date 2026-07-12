import { z } from 'zod';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import { canClosePeriod, canReopenPeriod } from '../engines/financial-period.engine.js';
import type {
  AccountingPeriodRepository,
  FiscalYearRepository,
} from '../repositories/fiscal-period.repository.js';
import type { JournalEntryRepository } from '../repositories/journal-entry.repository.js';
import { logAccountingAudit } from './audit.helper.js';

const fiscalYearSchema = z.object({
  name: z.string().min(2).max(50),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().optional(),
});

const periodSchema = z.object({
  fiscalYearId: z.string().uuid(),
  name: z.string().min(2).max(50),
  periodNo: z.number().int().min(1).max(12),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export class FiscalPeriodService {
  constructor(
    private readonly fiscalYearRepository: FiscalYearRepository,
    private readonly periodRepository: AccountingPeriodRepository,
    private readonly journalRepository: JournalEntryRepository,
    private readonly auditService: AuditService,
  ) {}

  listFiscalYears(tenantId: string) {
    return this.fiscalYearRepository.list(tenantId);
  }

  getCurrentFiscalYear(tenantId: string) {
    return this.fiscalYearRepository.findCurrent(tenantId);
  }

  async createFiscalYear(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(fiscalYearSchema, input);
    const year = await this.fiscalYearRepository.create(tenantId, {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      isCurrent: data.isCurrent ?? false,
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'fiscal_year',
      entityId: year.id,
      newValues: year,
      context,
    });

    return year;
  }

  listPeriods(tenantId: string, fiscalYearId?: string) {
    return this.periodRepository.list(tenantId, { fiscalYearId });
  }

  async createPeriod(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(periodSchema, input);
    const period = await this.periodRepository.create(tenantId, {
      name: data.name,
      periodNo: data.periodNo,
      startDate: data.startDate,
      endDate: data.endDate,
      fiscalYear: { connect: { id: data.fiscalYearId } },
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'accounting_period',
      entityId: period.id,
      newValues: period,
      context,
    });

    return period;
  }

  async closePeriod(tenantId: string, periodId: string, context?: AuditContext) {
    const period = await assertFound(
      this.periodRepository.findById(tenantId, periodId),
      'Period not found',
    );

    const draftCount = await this.journalRepository.countByPeriodAndStatus(
      tenantId,
      periodId,
      'DRAFT',
    );

    const check = canClosePeriod({ status: period.status, draftJournalCount: draftCount });
    if (!check.allowed) {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, check.reason ?? 'Cannot close period');
    }

    const closed = await this.periodRepository.update(tenantId, periodId, {
      status: 'CLOSED',
      closedAt: new Date(),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'APPROVE',
      entityType: 'accounting_period',
      entityId: periodId,
      oldValues: { status: period.status },
      newValues: { status: 'CLOSED' },
      context,
    });

    return closed;
  }

  async reopenPeriod(
    tenantId: string,
    periodId: string,
    hasPermission: boolean,
    context?: AuditContext,
  ) {
    const period = await assertFound(
      this.periodRepository.findById(tenantId, periodId),
      'Period not found',
    );

    const check = canReopenPeriod({ status: period.status, hasPermission });
    if (!check.allowed) {
      throw new BusinessError(BusinessErrorCodes.FORBIDDEN, check.reason ?? 'Cannot reopen period');
    }

    const reopened = await this.periodRepository.update(tenantId, periodId, {
      status: 'OPEN',
      closedAt: null,
      closedBy: { disconnect: true },
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'UPDATE',
      entityType: 'accounting_period',
      entityId: periodId,
      oldValues: { status: period.status },
      newValues: { status: 'OPEN' },
      context,
      reason: 'Period reopened',
    });

    return reopened;
  }
}
