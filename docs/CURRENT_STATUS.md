# Current Status

Last updated: 2026-11-25

## Phase
Stack accepted (ADR-002). Validation content published on TikTok; project foundations done; scaffolding next. No code yet.

Build order position (see `docs/ARCHITECTURE.md` section 12): step 1 in progress (`AGENTS.md`, status file, architecture and ADRs done; local dev infrastructure unblocked, not started).

## Repository
- Branch: `main`, tracking `origin/main`. Docs-only baseline pushed on 2026-11-13. Working tree clean.
- Remote: `origin` -> `https://github.com/Bienvee3/SnowStamp` (renamed from `ski-been`).
- Open issues: #1 world map with lit-up resorts, #2 visited percentages, #3 friends comparison, #4 run logging (deferred).
- Tests: none. Build: none.
- Docs baseline is on GitHub. Work proceeds in `review/phase-N` branches from now on.

## Documentation present
`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/adr/001-adopt-layered-ddd-architecture.md` (Accepted), `docs/adr/002-stack-selection.md` (Accepted), `docs/DECISIONS/README.md`, `docs/BRAND.md`, `docs/assets/logo.png`.

## Decisions
Full index in `docs/DECISIONS/README.md`.
| Decision | Value |
|---|---|
| Name | SnowStamp |
| Audience / language | Spanish-speaking; copy and content in Spanish, brand name in English |
| Scope | Issues #1-#3; #4 deferred (Skitude, Slopes already cover it) |
| Platforms | Play Store and App Store |
| Architecture | Layered, domain-centred (ADR-001, Accepted) |
| Stack | **Accepted** (ADR-002, 2026-11-25): TypeScript; Expo mobile app; Next.js public web; Supabase (PostgreSQL + PostGIS). Versions recorded at scaffold. |
| Resort definition | WGS84 MultiPolygon of the skiable domain (marked pistes, operating lifts); no radii or municipal limits; pure tested domain service (DEC-008) |
| Coverage | All countries and all ski resorts of each (DEC-009) |
| Order of work | Build the whole app first; nothing paid yet (DEC-010) |
| Domain | Not bought; deferred until the app is built (DEC-010). Planned `snowstamp.app` (+ `.es`). `snowstamp.com` belongs to an unrelated Greek T-shirt printing company. |
| Waitlist | Google Form + response sheet |

## Brand assets
- TikTok: `@snowstamp0`; Instagram: `@snowstamp0`.
- Brand Gmail account exists (address intentionally not recorded in this public repo).
- Waitlist form is live and linked from the profiles.

## Marketing content
Marketing material is **not versioned**: it lives outside this repository, in a sibling `marketing/` folder (not public). Nothing under it may be committed here. The only exception is the logo (`docs/assets/logo.png`), used by the README.
- Video 01 v6 (31.8 s, 1080x1920, Spanish voice-over, synthetic music), final candidate. Generated reproducibly from `marketing/video-01/` (`voice_external.py <audio>` -> `build.py`; edge-tts path in `voice.py` kept as fallback; deps: `edge-tts`, `faster-whisper`, `imageio-ffmpeg`, `numpy`, `pillow`; map data Natural Earth 50m cached in `marketing/.cache/`). Voice-over is an ElevenLabs file supplied by the owner, aligned to the script with faster-whisper; the reference TikTok voice could not be identified, no third-party voice cloning. Owner-requested changes applied: SFX at 35% gain and whooshes a further -8 dB, hook title raised with the map fully visible, brand caption "SNOWSTAMP:" shown alone before "TU PASAPORTE...", Iberian Peninsula centred. Percentages are demo values labelled "DATOS DE EJEMPLO"; resort coordinates are approximate. Owner approved the cut on 2026-11-14. Earlier cuts v1-v5 kept in `marketing/video-01/out/`.
- Videos 02-05 (2026-11-14, same engine, folders `marketing/video-02..05`): 02 "tu % del mundo" (28.8 s), 03 "reta a un amigo" (28.4 s), 04 "Excel vs mapa" (26.8 s), 05 "pregunta a la audiencia" (21.7 s). Rendered with the owner's ElevenLabs voice (aligned with `voice_external.py`, all words matched); MP4s in `marketing/video-0N/out/snowstamp-video-0N.mp4`; frames reviewed on contact sheets. Demo data tagged "DATOS DE EJEMPLO" ("Ana" is a placeholder friend). Per the owner, the videos are published on TikTok (2026-11-25). Scheduling notes: TikTok via desktop web (15 min to 10 days ahead), Instagram via app or Meta Business Suite (up to 30 days, 25/day).
- Landing page (2026-11-25, passes 2-5): latest version "La cumbre" (single `index.html` + `fonts/` + `img/`, Spanish, worldwide focus), kept in `marketing/` outside this repo. Waitlist is the only CTA; the app is never presented as available (no store badges); UI data labelled as example. Checked with screenshots at 1440, 820 and 390 px; no taste-skill gate run on this version (v4 passed it with 5 waivers). Region names were written from memory and need verification against the all-countries / all-resorts goal. Goal for the public site: let visitors see it and register for the app launch (waitlist). Not yet published.

