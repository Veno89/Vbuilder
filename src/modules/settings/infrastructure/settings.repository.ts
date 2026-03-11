import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import { organizations, users } from '@/server/db/schema';

export type AccountSettingsRecord = {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  isSuspended: boolean;
};

export class SettingsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findAccountByUserId(userId: string): Promise<AccountSettingsRecord | null> {
    const record = await this.db.query.users.findFirst({ where: eq(users.id, userId) });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      email: record.email,
      emailVerifiedAt: record.emailVerifiedAt,
      isSuspended: record.isSuspended
    };
  }

  async findAccountByEmail(email: string): Promise<AccountSettingsRecord | null> {
    const record = await this.db.query.users.findFirst({ where: eq(users.email, email) });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      email: record.email,
      emailVerifiedAt: record.emailVerifiedAt,
      isSuspended: record.isSuspended
    };
  }

  async updateAccountEmail(userId: string, email: string): Promise<void> {
    await this.db
      .update(users)
      .set({ email, updatedAt: new Date(), emailVerifiedAt: null })
      .where(eq(users.id, userId));
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async findPasswordHashByUserId(userId: string): Promise<string | null> {
    const record = await this.db.query.users.findFirst({ where: eq(users.id, userId) });
    return record?.passwordHash ?? null;
  }

  async findOrganizationBySlug(slug: string): Promise<{ id: string } | null> {
    const record = await this.db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
    return record ? { id: record.id } : null;
  }

  async updateOrganizationSettings(input: {
    organizationId: string;
    name: string;
    slug: string;
  }): Promise<void> {
    await this.db
      .update(organizations)
      .set({ name: input.name, slug: input.slug, updatedAt: new Date() })
      .where(eq(organizations.id, input.organizationId));
  }
}
