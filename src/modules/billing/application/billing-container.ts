import Stripe from 'stripe';
import { env } from '@/server/env';
import { db } from '@/server/db/client';
import { auditLogWriter } from '@/modules/audit-logs/application/audit-log-container';
import { MembershipRepository } from '@/modules/memberships/infrastructure/membership.repository';
import { OrgPermissionService } from '@/modules/permissions/application/org-permission.service';
import { BillingService, type StripeWebhookEvent } from './billing.service';
import { BillingRepository } from '../infrastructure/billing.repository';
import { planFromStripePriceId } from '../domain/stripe-plan-map';

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
const memberships = new MembershipRepository(db);
const permissions = new OrgPermissionService(memberships);
const billingRepository = new BillingRepository(db);

const starterPriceId = process.env.STRIPE_PRICE_STARTER ?? 'price_starter';
const proPriceId = process.env.STRIPE_PRICE_PRO ?? 'price_pro';

const planKeyToStripePriceId = (planKey: 'starter' | 'pro'): string => {
  if (planKey === 'starter') {
    return starterPriceId;
  }

  return proPriceId;
};

export const billingService = new BillingService(
  permissions,
  {
    async createCheckoutSession(input) {
      const session = await stripeClient.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: input.stripePriceId, quantity: 1 }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId
        }
      });

      if (!session.url) {
        throw new Error('Stripe checkout session URL was not returned.');
      }

      return { url: session.url };
    }
  },
  {
    async createPortalSession(input) {
      const subscription = await billingRepository.findActiveSubscriptionByOrganizationId(
        input.organizationId
      );

      if (!subscription) {
        throw new Error('No billing subscription customer found for this organization.');
      }

      const session = await stripeClient.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: input.returnUrl
      });

      return { url: session.url };
    }
  },
  {
    verify(rawBody: string, stripeSignature: string): StripeWebhookEvent {
      const event = stripeClient.webhooks.constructEvent(
        rawBody,
        stripeSignature,
        env.STRIPE_WEBHOOK_SECRET
      );

      return event as unknown as StripeWebhookEvent;
    }
  },
  {
    async recordIfNew(input) {
      return billingRepository.recordWebhookEventIfNew(input);
    }
  },
  {
    async upsertFromStripe(input) {
      await billingRepository.upsertSubscriptionFromStripe(input);
    },
    async findOrganizationIdByStripeCustomerId(stripeCustomerId) {
      return billingRepository.findOrganizationIdByStripeCustomerId(stripeCustomerId);
    }
  },
  {
    async writeSnapshot(input) {
      await billingRepository.writeEntitlementSnapshot(input);
    }
  },
  planKeyToStripePriceId,
  (priceId) => planFromStripePriceId(priceId, { starterPriceId, proPriceId }),
  env.APP_URL,
  auditLogWriter
);
