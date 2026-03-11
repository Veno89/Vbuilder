export type TransactionalEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type TransactionalEmailProvider = {
  sendEmail(input: TransactionalEmailInput): Promise<void>;
};

import { recordNotification } from './notification-inbox';

export class NotificationService {
  constructor(
    private readonly provider: TransactionalEmailProvider,
    private readonly appUrl: string,
    private readonly captureInboxMessages: boolean
  ) {}

  async sendVerifyEmail(input: { userId: string; email: string; verificationToken: string }): Promise<void> {
    const verificationUrl = `${this.appUrl}/verify-email?token=${encodeURIComponent(input.verificationToken)}`;

    try {
      await this.provider.sendEmail({
        to: input.email,
        subject: 'Verify your email',
        html: `<p>Welcome! Verify your email to activate your account.</p><p><a href="${verificationUrl}">Verify email</a></p>`
      });

      if (this.captureInboxMessages) {
        recordNotification({
          to: input.email,
          subject: 'Verify your email',
          html: `<p>Welcome! Verify your email to activate your account.</p><p><a href="${verificationUrl}">Verify email</a></p>`,
          verificationToken: input.verificationToken
        });
      }
    } catch (error) {
      console.error('Failed to send verification email.', {
        userId: input.userId,
        email: input.email,
        error
      });
      throw new Error('Unable to deliver verification email.');
    }
  }

  async sendResetPasswordEmail(input: { userId: string; email: string; resetToken: string }): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${encodeURIComponent(input.resetToken)}`;

    try {
      await this.provider.sendEmail({
        to: input.email,
        subject: 'Reset your password',
        html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset password</a></p>`
      });

      if (this.captureInboxMessages) {
        recordNotification({
          to: input.email,
          subject: 'Reset your password',
          html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset password</a></p>`
        });
      }
    } catch (error) {
      console.error('Failed to send password reset email.', {
        userId: input.userId,
        email: input.email,
        error
      });
      throw new Error('Unable to deliver password reset email.');
    }
  }

  async sendOrganizationInvite(input: {
    email: string;
    organizationId: string;
    invitedByUserId: string;
    token: string;
    role: 'admin' | 'member' | 'viewer';
  }): Promise<void> {
    const inviteUrl = `${this.appUrl}/accept-invitation?token=${encodeURIComponent(input.token)}`;

    try {
      await this.provider.sendEmail({
        to: input.email,
        subject: 'You have been invited to an organization',
        html: `<p>You were invited to join organization ${input.organizationId} as ${input.role}.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`
      });

      if (this.captureInboxMessages) {
        recordNotification({
          to: input.email,
          subject: 'You have been invited to an organization',
          html: `<p>You were invited to join organization ${input.organizationId} as ${input.role}.</p><p><a href="${inviteUrl}">Accept invitation</a></p>`
        });
      }
    } catch (error) {
      console.error('Failed to send organization invitation email.', {
        invitedByUserId: input.invitedByUserId,
        organizationId: input.organizationId,
        email: input.email,
        role: input.role,
        error
      });
      throw new Error('Unable to deliver organization invitation email.');
    }
  }
}
