import type { Prisma, PrismaClient, SettingScope } from '@goldos/database';

import { scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.setting.findFirst({
      where: { id, ...tenantScope(tenantId) },
    });
  }

  findByKey(tenantId: string, scope: SettingScope, scopeId: string | null, key: string) {
    return this.prisma.setting.findFirst({
      where: {
        ...tenantScope(tenantId),
        scope,
        scopeId,
        key,
      },
    });
  }

  list(tenantId: string, scope: SettingScope, scopeId?: string | null) {
    return this.prisma.setting.findMany({
      where: {
        ...tenantScope(tenantId),
        scope,
        ...(scopeId !== undefined ? { scopeId } : {}),
      },
      orderBy: { key: 'asc' },
    });
  }

  upsert(
    tenantId: string,
    scope: SettingScope,
    scopeId: string | null,
    key: string,
    value: Prisma.InputJsonValue,
  ) {
    return this.findByKey(tenantId, scope, scopeId, key).then((existing) => {
      if (existing) {
        return this.prisma.setting
          .updateMany({
            where: scopedIdWhere(tenantId, existing.id),
            data: { value, deletedAt: null },
          })
          .then((result) => {
            if (result.count === 0) return null;
            return this.findByKey(tenantId, scope, scopeId, key);
          });
      }

      return this.prisma.setting.create({
        data: { tenantId, scope, scopeId, key, value },
      });
    });
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.setting.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  softDeleteByKey(tenantId: string, scope: SettingScope, scopeId: string | null, key: string) {
    return this.prisma.setting.updateMany({
      where: {
        ...tenantScope(tenantId),
        scope,
        scopeId,
        key,
      },
      data: softDeleteData(),
    });
  }
}
