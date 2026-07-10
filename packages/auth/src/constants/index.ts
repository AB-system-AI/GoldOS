export const AUTH_SESSION_COOKIE_NAME = 'goldos.session-token';
export const AUTH_CSRF_COOKIE_NAME = 'goldos.csrf-token';
export const AUTH_CALLBACK_COOKIE_NAME = 'goldos.callback-url';

export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
export const AUTH_SESSION_IDLE_TIMEOUT_SECONDS = 60 * 30;
export const AUTH_MAX_CONCURRENT_SESSIONS = 3;

export const AUTH_ACCESS_TOKEN_TTL_SECONDS = 900;
export const AUTH_REFRESH_TOKEN_TTL_SECONDS = 604800;
export const AUTH_REMEMBER_ME_TTL_SECONDS = 2592000;
export const AUTH_MAX_LOGIN_ATTEMPTS = 5;
export const AUTH_LOCKOUT_DURATION_SECONDS = 1800;
export const AUTH_INVITATION_TTL_SECONDS = 604800;
export const AUTH_PASSWORD_RESET_TTL_SECONDS = 3600;
export const AUTH_EMAIL_VERIFY_TTL_SECONDS = 86400;
export const AUTH_PHONE_VERIFY_TTL_SECONDS = 600;
export const AUTH_RATE_LIMIT_LOGIN_MAX = 10;
export const AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS = 900;
export const AUTH_RATE_LIMIT_REFRESH_MAX = 30;
export const AUTH_RATE_LIMIT_REFRESH_WINDOW_SECONDS = 900;
export const AUTH_RATE_LIMIT_PASSWORD_RESET_MAX = 5;
export const AUTH_RATE_LIMIT_PASSWORD_RESET_WINDOW_SECONDS = 3600;
export const AUTH_RATE_LIMIT_VERIFICATION_MAX = 5;
export const AUTH_RATE_LIMIT_VERIFICATION_WINDOW_SECONDS = 900;

export const AUTH_PASSWORD_HISTORY_LIMIT = 5;
export const AUTH_BCRYPT_DUMMY_HASH =
  '$2a$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';

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

export const PERMISSION_SCOPES = ['tenant', 'organization', 'branch'] as const;
export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'update',
  'delete',
  'approve',
  'export',
  'print',
  'manage',
  'admin',
] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[keyof typeof AUTH_PROVIDERS];
export type PlatformRole = (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];
export type TenantRole = (typeof TENANT_ROLES)[keyof typeof TENANT_ROLES];
export type PermissionScope = (typeof PERMISSION_SCOPES)[number];
export type PermissionActionConstant = (typeof PERMISSION_ACTIONS)[number];
