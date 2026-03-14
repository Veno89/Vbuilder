# Dev Kit MVP Gap Analysis (2026-03-12)

## Target Definition: “Credible Starter/Dev-Kit MVP”
A credible MVP starter must let a new team reliably do the following without rewriting core foundation systems:
1. Set up environment and run locally with confidence.
2. Onboard users securely (signup/verify/signin/reset).
3. Create and manage organizations/teams with safe role transitions.
4. Enforce tenant-scoped permissions server-side.
5. Run billing + entitlements with trustworthy state sync.
6. Operate/support the platform (admin + audit visibility).
7. Extend plans/roles/modules using documented extension points.

Current codebase does **not** satisfy all seven conditions.

---

## MVP-Critical Gaps (Blockers)

### 1) Membership/ownership invariants are not fully enforced
- Current membership remove/update flows do not explicitly guard all owner-orphan edge cases in the service boundary.
- Risk: inconsistent organization ownership and broken tenant governance.
- MVP impact: **blocker**.

### 2) Operational visibility is insufficient
- Audit logs are write-heavy but there is no first-class read/query API for support.
- Admin only provides aggregate overview counts.
- MVP impact: **blocker** (supportability gap).

### 3) Billing lifecycle robustness is partial
- Webhook verification + idempotency exists, but no reconciliation loop for missed/delayed webhook scenarios.
- Downgrade/over-limit policy behavior is not clearly codified as starter behavior.
- MVP impact: **blocker** for trustworthiness.

### 4) API platform contract is inconsistent
- Repeated route boilerplate leads to inconsistent error mapping and status semantics.
- Raw error messages are often returned directly to clients.
- MVP impact: **blocker** for integrator trust and DX.

### 5) Reusability contracts are missing
- Plans/entitlements are code-hardcoded.
- Role/permission extension process is not formalized.
- MVP impact: **blocker** for “starter kit” credibility.

---

## Important Gaps (Should land immediately after MVP blocker closure)

1. Invite management completeness (list/revoke/resend, better UX states).
2. User/org lifecycle actions (archive/delete/suspend semantics).
3. Notification template/version management and retry strategy.
4. Deterministic CI pipeline with e2e smoke.
5. Better onboarding/adoption docs and extension cookbook.

---

## Nice-to-Have / Later (Not MVP blockers)

1. SSO/SAML scaffolding.
2. API keys/service accounts.
3. Usage-based billing primitives.
4. Feature-flag management system.
5. Advanced admin moderation and support tooling.

---

## Blocking Milestone Summary

The codebase becomes a credible starter MVP only when all are true:
- Ownership/member invariants are explicit and tested.
- Admin + audit read tooling supports practical operations.
- Billing has reconciliation and explicit lifecycle policies.
- API error/auth/rate-limit handling is standardized.
- Plans/roles/extensions are documented and configuration-driven.

Until then, this remains a strong foundation prototype—not a reliable reusable starter product.
