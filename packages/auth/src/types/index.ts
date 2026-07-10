import type { BranchId, TenantId, UserId } from '@goldos/types/tenant';
import type { PlatformRole, TenantRole } from '../constants/index.js';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface AuthSession {
  id: string;
  userId: UserId;
  tenantId: TenantId;
  branchId: BranchId | null;
  roles: TenantRole[];
  permissions: string[];
  platformRole: PlatformRole | null;
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface AuthUser {
  id: UserId;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: TenantId;
  roles: TenantRole[];
  permissions: string[];
  platformRole: PlatformRole | null;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface AuthCredentials {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface TwoFactorChallenge {
  sessionId: string;
  method: 'totp' | 'sms' | 'hardware_key';
  expiresAt: Date;
}

export type PermissionAction =
  'view' | 'create' | 'update' | 'delete' | 'approve' | 'void' | 'export' | 'manage';

export type Permission = `${string}.${string}.${PermissionAction}`;
