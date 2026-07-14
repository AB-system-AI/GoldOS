import type { ApprovalConfigRow } from './approval.engine.js';

export const DEFAULT_PURCHASE_APPROVAL_CONFIGS: ApprovalConfigRow[] = [
  { level: 'AUTO', minAmount: 0, maxAmount: null, autoApproveBelow: 10000 },
  { level: 'BRANCH_MANAGER', minAmount: 10000, maxAmount: 50000, autoApproveBelow: null },
  { level: 'FINANCE', minAmount: 50000, maxAmount: 200000, autoApproveBelow: null },
  { level: 'OWNER', minAmount: 200000, maxAmount: null, autoApproveBelow: null },
];
