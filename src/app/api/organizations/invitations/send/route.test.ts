import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const send = vi.fn();
const issueInvitationToken = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/invitations/application/invitation-container', () => ({
  invitationService: {
    send
  },
  issueInvitationToken
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('organizations invitations send route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    send.mockReset();
    issueInvitationToken.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'admin@example.com' });
    send.mockResolvedValue(undefined);
    issueInvitationToken.mockReturnValue('generated-invite-token-1234567890');
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('org:invite.send:user-1:ip');
  });

  it('forwards authenticated actor and generated token, ignoring body actorUserId', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/organizations/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-id',
          organizationId: '00000000-0000-0000-0000-000000000010',
          email: 'invitee@example.com',
          role: 'member'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        token: 'generated-invite-token-1234567890'
      })
    );
  });

  it('returns 429 when rate limit blocks requests', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 11 });

    const response = await POST(
      new Request('https://example.com/api/organizations/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          email: 'invitee@example.com',
          role: 'member'
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('11');
    expect(send).not.toHaveBeenCalled();
    expect(issueInvitationToken).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    send.mockRejectedValue(new AuthorizationError('Missing permission: members:invite'));

    const response = await POST(
      new Request('https://example.com/api/organizations/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          email: 'invitee@example.com',
          role: 'member'
        })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { POST } = await import('./route');
    send.mockRejectedValue(new NotFoundError('Organization was not found.'));

    const response = await POST(
      new Request('https://example.com/api/organizations/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          email: 'invitee@example.com',
          role: 'member'
        })
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { POST } = await import('./route');
    send.mockRejectedValue(new Error('smtp unavailable'));

    const response = await POST(
      new Request('https://example.com/api/organizations/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          email: 'invitee@example.com',
          role: 'member'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to send invitation.' });
  });
});
