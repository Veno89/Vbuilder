import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthenticatedActor = vi.fn();
const updateOrganizationSettings = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/settings/application/settings-container', () => ({
  settingsService: {
    updateOrganizationSettings
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('settings organization route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    updateOrganizationSettings.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'admin@example.com' });
    updateOrganizationSettings.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('settings:organization.update:user-1:ip');
  });

  it('forwards actor identity to organization settings service', async () => {
    const { PATCH } = await import('./route');

    const payload = {
      organizationId: '00000000-0000-0000-0000-000000000010',
      name: 'Acme Updated',
      slug: 'acme-updated'
    };

    const response = await PATCH(
      new Request('https://example.com/api/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    expect(updateOrganizationSettings).toHaveBeenCalledWith({
      actorUserId: 'user-1',
      ...payload
    });
  });


  it('ignores actorUserId supplied in request payload', async () => {
    const { PATCH } = await import('./route');

    const payload = {
      actorUserId: 'attacker-user-id',
      organizationId: '00000000-0000-0000-0000-000000000010',
      name: 'Acme Updated',
      slug: 'acme-updated'
    };

    const response = await PATCH(
      new Request('https://example.com/api/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    expect(updateOrganizationSettings).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', organizationId: payload.organizationId })
    );
  });

  it('returns 400 when service reports permission denial', async () => {
    const { PATCH } = await import('./route');

    updateOrganizationSettings.mockRejectedValue(new Error('Missing permission: organization:update'));

    const response = await PATCH(
      new Request('https://example.com/api/settings/organization', {
        method: 'PATCH',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          name: 'Acme Updated',
          slug: 'acme-updated'
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing permission: organization:update' });
  });
});
