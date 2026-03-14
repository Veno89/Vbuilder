import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const resetPassword = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  passwordResetService: {
    resetPassword
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/auth/reset-password route boundary', () => {
  beforeEach(() => {
    resetPassword.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    resetPassword.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('auth:reset-password:ip');
  });

  it('returns 200 for valid password reset payload', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'sample-token-value-over-20',
          newPassword: 'super-secure-password-123'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'sample-token-value-over-20',
      newPassword: 'super-secure-password-123'
    });
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 17 });

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'sample-token-value-over-20',
          newPassword: 'super-secure-password-123'
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('17');
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('returns sanitized 500 when rate limiter throws', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockRejectedValue(new Error('redis unavailable'));

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'sample-token-value-over-20',
          newPassword: 'super-secure-password-123'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to reset password.' });
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    resetPassword.mockRejectedValue(
      new AuthorizationError('Invalid or expired password reset token.')
    );

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'sample-token-value-over-20',
          newPassword: 'super-secure-password-123'
        })
      })
    );

    expect(response.status).toBe(403);
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    resetPassword.mockRejectedValue(new Error('db exploded'));

    const response = await POST(
      new Request('https://example.com/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: 'sample-token-value-over-20',
          newPassword: 'super-secure-password-123'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to reset password.' });
  });
});
