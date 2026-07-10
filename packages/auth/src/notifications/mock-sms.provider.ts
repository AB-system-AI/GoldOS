import { randomUUID } from 'crypto';

import type { PrismaClient } from '@goldos/database';

import type {
  NotificationDispatchResult,
  SmsNotificationPayload,
  SmsNotificationProvider,
} from './types.js';
import { sanitizeNotificationMetadata } from './sanitize.js';

export class MockSmsNotificationProvider implements SmsNotificationProvider {
  readonly channel = 'sms' as const;

  constructor(private readonly prisma: PrismaClient) {}

  async send(payload: SmsNotificationPayload): Promise<NotificationDispatchResult> {
    const messageId = randomUUID();
    const now = new Date();

    await this.prisma.notification.create({
      data: {
        id: messageId,
        tenantId: payload.tenantId,
        userId: payload.userId ?? undefined,
        channel: 'SMS',
        status: 'SENT',
        title: payload.template,
        body: payload.body,
        data: {
          template: payload.template,
          recipient: payload.to,
          metadata: sanitizeNotificationMetadata(payload.metadata),
          provider: 'mock-sms',
        },
        sentAt: now,
      },
    });

    return { messageId, dispatched: true };
  }
}
