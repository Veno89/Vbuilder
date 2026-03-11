# Dev Kit Roadmap (Revised)

## Phase 1 — Credible Starter MVP

### Goal
Move from prototype foundation to trustworthy starter baseline.

### Deliverables
1. Notifications are real (verify/reset/invite).
2. Invite acceptance identity binding shipped.
3. Billing checkout hardened to plan-key model.
4. Distributed rate limiter supported.
5. Minimal account and org settings shipped.
6. API integration tests for trust boundaries.
7. One E2E golden path in CI.
8. Setup/adoption docs corrected and complete.

### Exit Gate
All deliverables complete with passing test gates and no noop production-critical paths.

---

## Phase 2 — Strong Public Starter

### Goal
Make external adoption practical and supportable.

### Deliverables
1. Admin support actions and diagnostics.
2. Audit-log read/query APIs.
3. Error code standardization.
4. Extension cookbook (roles/plans/modules/providers).
5. Seed/demo setup automation.

### Exit Gate
External team can onboard and operate product without source-level archaeology.

---

## Phase 3 — Commercial-Quality Starter

### Goal
Differentiate as paid-quality foundation.

### Deliverables
1. Config-driven entitlement/plan system.
2. RBAC extension model with guardrails.
3. Webhook reconciliation and async reliability workflows.
4. Expanded isolation/failure-mode test matrix.
5. Release/versioning/changelog discipline.

### Exit Gate
Starter has reliable upgrade path, stable contracts, and high confidence under real workloads.

---

## Phase 4 — Advanced/Premium Expansion

### Goal
Support enterprise and advanced B2B scenarios.

### Candidate Deliverables
1. SSO/SAML scaffolding.
2. API keys/service accounts.
3. Usage-based billing primitives.
4. Advanced feature-management targeting.

### Exit Gate
Advanced patterns are supported without architectural churn.

---

## Priority Principle
Prioritize anything that protects trust boundaries, production operability, and adoption confidence before adding premium breadth.


### Progress Update (2026-03-10)
- ⏳ Deliverable 7 partial: Playwright golden-path E2E flow now includes verification-token retrieval via dev inbox endpoint; full CI execution still pending environment prerequisites.
- ✅ Deliverable 1 complete: transactional notification provider wiring shipped for verify/reset/invite flows.
- ✅ Deliverable 2 complete: invite acceptance identity binding shipped.
- ✅ Deliverable 3 complete: checkout hardened to plan-key model with server-side mapping.
- ✅ Deliverable 4 complete: distributed-ready rate limiter adapter shipped (Redis REST optional, in-memory fallback).
- ✅ Deliverable 5 complete: minimal account and organization settings APIs shipped with server-side authorization checks.
- ⏳ Remaining Phase 1 deliverables still in progress (integration/E2E, docs completion).
