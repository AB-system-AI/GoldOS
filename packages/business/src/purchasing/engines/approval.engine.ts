import type { PurchaseApprovalLevel } from '@goldos/database';

import { DEFAULT_PURCHASE_APPROVAL_CONFIGS } from './default-approval.config.js';

export interface ApprovalConfigRow {
  level: PurchaseApprovalLevel;
  minAmount: number;
  maxAmount: number | null;
  autoApproveBelow: number | null;
}

export interface ApprovalStepPlan {
  level: PurchaseApprovalLevel;
  autoApprove: boolean;
}

export function resolveApprovalSteps(
  amount: number,
  configs: ApprovalConfigRow[],
): ApprovalStepPlan[] {
  const active = configs
    .filter((config) => amount >= config.minAmount)
    .filter((config) => config.maxAmount === null || amount <= config.maxAmount)
    .sort((a, b) => levelOrder(a.level) - levelOrder(b.level));

  if (active.length === 0) {
    return resolveApprovalSteps(amount, DEFAULT_PURCHASE_APPROVAL_CONFIGS);
  }

  return active.map((config) => ({
    level: config.level,
    autoApprove:
      config.level === 'AUTO' ||
      (config.autoApproveBelow !== null && amount <= config.autoApproveBelow),
  }));
}

export function canAutoApprove(amount: number, configs: ApprovalConfigRow[]): boolean {
  const effective = configs.length > 0 ? configs : DEFAULT_PURCHASE_APPROVAL_CONFIGS;
  return resolveApprovalSteps(amount, effective).every((step) => step.autoApprove);
}

function levelOrder(level: PurchaseApprovalLevel): number {
  switch (level) {
    case 'AUTO':
      return 0;
    case 'BRANCH_MANAGER':
      return 1;
    case 'FINANCE':
      return 2;
    case 'OWNER':
      return 3;
    default:
      return 99;
  }
}
