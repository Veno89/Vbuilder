# Dev Kit MVP Gap Analysis (Revised)

## Purpose
Define the exact gap between current codebase state and a **credible reusable SaaS starter MVP**.

---

## A) MVP Bar (Non-Negotiable)
A credible starter MVP must satisfy all:
1. Production-operational identity lifecycle (verify/reset/invite comms actually delivered).
2. Server-enforced tenant/RBAC boundaries with tested edge cases.
3. Billing and entitlement trust boundaries controlled server-side.
4. Minimal self-serve settings and minimal support/admin capabilities.
5. Adoption-ready docs + setup + test proof.

---

## B) Current State vs MVP Bar

| Area | Current state | Gap severity | MVP blocker? |
|---|---|---:|---:|
| Notifications | Noop implementations wired in runtime containers | Critical | Yes |
| Invite identity binding | Token + actor only; no explicit invited-email check | High | Yes |
| Billing checkout trust | Accepts raw client `priceId` | High | Yes |
| Rate limiting | In-memory only | High | Yes |
| Settings | Largely absent | High | Yes |
| Admin/support | Overview metrics only | Medium | Yes |
| API boundary tests | Limited integration coverage | High | Yes |
| E2E proof | Script exists; no committed specs | High | Yes |
| Adoption docs | Partial and overstated in areas | Medium | Yes |

---

## C) MVP Blockers With Acceptance Criteria

### 1) Real notifications
**Required:** Verification/reset/invite emails sent through real provider adapter.

**Accept when:**
- [ ] Provider adapter enabled by env configuration.
- [ ] Template payload contracts defined.
- [ ] Failures logged with actionable context.
- [ ] Tests cover notifier success/failure integration points.

### 2) Invite identity hardening
**Required:** Invitation acceptance checks recipient identity.

**Accept when:**
- [ ] Invite email is matched against authenticated actor email (case-insensitive) or equivalent secure claim.
- [ ] Mismatch returns explicit auth error.
- [ ] Integration tests cover match/mismatch/replay cases.

### 3) Billing plan hardening
**Required:** Client cannot submit arbitrary Stripe price IDs.

**Accept when:**
- [ ] API accepts internal plan key only.
- [ ] Server maps plan key -> Stripe price ID.
- [ ] Invalid plan key rejected deterministically.
- [ ] Tests cover mapping and rejection paths.

### 4) Distributed rate limiting
**Required:** Production-safe limiter backend.

**Accept when:**
- [ ] Shared limiter interface supports adapters.
- [ ] Non-memory adapter available for production.
- [ ] Sensitive routes use unified limiter wiring.

### 5) Settings baseline
**Required:** Minimal reusable settings surfaces.

**Accept when:**
- [ ] Account settings: profile basics + password change.
- [ ] Organization settings: name/slug update with permission checks.
- [ ] Basic UI or API-only docs clearly provided.

### 6) Test proof of critical paths
**Required:** Refactoring-safe confidence on trust boundaries.

**Accept when:**
- [ ] API integration tests for auth/session/tenant/RBAC boundaries.
- [ ] Billing webhook idempotency + replay/order tests.
- [ ] One E2E golden path passes in CI.

### 7) Adoption-ready docs
**Required:** External team can onboard without reverse engineering.

**Accept when:**
- [ ] Setup/install/run docs are complete and truthful.
- [ ] Architecture and extension seams documented.
- [ ] Testing docs reflect actual suites.

---

## D) Post-MVP Priorities (Strong Public Starter)
1. Admin/support action surface (suspend user, org diagnostics, billing diagnostics).
2. Audit-log query/read APIs with access controls.
3. Structured error code system for client/support workflows.
4. Seed/demo data flow and first-run script.

---

## E) Deferred / Premium Track
1. SSO/SAML.
2. API keys/service accounts.
3. Usage-based billing.
4. Advanced feature-flag platform.

---

## F) Suggested MVP Sequence
1. Security boundary fixes (invite + billing + limiter).
2. Notification operationalization.
3. Settings baseline.
4. Test hardening (integration + E2E).
5. Adoption docs alignment.

If all five sequence groups are complete, this project can credibly claim “starter MVP”.
