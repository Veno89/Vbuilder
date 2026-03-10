import { db } from '@/server/db/client';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';

export const auditLogWriter = new AuditLogRepository(db);
