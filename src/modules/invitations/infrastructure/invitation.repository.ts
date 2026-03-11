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

  async findValidToken(tokenHash: string): Promise<InvitationRecord | null> {
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

  async markAccepted(invitationId: string): Promise<boolean> {
    const now = new Date();
    const result = await this.db
      .update(invitations)
      .set({ acceptedAt: now })
      .where(
        and(
          eq(invitations.id, invitationId),
          gt(invitations.expiresAt, now),
          isNull(invitations.acceptedAt),
          isNull(invitations.declinedAt)
        )
      )
      .returning({ id: invitations.id });

    return Boolean(result[0]);
  }

  async declineValidToken(tokenHash: string): Promise<InvitationRecord | null> {
    const now = new Date();
    const result = await this.db
      .update(invitations)
      .set({ declinedAt: now })
      .where(
        and(
          eq(invitations.tokenHash, tokenHash),
          gt(invitations.expiresAt, now),
          isNull(invitations.acceptedAt),
          isNull(invitations.declinedAt)
        )
      )
      .returning();

    const found = result[0];
    if (!found) {
      return null;
    }

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
