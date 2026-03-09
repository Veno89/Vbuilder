# Product Definition

## Goal
Vbuilder is a production-grade B2B SaaS starter platform that centralizes authentication, organizations, RBAC, billing, entitlements, admin tooling, audit logs, and developer-facing backend foundations.

## v1 Scope
- Email/password auth with verification, password reset, secure sessions.
- Multi-organization support with invites and membership lifecycle.
- Fixed RBAC roles: owner, admin, member, viewer.
- Stripe subscriptions (Free/Starter/Pro), billing portal, webhook synchronization.
- Plan-based entitlements enforced in backend services.
- Admin console for support visibility and account safety actions.
- Audit logs for high-value security and lifecycle actions.

## Non-Goals
- SAML/SSO, custom role builder, marketplace, microservices, advanced usage billing.

## Core Entities
- User, Session, Organization, Membership, Invitation, Subscription, Entitlement Snapshot, Audit Log, Admin Note.

## User Roles
- **Owner**: full org management including billing.
- **Admin**: member management and org settings (no billing by default).
- **Member**: core product usage.
- **Viewer**: read-only access.
