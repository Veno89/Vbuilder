import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import {
  emailVerificationTokens,
  passwordResetTokens,
  sessions,
  users
} from '@/server/db/schema';
import type {
  EmailVerificationTokenRepository,
  PasswordResetTokenRepository,
  SessionRecord,
  SessionRepository
} from '../domain/session.types';
import type { User, UserRepository } from '@/modules/users/domain/user.types';

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.db.query.users.findFirst({ where: eq(users.email, email) });
    return record ?? null;
  }

  async findById(userId: string): Promise<User | null> {
    const record = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    return record ?? null;
  }

  async create(input: { email: string; passwordHash: string }): Promise<User> {
    const result = await this.db
      .insert(users)
      .values({ email: input.email, passwordHash: input.passwordHash })
      .returning();
    const created = result[0];
    if (!created) {
      throw new Error('Failed to create user record.');
    }
    return created;
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}

export class DrizzleSessionRepository implements SessionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<SessionRecord> {
    const result = await this.db.insert(sessions).values(input).returning();
    const created = result[0];
    if (!created) {
      throw new Error('Failed to create session record.');
    }
    return created;
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }
  async revokeAllActiveForUserExcept(userId: string, keepTokenHash: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          ne(sessions.tokenHash, keepTokenHash)
        )
      );
  }
}


export class DrizzleEmailVerificationTokenRepository implements EmailVerificationTokenRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(emailVerificationTokens).values(input);
  }

  async consumeValidToken(tokenHash: string): Promise<{ userId: string } | null> {
    const now = new Date();
    const record = await this.db.query.emailVerificationTokens.findFirst({
      where: and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        gt(emailVerificationTokens.expiresAt, now),
        isNull(emailVerificationTokens.consumedAt)
      )
    });

    if (!record) {
      return null;
    }

    await this.db
      .update(emailVerificationTokens)
      .set({ consumedAt: now })
      .where(eq(emailVerificationTokens.id, record.id));

    return { userId: record.userId };
  }
}

export class DrizzlePasswordResetTokenRepository implements PasswordResetTokenRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    await this.db.insert(passwordResetTokens).values(input);
  }

  async consumeValidToken(tokenHash: string): Promise<{ userId: string } | null> {
    const now = new Date();
    const record = await this.db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        gt(passwordResetTokens.expiresAt, now),
        isNull(passwordResetTokens.consumedAt)
      )
    });

    if (!record) {
      return null;
    }

    await this.db
      .update(passwordResetTokens)
      .set({ consumedAt: now })
      .where(eq(passwordResetTokens.id, record.id));

    return { userId: record.userId };
  }
}
