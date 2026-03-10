import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { db } from '@/server/db/client';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { OrgPermissionService } from '@/modules/permissions/application/org-permission.service';
import { OrganizationRepository } from '../infrastructure/organization.repository';
import { OrganizationService } from './organization.service';

const organizations = new OrganizationRepository(db);
const memberships = new MembershipRepository(db);
const permissions = new OrgPermissionService(memberships);

export const organizationService = new OrganizationService(
  organizations,
  memberships,
  permissions,
  auditLogWriter
);
