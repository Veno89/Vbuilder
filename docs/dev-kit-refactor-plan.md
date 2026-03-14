# Dev Kit Refactor Plan (2026-03-12)

## Objective
Upgrade Vbuilder from a strong internal prototype to a credible starter/dev-kit MVP and then to a commercially viable starter foundation.

---

## Workstream A — Tenant Integrity Hardening (Urgent)

### A1. Membership ownership invariants
- Add explicit domain rules:
  - owner cannot be removed via generic remove path,
  - last-owner cannot be demoted/removed,
  - ownership transfer is only path to owner changes.
- Return explicit domain errors for invariant violations.
- Add integration tests for every invalid transition.

### A2. Repository signaling
- Membership update/remove should report whether target record existed.
- Service layer should convert no-op writes into explicit not-found or invariant errors.

**Definition of Done**
- Invariant checks are centralized, tested, and impossible to bypass through current APIs.

---

## Workstream B — API Platform Contract Standardization (Urgent)

### B1. Route guard wrapper
Create shared utilities for:
- authenticated actor extraction,
- rate-limit enforcement,
- zod validation mapping,
- standardized error-to-status mapping.

### B2. Error policy
- Introduce typed error codes (`code`, `message`, optional `details`).
- Prevent leaking raw internal error text by default.

**Definition of Done**
- Critical API routes migrated to shared wrapper with consistent status/error payloads.

---

## Workstream C — Ops/Support Core (Urgent)

### C1. Audit read model
- Add tenant-scoped audit list endpoint.
- Add platform-admin scoped audit endpoint.
- Enforce pagination and filtering.

### C2. Admin support actions (minimum)
- User lookup, org lookup, subscription lookup.
- Recent webhook outcomes and failure diagnostics.

**Definition of Done**
- Support teams can investigate auth/org/billing incidents without direct SQL access.

---

## Workstream D — Billing Reliability Hardening (High)

### D1. Reconciliation strategy
- Implement periodic reconciliation job for Stripe subscription state.
- Compare canonical internal subscriptions against Stripe and self-heal drift.

### D2. Lifecycle policies
- Define and enforce downgrade/over-limit behavior.
- Add explicit policy docs and tests.

**Definition of Done**
- Billing state converges reliably even if webhooks are delayed/missed.

---

## Workstream E — Reusability Contracts (High)

### E1. Entitlement/plan registry
- Replace hardcoded entitlement map with typed config-driven catalog.
- Startup validation for config consistency.

### E2. RBAC extension contract
- Formalize role-permission matrix management.
- Remove or wire currently unused permission constants.

### E3. Extension docs
- “How to add a plan”, “how to add a role”, “how to add a module/provider”.

**Definition of Done**
- External team can safely extend core foundation without code archaeology.

---

## Workstream F — Testing & Release Discipline (High)

### F1. Test expansion
- Add invariant tests for tenant lifecycle.
- Add billing reconciliation/out-of-order cases.
- Add admin/audit API boundary tests.

### F2. CI gates
- Add CI workflow: lint -> typecheck -> unit/integration -> e2e smoke (configurable).

### F3. Release hygiene
- Add starter changelog/versioning process.

**Definition of Done**
- Refactors are guarded by automated quality gates and release artifacts.

---

## Execution Order
1. Workstreams A + B (first, trust and contract stability).
2. Workstream C (operational safety).
3. Workstream D + E (commercial starter credibility).
4. Workstream F in parallel after A/B baseline.

---

## Anti-Patterns to Avoid During Refactor
- No microservice decomposition.
- No premature abstraction explosion.
- No feature expansion before trust-boundary and operational blockers are closed.
