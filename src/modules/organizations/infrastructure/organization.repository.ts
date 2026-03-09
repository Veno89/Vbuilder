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
}
