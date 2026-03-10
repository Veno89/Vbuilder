import { AuthorizationError } from '@/modules/shared/domain/errors';
import type { Plan } from '@/modules/entitlements/domain/entitlements';

export type StripePlanPriceConfig = {
  starterPriceId: string;
  proPriceId: string;
};

export function planFromStripePriceId(priceId: string, config: StripePlanPriceConfig): Plan {
  if (priceId === config.starterPriceId) {
    return 'starter';
  }

  if (priceId === config.proPriceId) {
    return 'pro';
  }

  throw new AuthorizationError('Unknown Stripe price id for plan mapping.');
}
