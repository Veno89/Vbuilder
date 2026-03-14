import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const declineInvitation = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/invitations/application/invitation-container', () => ({
  invitationService: {
    decline: declineInvitation
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/invitations/decline route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    declineInvitation.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-2', email: 'invitee@example.com' });
    declineInvitation.mockResolvedValue({ organizationId: '00000000-0000-0000-0000-000000000010' });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('invite:decline:user-2:ip');
  });

  it('forwards authenticated actor to invitation decline service', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/invitations/decline', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(200);
    expect(declineInvitation).toHaveBeenCalledWith({
      token: 'sample-token-value-over-20',
      actorUserId: 'user-2'
    });
  });

  it('returns 429 when rate limit denies request', async () => {
    const { POST } = await import('./route');

    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 22 });

    const response = await POST(
      new Request('https://example.com/api/invitations/decline', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('22');
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    declineInvitation.mockRejectedValue(new AuthorizationError('Invalid or expired invitation token.'));

    const response = await POST(
      new Request('https://example.com/api/invitations/decline', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { POST } = await import('./route');
    declineInvitation.mockRejectedValue(new NotFoundError('Invitation was not found.'));

    const response = await POST(
      new Request('https://example.com/api/invitations/decline', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { POST } = await import('./route');
    declineInvitation.mockRejectedValue(new Error('db timeout'));

    const response = await POST(
      new Request('https://example.com/api/invitations/decline', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to decline invitation.' });
  });
});
