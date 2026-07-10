import type { PrismaClient } from '@goldos/database';

export class PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findPermissionsForRole(roleId: string) {
    return this.prisma.rolePermission.findMany({
      where: {
        roleId,
        deletedAt: null,
        permission: { deletedAt: null },
      },
      include: { permission: true },
    });
  }

  findPermissionByCode(code: string) {
    return this.prisma.permission.findFirst({
      where: { code, deletedAt: null },
    });
  }

  listAll() {
    return this.prisma.permission.findMany({
      where: { deletedAt: null },
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }
}
