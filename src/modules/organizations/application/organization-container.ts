import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { db } from '@/server/db/client';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { OrganizationService } from './organization.service';

const noopAuditWriter: AuditLogWriter = {
  async write(): Promise<void> {
    return;
  }
};

const organizations = new OrganizationRepository(db);
const memberships = new MembershipRepository(db);

export const organizationService = new OrganizationService(
  organizations,
  memberships,
  noopAuditWriter
);
