# ADR 0001: Modular Monolith

## Status
Accepted

## Decision
Adopt a modular monolith rather than microservices for v1.

## Rationale
Enables strong internal boundaries with lower operational complexity, faster iteration, and simpler transactional consistency for auth, billing, and tenancy-sensitive logic.
