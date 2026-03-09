import { and, eq, gt, isNull } from 'drizzle-orm';
import type { DatabaseClient } from '@/server/db/client';
import { invitations } from '@/server/db/schema';
import type { MembershipRole } from '@/modules/memberships/infrastructure/membership.repository';

export type InvitationRecord = {
  id: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  invitedByUserId: string;
  tokenHash: string;
  expiresAt: Date;
};

export class InvitationRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: {
    organizationId: string;
    email: string;
    role: MembershipRole;
    invitedByUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<InvitationRecord> {
    const result = await this.db.insert(invitations).values(input).returning();
    const created = result[0];
    if (!created) {
      throw new Error('Failed to create invitation record.');
    }

    return {
      id: created.id,
      organizationId: created.organizationId,
      email: created.email,
      role: created.role,
      invitedByUserId: created.invitedByUserId,
      tokenHash: created.tokenHash,
      expiresAt: created.expiresAt
    };
  }

  async consumeValidToken(tokenHash: string): Promise<InvitationRecord | null> {
    const now = new Date();
    const found = await this.db.query.invitations.findFirst({
      where: and(
        eq(invitations.tokenHash, tokenHash),
        gt(invitations.expiresAt, now),
        isNull(invitations.acceptedAt),
        isNull(invitations.declinedAt)
      )
    });

    if (!found) {
      return null;
    }

    await this.db
      .update(invitations)
      .set({ acceptedAt: now })
      .where(eq(invitations.id, found.id));

    return {
      id: found.id,
      organizationId: found.organizationId,
      email: found.email,
      role: found.role,
      invitedByUserId: found.invitedByUserId,
      tokenHash: found.tokenHash,
      expiresAt: found.expiresAt
    };
  }
}
