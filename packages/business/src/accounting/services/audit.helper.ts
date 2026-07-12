import type { AuditAction } from '@goldos/database';

import type { AuditContext, AuditService } from '../../services/audit.service.js';

export async function logAccountingAudit(
  auditService: AuditService,
  params: {
    tenantId: string;
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: unknown;
    newValues?: unknown;
    context?: AuditContext;
    reason?: string;
  },
) {
  await auditService.log({
    tenantId: params.tenantId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    oldValues: params.oldValues,
    newValues: params.reason
      ? { ...(params.newValues as object), reason: params.reason }
      : params.newValues,
    context: params.context,
  });
}
