import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import type { AdminAccessService } from './admin-access.service';
import type { AdminRepository } from '../infrastructure/admin.repository';

export class AdminService {
  constructor(
    private readonly access: AdminAccessService,
    private readonly adminRepository: AdminRepository,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async getOverview(actorUserId: string): Promise<{
    totalUsers: number;
    totalOrganizations: number;
    totalSubscriptions: number;
  }> {
    await this.access.requirePlatformAdmin(actorUserId);

    const overview = await this.adminRepository.getOverview();

    await this.auditLogs.write({
      actorUserId,
      organizationId: null,
      action: 'admin.overview.viewed',
      targetType: 'admin',
      targetId: 'overview'
    });

    return overview;
  }
}
