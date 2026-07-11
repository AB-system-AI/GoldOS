import type { EmployeeStatus, Prisma, PrismaClient } from '@goldos/database';

import { activeOnly, scopedIdWhere, softDeleteData, tenantScope } from './tenant-scope.js';

const EMPLOYEE_ENTITY = 'employee';

export class EmployeeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findById(tenantId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, ...tenantScope(tenantId) },
      include: {
        branch: true,
        departmentRef: true,
        jobTitleRef: true,
        manager: true,
        employeeBranches: { where: activeOnly(), include: { branch: true } },
        employmentHistory: { where: activeOnly(), orderBy: { effectiveAt: 'desc' } },
        emergencyContacts: { where: activeOnly() },
        photoFile: true,
      },
    });
  }

  findByEmployeeNo(tenantId: string, employeeNo: string) {
    return this.prisma.employee.findFirst({
      where: { employeeNo, ...tenantScope(tenantId) },
    });
  }

  findActiveById(tenantId: string, id: string) {
    return this.prisma.employee.findFirst({
      where: { id, ...tenantScope(tenantId), status: 'ACTIVE', ...activeOnly() },
    });
  }

  async isAssignedToBranch(tenantId: string, employeeId: string, branchId: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, ...tenantScope(tenantId), ...activeOnly() },
      select: { branchId: true },
    });
    if (!employee) return false;
    if (employee.branchId === branchId) return true;

    const assignment = await this.prisma.employeeBranch.findFirst({
      where: {
        employeeId,
        branchId,
        ...tenantScope(tenantId),
        ...activeOnly(),
      },
      select: { id: true },
    });
    return assignment !== null;
  }

  async wouldCreateManagerCycle(
    tenantId: string,
    employeeId: string,
    managerId: string,
  ): Promise<boolean> {
    let currentId: string | null = managerId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === employeeId) {
        return true;
      }
      if (visited.has(currentId)) {
        return true;
      }
      visited.add(currentId);

      const managerRecord: { managerId: string | null } | null =
        await this.prisma.employee.findFirst({
          where: { id: currentId, ...tenantScope(tenantId) },
          select: { managerId: true },
        });
      currentId = managerRecord?.managerId ?? null;
    }

    return false;
  }

  list(
    tenantId: string,
    filters?: {
      branchId?: string;
      departmentId?: string;
      status?: EmployeeStatus;
      search?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.prisma.employee.findMany({
      where: {
        ...tenantScope(tenantId),
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.search
          ? {
              OR: [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { employeeNo: { contains: filters.search, mode: 'insensitive' } },
                { email: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search } },
              ],
            }
          : {}),
      },
      orderBy: { employeeNo: 'asc' },
      skip: filters?.skip,
      take: filters?.take,
    });
  }

  create(tenantId: string, data: Omit<Prisma.EmployeeCreateInput, 'tenant'>) {
    return this.prisma.employee.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  async update(tenantId: string, id: string, data: Prisma.EmployeeUpdateInput) {
    const result = await this.prisma.employee.updateMany({
      where: scopedIdWhere(tenantId, id),
      data,
    });
    if (result.count === 0) return null;
    return this.findById(tenantId, id);
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.employee.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listBranches(tenantId: string, employeeId: string) {
    return this.prisma.employeeBranch.findMany({
      where: { employeeId, ...tenantScope(tenantId), ...activeOnly() },
      include: { branch: true },
    });
  }

  assignBranch(
    tenantId: string,
    data: { employeeId: string; branchId: string; isDefault?: boolean },
  ) {
    return this.prisma.employeeBranch.upsert({
      where: {
        employeeId_branchId: {
          employeeId: data.employeeId,
          branchId: data.branchId,
        },
      },
      create: {
        tenantId,
        employeeId: data.employeeId,
        branchId: data.branchId,
        isDefault: data.isDefault ?? false,
      },
      update: { isDefault: data.isDefault, deletedAt: null },
    });
  }

  removeBranch(tenantId: string, id: string) {
    return this.prisma.employeeBranch.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  addHistory(tenantId: string, data: Omit<Prisma.EmploymentHistoryCreateInput, 'tenant'>) {
    return this.prisma.employmentHistory.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  listHistory(tenantId: string, employeeId: string) {
    return this.prisma.employmentHistory.findMany({
      where: { employeeId, ...tenantScope(tenantId) },
      orderBy: { effectiveAt: 'desc' },
    });
  }

  addEmergencyContact(
    tenantId: string,
    data: Omit<Prisma.EmployeeEmergencyContactCreateInput, 'tenant'>,
  ) {
    return this.prisma.employeeEmergencyContact.create({
      data: { ...data, tenant: { connect: { id: tenantId } } },
    });
  }

  updateEmergencyContact(
    tenantId: string,
    id: string,
    data: Prisma.EmployeeEmergencyContactUpdateInput,
  ) {
    return this.prisma.employeeEmergencyContact.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data,
    });
  }

  softDeleteEmergencyContact(tenantId: string, id: string) {
    return this.prisma.employeeEmergencyContact.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }

  listAttachments(tenantId: string, employeeId: string) {
    return this.prisma.attachment.findMany({
      where: {
        entityType: EMPLOYEE_ENTITY,
        entityId: employeeId,
        ...tenantScope(tenantId),
      },
      include: { file: true },
    });
  }

  addAttachment(
    tenantId: string,
    data: { employeeId: string; fileId: string; label?: string | null },
  ) {
    return this.prisma.attachment.create({
      data: {
        tenantId,
        fileId: data.fileId,
        entityType: EMPLOYEE_ENTITY,
        entityId: data.employeeId,
        label: data.label ?? null,
      },
      include: { file: true },
    });
  }

  softDeleteAttachment(tenantId: string, id: string) {
    return this.prisma.attachment.updateMany({
      where: { id, ...tenantScope(tenantId) },
      data: softDeleteData(),
    });
  }
}
