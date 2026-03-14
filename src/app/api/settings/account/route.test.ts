import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const getAccount = vi.fn();
const updateAccountEmail = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/settings/application/settings-container', () => ({
  settingsService: {
    getAccount,
    updateAccountEmail
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('settings account route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    getAccount.mockReset();
    updateAccountEmail.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    getAccount.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      emailVerifiedAt: null,
      isSuspended: false
    });
    updateAccountEmail.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('settings:account.update:user-1:ip');
  });

  it('returns authenticated account settings', async () => {
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.com/api/settings/account'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ id: 'user-1', email: 'user@example.com' })
    );
  });


  it('prevents body actorUserId from overriding authenticated actor', async () => {
    const { PATCH } = await import('./route');

    const response = await PATCH(
      new Request('https://example.com/api/settings/account', {
        method: 'PATCH',
        body: JSON.stringify({ actorUserId: 'attacker-user-id', email: 'new@example.com' })
      })
    );

    expect(response.status).toBe(200);
    expect(updateAccountEmail).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', email: 'new@example.com' })
    );
  });

  it('rate limits account email updates', async () => {
    const { PATCH } = await import('./route');

    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 15 });

    const response = await PATCH(
      new Request('https://example.com/api/settings/account', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'new@example.com' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('15');
    expect(updateAccountEmail).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { PATCH } = await import('./route');
    updateAccountEmail.mockRejectedValue(new AuthorizationError('Current password is incorrect.'));

    const response = await PATCH(
      new Request('https://example.com/api/settings/account', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'new@example.com' })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { GET } = await import('./route');
    getAccount.mockRejectedValue(new NotFoundError('Authenticated user account was not found.'));

    const response = await GET(new Request('https://example.com/api/settings/account'));

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { PATCH } = await import('./route');
    updateAccountEmail.mockRejectedValue(new Error('db offline'));

    const response = await PATCH(
      new Request('https://example.com/api/settings/account', {
        method: 'PATCH',
        body: JSON.stringify({ email: 'new@example.com' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to update account settings.' });
  });
});
