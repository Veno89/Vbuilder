export type AuditLogEvent = {
  actorUserId: string | null;
  organizationId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
};

export interface AuditLogWriter {
  write(event: AuditLogEvent): Promise<void>;
}
