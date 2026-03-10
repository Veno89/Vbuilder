import type { AuditLogEvent, AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import type { DatabaseClient } from '@/server/db/client';
import { auditLogs } from '@/server/db/schema';

export class AuditLogRepository implements AuditLogWriter {
  constructor(private readonly db: DatabaseClient) {}

  async write(event: AuditLogEvent): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorUserId: event.actorUserId,
      organizationId: event.organizationId,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      metadata: event.metadata ?? {}
    });
  }
}
