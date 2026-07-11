import type {
  BranchStatus,
  BranchType,
  Prisma,
  PrismaClient,
  SettingScope,
} from '@goldos/database';

import { activeOnly, scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

const BRANCH_SETTING_SCOPE = 'BRANCH' satisfies SettingScope;

export class BranchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.branch.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        organization: true,
        manager: true,
        branchCurrencies: { where: activeOnly() },
        defaultWarehouseBranch: true,
      },
    });
  }

  findByCode(tenantId: string, code: string) {
    return this.prisma.branch.findFirst({
      where: { code, ...tenantScope(tenantId) },
    });
  }

  list(
    tenantId: string,
    filters?: {
      organizationId?: string;
      branchStatus?: BranchStatus;
      type?: BranchType;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.branch.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.organizationId ? { organizationId: filters.organizationId } : {}),
        ...(filters?.branchStatus ? { branchStatus: filters.branchStatus } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { code: { contains: filters.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        branchCurrencies: { where: activeOnly() },
      },
      orderBy: { name: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.BranchCreateInput, 'tenant'>) {
    return this.prisma.branch.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
      include: { branchCurrencies: { where: activeOnly() } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.BranchUpdateInput) {
    const result = await this.prisma.branch.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.branch.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listCurrencies(tenantId: string, branchId: string) {
    return this.prisma.branchCurrency.findMany({
      where: { branchId, ...tenantScope(tenantId), ...activeOnly() },
    });
  }

  addCurrency(
    tenantId: string,
    data: { branchId: string; currencyCode: string; isDefault?: boolean; isActive?: boolean },
  ) {
    return this.prisma.branchCurrency.create({
      data: {
        tenantId,
        branchId: data.branchId,
        currencyCode: data.currencyCode,
        isDefault: data.isDefault ?? false,
        isActive: data.isActive ?? true,
      },
    });
  }

  updateCurrency(tenantId: string, id: string, data: Prisma.BranchCurrencyUpdateInput) {
    return this.prisma.branchCurrency.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data,
    });
  }

  softDeleteCurrency(tenantId: string, id: string) {
    return this.prisma.branchCurrency.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listSettings(tenantId: string, branchId: string) {
    return this.prisma.setting.findMany({
      where: {
        ...tenantScope(tenantId),
        scope: BRANCH_SETTING_SCOPE,
        scopeId: branchId,
      },
    });
  }

  upsertSetting(tenantId: string, branchId: string, key: string, value: Prisma.InputJsonValue) {
    return this.findByKey(tenantId, branchId, key).then((existing) => {
      if (existing) {
        return this.prisma.setting
          .updateMany({
            where: scopedIdWhere(tenantId, existing.id),
            data: { value, deletedAt: null },
          })
          .then((result) => {
            if (result.count === 0) return null;
            return this.findByKey(tenantId, branchId, key);
          });
      }

      return this.prisma.setting.create({
        data: {
          tenantId,
          scope: BRANCH_SETTING_SCOPE,
          scopeId: branchId,
          key,
          value,
        },
      });
    });
  }

  private findByKey(tenantId: string, branchId: string, key: string) {
    return this.prisma.setting.findFirst({
      where: {
        ...tenantScope(tenantId),
        scope: BRANCH_SETTING_SCOPE,
        scopeId: branchId,
        key,
      },
    });
  }
}
