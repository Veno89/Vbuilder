import { expiresAtFromNow, generateRawToken, hashToken } from '../domain/token';
import type { EmailVerificationTokenRepository } from '../domain/session.types';

const EMAIL_VERIFICATION_EXPIRY_MINUTES = 60 * 24;

export class EmailVerificationService {
  constructor(private readonly tokens: EmailVerificationTokenRepository) {}

  async createToken(userId: string): Promise<string> {
    const rawToken = generateRawToken();
    await this.tokens.create({
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: expiresAtFromNow(EMAIL_VERIFICATION_EXPIRY_MINUTES)
    });
    return rawToken;
  }
}
