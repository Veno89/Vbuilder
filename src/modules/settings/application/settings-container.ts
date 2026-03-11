import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { OrgPermissionService } from '@/modules/permissions/application/org-permission.service';
import { db } from '@/server/db/client';
import { SettingsRepository } from '../infrastructure/settings.repository';
import { SettingsService } from './settings.service';

const memberships = new MembershipRepository(db);
const permissions = new OrgPermissionService(memberships);
const repository = new SettingsRepository(db);

export const settingsService = new SettingsService(repository, permissions, auditLogWriter);
