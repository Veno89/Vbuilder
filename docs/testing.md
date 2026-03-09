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
- Auth service sign-up/sign-in behavior with explicit dependency mocks in `src/modules/auth/tests/auth.service.test.ts`.
- Email verification confirmation flow in `src/modules/auth/tests/email-verification-confirm.service.test.ts`.
- Password reset request/completion flow in `src/modules/auth/tests/password-reset.service.test.ts`.
- In-memory auth rate limiter behavior in `src/modules/shared/security/rate-limit.test.ts`.
- Organization service, invitation service, and membership service unit coverage.

## Database Strategy
- Dedicated isolated Postgres test database.
- Deterministic fixture factories.
- Transaction-based cleanup or schema reset between suites.

## Commands
- `npm run test`
- `npm run test:e2e`
- `npm run lint`
- `npm run typecheck`
