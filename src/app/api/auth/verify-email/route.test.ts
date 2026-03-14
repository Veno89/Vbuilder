import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const confirm = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  emailVerificationConfirmService: {
    confirm
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/auth/verify-email route boundary', () => {
  beforeEach(() => {
    confirm.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    confirm.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('auth:verify-email:ip');
  });

  it('returns 200 for valid verification token', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(200);
    expect(confirm).toHaveBeenCalledWith('sample-token-value-over-20');
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 19 });

    const response = await POST(
      new Request('https://example.com/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('19');
    expect(confirm).not.toHaveBeenCalled();
  });

  it('returns sanitized 500 when rate limiter throws', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockRejectedValue(new Error('redis unavailable'));

    const response = await POST(
      new Request('https://example.com/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to verify email.' });
    expect(confirm).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    confirm.mockRejectedValue(new AuthorizationError('Invalid or expired verification token.'));

    const response = await POST(
      new Request('https://example.com/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(403);
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    confirm.mockRejectedValue(new Error('db exploded'));

    const response = await POST(
      new Request('https://example.com/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: 'sample-token-value-over-20' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to verify email.' });
  });
});
