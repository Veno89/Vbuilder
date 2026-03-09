import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { generateRawToken } from '@/modules/auth/domain/token';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { db } from '@/server/db/client';
import { InvitationRepository } from '../infrastructure/invitation.repository';
import { InvitationService, type InvitationNotifier } from './invitation.service';

const noopAuditWriter: AuditLogWriter = {
  async write(): Promise<void> {
    return;
  }
};

const noopInvitationNotifier: InvitationNotifier = {
  async sendOrganizationInvite(): Promise<void> {
    return;
  }
};

const invitations = new InvitationRepository(db);
const memberships = new MembershipRepository(db);

export const invitationService = new InvitationService(
  invitations,
  memberships,
  noopInvitationNotifier,
  noopAuditWriter
);

export function issueInvitationToken(): string {
  return generateRawToken();
}
