import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { db } from '@/server/db/client';
import { OrgPermissionService } from '@/modules/permissions/application/org-permission.service';
import { MembershipRepository } from '../infrastructure/membership.repository';
import { MembershipService } from './membership.service';

const memberships = new MembershipRepository(db);
const permissions = new OrgPermissionService(memberships);

export const membershipService = new MembershipService(memberships, permissions, auditLogWriter);
