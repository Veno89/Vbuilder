import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

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

  it('returns 403 when service reports permission denial', async () => {
    const { PATCH } = await import('./route');

    updateOrganizationSettings.mockRejectedValue(new AuthorizationError('Missing permission: organization:update'));

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

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Missing permission: organization:update' });
  });

  it('returns 404 when service reports missing target', async () => {
    const { PATCH } = await import('./route');

    updateOrganizationSettings.mockRejectedValue(
      new NotFoundError('Organization was not found.')
    );

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

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected service failures', async () => {
    const { PATCH } = await import('./route');

    updateOrganizationSettings.mockRejectedValue(new Error('db timeout'));

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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to update organization settings.' });
  });
});
