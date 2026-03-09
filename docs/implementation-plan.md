# Implementation Plan

## Phase 0: Foundation and Architecture (Completed)
- [x] Next.js + TypeScript strict scaffolding
- [x] Initial modular monolith folders
- [x] Env validation baseline
- [x] Documentation foundation (product/architecture/permissions/billing/testing)
- [x] Initial schema proposal
- [x] ADR scaffolding

## Phase 1: Database and Core Domain Foundations (Completed)
- [x] Draft Drizzle schema for core entities
- [x] Add migrations and constraints/indexes
- [x] Implement initial repository interfaces for memberships and organizations
- [x] Add tenant-scoped permission assertion service
- [x] Add plan entitlement resolver with business-rule tests

## Phase 2: Authentication (Completed baseline)
- [x] Auth domain password hashing and verification utilities
- [x] Auth service contract for sign up and sign in
- [x] Email verification notification and session issuance interfaces
- [x] Token utility helpers (raw token generation, hashing, expiry)
- [x] Session issuer service storing hashed session tokens
- [x] Email verification token issuer service storing hashed tokens
- [x] DB schema support for sessions and auth lifecycle tokens
- [x] Signup/signin/logout route handlers
- [x] Verify email and password reset route handlers
- [x] Email verification confirm service
- [x] Password reset request/confirm service
- [x] Drizzle auth repositories for users/sessions/token stores
- [x] Basic session rotation (revoke active sessions on new login)
- [x] Basic per-IP auth endpoint rate limiting
- [ ] Advanced session concurrency controls (device/session visibility)
- [ ] Distributed rate limiting store (Redis or equivalent)

## Phase 3: Organizations, Memberships, Invitations (In Progress)
- [x] Organization creation service + route
- [x] Invitation send/accept service + routes
- [x] Membership role update/remove service + routes
- [x] Repository support for org/member/invite workflows
- [x] Unit tests for org/membership/invitation services
- [ ] Ownership transfer workflow
- [ ] Invitation decline flow
- [ ] Better authenticated actor resolution (replace actorUserId request payloads)

## Phase 4: RBAC and Guards
- [ ] Central permission guard services
- [ ] Route and service-level enforcement

## Phase 5: Billing and Entitlements
- [ ] Checkout + portal
- [ ] Webhooks and sync
- [ ] Entitlement enforcement in domain services

## Phase 6: Admin + Audit + Hardening
- [ ] Admin dashboard
- [ ] Audit logging service integration
- [ ] Security hardening and observability baseline

## Blockers
- Package installation is blocked in this environment (`npm install` currently returns 403 from registry policy).

## Deferred Items
- SSO/SAML
- Custom RBAC builder
- Usage-based billing
