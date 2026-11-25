# Decision Index

One `DEC-NNN` entry per decision, linked to its evidence. Significant technical decisions also have an ADR in `docs/adr/`.

| ID | Decision | Status | Date | Evidence |
|---|---|---|---|---|
| DEC-001 | Product name is **SnowStamp** | Accepted | 2026-11-13 | `docs/BRAND.md` (naming history and risks) |
| DEC-002 | Primary audience is Spanish-speaking; copy and content in Spanish, brand name in English | Accepted | 2026-11-13 | `docs/BRAND.md`; market summary in `docs/CURRENT_STATUS.md` |
| DEC-003 | Scope is issues #1-#3; #4 (run logging) is deferred | Accepted | 2026-11-13 | Competitors Slopes and Skitude already cover run tracking; see `docs/CURRENT_STATUS.md` |
| DEC-004 | Validate with a waitlist (Google Form) before building; buy the domain only after validation | Accepted | 2026-11-13 | `docs/CURRENT_STATUS.md` (validation criteria) |
| DEC-005 | Adopt the layered, domain-centred architecture | Accepted | 2026-11-13 | `docs/adr/001-adopt-layered-ddd-architecture.md`, `docs/ARCHITECTURE.md` |
| DEC-006 | Target platforms are Play Store and App Store | Accepted | 2026-11-13 | Owner's stated end goal |
| DEC-007 | Technology stack: Expo + Next.js web + TypeScript + Supabase/PostGIS | Accepted | 2026-11-25 | `docs/adr/002-stack-selection.md` |
| DEC-008 | A resort is a WGS84 MultiPolygon of its skiable domain, not a radius or a municipality; membership is a pure, tested domain service | Accepted | 2026-11-25 | `docs/adr/002-stack-selection.md` (geospatial rules) |
| DEC-009 | Coverage goal: all countries and all ski resorts of each | Accepted | 2026-11-25 | Owner decision; `docs/CURRENT_STATUS.md` |
| DEC-010 | Build the whole app first; buy the domain and pay for services later | Accepted | 2026-11-25 | Owner decision; supersedes the "buy after validation" timing in DEC-004 |
