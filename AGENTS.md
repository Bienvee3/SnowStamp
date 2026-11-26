# SnowStamp - Agent Context

Single source of truth for rules. Binding detail lives in `docs/ARCHITECTURE.md`.

## Project
SnowStamp is an app to record and interactively visualize personal trips to ski and snowboard resorts around the world ("a passport for skiers and snowboarders": every visited resort is a stamp on the map).

- GitHub: `Bienvee3/SnowStamp` (public). Renamed from `ski-been`; the local folder may still be called `ski-been`.
- Primary audience: Spanish-speaking skiers and snowboarders (Spain, Andorra, Latin America).
- End goal: publish on **Play Store and App Store**.
- Pricing intent: free app; optional paid extras later. Not a current concern.

## Stack
Decided in `docs/adr/002-stack-selection.md` (Accepted 2026-11-25): TypeScript everywhere; Expo (React Native) mobile app with MapLibre; Next.js public web (landing and waitlist); Supabase (PostgreSQL + PostGIS, auth, row-level security) behind domain ports. A resort is a WGS84 MultiPolygon of its skiable domain. Coverage: all countries and all their ski resorts.

Layout (npm workspaces, ES modules):
- `packages/domain`: pure TypeScript, no I/O.
- `packages/application`: use cases and DTOs; depends on domain.
- `packages/infrastructure`: Supabase adapters (PostgREST) for the domain ports.
- `packages/pipeline`: OSM resort extraction (Overpass) that emits seed SQL.
- `apps/web`: Next.js public site (landing, waitlist link, privacy draft).
- `supabase/migrations` and `supabase/tests`: versioned SQL and its checks.
The Expo mobile app is not built yet.

## Scope
Source of truth for features: GitHub issues.

| Issue | Feature | Priority |
|---|---|---|
| #1 | Interactive world map; select a country to see its resorts; mark visited ones (they light up) | MVP |
| #2 | Automatic % of resorts visited per country, continent and world | MVP |
| #3 | Share visited resorts with friends and compare | MVP |
| #4 | Per-run logging with resort maps and timings (Strava-like) | Deferred (Slopes and Skitude already cover it; high cost, low differentiation) |

## Architecture (summary; full text in `docs/ARCHITECTURE.md`)
- Dependency rule, always inward: `web/presentation -> application -> domain <- infrastructure`.
- Build bottom-up: domain first, each piece with unit tests, then the layers that depend on it. Never build on an untested layer.
- Domain: rich model, no indiscriminate setters, aggregate roots enforce invariants, unmodifiable collection views, equality on an immutable business key (never a database id), value objects only for non-trivial invariants, explicit state machines, CQS, pure domain services, no magic values.
- Application: constructor injection only, one service per aggregate/use-case group, commands transactional and queries read-only, depend on repository interfaces only, no slow external calls inside a transaction, DTOs as immutable records with a static `from(entity)` factory.
- Presentation: bind, validate, call a service, map the result; never expose entities; standardized error mapping from one central handler.
- Every external dependency is a domain port with a real adapter and an offline stub; provider failure raises a domain exception; never store fake fallback data; secrets only from environment variables.
- Database as code: versioned immutable migrations, ORM validates only, idempotent conditional seeds.
- Testing: tests mirror the production tree, Arrange-Act-Assert, coverage gate >= 80% in the build, a test per business rule, a regression test per bug fix, no tests that only mirror implementation or mocks.
- Make illegal states unrepresentable; fail fast with domain-specific errors; prefer boring explicit design; no speculative features; delete dead code.

## Mandatory workflow for every task
1. Read this file and `docs/CURRENT_STATUS.md`.
2. Define scope and acceptance criteria.
3. Inspect the existing code and reuse its patterns. Do not introduce a second convention.
4. Implement a focused, minimal change.
5. Run the full test suite and the build.
6. Update `docs/CURRENT_STATUS.md` and the project note `01 Projects/SnowStamp.md` in the Obsidian vault (vault content in Spanish). Add a session note in `05 Sessions/` for each work session.
7. Propose an atomic commit. Wait for authorization before pushing.

## Git
- Conventional Commits: `<type>(<scope>): <imperative present summary>`.
- Types: `feat | fix | refactor | test | docs | chore | perf`.
- Scopes mirror the layers: `domain | db | repo | service | security | web | ai/<integration> | infra | test`. New scopes only after the stack ADR.
- Atomic commits: one logical change each; never mix refactor with behavior or formatting with fixes.
- Always green: no commit without a full successful build and passing tests (once a build exists).
- One branch per phase (`review/phase-N`), merged to `main` after the phase is green.
- Never push without explicit authorization in the current conversation.

## Language
All repository content (code, comments, docs, commits) in English. Chat with the owner and the Obsidian vault in Spanish.

## Documentation
- `docs/CURRENT_STATUS.md`: live state; update after every task.
- `docs/adr/NNN-title.md`: one record per significant decision (Context, Decision, Rejected alternatives, Consequences).
- `docs/DECISIONS/README.md`: index of `DEC-NNN` entries with evidence.
- `docs/ARCHITECTURE.md`: update at each milestone.
- `docs/BRAND.md`: name, handles, tone, visual identity.
- Diagrams on demand, in Mermaid.

## Data and privacy
- Planned resort source: OpenSkiMap / OpenStreetMap (ODbL). Visible attribution is mandatory. Verify coverage and data quality first; define what counts as a "resort" before any percentage is computed.
- Never commit secrets, credentials or personal contact data. The repository is public.
- Marketing material (videos, generators, social assets) is never versioned here. It lives in a sibling `marketing/` folder outside the repository. The only brand asset kept in the repo is the logo, `docs/assets/logo.png`, used by `README.md`.

## Build / test
Verified on Node 24.21, npm 11.19, TypeScript 7.0.2, Vitest 5.1.2 (+ `@vitest/coverage-v8`), Docker 29.9, 2026-11-25.
- Install: `npm install`
- Build (domain first, then application): `npm run build`
- Type-check a package: `npm run typecheck --workspaces`
- Unit tests with the 80% coverage gate: `npm test` (domain, application, pipeline, web; each fails below 80%)
- Integration tests (need Docker running): `npm run test:integration` starts PostGIS and PostgREST containers, runs the migrations, the SQL tests in `supabase/tests`, then the infrastructure tests (coverage gate applies).
- World resort extraction: `npm run extract -w @snowstamp/pipeline -- [--refresh] [ISO2 ...]` (no codes = every country; caches raw answers in `data/out/raw/`; writes `world.seed.sql`, `world.resorts.json`, `world.skipped.json` in ignored `data/out/`; Overpass rate limits apply).
- Public site: `NEXT_PUBLIC_WAITLIST_URL=<https form url> npm run build -w @snowstamp/web`. The form URL is configuration, never committed.
- Next.js 16.4.6, React 19.3.1, @supabase/postgrest-js 1.x, Postgres 16 + PostGIS 3.4 (`postgis/postgis:16-3.4`), PostgREST v12.2.3 (test containers).
