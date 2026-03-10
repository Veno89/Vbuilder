# Dev Kit Refactor Plan (Revised)

## Objective
Refactor the current foundation into a credible starter MVP without rewriting the architecture.

---

## Workstream 1 — Security & Trust Boundaries (Urgent)

### 1.1 Invitation acceptance identity binding
- Add actor-email lookup in invitation acceptance flow.
- Enforce case-insensitive recipient match.
- Introduce explicit domain error (`invitation.recipient_mismatch`).
- Add integration tests for valid/invalid/replay paths.

### 1.2 Billing checkout input hardening
- Replace `priceId` request input with internal `planKey` enum.
- Map planKey -> Stripe price in server-only config.
- Reject unknown plan keys with stable error code.
- Update route and service tests accordingly.

### 1.3 Rate-limiter abstraction
- Define shared `RateLimiter` interface.
- Keep in-memory adapter for local tests.
- Add distributed adapter for production.
- Migrate high-risk endpoints to unified limiter wrapper.

**DoD:** all three changes shipped with tests and no API trust boundary regressions.

---

## Workstream 2 — Operational Core Completion (Urgent)

### 2.1 Notifications module (real)
- Introduce concrete notifications module (provider adapter + templates).
- Implement verification/reset/invite delivery.
- Add logging and failure telemetry hooks.
- Remove noop defaults from production containers.

### 2.2 Settings baseline
- Add account settings API/service (profile + password change).
- Add org settings API/service (name/slug update, permission-gated).
- Provide minimal settings pages or clearly documented API-first behavior.

### 2.3 Membership lifecycle invariants
- Explicitly prevent owner-orphan edge states.
- Add domain errors for illegal role/removal transitions.
- Expand integration tests for lifecycle edge cases.

**DoD:** starter has minimum usable self-service and operationally real core flows.

---

## Workstream 3 — Reusability & Extensibility (Medium)

### 3.1 Entitlement registry
- Move hardcoded entitlement map to typed catalog config.
- Add startup validation for plan catalog consistency.
- Document process to add plan/feature/limit.

### 3.2 RBAC cleanup
- Remove dead permissions or implement corresponding features.
- Create endpoint-to-permission matrix and enforce via tests.
- Add doc for extending roles/permissions safely.

### 3.3 Route cross-cutting utilities
- Create shared response/error handler utility.
- Create wrapper utility for auth + rate-limit composition.
- Incrementally migrate API handlers.

**DoD:** easier extension, reduced drift, less duplicate boilerplate.

---

## Workstream 4 — Admin, Audit, and Supportability (Medium)

### 4.1 Admin/support primitives
- Add user/org/subscription lookup endpoints.
- Add suspend/unsuspend admin actions with audit trails.
- Add billing troubleshooting visibility (recent webhook outcomes).

### 4.2 Audit log read model
- Build paginated query APIs (tenant/admin scoped).
- Document event taxonomy and naming conventions.
- Add retention/export plan notes.

**DoD:** support teams can diagnose and act without direct DB access.

---

## Workstream 5 — Testing & CI Hardening (Urgent -> Medium)

### 5.1 API integration coverage
- Auth/session edge behavior.
- Tenant/RBAC enforcement per role.
- Invite recipient checks.
- Billing webhook replay/out-of-order handling.

### 5.2 E2E golden path
- Signup -> verify -> signin -> create org -> invite -> accept -> billing upgrade.

### 5.3 CI gates
- Enforce lint/typecheck/unit/integration/E2E smoke.
- Publish test matrix in docs.

**DoD:** refactors become safe and regressions are detectable early.

---

## Recommended Sequencing (4 Sprints)

### Sprint 1
Workstream 1 (all) + Workstream 5.1 baseline.

### Sprint 2
Workstream 2.1 + 2.2 + 5.2 golden path.

### Sprint 3
Workstream 2.3 + Workstream 3.1 + 3.2.

### Sprint 4
Workstream 3.3 + Workstream 4 + Workstream 5.3 + docs polish.

---

## Anti-Goals
- No microservice rewrite.
- No premature enterprise features before MVP blockers close.
- No broad abstraction layering without concrete extension need.
