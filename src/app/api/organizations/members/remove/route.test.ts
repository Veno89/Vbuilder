import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const remove = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/memberships/application/membership-container', () => ({
  membershipService: {
    remove
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('organizations members remove route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    remove.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    remove.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('org:member.remove:user-1:ip');
  });

  it('forwards authenticated actor and ignores body actorUserId', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/organizations/members/remove', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-id',
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1' })
    );
  });

  it('returns 429 when rate limit blocks the request', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 12 });

    const response = await POST(
      new Request('https://example.com/api/organizations/members/remove', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('12');
    expect(remove).not.toHaveBeenCalled();
  });

  it('maps authorization errors to 403', async () => {
    const { POST } = await import('./route');
    remove.mockRejectedValue(
      new AuthorizationError('Owner removal must be performed through the ownership transfer workflow.')
    );

    const response = await POST(
      new Request('https://example.com/api/organizations/members/remove', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not found errors to 404', async () => {
    const { POST } = await import('./route');
    remove.mockRejectedValue(new NotFoundError('Target membership was not found.'));

    const response = await POST(
      new Request('https://example.com/api/organizations/members/remove', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    remove.mockRejectedValue(new Error('database exploded'));

    const response = await POST(
      new Request('https://example.com/api/organizations/members/remove', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to remove member.' });
  });
});
