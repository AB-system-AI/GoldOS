const MODULES = [
  'auth',
  'users',
  'inventory',
  'sales',
  'exchange',
  'accounting',
  'finance',
  'invoice',
  'payment',
  'buyback',
  'pos',
  'hr',
  'settings',
  'organization',
  'branches',
  'crm',
  'suppliers',
  'pricing',
  'purchasing',
];

const ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'cancel',
  'return',
  'discount',
  'complete',
  'export',
  'print',
  'manage',
  'admin',
  'post',
  'close',
];

const EXTRA_PERMISSIONS = [
  {
    code: 'tenant.finance.cash.manage',
    name: 'Finance Cash Manage',
    module: 'finance',
    description: 'Manage cash registers and shifts',
  },
  {
    code: 'tenant.finance.bank.manage',
    name: 'Finance Bank Manage',
    module: 'finance',
    description: 'Manage bank accounts and transactions',
  },
  {
    code: 'tenant.finance.expense.manage',
    name: 'Finance Expense Manage',
    module: 'finance',
    description: 'Manage expenses and approvals',
  },
  {
    code: 'tenant.finance.report.view',
    name: 'Finance Report View',
    module: 'finance',
    description: 'View financial and jewelry reports',
  },
];

const SCOPE = 'tenant';

function buildPermissionCode(module, action) {
  return `${SCOPE}.${module}.${action}`;
}

function humanize(value) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const PERMISSION_CATALOG = [
  ...MODULES.flatMap((module) =>
    ACTIONS.map((action) => {
      const code = buildPermissionCode(module, action);
      return {
        code,
        name: `${humanize(module)} ${humanize(action)}`,
        module,
        description: `Allows ${action} access to ${module} at ${SCOPE} scope`,
      };
    }),
  ),
  ...EXTRA_PERMISSIONS,
];

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 */
async function seedPermissions(prisma) {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      create: permission,
      update: {
        name: permission.name,
        module: permission.module,
        description: permission.description,
        deletedAt: null,
      },
    });
  }

  return PERMISSION_CATALOG.length;
}

module.exports = {
  PERMISSION_CATALOG,
  MODULES,
  ACTIONS,
  SCOPE,
  buildPermissionCode,
  seedPermissions,
};
