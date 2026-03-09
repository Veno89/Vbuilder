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
- `EmailVerificationConfirmService` consumes hashed verification tokens and marks users verified.
- `PasswordResetService` handles reset token issuance + password update workflow with hashed tokens and audit events.
- HTTP entry points are implemented via `/api/auth/*` route handlers (signup, signin, logout, verify-email, forgot-password, reset-password).
- Basic in-memory per-IP rate limiting guards auth-sensitive endpoints; planned upgrade is distributed rate limiting.

## Organizations and Invitations Model
- `OrganizationService` owns organization creation and owner membership bootstrap.
- `InvitationService` owns invitation send/accept workflows with permission checks and entitlement-aware member limit checks.
- `MembershipService` owns role changes and removals with centralized permission enforcement.
- HTTP entry points exist for org create, invite send/accept, member role update, and member removal under `/api/organizations/*` and `/api/invitations/accept`.

## Billing Model
Stripe is source of truth for payment events; synchronized subscription state is canonical for entitlement checks inside application services.

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
