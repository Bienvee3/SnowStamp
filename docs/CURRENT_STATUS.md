# Current Status

Last updated: 2026-11-13

## Phase
Pre-product validation in progress (waitlist and social content) and project foundations being laid. No code yet.

Build order position (see `docs/ARCHITECTURE.md` section 12): step 1 in progress (`AGENTS.md`, status file, architecture and ADRs done; local dev infrastructure blocked on the stack decision).

## Repository
- Branch: `main`. Docs-only baseline committed (not pushed). Working tree clean after the baseline.
- Remote: `origin` -> `https://github.com/Bienvee3/SnowStamp` (renamed from `ski-been`).
- Open issues: #1 world map with lit-up resorts, #2 visited percentages, #3 friends comparison, #4 run logging (deferred).
- Tests: none. Build: none.
- Docs baseline committed on `main`; push pending authorization. After that, work proceeds in `review/phase-N` branches.

## Documentation present
`AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/001-adopt-layered-ddd-architecture.md` (Accepted), `docs/adr/002-stack-selection.md` (Proposed), `docs/DECISIONS/README.md`, `docs/BRAND.md`.

## Decisions
Full index in `docs/DECISIONS/README.md`.
| Decision | Value |
|---|---|
| Name | SnowStamp |
| Audience / language | Spanish-speaking; copy and content in Spanish, brand name in English |
| Scope | Issues #1-#3; #4 deferred (Skitude, Slopes already cover it) |
| Platforms | Play Store and App Store |
| Architecture | Layered, domain-centred (ADR-001, Accepted) |
| Stack | **Open** (ADR-002, Proposed): Option A Spring Boot backend + Expo client, or Option B Expo + Supabase |
| Domain | Not bought. Planned `snowstamp.app` (+ `.es`). `snowstamp.com` belongs to an unrelated Greek T-shirt printing company. |
| Waitlist | Google Form + response sheet |

## Brand assets
- TikTok: `@snowstamp0`; Instagram: `@snowstamp0`.
- Brand Gmail account exists (address intentionally not recorded in this public repo).
- Waitlist form is live and linked from the profiles.

## Marketing content
Marketing material is **not versioned**: it lives outside this repository, in a sibling `marketing/` folder (not public). Nothing under it may be committed here.
- Video 01 v2 (35.9 s, 1080x1920, Spanish voice-over, synthetic music) rebuilt with the official logo palette and a single-axis layout (everything centred on x=540, focal band y 250-1650). Generated reproducibly from `marketing/video-01/` in that folder (`voice.py` -> `build.py`; deps: `edge-tts`, `imageio-ffmpeg`, `numpy`, `pillow`; map data Natural Earth 50m cached in `marketing/.cache/`; logo in `marketing/assets/logo.png`). Percentages in the video are demo values labelled "DATOS DE EJEMPLO"; resort coordinates are approximate. Not yet published; owner review pending (voice quality not auditioned by the agent). `docs/BRAND.md` palette updated to the logo colours.

## Market research summary (2026-11-13)
- Demand is real but niche: Reddit/forum threads asking for resort trackers, long-running "ski areas skied" threads on SkiTalk and Liftlines, hand-made spreadsheets and maps. Reddit pages could not be read (blocked); signals come from titles and search excerpts only.
- Competitors: Slopes, Skitude (Spanish, free, ~1.2M active users in 2023/24 per its own interview), Piste, Skitally, EverySki ("My Resorts"), iSKI, Ski Tracks. Likely gap: % visited per country/continent and resort-level comparison between friends. Not verified in Skitally or the r/Backcountry app.
- Spain: ~4.6M ski days sold in 2024-25 (ATUDEM); Chile projects >1.2M visitors in 2026. Visits, not unique skiers.
- Unit-economics figures discussed so far were estimates without data. Do not rely on them.

## Validation criteria (heuristics, not sourced)
Waitlist signups after the first week of content: <20 weak; 50-100 justifies an MVP; >200 strong. The form also asks willingness to pay and which app the person uses today.

## Known risks
- What counts as a "resort" (OSM includes tiny ski areas) defines every percentage; it must be curated and tested before the UI.
- Some architecture rules are worded for a server-side stack; their mapping depends on ADR-002.
- Play Store and App Store requirements (privacy policy, developer accounts, testing requirements) must be verified against current rules before release.

## Next steps
1. Owner chooses the stack (ADR-002 Option A or B) -> mark ADR Accepted, record versions and commands in `AGENTS.md`.
2. Authorize the push of the docs baseline, then start `review/phase-1`.
3. Build step 1-2: local dev infrastructure, versioned schema and seed.
4. Domain core with unit tests, starting with the "resort" definition and the visited-percentage service.
5. In parallel: publish the first 5 short videos, track waitlist signups weekly, ask 10-20 skiers whether they know Skitude/Slopes/EverySki.
6. Check name conflicts in TMview (EUIPO) and OEPM, classes 9, 41, 42.
