# SnowStamp - Engineering Architecture

Status: **adopted** (see `docs/adr/001-adopt-layered-ddd-architecture.md`). Stack-specific tooling is **not decided yet** (see `docs/adr/002-stack-selection.md`).
Update this file at every milestone. Never leave it stale.

## 1. Core principles
- Correctness and long-term maintainability come before speed.
- Build bottom-up: the domain core first, then the layers that depend on it. Never build a layer on top of an untested one.
- Prefer boring, explicit design over clever abstractions. Delete dead code; add no speculative features.
- Make illegal states unrepresentable. Fail fast with explicit, domain-specific errors.
- Frameworks are details. Business rules must not depend on web, database or SDK code.

## 2. Layered architecture
Dependency rule: always inward, toward the domain.

```
web/presentation  ->  application  ->  domain  <-  infrastructure
```

| Layer | Responsibility | Must NOT |
|---|---|---|
| domain | Entities, aggregates, value objects, invariants, state transitions, pure domain services, repository interfaces, ports | Import web, persistence or external-SDK code |
| application | Use cases, transaction boundaries, orchestration, DTOs | Contain business rules, or depend on concrete persistence |
| infrastructure | Implements repositories and ports, adapters, security and config wiring | Contain business rules |
| web/presentation | HTTP/UI handling, input validation, redirects, error mapping | Contain business logic, or expose domain entities |

### Package layout
Organized by layer. Tests mirror the same tree.

```
<root>/
├── domain/
│   ├── model/ (+ enums/)      entities, aggregate roots
│   ├── valueobject/           immutable, self-validating
│   ├── exception/             domain exceptions
│   ├── repository/            interfaces only
│   ├── ports/                 interfaces for external systems
│   └── *Calculator|*Scheduler|*Rules   pure domain services
├── application/
│   ├── service/               use cases
│   └── dto/                   request/response objects
├── infrastructure/
│   ├── persistence/           repository implementations, converters
│   ├── <external>/            real adapters + offline stub adapters
│   └── security|config/
└── web/
    ├── api/                   REST controllers + central error handler
    └── view/                  UI controllers + error handler
```

## 3. Domain-Driven Design rules
- **Rich domain model**
  - No public indiscriminate setters.
  - State changes go through methods that carry business intent (for example `kickOff()`, `addPlayer()`, `correctResult()`).
  - The aggregate root enforces its own invariants.
- **Aggregates**
  - Clear aggregate boundaries and a single entry point per aggregate.
  - Children are modified only through the root.
- **Encapsulated collections**: expose only unmodifiable views.
- **Identity and equality**: implement equals/hashCode on an immutable business key (UUID or natural key). Never use a database-generated id.
- **Value objects**
  - Create one only when a primitive has a non-trivial invariant (format, range, length).
  - Immutable, validated in the constructor.
  - Do not wrap trivial non-empty strings; validate those at the DTO boundary.
- **State machines**: model lifecycles explicitly. An illegal transition throws a domain exception.
- **Domain services**: algorithms that do not belong to one entity (scheduling, standings, eligibility, statistics) are pure classes with no framework and no I/O, hence trivially unit-testable.
- **Audit**: sensitive retroactive changes go through one single method that writes an immutable audit record.
- **CQS**: a method either changes state (command) or returns data (query), never both.
- **No magic values**: use constants, enums or value objects.

## 4. Application layer rules
- Constructor injection only; dependencies are final. No field injection.
- One service per aggregate or use-case group.
- Commands are transactional. Queries are read-only transactions.
- Services depend only on domain repository interfaces, never on concrete persistence types.
- Never call a slow external system inside a transaction. Pattern: short read transaction -> external call -> short write transaction.
- A missing entity raises a domain "not found" exception.
- DTOs are immutable records with input validation. Mapping is a static `from(entity)` factory on the response. No separate mapper class unless really needed.

## 5. Web / presentation layer rules
- Controllers only: bind input, validate, call a service, map the result.
- Never expose entities. Always use DTOs.
- Forms: POST -> Redirect -> GET.
- API errors: RFC 7807 ProblemDetail, with a single central handler mapping exception -> HTTP status (400/404/409/503...).
- Authorization is enforced twice: at URL level and at method level on every mutation. Least-privilege roles.

## 6. Hexagonal (ports and adapters) for every external dependency
- The domain defines a port (interface with its own request/result types).
- Infrastructure provides the real adapter and an offline stub adapter (deterministic CI).
- A provider failure raises a domain exception. Never store fake fallback data.
- Secrets and credentials come from environment variables, never from the repository.

## 7. Database as code
- All schema changes are versioned, immutable migrations (`V1__...`, `V2__...`). Never edit an applied migration.
- The ORM only validates the schema. It never generates it.
- Seed data is a migration too; conditional seeds must be idempotent.
- Constraint split: structural invariants -> DB constraints; business rules -> domain; input format -> DTO validation.
- Avoid reserved words in column names.

