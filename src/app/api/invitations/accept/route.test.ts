import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthenticatedActor = vi.fn();
const acceptInvitation = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/invitations/application/invitation-container', () => ({
  invitationService: {
    accept: acceptInvitation
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/invitations/accept route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    acceptInvitation.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-2', email: 'invitee@example.com' });
    acceptInvitation.mockResolvedValue({ organizationId: '00000000-0000-0000-0000-000000000010' });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('invite:accept:user-2:ip');
  });

  it('forwards actorEmail from authenticated actor to invitation accept service', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(200);
    expect(acceptInvitation).toHaveBeenCalledWith({
      token: 'sample-token-value-over-20',
      actorUserId: 'user-2',
      actorEmail: 'invitee@example.com'
    });
  });

  it('returns 429 when rate limit denies request', async () => {
    const { POST } = await import('./route');

    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });

    const response = await POST(
      new Request('https://example.com/api/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
  });
});
