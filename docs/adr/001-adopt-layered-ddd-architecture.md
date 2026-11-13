# ADR-001: Adopt a layered, domain-centred architecture

- Status: **Accepted**
- Date: 2026-11-13
- Deciders: Bienvenido Doalto

## Context
SnowStamp is a solo-developer project intended for Play Store and App Store. Correctness and long-term maintainability matter more than speed. The owner defined the engineering architecture to apply (see `docs/ARCHITECTURE.md`), the same discipline used in the SportsLeagueManagement project.

## Decision
Adopt the architecture in `docs/ARCHITECTURE.md`: layered with the dependency rule pointing inward (`web/presentation -> application -> domain <- infrastructure`), DDD tactical rules, ports and adapters for every external dependency, database as versioned migrations, a testing pyramid with a >= 80% coverage gate, Conventional Commits with atomic always-green commits, one branch per phase, and documentation as part of the architecture.

## Rejected alternatives
- Framework-centred structure (screens or controllers calling the database or SDK directly): faster at first, but business rules (visited percentage, friendship transitions) would depend on the framework and be hard to test.
- Backend-as-a-service logic embedded in the client with no domain layer: same testability problem.

## Consequences
- Positive: business rules are testable without frameworks; external systems (map data, backend, auth) are replaceable behind ports; consistent workflow across sessions.
- Trade-offs: more up-front structure for a small app; the first visible feature (map) arrives later because the domain is built and tested first.
- Some rules are worded for a server-side stack. How they map to the chosen stack is decided in ADR-002.
