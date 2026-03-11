import { describe, expect, it, vi } from 'vitest';
import { SettingsService } from '../application/settings.service';

describe('SettingsService', () => {
  it('updates account email when not taken', async () => {
    const repository = {
      findAccountByUserId: vi.fn().mockResolvedValue({
        id: 'user-1',
        email: 'old@example.com',
        emailVerifiedAt: new Date(),
        isSuspended: false
      }),
      findAccountByEmail: vi.fn().mockResolvedValue(null),
      updateAccountEmail: vi.fn().mockResolvedValue(undefined),
      findPasswordHashByUserId: vi.fn(),
      updatePasswordHash: vi.fn(),
      findOrganizationBySlug: vi.fn(),
      updateOrganizationSettings: vi.fn()
    };
    const permissions = { requireOrgPermission: vi.fn() };
    const auditLogs = { write: vi.fn().mockResolvedValue(undefined) };

    const service = new SettingsService(repository as never, permissions as never, auditLogs);

    await service.updateAccountEmail({ actorUserId: 'user-1', email: 'new@example.com' });

    expect(repository.updateAccountEmail).toHaveBeenCalledWith('user-1', 'new@example.com');
  });

  it('rejects password change when current password is wrong', async () => {
    const repository = {
      findAccountByUserId: vi.fn(),
      findAccountByEmail: vi.fn(),
      updateAccountEmail: vi.fn(),
      findPasswordHashByUserId: vi.fn().mockResolvedValue('scrypt:abcd:1234'),
      updatePasswordHash: vi.fn(),
      findOrganizationBySlug: vi.fn(),
      updateOrganizationSettings: vi.fn()
    };
    const permissions = { requireOrgPermission: vi.fn() };
    const auditLogs = { write: vi.fn() };

    const service = new SettingsService(repository as never, permissions as never, auditLogs as never);

    await expect(
      service.changePassword({
        actorUserId: 'user-1',
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123'
      })
    ).rejects.toThrow('Current password is incorrect.');

    expect(repository.updatePasswordHash).not.toHaveBeenCalled();
  });

  it('requires organization update permission for org settings update', async () => {
    const repository = {
      findAccountByUserId: vi.fn(),
      findAccountByEmail: vi.fn(),
      updateAccountEmail: vi.fn(),
      findPasswordHashByUserId: vi.fn(),
      updatePasswordHash: vi.fn(),
      findOrganizationBySlug: vi.fn().mockResolvedValue(null),
      updateOrganizationSettings: vi.fn()
    };
    const permissions = {
      requireOrgPermission: vi.fn().mockRejectedValue(new Error('Missing permission: organization:update'))
    };
    const auditLogs = { write: vi.fn() };

    const service = new SettingsService(repository as never, permissions as never, auditLogs as never);

    await expect(
      service.updateOrganizationSettings({
        actorUserId: 'user-1',
        organizationId: '00000000-0000-0000-0000-000000000010',
        name: 'Acme',
        slug: 'acme'
      })
    ).rejects.toThrow('Missing permission: organization:update');

    expect(repository.updateOrganizationSettings).not.toHaveBeenCalled();
  });
});
