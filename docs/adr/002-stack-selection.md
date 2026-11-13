# ADR-002: Stack selection

- Status: **Proposed** (not decided; no code may be scaffolded until accepted)
- Date: 2026-11-13
- Deciders: Bienvenido Doalto

## Context
The end goal is an app published on Play Store and App Store. The owner develops on Windows (iOS binaries cannot be built locally). The adopted architecture (ADR-001) describes layers that include an application layer with transactions, a REST API with standardized errors, security, versioned migrations and integration tests with containers. The features (issues #1-#3) need accounts, per-user visited resorts, friends, and country/continent percentages over curated reference data.

## Decision drivers
- Fidelity to the adopted architecture and the owner's existing Java/Spring experience.
- Time to a first store release as a solo developer.
- Hosting cost for a free app.
- Windows development with iOS builds via a cloud build service.
- Testability of the domain without frameworks.

## Options

### Option A: Server backend + cross-platform mobile client
- Backend: Java and Spring Boot (as in SportsLeagueManagement): JPA, versioned migrations (Flyway), PostgreSQL with PostGIS, REST API with ProblemDetail, security by role.
- Mobile client: Expo (React Native, TypeScript) with MapLibre, consuming the REST API; iOS builds via EAS Build.
- For: maps one-to-one onto ADR-001 sections 4-8; the domain and rules live on the server in a language the owner already uses.
- Against: two codebases and two toolchains; a server to host (cost, operations); slower to a first store release.

### Option B: Cross-platform client + backend-as-a-service
- Expo (TypeScript) with Supabase (PostgreSQL, PostGIS, authentication, row-level security). The domain layer is TypeScript; Supabase sits behind ports as an infrastructure adapter.
- For: one codebase; no server to operate; generous free tiers (verify current limits); fastest to release.
- Against: several ADR-001 rules need reinterpretation (no controller layer; authorization via row-level security instead of method-level checks); domain code runs on the client, so shared rules (such as percentage calculation) must be kept consistent with database policies.

### Option C: Web wrapped with Capacitor
- Rejected for now: stores can reject apps that are mostly a repackaged website (check the current App Store guideline on minimum functionality); the map experience is weaker.

## Decision
**Pending.** To be chosen by the owner. This ADR will be updated to Accepted with the chosen option, versions verified from the build, and the mapping of ADR-001 rules that need a stack-specific interpretation.

## Consequences
To be completed when accepted. Regardless of the option: resort data comes from OpenSkiMap/OSM (ODbL, visible attribution), and what counts as a "resort" must be curated and tested because it defines every percentage.
