import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import {
  createOrganizationSchema,
  transferOwnershipSchema,
  type CreateOrganizationInput,
  type TransferOwnershipInput
} from '../schemas/organization.schemas';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import type { OrgPermissionGuard } from '@/modules/permissions/application/org-permission.service';

export class OrganizationService {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly permissions: OrgPermissionGuard,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async create(rawInput: CreateOrganizationInput & { actorUserId: string }): Promise<{ organizationId: string }> {
    const input = createOrganizationSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    const existing = await this.organizations.findBySlug(input.slug);
    if (existing) {
      throw new AuthorizationError('Organization slug is already in use.');
    }

    const organization = await this.organizations.create({
      name: input.name,
      slug: input.slug,
      ownerUserId: actorUserId
    });

    await this.memberships.create({
      organizationId: organization.id,
      userId: actorUserId,
      role: 'owner'
    });

    await this.auditLogs.write({
      actorUserId,
      organizationId: organization.id,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id
    });

    return { organizationId: organization.id };
  }

  async transferOwnership(
    rawInput: TransferOwnershipInput & { actorUserId: string }
  ): Promise<void> {
    const input = transferOwnershipSchema.parse(rawInput);
    const actorUserId = rawInput.actorUserId;

    if (actorUserId === input.targetUserId) {
      throw new AuthorizationError('Target owner must be different from current owner.');
    }

    await this.permissions.requireOrgPermission({
      actorUserId,
      organizationId: input.organizationId,
      permission: 'organization:ownership.transfer'
    });

    const targetMembership = await this.memberships.findByOrganizationAndUser(
      input.organizationId,
      input.targetUserId
    );

    if (!targetMembership) {
      throw new AuthorizationError('Target user must already be a member of this organization.');
    }

    await this.organizations.transferOwnership({
      organizationId: input.organizationId,
      currentOwnerUserId: actorUserId,
      targetOwnerUserId: input.targetUserId
    });

    await this.auditLogs.write({
      actorUserId,
      organizationId: input.organizationId,
      action: 'organization.ownership_transferred',
      targetType: 'organization',
      targetId: input.organizationId,
      metadata: {
        previousOwnerUserId: actorUserId,
        newOwnerUserId: input.targetUserId
      }
    });
  }
}