## Market research summary (2026-11-13)
- Demand is real but niche: Reddit/forum threads asking for resort trackers, long-running "ski areas skied" threads on SkiTalk and Liftlines, hand-made spreadsheets and maps. Reddit pages could not be read (blocked); signals come from titles and search excerpts only.
- Closest competitor found 2026-11-25: **Snow Passport** (iOS, 2025; digital passport of resort visits with dated stamps and badges; in-app purchases in resort packs). The "passport" idea is not unique; the gap remains % per country/continent and friend comparison (unverified).
- Competitors: Slopes, Skitude (Spanish, free, ~1.2M active users in 2023/24 per its own interview), Piste, Skitally, EverySki ("My Resorts"), iSKI, Ski Tracks. Likely gap: % visited per country/continent and resort-level comparison between friends. Not verified in Skitally or the r/Backcountry app.
- Spain: ~4.6M ski days sold in 2024-25 (ATUDEM); Chile projects >1.2M visitors in 2026. Visits, not unique skiers.
- Unit-economics figures discussed so far were estimates without data. Do not rely on them.

## Validation criteria (heuristics, not sourced)
Waitlist signups after the first week of content: <20 weak; 50-100 justifies an MVP; >200 strong. The form also asks willingness to pay and which app the person uses today.

## Known risks
- What counts as a "resort" (OSM includes tiny ski areas) defines every percentage; it must be curated and tested before the UI.
- Some architecture rules are worded for a server-side stack; ADR-002 lists the reinterpretations (no controller layer, RLS authorization, Supabase migrations). Map each rule to code when scaffolding.
- No official polygon dataset exists for every resort; polygons must be derived from OSM and curated. Covering all countries makes data curation the main cost.
- ST_Contains/ST_DWithin only matter for GPS validation; issues #1-#3 mark visits manually. Decide when GPS check-in enters scope.
- Name conflict: a web search (2026-11-25) found no "SnowStamp" mark or app, but TMview/OEPM were not queried (not searchable that way). Owner believes there is no conflict; the official check is still open.
- Store rules checked 2026-11-25 from official pages: Google Play personal developer accounts created after 2023-11-13 need a closed test with >= 12 testers opted in for 14 continuous days before production access (<https://support.google.com/googleplay/android-developer/answer/14151465>); Apple guideline 5.1.1(v) requires in-app account deletion for apps with account creation (<https://developer.apple.com/support/offering-account-deletion-in-your-app>). Privacy policy is required by both stores. Re-verify at release; the waitlist can seed the 12 testers.

## Next steps
1. Scaffold the project per ADR-002 on `review/phase-1`; record verified versions and commands in `AGENTS.md`.
2. Local dev infrastructure (Supabase CLI), versioned schema with PostGIS and seed.
3. Domain core with unit tests: the resort-membership service on real polygons (Formigal, Baqueira: piste, base car park, access road), then the visited-percentage service.
4. Resort data pipeline: derive polygons for all countries from OSM, curate, attribute (ODbL).
5. Public web (Next.js): landing "La cumbre" live with waitlist registration for the launch.
6. Verify landing region names; keep publishing content and tracking waitlist signups weekly.
7. Official trademark check in TMview (EUIPO) and OEPM, classes 9, 41, 42.
