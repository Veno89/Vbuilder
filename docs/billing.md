# Billing Model

## Plans
- Free
- Starter
- Pro

## Stripe Flow
1. Organization owner starts checkout session.
2. Stripe handles payment method and subscription lifecycle.
3. Webhook events are verified and stored idempotently.
4. Subscription state updates internal subscription table.
5. Entitlement service derives limits/features from synchronized plan state.

## Implemented Billing API Skeleton
- `POST /api/billing/checkout`: authenticated actor + `organization:billing.manage` permission required; request accepts internal `planKey` (`starter`/`pro`) only.
- `POST /api/billing/portal`: authenticated actor + `organization:billing.manage` permission required.
- `POST /api/billing/webhook`: Stripe signature verification + idempotent event handling.

## Webhook Sync Behavior
- Verify webhook signature with Stripe webhook secret.
- Insert event into `stripe_webhook_events`; duplicates are ignored.
- For subscription events:
  - resolve organization id from Stripe metadata/customer mapping,
  - map Stripe price id to internal plan,
  - upsert `subscriptions` canonical state,
  - write entitlement snapshot derived from internal plan.

## Entitlement Enforcement in Domain Flows
- Member-limit enforcement for invitations is performed server-side by `EntitlementEnforcementService`.
- The check derives current member count from `memberships` and plan from canonical `subscriptions` state (fallback `free`), not from request payloads.

## Idempotency Behavior
- Store processed webhook event IDs.
- Ignore duplicates safely.
- Keep handlers resilient to out-of-order delivery.

## Entitlement Mapping (initial)
- Free: low member limit, premium features disabled.
- Starter: increased member limit + baseline premium set.
- Pro: highest limits + full premium feature set.


## Checkout Trust Boundary
- Client submits `planKey` only; raw Stripe `priceId` is never accepted from request payloads.
- Server maps `planKey` to Stripe price ID using server-side configuration (`STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`) before creating checkout sessions.
