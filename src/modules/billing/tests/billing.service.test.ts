import { describe, expect, it, vi } from 'vitest';
import { BillingService } from '../application/billing.service';

describe('BillingService', () => {
  it('requires billing permission before creating checkout session', async () => {
    const permissions = {
      requireOrgPermission: vi.fn().mockRejectedValue(new Error('Missing permission: organization:billing.manage'))
    };

    const service = new BillingService(
      permissions,
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      { verify: vi.fn() },
      { recordIfNew: vi.fn() },
      {
        upsertFromStripe: vi.fn(),
        findOrganizationIdByStripeCustomerId: vi.fn()
      },
      { writeSnapshot: vi.fn() },
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await expect(
      service.createCheckoutSession({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        priceId: 'price_starter_123'
      })
    ).rejects.toThrow('Missing permission: organization:billing.manage');
  });

  it('processes subscription webhook once and ignores duplicates', async () => {
    const permissions = { requireOrgPermission: vi.fn() };
    const recordIfNew = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const upsertFromStripe = vi.fn().mockResolvedValue(undefined);
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);
    const writeAudit = vi.fn().mockResolvedValue(undefined);

    const service = new BillingService(
      permissions,
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      {
        verify: vi.fn().mockReturnValue({
          id: 'evt_1',
          type: 'customer.subscription.updated',
          data: {
            object: {
              metadata: { organizationId: '00000000-0000-0000-0000-000000000010' },
              customer: 'cus_123',
              id: 'sub_123',
              status: 'active',
              cancel_at_period_end: false,
              current_period_end: 1_800_000_000,
              items: { data: [{ price: { id: 'price_starter_123' } }] }
            }
          }
        })
      },
      { recordIfNew },
      {
        upsertFromStripe,
        findOrganizationIdByStripeCustomerId: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000010')
      },
      { writeSnapshot },
      vi.fn().mockReturnValue('starter'),
      'http://localhost:3000',
      { write: writeAudit }
    );

    const first = await service.handleWebhook('{"id":"evt_1"}', 'sig_header');
    const second = await service.handleWebhook('{"id":"evt_1"}', 'sig_header');

    expect(first.processed).toBe(true);
    expect(second.processed).toBe(false);
    expect(upsertFromStripe).toHaveBeenCalledTimes(1);
    expect(writeSnapshot).toHaveBeenCalledTimes(1);
    expect(writeAudit).toHaveBeenCalledTimes(1);
  });
});
