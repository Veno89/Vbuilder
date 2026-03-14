import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError } from '@/modules/shared/domain/errors';

const handleWebhook = vi.fn();

vi.mock('@/modules/billing/application/billing-container', () => ({
  billingService: {
    handleWebhook
  }
}));

describe('POST /api/billing/webhook route boundary', () => {
  beforeEach(() => {
    handleWebhook.mockReset();
    handleWebhook.mockResolvedValue({ processed: true });
  });

  it('forwards raw body and stripe signature to billing service', async () => {
    const { POST } = await import('./route');

    const response = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=123,v1=abc'
        },
        body: '{"id":"evt_123"}'
      })
    );

    expect(response.status).toBe(200);
    expect(handleWebhook).toHaveBeenCalledWith('{"id":"evt_123"}', 't=123,v1=abc');
    await expect(response.json()).resolves.toEqual({ received: true, processed: true });
  });

  it('maps authorization failures to 400', async () => {
    const { POST } = await import('./route');
    handleWebhook.mockRejectedValue(new AuthorizationError('Missing Stripe signature header.'));

    const response = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        body: '{"id":"evt_123"}'
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Missing Stripe signature header.' });
  });

  it('returns sanitized 500 for unexpected failures', async () => {
    const { POST } = await import('./route');
    handleWebhook.mockRejectedValue(new Error('db outage'));

    const response = await POST(
      new Request('https://example.com/api/billing/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 't=123,v1=abc'
        },
        body: '{"id":"evt_123"}'
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to process billing webhook.' });
  });
});
