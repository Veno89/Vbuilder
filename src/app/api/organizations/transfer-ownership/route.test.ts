import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const transferOwnership = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/organizations/application/organization-container', () => ({
  organizationService: {
    transferOwnership
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('organizations transfer-ownership route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    transferOwnership.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'owner@example.com' });
    transferOwnership.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('org:ownership.transfer:user-1:ip');
  });

  it('forwards authenticated actor and ignores body actorUserId', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/organizations/transfer-ownership', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-id',
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(transferOwnership).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1' })
    );
  });

  it('returns 429 when rate limit blocks the request', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 9 });

    const response = await POST(
      new Request('https://example.com/api/organizations/transfer-ownership', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('9');
    expect(transferOwnership).not.toHaveBeenCalled();
  });

  it('maps authorization errors to 403', async () => {
    const { POST } = await import('./route');
    transferOwnership.mockRejectedValue(new AuthorizationError('Missing permission: organization:ownership.transfer'));

    const response = await POST(
      new Request('https://example.com/api/organizations/transfer-ownership', {
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
    transferOwnership.mockRejectedValue(new NotFoundError('Target membership was not found.'));

    const response = await POST(
      new Request('https://example.com/api/organizations/transfer-ownership', {
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
    transferOwnership.mockRejectedValue(new Error('stale owner state'));

    const response = await POST(
      new Request('https://example.com/api/organizations/transfer-ownership', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          targetUserId: '00000000-0000-0000-0000-000000000011'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to transfer organization ownership.' });
  });
});
