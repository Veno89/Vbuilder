import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const signIn = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authService: {
    signIn
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/auth/signin route boundary', () => {
  beforeEach(() => {
    signIn.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    signIn.mockResolvedValue({
      sessionToken: 'session-token-abc',
      expiresAt: new Date('2099-01-01T00:00:00.000Z')
    });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('auth:signin:ip');
  });

  it('sets session cookie on successful sign in', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('vb_session=session-token-abc');
  });

  it('returns 429 when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 8 });

    const response = await POST(
      new Request('https://example.com/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('8');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('returns sanitized 500 when rate limiter throws', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockRejectedValue(new Error('redis unavailable'));

    const response = await POST(
      new Request('https://example.com/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to sign in.' });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('maps auth failures to 401', async () => {
    const { POST } = await import('./route');
    signIn.mockRejectedValue(new AuthorizationError('Invalid email or password.'));

    const response = await POST(
      new Request('https://example.com/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'bad-pass' })
      })
    );

    expect(response.status).toBe(401);
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    signIn.mockRejectedValue(new Error('db offline'));

    const response = await POST(
      new Request('https://example.com/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to sign in.' });
  });
});
