import { describe, expect, it, vi } from 'vitest';
import { AuditLogRepository } from '../infrastructure/audit-log.repository';

describe('AuditLogRepository', () => {
  it('writes audit log events with default metadata', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const db = { insert };

    const repo = new AuditLogRepository(db as never);

    await repo.write({
      actorUserId: 'u1',
      organizationId: 'org1',
      action: 'membership.removed',
      targetType: 'membership',
      targetId: 'org1:u2'
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: {} })
    );
  });
});
