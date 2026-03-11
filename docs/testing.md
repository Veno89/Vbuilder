# Testing Strategy

## Test Types
- **Unit tests**: permission mapping, entitlement logic, role transitions, billing mapping, auth password + token + service invariants, auth rate limiting utility, organization/invitation/membership services.
- **Integration tests**: auth flow, organization + invite lifecycle, webhook synchronization, audit logging.
- **E2E tests**: signup/login, org creation, invite acceptance, plan upgrade, admin access controls.
- E2E golden-path spec scaffold in `e2e/golden-path.spec.ts` with Playwright config (`playwright.config.ts`).
- E2E flow uses a dev notification inbox endpoint (`/api/dev/notifications/latest`) gated by `NOTIFICATION_INBOX_ENABLED` and `DEV_INBOX_TOKEN` for verification-token retrieval in non-production environments.

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
- Shared rate limiter behavior (in-memory adapter and enforcement contract) in `src/modules/shared/security/rate-limit.test.ts`.
- Notification service coverage for verification/invite delivery success/failure handling in `src/modules/notifications/tests/notification.service.test.ts`.
- Settings service coverage for account email update, password-change denial path, and organization permission enforcement in `src/modules/settings/tests/settings.service.test.ts`.
- Organization service, invitation service, and membership service unit coverage.
- Membership request-boundary schema validation for role update/member removal payloads.
- Invitation decline flow coverage including no-membership side effects and audit action assertions.
- Ownership transfer service coverage for allowed and denied transitions.
- Membership role update validation coverage for owner-role rejection in generic member role updates.
- Org permission guard service coverage for membership-required and permission-required paths.
- Permission-denied coverage for invitation send, membership remove, and ownership transfer workflows.
- Billing plan mapping tests plus webhook idempotency, signature/customer/org-resolution failure paths, non-subscription ignore behavior, and customer-mapping fallback paths in billing service tests.
- Entitlement enforcement service tests for plan-limit allow/deny behavior and invitation service denial when limit reached.
- Audit log repository tests for persistence writer behavior and default metadata handling.
- Admin access/admin service tests for platform-allowlist authorization and overview retrieval/audit behavior.
- Admin dashboard page smoke path validated by lint/typecheck and manual rendering check against `/api/admin/overview` contract.

## Current Integration Coverage
- API route boundary tests for settings account/organization endpoints in `src/app/api/settings/account/route.test.ts` and `src/app/api/settings/organization/route.test.ts`, including actor forwarding, spoofed-actor override prevention, and 429 behavior.
- API route boundary tests for checkout and invitation acceptance handlers in `src/app/api/billing/checkout/route.test.ts` and `src/app/api/invitations/accept/route.test.ts`, including plan-key payload enforcement, actor-email forwarding, and 429 rate-limit behavior.
- Organization/invitation/membership lifecycle invariant coverage in `src/modules/organizations/tests/organization-lifecycle.integration.test.ts`, including:
  - owner-only transfer invariants and exactly-one-owner postcondition,
  - invitation recipient-binding and single-use semantics (email mismatch does not consume token; decline blocks later accept),
  - audit action assertions for critical state transitions.

## Database Strategy
- Dedicated isolated Postgres test database.
- Deterministic fixture factories.
- Transaction-based cleanup or schema reset between suites.

## Commands
- `npm run test`
- `E2E_RUN_FULL=1 npm run test:e2e`
- `npm run test:e2e` (spec is present but skipped unless `E2E_RUN_FULL=1`)
- `npm run lint`
- `npm run typecheck`
