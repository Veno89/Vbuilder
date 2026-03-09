import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { db } from '@/server/db/client';
import { MembershipRepository } from '../infrastructure/membership.repository';
import { MembershipService } from './membership.service';

const noopAuditWriter: AuditLogWriter = {
  async write(): Promise<void> {
    return;
  }
};

const memberships = new MembershipRepository(db);

export const membershipService = new MembershipService(memberships, noopAuditWriter);
