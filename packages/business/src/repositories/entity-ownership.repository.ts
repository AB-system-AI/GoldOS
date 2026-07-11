import type { AddressableType, PrismaClient } from '@goldos/database';

import { tenantScope } from '../repositories/tenant-scope.js';

export class EntityOwnershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  hasOrganization(tenantId: string, id: string) {
    return this.prisma.organization.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasBranch(tenantId: string, id: string) {
    return this.prisma.branch.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasCustomer(tenantId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasSupplier(tenantId: string, id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasEmployee(tenantId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasManufacturer(tenantId: string, id: string) {
    return this.prisma.manufacturer.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasUser(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasDepartment(tenantId: string, id: string) {
    return this.prisma.department.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  hasCustomerGroup(tenantId: string, id: string) {
    return this.prisma.customerGroup.findFirst({
      where: { id, ...tenantScope(tenantId) },
      select: { id: true },
    });
  }

  async hasAddressable(tenantId: string, type: AddressableType, id: string) {
    switch (type) {
      case 'ORGANIZATION':
        return this.hasOrganization(tenantId, id);
      case 'BRANCH':
        return this.hasBranch(tenantId, id);
      case 'CUSTOMER':
        return this.hasCustomer(tenantId, id);
      case 'SUPPLIER':
        return this.hasSupplier(tenantId, id);
      case 'EMPLOYEE':
        return this.hasEmployee(tenantId, id);
      case 'MANUFACTURER':
        return this.hasManufacturer(tenantId, id);
      case 'USER':
        return this.hasUser(tenantId, id);
      default:
        return null;
    }
  }
}
