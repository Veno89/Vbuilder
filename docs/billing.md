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

## Idempotency Behavior
- Store processed webhook event IDs.
- Ignore duplicates safely.
- Keep handlers resilient to out-of-order delivery.

## Entitlement Mapping (initial)
- Free: low member limit, premium features disabled.
- Starter: increased member limit + baseline premium set.
- Pro: highest limits + full premium feature set.
