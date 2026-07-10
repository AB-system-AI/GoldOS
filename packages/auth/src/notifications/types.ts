export interface NotificationDispatchResult {
  messageId: string;
  dispatched: boolean;
}

export interface EmailNotificationPayload {
  tenantId: string;
  userId?: string | null;
  to: string;
  subject: string;
  body: string;
  template: string;
  metadata?: Record<string, string>;
}

export interface SmsNotificationPayload {
  tenantId: string;
  userId?: string | null;
  to: string;
  body: string;
  template: string;
  metadata?: Record<string, string>;
}

export interface EmailNotificationProvider {
  readonly channel: 'email';
  send(payload: EmailNotificationPayload): Promise<NotificationDispatchResult>;
}

export interface SmsNotificationProvider {
  readonly channel: 'sms';
  send(payload: SmsNotificationPayload): Promise<NotificationDispatchResult>;
}
