import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const create = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/organizations/application/organization-container', () => ({
  organizationService: {
    create
  }
}));

describe('organizations create route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    create.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    create.mockResolvedValue({ organizationId: '00000000-0000-0000-0000-000000000010' });
  });

  it('forwards authenticated actor and ignores body actorUserId', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/organizations/create', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-id',
          name: 'Acme',
          slug: 'acme'
        })
      })
    );

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', name: 'Acme', slug: 'acme' })
    );
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    create.mockRejectedValue(new AuthorizationError('Organization slug is already in use.'));

    const response = await POST(
      new Request('https://example.com/api/organizations/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Acme', slug: 'acme' })
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Organization slug is already in use.' });
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    create.mockRejectedValue(new Error('db exploded'));

    const response = await POST(
      new Request('https://example.com/api/organizations/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Acme', slug: 'acme' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to create organization.' });
  });
});
