# Testing Strategy

## Test Types
- **Unit tests**: permission mapping, entitlement logic, role transitions, billing mapping, auth password + token + service invariants, auth rate limiting utility, organization/invitation/membership services.
- **Integration tests**: auth flow, organization + invite lifecycle, webhook synchronization, audit logging.
- **E2E tests**: signup/login, org creation, invite acceptance, plan upgrade, admin access controls.

## Current Unit Coverage
- Permission matrix invariants (`owner/admin/member/viewer`) in `src/modules/permissions/tests/permissions.test.ts`.
- Entitlement resolution and member-limit enforcement in `src/modules/entitlements/tests/entitlements.test.ts`.
- Password hash/verify guarantees in `src/modules/auth/tests/password.test.ts`.
- Token generation/hash/expiry helpers in `src/modules/auth/tests/token.test.ts`.
- Session issuer behavior in `src/modules/auth/tests/session-issuer.service.test.ts`.
- Authenticated actor resolution from secure session cookie in `src/modules/auth/tests/auth-context.service.test.ts`.
- Auth service sign-up/sign-in behavior with explicit dependency mocks in `src/modules/auth/tests/auth.service.test.ts`.
- Email verification confirmation flow in `src/modules/auth/tests/email-verification-confirm.service.test.ts`.
- Password reset request/completion flow in `src/modules/auth/tests/password-reset.service.test.ts`.
- In-memory auth rate limiter behavior in `src/modules/shared/security/rate-limit.test.ts`.
- Organization service, invitation service, and membership service unit coverage.
- Membership request-boundary schema validation for role update/member removal payloads.
- Invitation decline flow coverage including no-membership side effects and audit action assertions.
- Ownership transfer service coverage for allowed and denied transitions.
- Membership role update validation coverage for owner-role rejection in generic member role updates.
- Org permission guard service coverage for membership-required and permission-required paths.
- Permission-denied coverage for invitation send, membership remove, and ownership transfer workflows.
- Billing plan mapping tests and billing webhook idempotency processing tests.
- Entitlement enforcement service tests for plan-limit allow/deny behavior and invitation service denial when limit reached.
- Audit log repository tests for persistence writer behavior and default metadata handling.
- Admin access/admin service tests for platform-allowlist authorization and overview retrieval/audit behavior.
- Admin dashboard page smoke path validated by lint/typecheck and manual rendering check against `/api/admin/overview` contract.

## Current Integration Coverage
- Organization/invitation/membership lifecycle invariant coverage in `src/modules/organizations/tests/organization-lifecycle.integration.test.ts`, including:
  - owner-only transfer invariants and exactly-one-owner postcondition,
  - invitation single-use decline semantics (decline blocks later accept),
  - audit action assertions for critical state transitions.

## Database Strategy
- Dedicated isolated Postgres test database.
- Deterministic fixture factories.
- Transaction-based cleanup or schema reset between suites.

## Commands
- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
