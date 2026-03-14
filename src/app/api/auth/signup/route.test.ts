import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const signUp = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authService: {
    signUp
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/auth/signup route boundary', () => {
  beforeEach(() => {
    signUp.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    signUp.mockResolvedValue({ userId: 'user-1' });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('auth:signup:ip');
  });

  it('returns 201 for valid signup payload', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(201);
    expect(signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'super-secure-password-123'
    });
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 14 });

    const response = await POST(
      new Request('https://example.com/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('14');
    expect(signUp).not.toHaveBeenCalled();
  });

  it('returns sanitized 500 when rate limiter throws', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockRejectedValue(new Error('redis unavailable'));

    const response = await POST(
      new Request('https://example.com/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to sign up.' });
    expect(signUp).not.toHaveBeenCalled();
  });

  it('maps auth conflicts to 409', async () => {
    const { POST } = await import('./route');
    signUp.mockRejectedValue(new AuthorizationError('An account with this email already exists.'));

    const response = await POST(
      new Request('https://example.com/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(409);
  });

  it('returns sanitized 500 for unexpected errors', async () => {
    const { POST } = await import('./route');
    signUp.mockRejectedValue(new Error('smtp dead'));

    const response = await POST(
      new Request('https://example.com/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com', password: 'super-secure-password-123' })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to sign up.' });
  });
});
