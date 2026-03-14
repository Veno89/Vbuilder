import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestReset = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  passwordResetService: {
    requestReset
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/auth/forgot-password route boundary', () => {
  beforeEach(() => {
    requestReset.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requestReset.mockResolvedValue(undefined);
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('auth:forgot-password:ip');
  });

  it('returns 200 for valid payload and forwards email', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' })
      })
    );

    expect(response.status).toBe(200);
    expect(requestReset).toHaveBeenCalledWith('user@example.com');
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 13 });

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('13');
    expect(requestReset).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid payload', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'not-an-email' })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
  });

  it('returns sanitized 500 when rate limiter throws', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockRejectedValue(new Error('redis unavailable'));

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to request password reset.' });
    expect(requestReset).not.toHaveBeenCalled();
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    requestReset.mockRejectedValue(new Error('smtp down'));

    const response = await POST(
      new Request('https://example.com/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to request password reset.' });
  });
});
