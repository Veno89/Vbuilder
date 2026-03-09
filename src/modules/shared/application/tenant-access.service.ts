import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { requirePermission } from '@/modules/permissions/application/permission-guard.service';
import { NotFoundError } from '@/modules/shared/domain/errors';
import type { Permission } from '@/modules/permissions/domain/permissions';

export class TenantAccessService {
  constructor(private readonly membershipRepository: MembershipRepository) {}

  async assertOrgPermission(input: {
    organizationId: string;
    userId: string;
    permission: Permission;
  }): Promise<void> {
    const membership = await this.membershipRepository.findByOrganizationAndUser(
      input.organizationId,
      input.userId
    );

    if (!membership) {
      throw new NotFoundError('Organization membership was not found for this user.');
    }

    requirePermission(membership.role, input.permission);
  }
}
