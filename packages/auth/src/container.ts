import type { PrismaClient } from '@goldos/database';
import { prisma } from '@goldos/database';

import {
  MockEmailNotificationProvider,
  MockSmsNotificationProvider,
  NotificationService,
} from './notifications/index.js';
import { DeviceRepository } from './repositories/device.repository.js';
import { InvitationRepository } from './repositories/invitation.repository.js';
import { PermissionRepository } from './repositories/permission.repository.js';
import { RateLimitRepository } from './repositories/rate-limit.repository.js';
import { SecurityRepository } from './repositories/security.repository.js';
import { SessionRepository } from './repositories/session.repository.js';
import { UserRepository } from './repositories/user.repository.js';
import { VerificationRepository } from './repositories/verification.repository.js';
import { DatabaseRateLimitBackend } from './security/database-rate-limit-backend.js';
import { RateLimitService } from './security/rate-limit.service.js';
import { AuthService } from './services/auth.service.js';
import { DeviceService } from './services/device.service.js';
import { InvitationService } from './services/invitation.service.js';
import { PermissionService } from './services/permission.service.js';
import { SecurityEventService } from './services/security-event.service.js';
import { SessionService } from './services/session.service.js';
import { TwoFactorService } from './services/two-factor.service.js';
import { VerificationService } from './services/verification.service.js';

export interface AuthContainerOptions {
  authSecret: string;
  prisma?: PrismaClient;
}

export interface AuthContainer {
  authService: AuthService;
  sessionService: SessionService;
  permissionService: PermissionService;
  invitationService: InvitationService;
  verificationService: VerificationService;
  twoFactorService: TwoFactorService;
  deviceService: DeviceService;
  securityEventService: SecurityEventService;
  notificationService: NotificationService;
  rateLimitService: RateLimitService;
}

export function createAuthContainer(options: AuthContainerOptions): AuthContainer {
  const { authSecret, prisma: prismaClient = prisma } = options;

  const userRepository = new UserRepository(prismaClient);
  const sessionRepository = new SessionRepository(prismaClient);
  const permissionRepository = new PermissionRepository(prismaClient);
  const invitationRepository = new InvitationRepository(prismaClient);
  const verificationRepository = new VerificationRepository(prismaClient);
  const deviceRepository = new DeviceRepository(prismaClient);
  const securityRepository = new SecurityRepository(prismaClient);
  const rateLimitRepository = new RateLimitRepository(prismaClient);

  const rateLimitBackend = new DatabaseRateLimitBackend(rateLimitRepository);
  const rateLimitService = new RateLimitService(rateLimitBackend);

  const emailProvider = new MockEmailNotificationProvider(prismaClient);
  const smsProvider = new MockSmsNotificationProvider(prismaClient);
  const notificationService = new NotificationService(emailProvider, smsProvider);

  const permissionService = new PermissionService(permissionRepository);
  const securityEventService = new SecurityEventService(securityRepository);
  const sessionService = new SessionService(
    sessionRepository,
    permissionService,
    securityEventService,
    authSecret,
  );
  const deviceService = new DeviceService(deviceRepository);
  const twoFactorService = new TwoFactorService(
    userRepository,
    securityRepository,
    sessionService,
    permissionService,
  );
  const verificationService = new VerificationService(
    userRepository,
    verificationRepository,
    securityRepository,
    notificationService,
    rateLimitService,
    sessionService,
  );
  const invitationService = new InvitationService(
    invitationRepository,
    userRepository,
    notificationService,
    prismaClient,
  );
  const authService = new AuthService(
    userRepository,
    sessionService,
    permissionService,
    securityEventService,
    twoFactorService,
    deviceService,
    rateLimitService,
    authSecret,
  );

  return {
    authService,
    sessionService,
    permissionService,
    invitationService,
    verificationService,
    twoFactorService,
    deviceService,
    securityEventService,
    notificationService,
    rateLimitService,
  };
}
