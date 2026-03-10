import { and, count, eq } from 'drizzle-orm';
import { memberships } from '@/server/db/schema';
import type { DatabaseClient } from '@/server/db/client';

export type MembershipRole = 'owner' | 'admin' | 'member' | 'viewer';

export type MembershipRecord = {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
};

export class MembershipRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(input: {
    organizationId: string;
    userId: string;
    role: MembershipRole;
  }): Promise<MembershipRecord> {
    const result = await this.database.insert(memberships).values(input).returning();
    const created = result[0];
    if (!created) {
      throw new Error('Failed to create membership record.');
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      userId: created.userId,
      role: created.role
    };
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string
  ): Promise<MembershipRecord | null> {
    const record = await this.database.query.memberships.findFirst({
      where: and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId))
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      organizationId: record.organizationId,
      userId: record.userId,
      role: record.role
    };
  }

  async updateRole(input: {
    organizationId: string;
    userId: string;
    role: MembershipRole;
  }): Promise<void> {
    await this.database
      .update(memberships)
      .set({ role: input.role })
      .where(
        and(
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.userId, input.userId)
        )
      );
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    await this.database
      .delete(memberships)
      .where(and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)));
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    const result = await this.database
      .select({ value: count() })
      .from(memberships)
      .where(eq(memberships.organizationId, organizationId));

    return result[0]?.value ?? 0;
  }
}
