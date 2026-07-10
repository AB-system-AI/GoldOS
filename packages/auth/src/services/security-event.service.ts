import type { SecurityEventInput } from '../types/index.js';
import type { SecurityRepository } from '../repositories/security.repository.js';

export class SecurityEventService {
  constructor(private readonly securityRepository: SecurityRepository) {}

  async recordLoginAttempt(input: SecurityEventInput) {
    return this.securityRepository.recordLoginAttempt({
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      result: input.result ?? 'SUCCESS',
      failureReason: input.failureReason,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      countryCode: input.countryCode,
      city: input.city,
      browser: input.browser,
      operatingSystem: input.operatingSystem,
      deviceType: input.deviceType,
      requestId: input.requestId,
      correlationId: input.correlationId,
      geo: input.geo,
    });
  }

  async recordFailedLogin(input: SecurityEventInput & { failureReason: string }) {
    await this.securityRepository.recordFailedLogin({
      tenantId: input.tenantId,
      userId: input.userId,
      email: input.email,
      failureReason: input.failureReason,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      countryCode: input.countryCode,
      city: input.city,
      browser: input.browser,
      operatingSystem: input.operatingSystem,
      deviceType: input.deviceType,
      requestId: input.requestId,
      correlationId: input.correlationId,
      geo: input.geo,
    });

    return this.recordLoginAttempt({
      ...input,
      result: 'FAILED',
      failureReason: input.failureReason,
    });
  }

  async recordSecurityEvent(input: SecurityEventInput) {
    return this.recordLoginAttempt(input);
  }
}