## 8. Testing strategy
- Tests mirror the production package tree. Arrange-Act-Assert. Deterministic and independent.

| Target | Test type |
|---|---|
| Value objects, guards, domain services | Pure unit tests, no framework |
| Application services | Unit tests with mocked repository interfaces |
| Repositories | Persistence slice tests |
| Controllers | Web slice tests (success, validation, 401/403, 404, 409) |
| Security | Full-context tests per role |
| Real infrastructure | Separate integration profile with containers |

- Coverage gate in the build (>= 80%). The build fails below it.
- Every business rule ships with a test. Every bug fix ships with a regression test.
- Do not write tests that only mirror implementation, wiring or mocks.
- Optional but desired: TDD, Red -> Green -> Refactor. Prefer the simplest transformation (Transformation Priority Premise): constant -> scalar -> conditional -> collection -> iteration. Generalize only when a new test forces it.

## 9. Git workflow
- Conventional Commits: `<type>(<scope>): <imperative present summary>`.
  - Types: `feat | fix | refactor | test | docs | chore | perf`.
  - Scopes mirror the layers: `domain | db | repo | service | security | web | ai/<integration> | infra | test`.
- Atomic commits: one logical change per commit. Never mix refactor with behavior, or formatting with fixes.
- Always green: no commit without a full build and passing tests.
- One branch per phase (`review/phase-N`) -> merge to `main` after the phase is green.
- Never push without explicit authorization from the user.
- Typical phase sequence: DTOs -> one service per commit -> a `docs(status)` commit.

## 10. Documentation as part of the architecture
- `AGENTS.md`: single source of truth for rules (stack, conventions, commands, commit policy, language).
- `docs/CURRENT_STATUS.md`: live state (last commit, test results, pending work, known issues). Read first every session; update after every task.
- `docs/adr/NNN-title.md`: one decision record per significant choice (Context, Decision, Rejected alternatives, Consequences).
- `docs/DECISIONS/README.md`: index of `DEC-NNN` entries linking each decision to its evidence.
- `docs/ARCHITECTURE.md`: this file. Updated at each milestone.
- Diagrams on demand (class, ERD, sequence), in Mermaid.
- All repository content (code, comments, docs, commits) in one agreed language: **English**.

## 11. Mandatory workflow for every task
1. Read `AGENTS.md` and `docs/CURRENT_STATUS.md`.
2. Define scope and acceptance criteria.
3. Inspect the existing code and reuse its patterns. Do not introduce a second convention.
4. Implement a focused, minimal change.
5. Run the full test suite and the build.
6. Update `docs/CURRENT_STATUS.md` (and the Obsidian project note).
7. Propose an atomic commit. Wait for authorization before pushing.

## 12. Build order for a new project
1. `AGENTS.md`, status file, local dev infrastructure.
2. Versioned schema + seed.
3. Domain: entities, value objects, exceptions, guards, state machines, domain services (each with unit tests).
4. Repository interfaces (domain) -> implementations (infrastructure).
5. Application services + DTOs.
6. Security + API + standardized errors.
7. Ports and adapters for external systems (with stubs).
8. Quality gates (coverage, integration tests with containers).
9. UI.

---

## SnowStamp-specific notes

### Applicability to the stack
Sections 1-4, 6, 8 (principles, pyramid), 9, 10, 11, 12 are stack-agnostic. The wording of sections 5, 7 and 8 assumes a server-side stack (HTTP controllers, ProblemDetail, ORM, migrations, web slice tests, containers, a coverage plugin). SnowStamp's end goal is a **mobile app on Play Store and App Store**, so the presentation layer is a mobile UI, possibly a client of a REST API. ADR-002 is **Accepted** (Expo + Next.js + TypeScript + Supabase/PostGIS): see its Consequences for how sections 5, 7 and 8 are realised.

### Initial domain sketch (proposal, not decided)
Derived from issues #1-#3 only. Revise once the stack and the first domain tests exist.

| Concept | Kind | Notes |
|---|---|---|
| `Resort` | Reference data (entity) | Identified by a stable business key; belongs to one country. Source: OpenSkiMap/OSM, curated. |
| `Country`, `Continent` | Reference data | Denominators for the visited percentage (#2). |
| `Passport` (per user) | Aggregate root | Holds the user's stamps; the only entry point to mark or unmark a resort as visited (#1). |
| `Stamp` | Child of `Passport` | One visited resort, optional date. |
| `Friendship` | Aggregate | State machine: requested -> accepted -> removed (#3). |
| Visited percentage | Pure domain service | `visited / total` per country, continent and world. Needs a curated definition of "resort". |

Open design question with real impact: what counts as a "resort" (OSM includes tiny ski areas). It determines every percentage and must be fixed and tested before the UI.
