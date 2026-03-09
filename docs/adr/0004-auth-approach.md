# ADR 0004: Auth Approach

## Status
Accepted

## Decision
Implement auth flows behind internal interfaces, minimizing hard coupling to provider internals.

## Rationale
Supports secure v1 requirements (email/password, reset, verification, sessions) while keeping future migration/extension paths open (OAuth/SSO).
