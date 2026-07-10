import type { BranchId, TenantId, UserId } from '@goldos/types/tenant';
import type {
  PermissionActionConstant,
  PermissionScope,
  PlatformRole,
  TenantRole,
} from '../constants/index.js';

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
  pendingTwoFactor?: boolean;
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
  phone?: string | null;
  status?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
  tenantSlug: string;
  rememberMe?: boolean;
}

export interface TwoFactorChallenge {
  sessionId: string;
  method: 'totp' | 'sms' | 'hardware_key';
  expiresAt: Date;
}

export type PermissionAction = PermissionActionConstant | 'void';

export type Permission = `${PermissionScope}.${string}.${PermissionAction}`;

export interface AuthContext {
  user: AuthUser;
  session: AuthSession;
  tenantId: TenantId;
  branchId: BranchId | null;
  permissions: string[];
  requestId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export type LoginResult =
  | {
      type: 'success';
      tokens: TokenPair;
      user: AuthUser;
      sessionId: string;
    }
  | {
      type: 'two_factor_required';
      challenge: TwoFactorChallenge;
      refreshToken: string;
    };

export interface SecurityEventInput {
  tenantId?: string | null;
  userId?: string | null;
  email?: string | null;
  eventType: string;
  result?: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  failureReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  countryCode?: string | null;
  city?: string | null;
  browser?: string | null;
  operatingSystem?: string | null;
  deviceType?: string | null;
  requestId?: string | null;
  correlationId?: string | null;
  geo?: Record<string, unknown> | null;
}

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
  countryCode: string | null;
  city: string | null;
  browser: string | null;
  operatingSystem: string | null;
  deviceType: string | null;
  fingerprint: string | null;
}

export interface InvitationCreateInput {
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  createdById: string;
  branchId?: string | null;
  roleId?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  employeeId?: string | null;
}

export interface InvitationAcceptInput {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
  clientInfo?: ClientInfo;
}

export interface DeviceInfo {
  id: string;
  name: string;
  type: string;
  identifier: string;
  isTrusted: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
}
