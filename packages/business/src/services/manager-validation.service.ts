import type { EmployeeRepository } from '../repositories/employee.repository.js';
import { BusinessError, BusinessErrorCodes } from '../errors/business-error.js';
import { assertFound } from './validation.js';

export class ManagerValidationService {
  constructor(private readonly employeeRepository: EmployeeRepository) {}

  async validateBranchManagerAssignment(
    tenantId: string,
    branchId: string | null,
    managerId: string,
  ): Promise<void> {
    const manager = await assertFound(
      this.employeeRepository.findActiveById(tenantId, managerId),
      'Manager not found or inactive in tenant',
    );

    if (branchId) {
      const inBranch = await this.employeeRepository.isAssignedToBranch(
        tenantId,
        manager.id,
        branchId,
      );
      if (!inBranch) {
        throw new BusinessError(
          BusinessErrorCodes.VALIDATION_ERROR,
          'Manager must be assigned to the branch',
        );
      }
    }
  }

  async validateEmployeeManagerAssignment(
    tenantId: string,
    employeeId: string | null,
    managerId: string,
    branchId?: string | null,
  ): Promise<void> {
    if (employeeId && managerId === employeeId) {
      throw new BusinessError(
        BusinessErrorCodes.VALIDATION_ERROR,
        'Employee cannot be their own manager',
      );
    }

    const manager = await assertFound(
      this.employeeRepository.findActiveById(tenantId, managerId),
      'Manager not found or inactive in tenant',
    );

    if (branchId) {
      const managerInBranch = await this.employeeRepository.isAssignedToBranch(
        tenantId,
        manager.id,
        branchId,
      );
      if (!managerInBranch) {
        throw new BusinessError(
          BusinessErrorCodes.VALIDATION_ERROR,
          'Manager must belong to the employee branch scope',
        );
      }
    }

    if (employeeId) {
      const createsCycle = await this.employeeRepository.wouldCreateManagerCycle(
        tenantId,
        employeeId,
        managerId,
      );
      if (createsCycle) {
        throw new BusinessError(
          BusinessErrorCodes.CONFLICT,
          'Manager assignment would create a circular hierarchy',
        );
      }
    }
  }
}
