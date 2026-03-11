# Dev Kit Execution Plan

Last updated: 2026-03-10

## Phase A — Audit Triage

### MVP blockers (Priority 1)
1. Notification provider wiring is noop in runtime containers. **Status: completed in current phase**.
2. Invitation acceptance must bind invitation recipient email to authenticated actor email. **Status: completed in current phase**.
3. Billing checkout must accept internal `planKey` only (no client `priceId`). **Status: completed in current phase**.
4. In-memory-only rate limiting must gain distributed adapter path. **Status: completed in current phase**.
5. Minimal account + organization settings flows are missing. **Status: completed in current phase**.
6. Critical trust-boundary integration tests and one E2E golden path are missing. **Status: pending**.
7. Adoption docs overstate shipped behavior. **Status: in_progress**.

### Launch hardening (Priority 2)
- Admin/support actionable workflows (lookup, suspend, diagnostics). **Status: pending**.
- Audit log read APIs and taxonomy docs. **Status: pending**.
- Structured error code contract. **Status: pending**.

### Commercial-quality improvements (Priority 3)
- Config-driven entitlement registry.
- RBAC extension guardrails and docs.
- Route cross-cutting wrapper utilities.

### Deferred / later (Priority 4)
- SSO/SAML, API keys/service accounts, usage billing.

## Safe execution order
1. Security/trust boundary fixes (invite identity, billing plan input, distributed limiter).
2. Operational core completion (notifications + settings baseline).
3. Test hardening (integration boundaries + E2E golden path).
4. Admin/audit read tooling and extension docs.

## Current phase notes
Completed in this phase:
- Hardened invitation acceptance with recipient-email verification against authenticated actor email.
- Hardened checkout input to internal `planKey` model with server-side plan-key-to-Stripe-price mapping.
- Updated unit/integration tests and documentation for the new trust boundaries.
- Distributed-ready rate limiter adapter with optional Redis REST backend and in-memory fallback.
- Real notification provider wiring (Resend adapter) for verify/reset/invite flows, replacing noop container implementations.
- Minimal settings baseline APIs for account (read/email/password) and organization (name/slug) with server-side authz checks.
- Removed obsolete `NEXTAUTH_SECRET` runtime requirement to align env contract with custom auth implementation.

Follow-ups for next phase:
- Add trust-boundary integration coverage and one E2E golden path.

Progress note:
- Added API boundary tests for billing checkout and invitation acceptance routes.
- Expanded billing webhook boundary tests for non-subscription events and customer-mapping fallback.
- Expanded billing webhook error-path tests (missing signature, missing customer id, unresolved organization).
- Added API boundary tests for settings account/organization routes (actor forwarding, permission-denial and 429 behavior).
- Fixed settings-route actor spoofing risk by enforcing authenticated actor precedence over request payload actor fields.
- Committed Playwright golden-path E2E spec scaffold and config; activation gated by `E2E_RUN_FULL=1` for CI/env readiness.
- Added dev-only notification inbox endpoint + token-gated access for E2E verification-token retrieval.
