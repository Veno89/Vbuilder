import { describe, expect, it } from 'vitest';
import { planFromStripePriceId } from '../domain/stripe-plan-map';

describe('planFromStripePriceId', () => {
  const config = {
    starterPriceId: 'price_starter_123',
    proPriceId: 'price_pro_456'
  };

  it('maps starter and pro Stripe price ids to internal plan', () => {
    expect(planFromStripePriceId('price_starter_123', config)).toBe('starter');
    expect(planFromStripePriceId('price_pro_456', config)).toBe('pro');
  });

  it('rejects unknown Stripe price ids', () => {
    expect(() => planFromStripePriceId('price_unknown', config)).toThrow(
      'Unknown Stripe price id for plan mapping.'
    );
  });
});
