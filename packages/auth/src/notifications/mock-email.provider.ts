import { randomUUID } from 'crypto';

import type { PrismaClient } from '@goldos/database';

import type {
  EmailNotificationPayload,
  EmailNotificationProvider,
  NotificationDispatchResult,
} from './types.js';
import { sanitizeNotificationMetadata } from './sanitize.js';

export class MockEmailNotificationProvider implements EmailNotificationProvider {
  readonly channel = 'email' as const;

  constructor(private readonly prisma: PrismaClient) {}

  async send(payload: EmailNotificationPayload): Promise<NotificationDispatchResult> {
    const messageId = randomUUID();
    const now = new Date();

    await this.prisma.notification.create({
      data: {
        id: messageId,
        tenantId: payload.tenantId,
        userId: payload.userId ?? undefined,
        channel: 'EMAIL',
        status: 'SENT',
        title: payload.subject,
        body: payload.body,
        data: {
          template: payload.template,
          recipient: payload.to,
          metadata: sanitizeNotificationMetadata(payload.metadata),
          provider: 'mock-email',
        },
        sentAt: now,
      },
    });

    return { messageId, dispatched: true };
  }
}
