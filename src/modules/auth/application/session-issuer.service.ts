import { expiresAtFromNow, generateRawToken, hashToken } from '../domain/token';
import type { SessionRepository } from '../domain/session.types';

const DEFAULT_SESSION_MINUTES = 60 * 24 * 7;

export class SessionIssuerService {
  constructor(private readonly sessions: SessionRepository) {}

  async issue(userId: string): Promise<{ token: string; expiresAt: Date }> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = expiresAtFromNow(DEFAULT_SESSION_MINUTES);

    await this.sessions.create({ userId, tokenHash, expiresAt });
    await this.sessions.revokeAllActiveForUserExcept(userId, tokenHash);

    return { token: rawToken, expiresAt };
  }
}
