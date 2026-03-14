import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';
import type { AuditLogEvent } from '@/modules/audit-logs/domain/audit-log.types';
import type { Permission } from '@/modules/permissions/domain/permissions';
import type { MembershipRecord, MutableMembershipRole } from '../domain/membership.types';
import {
  removeMembershipSchema,
  updateMembershipRoleSchema,
  type RemoveMembershipInput,
  type UpdateMembershipRoleInput
} from '../schemas/membership.schemas';

type MembershipRepositoryPort = {
  findByOrganizationAndUser(organizationId: string, userId: string): Promise<MembershipRecord | null>;
  updateRole(input: {
    organizationId: string;
    userId: string;
    role: MutableMembershipRole;
  }): Promise<boolean>;
  remove(organizationId: string, userId: string): Promise<boolean>;
};

type OrgPermissionGuardPort = {
  requireOrgPermission(input: {
    actorUserId: string;
    organizationId: string;
    permission: Permission;
  }): Promise<void>;
};

type MembershipAuditAction = 'membership.role_updated' | 'membership.removed';

type MembershipAuditEvent = Omit<AuditLogEvent, 'action' | 'targetType'> & {
  actorUserId: string;
  organizationId: string;
  action: MembershipAuditAction;
  targetType: 'membership';
};

type AuditLogWriterPort = {
  write(input: MembershipAuditEvent): Promise<void>;
};

export class MembershipService {
  constructor(
    private readonly memberships: MembershipRepositoryPort,
    private readonly permissions: OrgPermissionGuardPort,
    private readonly auditLogs: AuditLogWriterPort
  ) {}

  async updateRole(input: UpdateMembershipRoleInput & { actorUserId: string }): Promise<void> {
    const parsed = updateMembershipRoleSchema.parse(input);

    await this.permissions.requireOrgPermission({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      permission: 'members:role.update'
    });

    const targetMembership = await this.memberships.findByOrganizationAndUser(
      parsed.organizationId,
      parsed.targetUserId
    );

    if (!targetMembership) {
      throw new NotFoundError('Target membership was not found.');
    }

    if (targetMembership.role === 'owner') {
      throw new AuthorizationError(
        'Owner role updates must be performed through the ownership transfer workflow.'
      );
    }

    const updated = await this.memberships.updateRole({
      organizationId: parsed.organizationId,
      userId: parsed.targetUserId,
      role: parsed.role
    });

    if (!updated) {
      throw new NotFoundError('Target membership was not found.');
    }

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      action: 'membership.role_updated',
      targetType: 'membership',
      targetId: `${parsed.organizationId}:${parsed.targetUserId}`,
      metadata: { role: parsed.role }
    });
  }

  async remove(input: RemoveMembershipInput & { actorUserId: string }): Promise<void> {
    const parsed = removeMembershipSchema.parse(input);

    await this.permissions.requireOrgPermission({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      permission: 'members:remove'
    });

    const targetMembership = await this.memberships.findByOrganizationAndUser(
      parsed.organizationId,
      parsed.targetUserId
    );

    if (!targetMembership) {
      throw new NotFoundError('Target membership was not found.');
    }

    if (targetMembership.role === 'owner') {
      throw new AuthorizationError(
        'Owner removal must be performed through the ownership transfer workflow.'
      );
    }

    const removed = await this.memberships.remove(parsed.organizationId, parsed.targetUserId);
    if (!removed) {
      throw new NotFoundError('Target membership was not found.');
    }

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: parsed.organizationId,
      action: 'membership.removed',
      targetType: 'membership',
      targetId: `${parsed.organizationId}:${parsed.targetUserId}`
    });
  }
}
