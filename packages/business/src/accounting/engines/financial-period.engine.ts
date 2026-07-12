import type { AccountingPeriodStatus } from '@goldos/database';

export function assertPeriodOpen(status: AccountingPeriodStatus): void {
  if (status !== 'OPEN') {
    throw new Error(`Accounting period is ${status}; postings are not allowed`);
  }
}

export function canClosePeriod(params: {
  status: AccountingPeriodStatus;
  draftJournalCount: number;
}): { allowed: boolean; reason?: string } {
  if (params.status !== 'OPEN') {
    return { allowed: false, reason: 'Period is not open' };
  }
  if (params.draftJournalCount > 0) {
    return { allowed: false, reason: 'Draft journals must be posted or removed before closing' };
  }
  return { allowed: true };
}

export function canReopenPeriod(params: {
  status: AccountingPeriodStatus;
  hasPermission: boolean;
}): { allowed: boolean; reason?: string } {
  if (!params.hasPermission) {
    return { allowed: false, reason: 'Reopen permission required' };
  }
  if (params.status !== 'CLOSED' && params.status !== 'LOCKED') {
    return { allowed: false, reason: 'Only closed or locked periods can be reopened' };
  }
  return { allowed: true };
}

export function isDateInPeriod(date: Date, startDate: Date, endDate: Date): boolean {
  const d = date.toISOString().slice(0, 10);
  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);
  return d >= start && d <= end;
}
