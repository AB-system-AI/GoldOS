import type { AuditContext, AuditService } from '../../services/audit.service.js';
import type { PurchaseApprovalRepository } from '../repositories/purchase-approval.repository.js';

const DEFAULT_APPROVAL_CONFIGS = [
  { level: 'AUTO' as const, minAmount: 0, maxAmount: null, autoApproveBelow: 10000 },
  { level: 'BRANCH_MANAGER' as const, minAmount: 10000, maxAmount: 50000, autoApproveBelow: null },
  { level: 'FINANCE' as const, minAmount: 50000, maxAmount: 200000, autoApproveBelow: null },
  { level: 'OWNER' as const, minAmount: 200000, maxAmount: null, autoApproveBelow: null },
];

export class TenantPurchasingBootstrapService {
  constructor(
    private readonly purchaseApprovalRepository: PurchaseApprovalRepository,
    private readonly auditService: AuditService,
  ) {}

  async seedTenantPurchasing(tenantId: string, branchId?: string | null, context?: AuditContext) {
    const existing = await this.purchaseApprovalRepository.listConfigs(tenantId, branchId);
    if (existing.length > 0) {
      return { configs: existing, created: 0 };
    }

    const created = [];
    for (const config of DEFAULT_APPROVAL_CONFIGS) {
      const row = await this.purchaseApprovalRepository.upsertConfig(tenantId, {
        level: config.level,
        minAmount: config.minAmount,
        maxAmount: config.maxAmount,
        autoApproveBelow: config.autoApproveBelow,
        isActive: true,
        ...(branchId ? { branch: { connect: { id: branchId } } } : {}),
      });
      created.push(row);
    }

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'purchase_approval_config_seed',
      entityId: tenantId,
      newValues: { count: created.length, branchId },
      context,
    });

    return { configs: created, created: created.length };
  }
}
