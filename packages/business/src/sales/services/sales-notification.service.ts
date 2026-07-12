import type { SalesEventType } from '@goldos/database';

import type { SalesEventLogRepository } from '../repositories/sales-event-log.repository.js';
import { asJson } from '../../services/validation.js';

export interface SalesNotificationParams {
  tenantId: string;
  branchId?: string | null;
  userId?: string | null;
  eventType: SalesEventType;
  referenceType?: string;
  referenceId?: string;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
}

export class SalesNotificationService {
  constructor(private readonly salesEventLogRepository: SalesEventLogRepository) {}

  async emit(params: SalesNotificationParams) {
    return this.salesEventLogRepository.create(params.tenantId, {
      eventType: params.eventType,
      title: params.title,
      body: params.body,
      payload: asJson(params.payload ?? {}),
      referenceType: params.referenceType ?? null,
      referenceId: params.referenceId ?? null,
      ...(params.branchId ? { branch: { connect: { id: params.branchId } } } : {}),
    });
  }
}
