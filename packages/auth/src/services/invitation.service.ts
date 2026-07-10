import { AUTH_INVITATION_TTL_SECONDS } from '../constants/index.js';
import {
  assertPasswordStrength,
  generateSecureToken,
  hashPassword,
  hashToken,
} from '../crypto/password.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';
import type { InvitationRepository } from '../repositories/invitation.repository.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { NotificationService } from '../notifications/notification.service.js';
import type { Prisma, PrismaClient } from '@goldos/database';
import type { InvitationAcceptInput, InvitationCreateInput } from '../types/index.js';

export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly userRepository: UserRepository,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaClient,
  ) {}

  async create(input: InvitationCreateInput) {
    const expiresAt = new Date(Date.now() + AUTH_INVITATION_TTL_SECONDS * 1000);

    const invitation = await this.invitationRepository.create({
      ...input,
      expiresAt,
    });

    const token = generateSecureToken();
    const tokenHash = hashToken(token);

    await this.invitationRepository.createToken({
      invitationId: invitation.id,
      tokenHash,
      expiresAt,
    });

    await this.invitationRepository.createAuditLog({
      tenantId: input.tenantId,
      invitationId: invitation.id,
      action: 'CREATED',
      performedById: input.createdById,
    });

    const tenant = await this.userRepository.findTenantById(input.tenantId);
    if (tenant) {
      await this.notificationService.sendInvitation({
        tenantId: input.tenantId,
        email: invitation.email,
        token,
        tenantSlug: tenant.slug,
      });
    }

    return { invitation };
  }

  async resend(invitationId: string, tenantId: string, performedById: string) {
    const invitation = await this.invitationRepository.findById(invitationId, tenantId);
    if (!invitation) {
      throw new AuthError(AuthErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found');
    }

    if (invitation.status === 'ACCEPTED' || invitation.status === 'CANCELLED') {
      throw new AuthError(
        AuthErrorCodes.INVITATION_ALREADY_ACCEPTED,
        'Invitation cannot be resent',
      );
    }

    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + AUTH_INVITATION_TTL_SECONDS * 1000);

    await this.invitationRepository.createToken({
      invitationId: invitation.id,
      tokenHash,
      expiresAt,
    });

    await this.invitationRepository.updateStatus(invitation.id, 'SENT', {
      lastSentAt: new Date(),
      resendCount: invitation.resendCount + 1,
    });

    await this.invitationRepository.createAuditLog({
      tenantId,
      invitationId: invitation.id,
      action: 'RESENT',
      performedById,
    });

    const tenant = await this.userRepository.findTenantById(tenantId);
    if (tenant) {
      await this.notificationService.sendInvitation({
        tenantId,
        email: invitation.email,
        token,
        tenantSlug: tenant.slug,
      });
    }

    return { invitation };
  }

  async cancel(invitationId: string, tenantId: string, cancelledById: string) {
    const invitation = await this.invitationRepository.findById(invitationId, tenantId);
    if (!invitation) {
      throw new AuthError(AuthErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found');
    }

    await this.invitationRepository.updateStatus(invitation.id, 'CANCELLED', {
      cancelledById,
      cancelledAt: new Date(),
    });

    await this.invitationRepository.createAuditLog({
      tenantId,
      invitationId: invitation.id,
      action: 'CANCELLED',
      performedById: cancelledById,
    });

    return { cancelled: true };
  }

  async getByToken(token: string) {
    const tokenHash = hashToken(token);
    const record = await this.invitationRepository.findByTokenHash(tokenHash);
    if (!record) {
      throw new AuthError(AuthErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found');
    }
    return record.invitation;
  }

  async accept(input: InvitationAcceptInput) {
    assertPasswordStrength(input.password);

    const tokenHash = hashToken(input.token);
    const tokenRecord = await this.invitationRepository.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw new AuthError(AuthErrorCodes.INVITATION_NOT_FOUND, 'Invalid invitation token');
    }

    const invitation = tokenRecord.invitation;

    if (invitation.status === 'ACCEPTED') {
      throw new AuthError(
        AuthErrorCodes.INVITATION_ALREADY_ACCEPTED,
        'Invitation already accepted',
      );
    }

    if (invitation.status === 'CANCELLED') {
      throw new AuthError(AuthErrorCodes.INVITATION_CANCELLED, 'Invitation has been cancelled');
    }

    if (invitation.expiresAt < new Date()) {
      await this.invitationRepository.updateStatus(invitation.id, 'EXPIRED');
      throw new AuthError(AuthErrorCodes.INVITATION_EXPIRED, 'Invitation has expired');
    }

    const roleId = invitation.roleId;
    if (!roleId) {
      throw new AuthError(
        AuthErrorCodes.VALIDATION_ERROR,
        'Invitation is missing a role assignment',
      );
    }

    const passwordHash = await hashPassword(input.password);
    const firstName = input.firstName ?? invitation.firstName;
    const lastName = input.lastName ?? invitation.lastName;

    const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          tenantId: invitation.tenantId,
          roleId,
          email: invitation.email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          phone: invitation.phone,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
        },
      });

      let employeeId = invitation.employeeId;

      if (employeeId) {
        await tx.employee.update({
          where: { id: employeeId },
          data: { userId: user.id, status: 'ACTIVE' },
        });
      } else {
        const employeeNo = `EMP-${Date.now().toString(36).toUpperCase()}`;
        const employee = await tx.employee.create({
          data: {
            tenantId: invitation.tenantId,
            branchId: invitation.branchId,
            userId: user.id,
            employeeNo,
            firstName,
            lastName,
            email: invitation.email,
            phone: invitation.phone,
            jobTitle: invitation.jobTitle,
            status: 'ACTIVE',
          },
        });
        employeeId = employee.id;
      }

      if (invitation.branchId) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId: invitation.branchId,
            isDefault: true,
          },
        });
      }

      await tx.employeeInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedById: user.id,
          acceptedAt: new Date(),
          employeeId,
        },
      });

      await tx.invitationToken.update({
        where: { id: tokenRecord.id },
        data: {
          usedAt: new Date(),
          ipAddress: input.clientInfo?.ipAddress ?? null,
          userAgent: input.clientInfo?.userAgent ?? null,
        },
      });

      await tx.invitationAuditLog.create({
        data: {
          tenantId: invitation.tenantId,
          invitationId: invitation.id,
          action: 'ACCEPTED',
          performedById: user.id,
          ipAddress: input.clientInfo?.ipAddress ?? null,
          userAgent: input.clientInfo?.userAgent ?? null,
          metadata: { employeeId },
        },
      });

      return { user, employeeId };
    });

    return result;
  }

  async list(tenantId: string) {
    return this.invitationRepository.listByTenant(tenantId);
  }

  async getById(invitationId: string, tenantId: string) {
    const invitation = await this.invitationRepository.findById(invitationId, tenantId);
    if (!invitation) {
      throw new AuthError(AuthErrorCodes.INVITATION_NOT_FOUND, 'Invitation not found');
    }
    return invitation;
  }
}
