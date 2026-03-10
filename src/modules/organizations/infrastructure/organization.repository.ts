import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import { memberships, organizations } from '@/server/db/schema';

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  ownerUserId: string;
};

export class OrganizationRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(input: { name: string; slug: string; ownerUserId: string }): Promise<OrganizationRecord> {
    const result = await this.database.insert(organizations).values(input).returning();
    const created = result[0];
    if (!created) {
      throw new Error('Failed to create organization record.');
    }

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      ownerUserId: created.ownerUserId
    };
  }

  async findBySlug(slug: string): Promise<OrganizationRecord | null> {
    const result = await this.database.query.organizations.findFirst({
      where: eq(organizations.slug, slug)
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      slug: result.slug,
      ownerUserId: result.ownerUserId
    };
  }

  async findByIdForMember(
    organizationId: string,
    memberUserId: string
  ): Promise<OrganizationRecord | null> {
    const result = await this.database
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        ownerUserId: organizations.ownerUserId
      })
      .from(organizations)
      .innerJoin(
        memberships,
        and(
          eq(memberships.organizationId, organizations.id),
          eq(memberships.userId, memberUserId)
        )
      )
      .where(eq(organizations.id, organizationId))
      .limit(1);

    return result[0] ?? null;
  }

  async transferOwnership(input: {
    organizationId: string;
    currentOwnerUserId: string;
    targetOwnerUserId: string;
  }): Promise<void> {
    await this.database.transaction(async (tx) => {
      const updatedOrganization = await tx
        .update(organizations)
        .set({ ownerUserId: input.targetOwnerUserId })
        .where(
          and(
            eq(organizations.id, input.organizationId),
            eq(organizations.ownerUserId, input.currentOwnerUserId)
          )
        )
        .returning({ id: organizations.id });

      if (!updatedOrganization[0]) {
        throw new Error('Ownership transfer failed due to stale owner state.');
      }

      const demotedOwner = await tx
        .update(memberships)
        .set({ role: 'admin' })
        .where(
          and(
            eq(memberships.organizationId, input.organizationId),
            eq(memberships.userId, input.currentOwnerUserId),
            eq(memberships.role, 'owner')
          )
        )
        .returning({ id: memberships.id });

      if (!demotedOwner[0]) {
        throw new Error('Current owner membership was not in owner role.');
      }

      const promotedOwner = await tx
        .update(memberships)
        .set({ role: 'owner' })
        .where(
          and(
            eq(memberships.organizationId, input.organizationId),
            eq(memberships.userId, input.targetOwnerUserId)
          )
        )
        .returning({ id: memberships.id });

      if (!promotedOwner[0]) {
        throw new Error('Target user is not a member of this organization.');
      }
    });
  }
}
