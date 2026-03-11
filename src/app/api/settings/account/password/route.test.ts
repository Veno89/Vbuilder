import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAuthenticatedActor = vi.fn();
const changePassword = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/settings/application/settings-container', () => ({
  settingsService: {
    changePassword
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('settings account password route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    changePassword.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    changePassword.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('settings:password.update:user-1:ip');
  });

  it('prevents body actorUserId from overriding authenticated actor', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/settings/account/password', {
        method: 'POST',
        body: JSON.stringify({
          actorUserId: 'attacker-user-id',
          currentPassword: 'current-password-123',
          newPassword: 'new-password-123'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        currentPassword: 'current-password-123',
        newPassword: 'new-password-123'
      })
    );
  });
});
