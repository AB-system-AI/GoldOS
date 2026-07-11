import { z } from 'zod';

import type { SettingScope } from '@goldos/database';

import type { AuditContext, AuditService } from './audit.service.js';
import type { SettingsRepository } from '../repositories/settings.repository.js';
import { assertFound, asJson, parseInput } from './validation.js';

const upsertSettingSchema = z.object({
  scope: z.enum(['TENANT', 'ORGANIZATION', 'BRANCH', 'USER']),
  scopeId: z.string().uuid().optional().nullable(),
  key: z.string().min(1).max(100),
  value: z.unknown(),
});

export class SettingsService {
  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly auditService: AuditService,
  ) {}

  get(tenantId: string, scope: SettingScope, scopeId: string | null, key: string) {
    return this.settingsRepository.findByKey(tenantId, scope, scopeId, key);
  }

  list(tenantId: string, scope: SettingScope, scopeId?: string | null) {
    return this.settingsRepository.list(tenantId, scope, scopeId);
  }

  async upsert(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(upsertSettingSchema, input);
    const scopeId = data.scope === 'TENANT' ? null : (data.scopeId ?? null);
    const existing = await this.settingsRepository.findByKey(
      tenantId,
      data.scope,
      scopeId,
      data.key,
    );

    const setting = await assertFound(
      this.settingsRepository.upsert(tenantId, data.scope, scopeId, data.key, asJson(data.value)),
      'Setting not found',
    );

    await this.auditService.log({
      tenantId,
      action: existing ? 'UPDATE' : 'CREATE',
      entityType: 'setting',
      entityId: setting.id,
      oldValues: existing ?? undefined,
      newValues: setting,
      context,
    });

    return setting;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.settingsRepository.findById(tenantId, id),
      'Setting not found',
    );
    await this.settingsRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'setting',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  async deleteByKey(
    tenantId: string,
    scope: SettingScope,
    scopeId: string | null,
    key: string,
    context?: AuditContext,
  ) {
    const existing = await this.settingsRepository.findByKey(tenantId, scope, scopeId, key);
    if (!existing) {
      return { deleted: false };
    }
    await this.settingsRepository.softDeleteByKey(tenantId, scope, scopeId, key);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'setting',
      entityId: existing.id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }
}
