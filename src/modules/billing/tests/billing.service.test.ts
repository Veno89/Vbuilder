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
      vi.fn().mockReturnValue('price_starter_123'),
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await expect(
      service.createCheckoutSession({
        actorUserId: '00000000-0000-0000-0000-000000000001',
        organizationId: '00000000-0000-0000-0000-000000000010',
        planKey: 'starter'
      })
    ).rejects.toThrow('Missing permission: organization:billing.manage');
  });

  it('maps planKey to server-side Stripe price id for checkout provider', async () => {
    const permissions = { requireOrgPermission: vi.fn().mockResolvedValue(undefined) };
    const createCheckoutSession = vi.fn().mockResolvedValue({ url: 'https://stripe.test/session' });

    const service = new BillingService(
      permissions,
      { createCheckoutSession },
      { createPortalSession: vi.fn() },
      { verify: vi.fn() },
      { recordIfNew: vi.fn() },
      {
        upsertFromStripe: vi.fn(),
        findOrganizationIdByStripeCustomerId: vi.fn()
      },
      { writeSnapshot: vi.fn() },
      vi.fn().mockReturnValue('price_server_starter'),
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await service.createCheckoutSession({
      actorUserId: '00000000-0000-0000-0000-000000000001',
      organizationId: '00000000-0000-0000-0000-000000000010',
      planKey: 'starter'
    });

    expect(createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ stripePriceId: 'price_server_starter' })
    );
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
      vi.fn().mockReturnValue('price_starter_123'),
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


  it('rejects webhook when Stripe signature header is missing', async () => {
    const service = new BillingService(
      { requireOrgPermission: vi.fn() },
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
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await expect(service.handleWebhook('{"id":"evt_missing_sig"}', null)).rejects.toThrow(
      'Missing Stripe signature header.'
    );
  });

  it('rejects subscription event without customer id', async () => {
    const service = new BillingService(
      { requireOrgPermission: vi.fn() },
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      {
        verify: vi.fn().mockReturnValue({
          id: 'evt_missing_customer',
          type: 'customer.subscription.updated',
          data: { object: { id: 'sub_123' } }
        })
      },
      { recordIfNew: vi.fn().mockResolvedValue(true) },
      {
        upsertFromStripe: vi.fn(),
        findOrganizationIdByStripeCustomerId: vi.fn()
      },
      { writeSnapshot: vi.fn() },
      vi.fn(),
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await expect(service.handleWebhook('{"id":"evt_missing_customer"}', 'sig_header')).rejects.toThrow(
      'Stripe subscription event missing customer id.'
    );
  });

  it('rejects subscription event when organization cannot be resolved', async () => {
    const service = new BillingService(
      { requireOrgPermission: vi.fn() },
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      {
        verify: vi.fn().mockReturnValue({
          id: 'evt_missing_org',
          type: 'customer.subscription.updated',
          data: {
            object: {
              customer: 'cus_missing_org',
              id: 'sub_456',
              items: { data: [{ price: { id: 'price_starter_123' } }] }
            }
          }
        })
      },
      { recordIfNew: vi.fn().mockResolvedValue(true) },
      {
        upsertFromStripe: vi.fn(),
        findOrganizationIdByStripeCustomerId: vi.fn().mockResolvedValue(null)
      },
      { writeSnapshot: vi.fn() },
      vi.fn(),
      vi.fn(),
      'http://localhost:3000',
      { write: vi.fn() }
    );

    await expect(service.handleWebhook('{"id":"evt_missing_org"}', 'sig_header')).rejects.toThrow(
      'Unable to resolve organization for Stripe customer.'
    );
  });

  it('ignores non-subscription webhook events after idempotency record', async () => {
    const upsertFromStripe = vi.fn();
    const writeSnapshot = vi.fn();
    const writeAudit = vi.fn();

    const service = new BillingService(
      { requireOrgPermission: vi.fn() },
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      {
        verify: vi.fn().mockReturnValue({
          id: 'evt_invoice_1',
          type: 'invoice.paid',
          data: { object: { customer: 'cus_123' } }
        })
      },
      { recordIfNew: vi.fn().mockResolvedValue(true) },
      {
        upsertFromStripe,
        findOrganizationIdByStripeCustomerId: vi.fn()
      },
      { writeSnapshot },
      vi.fn(),
      vi.fn(),
      'http://localhost:3000',
      { write: writeAudit }
    );

    const result = await service.handleWebhook('{"id":"evt_invoice_1"}', 'sig_header');

    expect(result).toEqual({ processed: true });
    expect(upsertFromStripe).not.toHaveBeenCalled();
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(writeAudit).not.toHaveBeenCalled();
  });

  it('resolves organization from customer mapping when metadata is absent', async () => {
    const upsertFromStripe = vi.fn().mockResolvedValue(undefined);
    const writeSnapshot = vi.fn().mockResolvedValue(undefined);
    const writeAudit = vi.fn().mockResolvedValue(undefined);
    const findOrganizationIdByStripeCustomerId = vi
      .fn()
      .mockResolvedValue('00000000-0000-0000-0000-000000000099');

    const service = new BillingService(
      { requireOrgPermission: vi.fn() },
      { createCheckoutSession: vi.fn() },
      { createPortalSession: vi.fn() },
      {
        verify: vi.fn().mockReturnValue({
          id: 'evt_2',
          type: 'customer.subscription.created',
          data: {
            object: {
              customer: 'cus_999',
              id: 'sub_999',
              status: 'active',
              cancel_at_period_end: false,
              current_period_end: 1_900_000_000,
              items: { data: [{ price: { id: 'price_pro_123' } }] }
            }
          }
        })
      },
      { recordIfNew: vi.fn().mockResolvedValue(true) },
      {
        upsertFromStripe,
        findOrganizationIdByStripeCustomerId
      },
      { writeSnapshot },
      vi.fn().mockReturnValue('price_pro_123'),
      vi.fn().mockReturnValue('pro'),
      'http://localhost:3000',
      { write: writeAudit }
    );

    const result = await service.handleWebhook('{"id":"evt_2"}', 'sig_header');

    expect(result).toEqual({ processed: true });
    expect(findOrganizationIdByStripeCustomerId).toHaveBeenCalledWith('cus_999');
    expect(upsertFromStripe).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: '00000000-0000-0000-0000-000000000099', plan: 'pro' })
    );
  });
});
