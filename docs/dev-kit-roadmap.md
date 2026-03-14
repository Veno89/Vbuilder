# Dev Kit Roadmap (2026-03-12)

## Phase 1 — Starter MVP Blockers (Now)

### Goal
Cross the line from “good prototype” to “credible starter MVP”.

### Must-ship outcomes
1. Membership/ownership invariants hardened and tested.
2. Standardized API wrapper for auth/rate-limit/errors.
3. Audit log read APIs + minimum admin support diagnostics.
4. Billing reconciliation strategy and documented lifecycle policies.
5. CI quality gates with deterministic baseline checks.

### Exit gate
A new team can trust auth/team/billing operations and support incidents without custom rewrites.

---

## Phase 2 — Strong Public Starter (Near-term)

### Goal
Make adoption practical for external teams.

### Deliverables
1. Config-driven plan/entitlement catalog.
2. Role/permission extension contract and matrix tests.
3. Invite lifecycle completeness (list/revoke/resend).
4. Starter extension documentation (module/provider/playbook).
5. Local seed/demo workflows and setup hardening.

### Exit gate
External adopters can set up, customize, and ship without reverse-engineering internals.

---

## Phase 3 — Commercial-Quality Starter (Mid-term)

### Goal
Raise trust and maintainability to paid starter expectations.

### Deliverables
1. Notification template/version system with retries/queue strategy.
2. Expanded admin/support tooling (user/org/subscription incident workflows).
3. Reliability suite for billing + membership + invitation edge cases.
4. Observability guidance (logs/metrics/error tracking integration points).
5. Versioned release/changelog discipline.

### Exit gate
Starter demonstrates operational maturity and controlled evolution.

---

## Phase 4 — Advanced/Premium Expansion (Later)

### Goal
Add advanced B2B features without destabilizing foundation.

### Candidate deliverables
1. SSO/SAML scaffolding.
2. API keys/service accounts.
3. Usage-based billing primitives.
4. Advanced feature management.

### Exit gate
Advanced capabilities layer cleanly on top of stable core contracts.

---

## Prioritization Principle
Anything that protects tenant integrity, billing trust, and operational supportability outranks new feature breadth.
