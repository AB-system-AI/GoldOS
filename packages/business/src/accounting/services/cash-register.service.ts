import { z } from 'zod';

import { BusinessError, BusinessErrorCodes } from '../../errors/business-error.js';
import type { AuditContext, AuditService } from '../../services/audit.service.js';
import { assertFound, parseInput } from '../../services/validation.js';
import type {
  CashMovementRepository,
  CashRegisterShiftRepository,
} from '../repositories/cash.repository.js';
import { logAccountingAudit } from './audit.helper.js';
import type { OperationsAccountingIntegrationService } from './operations-integration.service.js';

const openShiftSchema = z.object({
  branchId: z.string().uuid(),
  cashRegisterId: z.string().uuid(),
  employeeId: z.string().uuid(),
  openingBalance: z.number().min(0),
  currency: z.string().length(3).default('SAR'),
});

const closeShiftSchema = z.object({
  closingBalance: z.number().min(0),
  notes: z.string().optional().nullable(),
});

const movementSchema = z.object({
  branchId: z.string().uuid(),
  cashRegisterId: z.string().uuid(),
  shiftId: z.string().uuid().optional().nullable(),
  movementType: z.enum([
    'DEPOSIT',
    'WITHDRAWAL',
    'TRANSFER',
    'ADJUSTMENT',
    'SHORTAGE',
    'OVERAGE',
    'OPENING',
    'CLOSING',
  ]),
  amount: z.number().positive(),
  currency: z.string().length(3).default('SAR'),
  description: z.string().min(1),
  fromEmployeeId: z.string().uuid().optional().nullable(),
  toEmployeeId: z.string().uuid().optional().nullable(),
});

export class CashRegisterService {
  constructor(
    private readonly shiftRepository: CashRegisterShiftRepository,
    private readonly movementRepository: CashMovementRepository,
    private readonly auditService: AuditService,
    private readonly operationsAccountingIntegrationService?: OperationsAccountingIntegrationService,
  ) {}

  listShifts(tenantId: string, filters?: Parameters<CashRegisterShiftRepository['list']>[1]) {
    return this.shiftRepository.list(tenantId, filters);
  }

  async openShift(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(openShiftSchema, input);
    const existing = await this.shiftRepository.findOpenShift(tenantId, data.cashRegisterId);
    if (existing) {
      throw new BusinessError(
        BusinessErrorCodes.CONFLICT,
        'Cash register already has an open shift',
      );
    }

    const shift = await this.shiftRepository.create(tenantId, {
      status: 'OPEN',
      openingBalance: data.openingBalance,
      currency: data.currency,
      openedAt: new Date(),
      branch: { connect: { id: data.branchId } },
      cashRegister: { connect: { id: data.cashRegisterId } },
      employee: { connect: { id: data.employeeId } },
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'cash_register_shift',
      entityId: shift.id,
      newValues: shift,
      context,
    });

    return shift;
  }

  async closeShift(tenantId: string, shiftId: string, input: unknown, context?: AuditContext) {
    const shift = await assertFound(
      this.shiftRepository.findById(tenantId, shiftId),
      'Shift not found',
    );
    if (shift.status !== 'OPEN') {
      throw new BusinessError(BusinessErrorCodes.CONFLICT, 'Shift is not open');
    }

    const data = parseInput(closeShiftSchema, input);
    const shortageOverage = data.closingBalance - Number(shift.openingBalance);

    const closed = await this.shiftRepository.update(tenantId, shiftId, {
      status: 'CLOSED',
      closingBalance: data.closingBalance,
      expectedBalance: shift.openingBalance,
      shortageOverage,
      closedAt: new Date(),
      notes: data.notes,
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'UPDATE',
      entityType: 'cash_register_shift',
      entityId: shiftId,
      oldValues: { status: 'OPEN' },
      newValues: { status: 'CLOSED', shortageOverage },
      context,
    });

    if (this.operationsAccountingIntegrationService && shortageOverage !== 0) {
      await this.operationsAccountingIntegrationService.postCashMovement(
        tenantId,
        {
          movementId: shiftId,
          branchId: shift.branchId,
          amount: Math.abs(shortageOverage),
          movementType: shortageOverage < 0 ? 'SHORTAGE' : 'OVERAGE',
          entryDate: new Date(),
        },
        context,
      );
    }

    return closed;
  }

  listMovements(tenantId: string, filters?: Parameters<CashMovementRepository['list']>[1]) {
    return this.movementRepository.list(tenantId, filters);
  }

  async recordMovement(tenantId: string, input: unknown, context?: AuditContext) {
    const data = parseInput(movementSchema, input);
    const movement = await this.movementRepository.create(tenantId, {
      movementType: data.movementType,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      occurredAt: new Date(),
      branch: { connect: { id: data.branchId } },
      cashRegister: { connect: { id: data.cashRegisterId } },
      ...(data.shiftId ? { shift: { connect: { id: data.shiftId } } } : {}),
      ...(data.fromEmployeeId ? { fromEmployee: { connect: { id: data.fromEmployeeId } } } : {}),
      ...(data.toEmployeeId ? { toEmployee: { connect: { id: data.toEmployeeId } } } : {}),
    });

    await logAccountingAudit(this.auditService, {
      tenantId,
      action: 'CREATE',
      entityType: 'cash_movement',
      entityId: movement.id,
      newValues: movement,
      context,
    });

    if (
      this.operationsAccountingIntegrationService &&
      !['OPENING', 'CLOSING'].includes(data.movementType)
    ) {
      await this.operationsAccountingIntegrationService.postCashMovement(
        tenantId,
        {
          movementId: movement.id,
          branchId: data.branchId,
          amount: data.amount,
          movementType: data.movementType,
          entryDate: movement.occurredAt,
        },
        context,
      );
    }

    return movement;
  }
}
