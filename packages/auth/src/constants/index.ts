export const AUTH_SESSION_COOKIE_NAME = 'goldos.session-token';
export const AUTH_CSRF_COOKIE_NAME = 'goldos.csrf-token';
export const AUTH_CALLBACK_COOKIE_NAME = 'goldos.callback-url';

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const AUTH_SESSION_IDLE_TIMEOUT_SECONDS = 60 * 30;
export const AUTH_MAX_CONCURRENT_SESSIONS = 3;

export const AUTH_PROVIDERS = {
  CREDENTIALS: 'credentials',
  TOTP: 'totp',
  GOOGLE: 'google',
  MICROSOFT: 'microsoft-entra-id',
} as const;

export const PLATFORM_ROLES = {
  SUPER_ADMIN: 'platform_super_admin',
  SUPPORT: 'platform_support',
  BILLING: 'platform_billing',
} as const;

export const TENANT_ROLES = {
  OWNER: 'tenant_owner',
  ADMIN: 'tenant_admin',
  BRANCH_MANAGER: 'branch_manager',
  ASSISTANT_MANAGER: 'assistant_manager',
  ACCOUNTANT: 'accountant',
  INVENTORY_MANAGER: 'inventory_manager',
  SALES_ASSOCIATE: 'sales_associate',
  CASHIER: 'cashier',
  WORKSHOP_MANAGER: 'workshop_manager',
  WORKSHOP_TECHNICIAN: 'workshop_technician',
  HR_MANAGER: 'hr_manager',
  VIEWER: 'viewer',
} as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];
export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];
