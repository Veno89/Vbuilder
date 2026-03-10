import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { generateRawToken } from '@/modules/auth/domain/token';
import { EntitlementEnforcementService } from '@/modules/entitlements/application/entitlement-enforcement.service';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { OrgPermissionService } from '@/modules/permissions/application/org-permission.service';
import { db } from '@/server/db/client';
import { BillingRepository } from '@/modules/billing/infrastructure/billing.repository';
import { InvitationRepository } from '../infrastructure/invitation.repository';
import { InvitationService, type InvitationNotifier } from './invitation.service';

const noopInvitationNotifier: InvitationNotifier = {
  async sendOrganizationInvite(): Promise<void> {
    return;
  }
};

const invitations = new InvitationRepository(db);
const memberships = new MembershipRepository(db);
const permissions = new OrgPermissionService(memberships);
const billings = new BillingRepository(db);
const entitlements = new EntitlementEnforcementService(memberships, billings);

export const invitationService = new InvitationService(
  invitations,
  memberships,
  permissions,
  entitlements,
  noopInvitationNotifier,
  auditLogWriter
);

export function issueInvitationToken(): string {
  return generateRawToken();
}
