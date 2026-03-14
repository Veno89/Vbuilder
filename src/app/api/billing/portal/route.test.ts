import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const createPortalSession = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/billing/application/billing-container', () => ({
  billingService: {
    createPortalSession
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/billing/portal route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    createPortalSession.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    createPortalSession.mockResolvedValue({ url: 'https://billing.example.com/portal' });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('billing:portal:user-1:ip');
  });

  it('forwards authenticated actor and ignores body actorUserId', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-id',
          organizationId: '00000000-0000-0000-0000-000000000010'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(createPortalSession).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1' })
    );
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 7 });

    const response = await POST(
      new Request('https://example.com/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ organizationId: '00000000-0000-0000-0000-000000000010' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('7');
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    createPortalSession.mockRejectedValue(new AuthorizationError('Missing permission: organization:billing.manage'));

    const response = await POST(
      new Request('https://example.com/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ organizationId: '00000000-0000-0000-0000-000000000010' })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { POST } = await import('./route');
    createPortalSession.mockRejectedValue(new NotFoundError('Organization was not found.'));

    const response = await POST(
      new Request('https://example.com/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ organizationId: '00000000-0000-0000-0000-000000000010' })
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { POST } = await import('./route');
    createPortalSession.mockRejectedValue(new Error('stripe down'));

    const response = await POST(
      new Request('https://example.com/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ organizationId: '00000000-0000-0000-0000-000000000010' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to create billing portal session.' });
  });
});
