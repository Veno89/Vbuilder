import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import { createOrganizationSchema, type CreateOrganizationInput } from '../schemas/organization.schemas';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';

export class OrganizationService {
  constructor(
    private readonly organizations: OrganizationRepository,
    private readonly memberships: MembershipRepository,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async create(rawInput: CreateOrganizationInput): Promise<{ organizationId: string }> {
    const input = createOrganizationSchema.parse(rawInput);

    const existing = await this.organizations.findBySlug(input.slug);
    if (existing) {
      throw new AuthorizationError('Organization slug is already in use.');
    }

    const organization = await this.organizations.create({
      name: input.name,
      slug: input.slug,
      ownerUserId: input.actorUserId
    });

    await this.memberships.create({
      organizationId: organization.id,
      userId: input.actorUserId,
      role: 'owner'
    });

    await this.auditLogs.write({
      actorUserId: input.actorUserId,
      organizationId: organization.id,
      action: 'organization.created',
      targetType: 'organization',
      targetId: organization.id
    });

    return { organizationId: organization.id };
  }
}
