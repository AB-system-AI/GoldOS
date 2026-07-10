import type { DeviceRepository } from '../repositories/device.repository.js';
import type { ClientInfo, DeviceInfo } from '../types/index.js';
import { AuthError, AuthErrorCodes } from '../errors/auth-error.js';

export class DeviceService {
  constructor(private readonly deviceRepository: DeviceRepository) {}

  async list(userId: string, tenantId: string): Promise<DeviceInfo[]> {
    const devices = await this.deviceRepository.listForUser(userId, tenantId);
    return devices.map(
      (device: {
        id: string;
        name: string;
        type: string;
        identifier: string;
        isTrusted: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
      }) => ({
        id: device.id,
        name: device.name,
        type: device.type,
        identifier: device.identifier,
        isTrusted: device.isTrusted,
        lastSeenAt: device.lastSeenAt,
        createdAt: device.createdAt,
      }),
    );
  }

  async registerOrUpdate(
    tenantId: string,
    userId: string,
    clientInfo: ClientInfo,
    branchId?: string | null,
  ) {
    if (!clientInfo.fingerprint) {
      return null;
    }

    return this.deviceRepository.upsertDevice({
      tenantId,
      userId,
      identifier: clientInfo.fingerprint,
      name: clientInfo.browser
        ? `${clientInfo.browser} on ${clientInfo.operatingSystem ?? 'Unknown'}`
        : 'Unknown device',
      branchId,
    });
  }

  async trust(userId: string, deviceId: string, clientInfo?: ClientInfo) {
    const device = await this.deviceRepository.findById(deviceId, userId);
    if (!device) {
      throw new AuthError(AuthErrorCodes.VALIDATION_ERROR, 'Device not found');
    }

    await this.deviceRepository.trustDevice(deviceId);

    if (clientInfo?.fingerprint) {
      await this.deviceRepository.trustByFingerprint({
        userId,
        fingerprint: clientInfo.fingerprint,
        deviceId,
        name: device.name,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
      });
    }

    return { trusted: true };
  }

  async revoke(userId: string, deviceId: string) {
    const device = await this.deviceRepository.findById(deviceId, userId);
    if (!device) {
      throw new AuthError(AuthErrorCodes.VALIDATION_ERROR, 'Device not found');
    }

    await this.deviceRepository.revokeDevice(deviceId);
    return { revoked: true };
  }

  async revokeTrusted(userId: string, trustedDeviceId: string) {
    await this.deviceRepository.revokeTrustedDevice(trustedDeviceId, userId);
    return { revoked: true };
  }

  async revokeRemembered(userId: string, rememberedDeviceId: string) {
    await this.deviceRepository.revokeRememberedDevice(rememberedDeviceId, userId);
    return { revoked: true };
  }
}
