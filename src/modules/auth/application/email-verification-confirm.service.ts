import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { UserRepository } from '@/modules/users/domain/user.types';
import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { hashToken } from '../domain/token';
import type { EmailVerificationTokenRepository } from '../domain/session.types';

export class EmailVerificationConfirmService {
  constructor(
    private readonly tokenRepository: EmailVerificationTokenRepository,
    private readonly userRepository: UserRepository,
    private readonly auditLogWriter: AuditLogWriter
  ) {}

  async confirm(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const token = await this.tokenRepository.consumeValidToken(tokenHash);

    if (!token) {
      throw new AuthorizationError('Invalid or expired email verification token.');
    }

    await this.userRepository.markEmailVerified(token.userId);
    await this.auditLogWriter.write({
      actorUserId: token.userId,
      organizationId: null,
      action: 'auth.verify_email',
      targetType: 'user',
      targetId: token.userId
    });
  }
}
