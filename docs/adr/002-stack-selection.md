# ADR-002: Stack selection

- Status: **Accepted** (2026-11-25)
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
**Option B, extended with a public web client.** Chosen by the owner on 2026-11-25.
- Language: TypeScript on client and server side, so the geospatial domain models are shared.
- Mobile app: Expo (React Native) with MapLibre. iOS builds via EAS Build.
- Public web (landing, waitlist registration, later a web view of the map): Next.js.
- Backend: Supabase (PostgreSQL + PostGIS, authentication, row-level security).
- Supabase and PostGIS sit behind domain ports as infrastructure adapters, with offline stubs (ADR-001).
- Exact versions and commands are recorded in `AGENTS.md` when the project is scaffolded and verified from a real build.

### Geospatial rules
- PostGIS handles spatial queries (`ST_Contains`, `ST_DWithin`) on `geography`/`geometry` in WGS84 (SRID 4326), for example validating a GPS point against a resort polygon.
- A `Resort` is modelled as a `MultiPolygon` in WGS84 covering its skiable domain (marked pistes and operating lifts). Circular radii and municipal boundaries are rejected: they produce false positives in nearby towns.
- No "official" polygon dataset exists for every resort. Polygons are derived from OpenSkiMap/OSM (ODbL, visible attribution) and curated.
- The resort-membership rule is a pure domain service with deterministic unit tests on real edge coordinates (for example Formigal and Baqueira): point on a piste, point in the base car park, point on the access road.
- Domain unit tests run without a database, so the pure service needs an in-process geometry implementation; PostGIS queries must be tested for agreement with it in an integration profile.

### Rejected
- Option A (Spring Boot backend): two codebases and a server to operate; slower to a store release.
- Option C (Capacitor): risk of store rejection and weaker map experience.

## Consequences
- Several ADR-001 rules are reinterpreted for this stack: no controller layer (Supabase API behind a port); authorization through row-level security instead of method-level checks; migrations via the Supabase CLI.
- Shared rules (such as the percentage calculation) live in the TypeScript domain and must stay consistent with database policies.
- Coverage scope: all countries, and within each country all of its ski resorts. This makes data curation the main cost, not the app code.
- Resort data comes from OpenSkiMap/OSM (ODbL, visible attribution); what counts as a "resort" is defined by the polygon rule above and tested before any percentage is computed.
