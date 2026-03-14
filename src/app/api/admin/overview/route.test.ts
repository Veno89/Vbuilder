import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const getOverview = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/admin/application/admin-container', () => ({
  adminService: {
    getOverview
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('GET /api/admin/overview route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    getOverview.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'admin@example.com' });
    getOverview.mockResolvedValue({
      totalUsers: 10,
      totalOrganizations: 4,
      totalSubscriptions: 3
    });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('admin:overview:user-1:ip');
  });

  it('returns overview for authenticated admin path', async () => {
    const { GET } = await import('./route');

    const response = await GET(new Request('https://example.com/api/admin/overview'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      totalUsers: 10,
      totalOrganizations: 4,
      totalSubscriptions: 3
    });
    expect(getOverview).toHaveBeenCalledWith('user-1');
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { GET } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 16 });

    const response = await GET(new Request('https://example.com/api/admin/overview'));

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('16');
    expect(getOverview).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { GET } = await import('./route');
    getOverview.mockRejectedValue(new AuthorizationError('Admin access is required.'));

    const response = await GET(new Request('https://example.com/api/admin/overview'));

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { GET } = await import('./route');
    getOverview.mockRejectedValue(new NotFoundError('Authenticated user was not found.'));

    const response = await GET(new Request('https://example.com/api/admin/overview'));

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { GET } = await import('./route');
    getOverview.mockRejectedValue(new Error('db outage'));

    const response = await GET(new Request('https://example.com/api/admin/overview'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to load admin overview.' });
  });
});
