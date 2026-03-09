# ADR 0005: Billing Approach (Stripe)

## Status
Accepted

## Decision
Use Stripe subscriptions with webhook-first synchronization and idempotent handlers.

## Rationale
Stripe is robust for SaaS recurring billing. Idempotent webhook processing plus centralized entitlement mapping yields resilient and auditable billing behavior.
