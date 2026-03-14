import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { createCheckoutSessionSchema } from '@/modules/billing/schemas/billing.schemas';
import { AuthorizationError, NotFoundError } from '@/modules/shared/domain/errors';

const requireAuthenticatedActor = vi.fn();
const createCheckoutSession = vi.fn();
const enforceRateLimit = vi.fn();
const rateLimitKeyFromRequest = vi.fn();

vi.mock('@/modules/auth/application/auth-container', () => ({
  authContextService: {
    requireAuthenticatedActor
  }
}));

vi.mock('@/modules/billing/application/billing-container', () => ({
  billingService: {
    createCheckoutSession
  }
}));

vi.mock('@/modules/shared/security/rate-limit', () => ({
  enforceRateLimit,
  rateLimitKeyFromRequest
}));

describe('POST /api/billing/checkout route boundary', () => {
  beforeEach(() => {
    requireAuthenticatedActor.mockReset();
    createCheckoutSession.mockReset();
    enforceRateLimit.mockReset();
    rateLimitKeyFromRequest.mockReset();

    requireAuthenticatedActor.mockResolvedValue({ userId: 'user-1', email: 'user@example.com' });
    enforceRateLimit.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
    rateLimitKeyFromRequest.mockReturnValue('billing:checkout:user-1:ip');
    createCheckoutSession.mockImplementation(async (input: unknown) => {
      const parsed = createCheckoutSessionSchema.parse(input);
      return { url: `https://stripe.test/${parsed.planKey}` };
    });
  });

  it('accepts planKey payload and forwards actor user id', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          planKey: 'starter'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: 'user-1', planKey: 'starter' })
    );
  });

  it('rejects payloads that use legacy priceId input', async () => {
    const { POST } = await import('./route');

    createCheckoutSession.mockImplementation(async (input: unknown) => {
      throw new ZodError(createCheckoutSessionSchema.safeParse(input).error?.issues ?? []);
    });

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          priceId: 'price_starter_123'
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid request payload.' });
  });

  it('returns 429 with retry-after when rate limited', async () => {
    const { POST } = await import('./route');
    enforceRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 12 });

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          planKey: 'starter'
        })
      })
    );

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('12');
    expect(createCheckoutSession).not.toHaveBeenCalled();
  });

  it('maps authorization failures to 403', async () => {
    const { POST } = await import('./route');
    createCheckoutSession.mockRejectedValue(new AuthorizationError('Missing permission: organization:billing.manage'));

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          planKey: 'starter'
        })
      })
    );

    expect(response.status).toBe(403);
  });

  it('maps not-found failures to 404', async () => {
    const { POST } = await import('./route');
    createCheckoutSession.mockRejectedValue(new NotFoundError('Organization was not found.'));

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          planKey: 'starter'
        })
      })
    );

    expect(response.status).toBe(404);
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { POST } = await import('./route');
    createCheckoutSession.mockRejectedValue(new Error('stripe unavailable'));

    const response = await POST(
      new Request('https://example.com/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({
          organizationId: '00000000-0000-0000-0000-000000000010',
          planKey: 'starter'
        })
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to create checkout session.' });
  });
});
