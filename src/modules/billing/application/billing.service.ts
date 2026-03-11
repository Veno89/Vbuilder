import type { AuditLogWriter } from '@/modules/audit-logs/domain/audit-log.types';
import { resolveEntitlements, type Plan } from '@/modules/entitlements/domain/entitlements';
import type { OrgPermissionGuard } from '@/modules/permissions/application/org-permission.service';
import { AuthorizationError } from '@/modules/shared/domain/errors';
import {
  createCheckoutSessionSchema,
  createPortalSessionSchema,
  type CreateCheckoutSessionInput,
  type CreatePortalSessionInput
} from '../schemas/billing.schemas';

export type BillingCheckoutProvider = {
  createCheckoutSession(input: {
    organizationId: string;
    actorUserId: string;
    stripePriceId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
};

export type BillingPortalProvider = {
  createPortalSession(input: {
    organizationId: string;
    actorUserId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
};

export type StripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: {
      metadata?: Record<string, string>;
      customer?: string;
      id?: string;
      status?: string;
      cancel_at_period_end?: boolean;
      current_period_end?: number;
      items?: {
        data: Array<{
          price?: {
            id?: string;
          };
        }>;
      };
    };
  };
};

export type StripeWebhookVerifier = {
  verify(rawBody: string, stripeSignature: string): StripeWebhookEvent;
};

export type BillingWebhookEventRepository = {
  recordIfNew(input: { eventId: string; eventType: string; payload: Record<string, unknown> }): Promise<boolean>;
};

export type BillingSubscriptionRepository = {
  upsertFromStripe(input: {
    organizationId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    plan: Plan;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  }): Promise<void>;
  findOrganizationIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null>;
};

export type BillingEntitlementSnapshotWriter = {
  writeSnapshot(input: {
    organizationId: string;
    plan: Plan;
    maxMembers: number;
    featureFlags: Record<string, boolean>;
  }): Promise<void>;
};

const SUBSCRIPTION_EVENT_TYPES = new Set([
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted'
]);

export class BillingService {
  constructor(
    private readonly permissions: OrgPermissionGuard,
    private readonly checkoutProvider: BillingCheckoutProvider,
    private readonly portalProvider: BillingPortalProvider,
    private readonly webhookVerifier: StripeWebhookVerifier,
    private readonly webhookEvents: BillingWebhookEventRepository,
    private readonly subscriptions: BillingSubscriptionRepository,
    private readonly entitlements: BillingEntitlementSnapshotWriter,
    private readonly planKeyToStripePriceId: (planKey: CreateCheckoutSessionInput['planKey']) => string,
    private readonly planFromStripePriceId: (priceId: string) => Plan,
    private readonly appUrl: string,
    private readonly auditLogs: AuditLogWriter
  ) {}

  async createCheckoutSession(
    rawInput: CreateCheckoutSessionInput & { actorUserId: string }
  ): Promise<{ url: string }> {
    const input = createCheckoutSessionSchema.parse(rawInput);

    await this.permissions.requireOrgPermission({
      actorUserId: rawInput.actorUserId,
      organizationId: input.organizationId,
      permission: 'organization:billing.manage'
    });

    return this.checkoutProvider.createCheckoutSession({
      organizationId: input.organizationId,
      actorUserId: rawInput.actorUserId,
      stripePriceId: this.planKeyToStripePriceId(input.planKey),
      successUrl: input.successUrl ?? `${this.appUrl}/billing/success`,
      cancelUrl: input.cancelUrl ?? `${this.appUrl}/billing/cancel`
    });
  }

  async createPortalSession(
    rawInput: CreatePortalSessionInput & { actorUserId: string }
  ): Promise<{ url: string }> {
    const input = createPortalSessionSchema.parse(rawInput);

    await this.permissions.requireOrgPermission({
      actorUserId: rawInput.actorUserId,
      organizationId: input.organizationId,
      permission: 'organization:billing.manage'
    });

    return this.portalProvider.createPortalSession({
      organizationId: input.organizationId,
      actorUserId: rawInput.actorUserId,
      returnUrl: input.returnUrl ?? `${this.appUrl}/settings/billing`
    });
  }

  async handleWebhook(rawBody: string, stripeSignature: string | null): Promise<{ processed: boolean }> {
    if (!stripeSignature) {
      throw new AuthorizationError('Missing Stripe signature header.');
    }

    const event = this.webhookVerifier.verify(rawBody, stripeSignature);

    const recorded = await this.webhookEvents.recordIfNew({
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown as Record<string, unknown>
    });

    if (!recorded) {
      return { processed: false };
    }

    if (!SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
      return { processed: true };
    }

    const object = event.data.object;
    const stripeCustomerId = object.customer;

    if (!stripeCustomerId) {
      throw new AuthorizationError('Stripe subscription event missing customer id.');
    }

    const organizationId =
      object.metadata?.organizationId ??
      (await this.subscriptions.findOrganizationIdByStripeCustomerId(stripeCustomerId));

    if (!organizationId) {
      throw new AuthorizationError('Unable to resolve organization for Stripe customer.');
    }

    const priceId = object.items?.data[0]?.price?.id;
    const plan = priceId ? this.planFromStripePriceId(priceId) : 'free';

    await this.subscriptions.upsertFromStripe({
      organizationId,
      stripeCustomerId,
      stripeSubscriptionId: object.id ?? null,
      plan,
      status: object.status ?? 'inactive',
      cancelAtPeriodEnd: object.cancel_at_period_end ?? false,
      currentPeriodEnd: object.current_period_end
        ? new Date(object.current_period_end * 1000)
        : null
    });

    const resolved = resolveEntitlements(plan);
    await this.entitlements.writeSnapshot({
      organizationId,
      plan,
      maxMembers: resolved.maxMembers,
      featureFlags: {
        advancedAuditExports: resolved.features.advancedAuditExports,
        prioritySupport: resolved.features.prioritySupport
      }
    });

    await this.auditLogs.write({
      actorUserId: null,
      organizationId,
      action: 'billing.subscription_synced',
      targetType: 'subscription',
      targetId: object.id ?? stripeCustomerId,
      metadata: { stripeEventId: event.id, stripeEventType: event.type, plan }
    });

    return { processed: true };
  }
}
