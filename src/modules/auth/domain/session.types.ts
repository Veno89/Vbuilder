export type SessionRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export interface SessionRepository {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<SessionRecord>;
  findValidByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  revokeAllActiveForUserExcept(userId: string, keepTokenHash: string): Promise<void>;
}

export interface EmailVerificationTokenRepository {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  consumeValidToken(tokenHash: string): Promise<{ userId: string } | null>;
}

export interface PasswordResetTokenRepository {
  create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  consumeValidToken(tokenHash: string): Promise<{ userId: string } | null>;
}
