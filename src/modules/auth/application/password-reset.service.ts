import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import type { UserRepository } from '@/modules/users/domain/user.types';
import { hashPassword } from '../domain/password';
import { expiresAtFromNow, generateRawToken, hashToken } from '../domain/token';
import type { PasswordResetTokenRepository } from '../domain/session.types';

export type PasswordResetNotifier = {
  sendResetPasswordEmail(input: { userId: string; email: string; resetToken: string }): Promise<void>;
};

const PASSWORD_RESET_EXPIRY_MINUTES = 30;

export class PasswordResetService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: PasswordResetTokenRepository,
    private readonly notifier: PasswordResetNotifier,
    private readonly auditLogWriter: AuditLogWriter
  ) {}

  async requestReset(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.users.findByEmail(normalizedEmail);

    if (!user) {
      return;
    }

    const rawToken = generateRawToken();
    await this.tokens.create({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: expiresAtFromNow(PASSWORD_RESET_EXPIRY_MINUTES)
    });

    await this.notifier.sendResetPasswordEmail({
      userId: user.id,
      email: user.email,
      resetToken: rawToken
    });

    await this.auditLogWriter.write({
      actorUserId: user.id,
      organizationId: null,
      action: 'auth.password_reset_requested',
      targetType: 'user',
      targetId: user.id
    });
  }

  async resetPassword(input: { token: string; newPassword: string }): Promise<void> {
    const token = await this.tokens.consumeValidToken(hashToken(input.token));
    if (!token) {
      throw new AuthorizationError('Invalid or expired password reset token.');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.users.updatePassword(token.userId, passwordHash);

    await this.auditLogWriter.write({
      actorUserId: token.userId,
      organizationId: null,
      action: 'auth.password_reset_completed',
      targetType: 'user',
      targetId: token.userId
    });
  }
}
