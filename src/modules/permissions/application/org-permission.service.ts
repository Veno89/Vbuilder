import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { Permission } from '../domain/permissions';
import { requirePermission } from './permission-guard.service';

export type OrgPermissionGuard = {
  requireOrgPermission(input: {
    actorUserId: string;
    organizationId: string;
    permission: Permission;
  }): Promise<void>;
};

export class OrgPermissionService implements OrgPermissionGuard {
  constructor(private readonly memberships: MembershipRepository) {}

  async requireOrgPermission(input: {
    actorUserId: string;
    organizationId: string;
    permission: Permission;
  }): Promise<void> {
    const membership = await this.memberships.findByOrganizationAndUser(
      input.organizationId,
      input.actorUserId
    );

    if (!membership) {
      throw new AuthorizationError('Actor is not a member of this organization.');
    }

    requirePermission(membership.role, input.permission);
  }
}
