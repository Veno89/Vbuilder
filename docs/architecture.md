# Architecture

## Architectural Style
Modular monolith in a Next.js App Router application with strict server-side domain boundaries.

## Module Boundaries
- auth
- users
- organizations
- memberships
- invitations
- permissions
- billing
- entitlements
- audit-logs
- admin
- notifications
- shared/core

Each module contains domain, application, infrastructure, API integration, schemas, and tests.

## Technology Choices
- **Framework**: Next.js 14 App Router + TypeScript strict mode.
- **ORM**: Drizzle ORM (explicit SQL-like schema, strong type safety, clear migrations).
- **Database**: PostgreSQL.
- **Validation**: Zod at request and environment boundaries.
- **Billing**: Stripe with idempotent webhook processing.
- **Testing**: Vitest (unit/integration), Playwright (critical E2E).

## Data Access and Boundaries
- Schema is defined in `src/server/db/schema.ts` with explicit foreign keys and indexes for tenant-safe query patterns.
- Auth persistence includes `users`, `sessions`, `email_verification_tokens`, and `password_reset_tokens`.
- Drizzle-backed repositories now cover auth, organizations, memberships, and invitations.
- Repositories in module `infrastructure` layers isolate persistence from domain/application services.
- Tenant access is enforced via application services (e.g., shared tenant access checks) rather than route-only checks.

## Auth Model
- Auth service (`AuthService`) handles sign-up/sign-in orchestration and depends on interfaces for user persistence, session issuance, verification token creation, notification delivery, and audit logging.
- `SessionIssuerService` stores hashed session tokens, revokes prior active sessions for the user (basic rotation policy), and returns raw bearer tokens once.
- `AuthContextService` resolves the authenticated actor from the secure `vb_session` cookie by hashing the token, verifying the backing session is active/non-expired, and validating the user is not suspended.
- `EmailVerificationConfirmService` consumes hashed verification tokens and marks users verified.
- `PasswordResetService` handles reset token issuance + password update workflow with hashed tokens and audit events.
- HTTP entry points are implemented via `/api/auth/*` route handlers (signup, signin, logout, verify-email, forgot-password, reset-password).
- Rate limiting uses a shared adapter: in-memory by default, with optional Redis REST backend for distributed deployments (`RATE_LIMIT_REDIS_REST_URL` + `RATE_LIMIT_REDIS_REST_TOKEN`).

## Organizations and Invitations Model
- `OrganizationService` owns organization creation and owner membership bootstrap.
- `OrganizationService` also owns ownership transfer (owner-only), requiring the target to already be a member and writing an explicit audit event.
- `InvitationService` owns invitation send/accept workflows with permission checks and entitlement-aware member limit checks.
- `InvitationService` also owns invitation decline with single-use token state transitions (`acceptedAt`/`declinedAt`) enforced in persistence.
- `MembershipService` owns role changes and removals with centralized permission enforcement.
- `OrgPermissionService` provides explicit service-boundary authorization (`requireOrgPermission(actor, orgId, permission)`) and is reused by organization/invitation/membership services.
- Generic membership role updates do not assign `owner`; ownership changes are handled through the dedicated transfer workflow.
- Invariants are enforced across services/repositories: invitation tokens are single-use, ownership transfer preserves one owner per organization, and non-owners cannot transfer ownership.
- Organization/membership/invitation HTTP routes no longer trust request-body `actorUserId`; they derive actor identity from server-side session context before calling services.
- Routes remain thin wrappers; authorization decisions are enforced in application services via named permissions rather than ad hoc route checks.
- HTTP entry points exist for org create, invite send, member role update/member removal, and invitation accept/decline under `/api/organizations/*` and `/api/invitations/*`.

## Billing Model
Stripe is source of truth for payment events; synchronized subscription state is canonical for entitlement checks inside application services.

- `BillingService` owns checkout session creation, billing portal session creation, and webhook synchronization workflows.
- Billing API routes (`/api/billing/checkout`, `/api/billing/portal`, `/api/billing/webhook`) are thin adapters over application services.
- Billing management endpoints require `organization:billing.manage` permission server-side.
- Webhooks are verified using Stripe signatures and deduplicated with `stripe_webhook_events` idempotency records.
- Subscription webhook sync writes canonical subscription state and entitlement snapshots from mapped internal plans.
- `EntitlementEnforcementService` enforces member-limit checks from canonical server-side state (`memberships` count + `subscriptions` plan), removing any client influence on plan/member-count calculations.

## Multi-Tenant Model
Organization is the primary tenant boundary. Every tenant-owned read/write path validates membership + permission server-side before access.

## Security Decisions
- Strict env validation
- Server-side authorization enforcement
- No client-trusted role assertions
- Stripe webhook signature verification and idempotency
- Sensitive action audit logging
- Password hashing via `scrypt` with timing-safe comparisons
- Persist only hashed session/verification/reset tokens
- Rate-limit auth endpoints and rotate active sessions on new login
- Rate-limit high-risk tenant mutation endpoints (invitation accept/decline/send, member role/remove, ownership transfer, billing checkout/portal)

## Notifications
- Notification delivery is wired through a concrete provider adapter (Resend REST) used by signup verification, password reset, and organization invitation flows.
- Provider failures are logged with actionable context and surfaced as explicit delivery errors to callers.

## Audit Logging
- `AuditLogRepository` persists audit events to `audit_logs` and is wired into auth, organization, invitation, membership, and billing application containers.
- Critical workflows (auth lifecycle events, membership changes, invite acceptance/decline, ownership transfer, billing sync) now use a concrete writer rather than noop stubs.

## Settings Model
- Account settings API supports authenticated account read + email update + password change, all enforced server-side.
- Organization settings API supports name/slug updates gated by `organization:update` permission checks in application services.

## Admin Model
- Admin access is platform-scoped and independent from tenant roles, enforced via server-side allowlist (`PLATFORM_ADMIN_EMAILS`).
- `AdminService` currently provides an authenticated `GET /api/admin/overview` endpoint with explicit admin access checks and audit event logging.
- App Router includes a minimal `/admin` dashboard page that consumes the server-validated overview endpoint and surfaces authorization/transport errors.
