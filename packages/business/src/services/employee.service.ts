import { z } from 'zod';

import type { AuditContext, AuditService } from './audit.service.js';
import type { BranchRepository } from '../repositories/branch.repository.js';
import type { EmployeeRepository } from '../repositories/employee.repository.js';
import type { ManagerValidationService } from './manager-validation.service.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound, assertTenantRef, asJsonOptional, parseInput } from './validation.js';

const createEmployeeSchema = z.object({
  branchId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  managerId: z.string().uuid().optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  jobTitleId: z.string().uuid().optional().nullable(),
  photoFileId: z.string().uuid().optional().nullable(),
  employeeNo: z.string().min(1).max(30),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  jobTitle: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  hireDate: z.coerce.date().optional().nullable(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'TERMINATED']).optional(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial().omit({ employeeNo: true });

const assignBranchSchema = z.object({
  branchId: z.string().uuid(),
  isDefault: z.boolean().optional(),
});

const emergencyContactSchema = z.object({
  name: z.string().min(1).max(150),
  relationship: z.string().min(1).max(50),
  phone: z.string().min(1).max(30),
  email: z.string().email().max(255).optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const attachmentSchema = z.object({
  fileId: z.string().uuid(),
  label: z.string().max(100).optional().nullable(),
});

export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly branchRepository: BranchRepository,
    private readonly managerValidationService: ManagerValidationService,
    private readonly auditService: AuditService,
  ) {}

  getById(tenantId: string, id: string) {
    return assertFound(this.employeeRepository.findById(tenantId, id), 'Employee not found');
  }

  list(tenantId: string, filters?: Parameters<EmployeeRepository['list']>[1]) {
    return this.employeeRepository.list(tenantId, filters);
  }

  async create(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(createEmployeeSchema, input);
    const existing = await this.employeeRepository.findByEmployeeNo(tenantId, data.employeeNo);
    if (existing) {
      throw new BusinessError(BusinessErrorCodes.ALREADY_EXISTS, 'Employee number already exists');
    }

    if (data.branchId) {
      const branchId = data.branchId;
      await assertTenantRef(
        () => this.branchRepository.findById(tenantId, branchId),
        'Branch not found in tenant',
      );
    }

    if (data.managerId) {
      await this.managerValidationService.validateEmployeeManagerAssignment(
        tenantId,
        null,
        data.managerId,
        data.branchId ?? null,
      );
    }

    const employee = await this.employeeRepository.create(tenantId, {
      employeeNo: data.employeeNo,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email ?? null,
      phone: data.phone ?? null,
      jobTitle: data.jobTitle ?? null,
      department: data.department ?? null,
      hireDate: data.hireDate ?? null,
      status: data.status,
      notes: data.notes ?? null,
      metadata: asJsonOptional(data.metadata) ?? {},
      ...(data.branchId ? { branch: { connect: { id: data.branchId } } } : {}),
      ...(data.userId ? { user: { connect: { id: data.userId } } } : {}),
      ...(data.managerId ? { manager: { connect: { id: data.managerId } } } : {}),
      ...(data.departmentId ? { departmentRef: { connect: { id: data.departmentId } } } : {}),
      ...(data.jobTitleId ? { jobTitleRef: { connect: { id: data.jobTitleId } } } : {}),
      ...(data.photoFileId ? { photoFile: { connect: { id: data.photoFileId } } } : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'employee',
      entityId: employee.id,
      newValues: employee,
      context,
    });

    return employee;
  }

  async update(tenantId: string, id: string, input: unknown, context?: AuditContext) {
    const existing = await assertFound(
      this.employeeRepository.findById(tenantId, id),
      'Employee not found',
    );
    const data = parseInput(updateEmployeeSchema, input);

    const branchId = data.branchId !== undefined ? data.branchId : (existing.branchId ?? null);

    if (data.branchId) {
      const nextBranchId = data.branchId;
      await assertTenantRef(
        () => this.branchRepository.findById(tenantId, nextBranchId),
        'Branch not found in tenant',
      );
    }

    if (data.managerId) {
      await this.managerValidationService.validateEmployeeManagerAssignment(
        tenantId,
        id,
        data.managerId,
        branchId,
      );
    } else if (data.branchId && existing.managerId) {
      await this.managerValidationService.validateEmployeeManagerAssignment(
        tenantId,
        id,
        existing.managerId,
        data.branchId,
      );
    }

    const employee = await this.employeeRepository.update(tenantId, id, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      jobTitle: data.jobTitle,
      department: data.department,
      hireDate: data.hireDate,
      status: data.status,
      notes: data.notes,
      metadata: asJsonOptional(data.metadata),
      ...(data.branchId !== undefined
        ? data.branchId
          ? { branch: { connect: { id: data.branchId } } }
          : { branch: { disconnect: true } }
        : {}),
      ...(data.managerId !== undefined
        ? data.managerId
          ? { manager: { connect: { id: data.managerId } } }
          : { manager: { disconnect: true } }
        : {}),
      ...(data.departmentId !== undefined
        ? data.departmentId
          ? { departmentRef: { connect: { id: data.departmentId } } }
          : { departmentRef: { disconnect: true } }
        : {}),
      ...(data.jobTitleId !== undefined
        ? data.jobTitleId
          ? { jobTitleRef: { connect: { id: data.jobTitleId } } }
          : { jobTitleRef: { disconnect: true } }
        : {}),
    });

    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'employee',
      entityId: id,
      oldValues: existing,
      newValues: employee,
      context,
    });

    return employee;
  }

  async delete(tenantId: string, id: string, context?: AuditContext) {
    const existing = await assertFound(
      this.employeeRepository.findById(tenantId, id),
      'Employee not found',
    );
    await this.employeeRepository.softDelete(tenantId, id);
    await this.auditService.log({
      tenantId,
      action: 'DELETE',
      entityType: 'employee',
      entityId: id,
      oldValues: existing,
      context,
    });
    return { deleted: true };
  }

  listBranches(tenantId: string, employeeId: string) {
    return this.employeeRepository.listBranches(tenantId, employeeId);
  }

  async assignBranch(tenantId: string, employeeId: string, input: unknown, context?: AuditContext) {
    await assertFound(this.employeeRepository.findById(tenantId, employeeId), 'Employee not found');
    const data = parseInput(assignBranchSchema, input);
    await assertTenantRef(
      () => this.branchRepository.findById(tenantId, data.branchId),
      'Branch not found in tenant',
    );
    const assignment = await this.employeeRepository.assignBranch(tenantId, {
      employeeId,
      ...data,
    });
    await this.auditService.log({
      tenantId,
      action: 'UPDATE',
      entityType: 'employee_branch',
      entityId: assignment.id,
      newValues: assignment,
      context,
    });
    return assignment;
  }

  listHistory(tenantId: string, employeeId: string) {
    return this.employeeRepository.listHistory(tenantId, employeeId);
  }

  async addEmergencyContact(
    tenantId: string,
    employeeId: string,
    input: unknown,
    context?: AuditContext,
  ) {
    await assertFound(this.employeeRepository.findById(tenantId, employeeId), 'Employee not found');
    const data = parseInput(emergencyContactSchema, input);
    const contact = await this.employeeRepository.addEmergencyContact(tenantId, {
      employee: { connect: { id: employeeId } },
      ...data,
    });
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'employee_emergency_contact',
      entityId: contact.id,
      newValues: contact,
      context,
    });
    return contact;
  }

  listAttachments(tenantId: string, employeeId: string) {
    return this.employeeRepository.listAttachments(tenantId, employeeId);
  }

  async addAttachment(
    tenantId: string,
    employeeId: string,
    input: unknown,
    context?: AuditContext,
  ) {
    await assertFound(this.employeeRepository.findById(tenantId, employeeId), 'Employee not found');
    const data = parseInput(attachmentSchema, input);
    const attachment = await this.employeeRepository.addAttachment(tenantId, {
      employeeId,
      ...data,
    });
    await this.auditService.log({
      tenantId,
      action: 'CREATE',
      entityType: 'employee_attachment',
      entityId: attachment.id,
      newValues: attachment,
      context,
    });
    return attachment;
  }
}
