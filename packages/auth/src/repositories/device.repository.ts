import type { DeviceType, PrismaClient } from '@goldos/database';

export class DeviceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listForUser(userId: string, tenantId: string) {
    return this.prisma.device.findMany({
      where: {
        userId,
        tenantId,
        deletedAt: null,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  findById(deviceId: string, userId: string) {
    return this.prisma.device.findFirst({
      where: { id: deviceId, userId, deletedAt: null },
    });
  }

  upsertDevice(data: {
    tenantId: string;
    userId: string;
    identifier: string;
    name: string;
    type?: DeviceType;
    branchId?: string | null;
  }) {
    return this.prisma.device.upsert({
      where: {
        tenantId_identifier: {
          tenantId: data.tenantId,
          identifier: data.identifier,
        },
      },
      create: {
        tenantId: data.tenantId,
        userId: data.userId,
        identifier: data.identifier,
        name: data.name,
        type: data.type ?? 'OTHER',
        branchId: data.branchId ?? null,
        lastSeenAt: new Date(),
      },
      update: {
        userId: data.userId,
        name: data.name,
        lastSeenAt: new Date(),
      },
    });
  }

  trustDevice(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { isTrusted: true },
    });
  }

  revokeDevice(deviceId: string) {
    return this.prisma.device.update({
      where: { id: deviceId },
      data: { deletedAt: new Date(), isTrusted: false },
    });
  }

  listTrustedDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId, deletedAt: null },
      include: { device: true },
      orderBy: { trustedAt: 'desc' },
    });
  }

  trustByFingerprint(data: {
    userId: string;
    fingerprint: string;
    name?: string | null;
    deviceId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    expiresAt?: Date | null;
  }) {
    return this.prisma.trustedDevice.upsert({
      where: {
        userId_fingerprint: {
          userId: data.userId,
          fingerprint: data.fingerprint,
        },
      },
      create: {
        userId: data.userId,
        fingerprint: data.fingerprint,
        name: data.name ?? null,
        deviceId: data.deviceId ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt ?? null,
        lastUsedAt: new Date(),
      },
      update: {
        lastUsedAt: new Date(),
        deviceId: data.deviceId ?? undefined,
      },
    });
  }

  listRememberedDevices(userId: string) {
    return this.prisma.rememberedDevice.findMany({
      where: {
        userId,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  revokeRememberedDevice(id: string, userId: string) {
    return this.prisma.rememberedDevice.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  revokeTrustedDevice(id: string, userId: string) {
    return this.prisma.trustedDevice.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
