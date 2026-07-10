import type { PermissionActionConstant, PermissionScope } from '../constants/index.js';
import type { PermissionRepository } from '../repositories/permission.repository.js';
import type { TenantRole } from '../constants/index.js';
import type { AuthUser } from '../types/index.js';
import { asBranchId, asTenantId, asUserId } from '@goldos/types/tenant';

export function buildPermissionCode(
  scope: PermissionScope,
  module: string,
  action: PermissionActionConstant,
): string {
  return `${scope}.${module}.${action}`;
}

export function hasPermission(permissions: string[], permission: string): boolean {
  if (permissions.includes(permission)) {
    return true;
  }

  const parts = permission.split('.');
  if (parts.length === 3) {
    const scope = parts[0] ?? '';
    const module = parts[1] ?? '';
    const action = parts[2] ?? '';
    const manageCode = `${scope}.${module}.manage`;
    const adminCode = `${scope}.${module}.admin`;
    if (permissions.includes(manageCode) || permissions.includes(adminCode)) {
      return true;
    }
    const tenantAdmin = `tenant.${module}.admin`;
    if (permissions.includes(tenantAdmin)) {
      return true;
    }
    if (action !== 'view' && permissions.includes(`${scope}.${module}.manage`)) {
      return true;
    }
  }

  return permissions.some(
    (p) => p.endsWith('.admin') && permission.startsWith(p.replace('.admin', '.')),
  );
}

export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some((permission) => hasPermission(permissions, permission));
}

export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async resolvePermissions(userId: string, roleId: string): Promise<string[]> {
    void userId;
    const rolePermissions = await this.permissionRepository.findPermissionsForRole(roleId);
    return rolePermissions.map((rp: { permission: { code: string } }) => rp.permission.code);
  }

  hasPermission(permissions: string[], permission: string): boolean {
    return hasPermission(permissions, permission);
  }

  hasAnyPermission(permissions: string[], required: string[]): boolean {
    return hasAnyPermission(permissions, required);
  }

  mapUser(
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      tenantId: string;
      emailVerifiedAt: Date | null;
      twoFactorEnabled: boolean;
      phone: string | null;
      status: string;
      role: { code: string };
    },
    permissions: string[],
  ): AuthUser {
    return {
      id: asUserId(user.id),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: asTenantId(user.tenantId),
      roles: [user.role.code as TenantRole],
      permissions,
      platformRole: null,
      emailVerified: user.emailVerifiedAt !== null,
      twoFactorEnabled: user.twoFactorEnabled,
      phone: user.phone,
      status: user.status,
    };
  }

  getDefaultBranchId(
    userBranches: { branchId: string; isDefault: boolean }[],
  ): ReturnType<typeof asBranchId> | null {
    const defaultBranch = userBranches.find((ub) => ub.isDefault) ?? userBranches[0];
    return defaultBranch ? asBranchId(defaultBranch.branchId) : null;
  }
}
