import { db } from '@/server/db/client';
import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { DrizzleUserRepository } from '@/modules/auth/infrastructure/auth.repository';
import { AdminRepository } from '../infrastructure/admin.repository';
import { AdminAccessService } from './admin-access.service';
import { AdminService } from './admin.service';

function parsePlatformAdminEmails(value: string): Set<string> {
  return new Set(
    value
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

const users = new DrizzleUserRepository(db);
const adminRepository = new AdminRepository(db);
const allowedEmails = parsePlatformAdminEmails(process.env.PLATFORM_ADMIN_EMAILS ?? '');
const access = new AdminAccessService(users, allowedEmails);

export const adminService = new AdminService(access, adminRepository, auditLogWriter);
