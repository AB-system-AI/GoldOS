import type { AuditAction } from '@goldos/database';

import type { AuditRepository } from '../repositories/audit.repository.js';

export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

export interface AuditLogParams {
  tenantId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  oldValues?: unknown;
  newValues?: unknown;
  context?: AuditContext;
}

export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async log(params: AuditLogParams) {
    const { tenantId, action, entityType, entityId, oldValues, newValues, context } = params;

    return this.auditRepository.create({
      tenant: { connect: { id: tenantId } },
      action,
      entityType,
      entityId: entityId ?? null,
      oldValues: oldValues !== undefined ? (oldValues as object) : undefined,
      newValues: newValues !== undefined ? (newValues as object) : undefined,
      ...(context?.userId ? { user: { connect: { id: context.userId } } } : {}),
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      requestId: context?.requestId ?? null,
      correlationId: context?.correlationId ?? null,
    });
  }

  list(
    tenantId: string,
    filters?: {
      entityType?: string;
      entityId?: string;
      action?: AuditAction;
      userId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.auditRepository.list(tenantId, filters);
  }
}
