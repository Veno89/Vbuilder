import { eq } from 'drizzle-orm';
import type { Plan } from '@/modules/entitlements/domain/entitlements';
import type { DatabaseClient } from '@/server/db/client';
import { entitlementSnapshots, stripeWebhookEvents, subscriptions } from '@/server/db/schema';

export class BillingRepository {
  constructor(private readonly db: DatabaseClient) {}

  async recordWebhookEventIfNew(input: {
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<boolean> {
    try {
      const result = await this.db
        .insert(stripeWebhookEvents)
        .values({ eventId: input.eventId, eventType: input.eventType, payload: input.payload })
        .returning({ id: stripeWebhookEvents.id });
      return Boolean(result[0]);
    } catch {
      return false;
    }
  }

  async upsertSubscriptionFromStripe(input: {
    organizationId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string | null;
    plan: Plan;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
  }): Promise<void> {
    const existing = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, input.organizationId)
    });

    if (!existing) {
      await this.db.insert(subscriptions).values({
        organizationId: input.organizationId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        plan: input.plan,
        status: input.status,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEnd: input.currentPeriodEnd
      });
      return;
    }

    await this.db
      .update(subscriptions)
      .set({
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        plan: input.plan,
        status: input.status,
        cancelAtPeriodEnd: input.cancelAtPeriodEnd,
        currentPeriodEnd: input.currentPeriodEnd,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, existing.id));
  }

  async findOrganizationIdByStripeCustomerId(stripeCustomerId: string): Promise<string | null> {
    const existing = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptions.stripeCustomerId, stripeCustomerId)
    });

    return existing?.organizationId ?? null;
  }

  async writeEntitlementSnapshot(input: {
    organizationId: string;
    plan: Plan;
    maxMembers: number;
    featureFlags: Record<string, boolean>;
  }): Promise<void> {
    await this.db.insert(entitlementSnapshots).values(input);
  }

  async findActiveSubscriptionByOrganizationId(organizationId: string): Promise<{
    stripeCustomerId: string;
  } | null> {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId)
    });

    if (!subscription) {
      return null;
    }

    return { stripeCustomerId: subscription.stripeCustomerId };
  }

  async findPlanByOrganizationId(organizationId: string): Promise<Plan | null> {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, organizationId)
    });

    return subscription?.plan ?? null;
  }
}
