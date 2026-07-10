import { hashToken } from '../crypto/password.js';
import type {
  EmailNotificationProvider,
  NotificationDispatchResult,
  SmsNotificationProvider,
} from './types.js';

export class NotificationService {
  constructor(
    private readonly emailProvider: EmailNotificationProvider,
    private readonly smsProvider: SmsNotificationProvider,
  ) {}

  async sendPasswordReset(input: {
    tenantId: string;
    userId: string;
    email: string;
    token: string;
    tenantSlug: string;
  }): Promise<NotificationDispatchResult> {
    return this.emailProvider.send({
      tenantId: input.tenantId,
      userId: input.userId,
      to: input.email,
      subject: 'Reset your GoldOS password',
      body: 'A password reset was requested for your account. Use the secure link provided to set a new password.',
      template: 'password_reset',
      metadata: {
        tenantSlug: input.tenantSlug,
        tokenRef: hashToken(input.token),
      },
    });
  }

  async sendEmailVerification(input: {
    tenantId: string;
    userId: string;
    email: string;
    token: string;
  }): Promise<NotificationDispatchResult> {
    return this.emailProvider.send({
      tenantId: input.tenantId,
      userId: input.userId,
      to: input.email,
      subject: 'Verify your GoldOS email address',
      body: 'Please verify your email address to activate your account.',
      template: 'email_verification',
      metadata: {
        tokenRef: hashToken(input.token),
      },
    });
  }

  async sendInvitation(input: {
    tenantId: string;
    email: string;
    token: string;
    tenantSlug: string;
    invitedByName?: string;
  }): Promise<NotificationDispatchResult> {
    return this.emailProvider.send({
      tenantId: input.tenantId,
      to: input.email,
      subject: 'You have been invited to GoldOS',
      body: 'You have been invited to join your organization on GoldOS.',
      template: 'invitation',
      metadata: {
        tenantSlug: input.tenantSlug,
        invitedByName: input.invitedByName ?? 'your administrator',
        tokenRef: hashToken(input.token),
      },
    });
  }

  async sendPhoneVerification(input: {
    tenantId: string;
    userId: string;
    phone: string;
    code: string;
  }): Promise<NotificationDispatchResult> {
    return this.smsProvider.send({
      tenantId: input.tenantId,
      userId: input.userId,
      to: input.phone,
      body: 'Your GoldOS verification code has been sent. Enter it in the app to verify your phone number.',
      template: 'phone_verification',
      metadata: {
        codeRef: hashToken(input.code),
      },
    });
  }

  async sendSecurityAlert(input: {
    tenantId: string;
    userId: string;
    email: string;
    subject: string;
    body: string;
    template: string;
  }): Promise<NotificationDispatchResult> {
    return this.emailProvider.send({
      tenantId: input.tenantId,
      userId: input.userId,
      to: input.email,
      subject: input.subject,
      body: input.body,
      template: input.template,
    });
  }
}
