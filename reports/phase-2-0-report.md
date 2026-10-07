# PHASE 2.0 READ-ONLY BRAIN REPORT

Project: E-COM STUDIO IA — Phase 2 (Project Brain + Memory + Source of Truth), sub-phase 2.0 "Read-only Brain".
Scope authorised by the owner: 2.0 only. 2.1 not started.
Notation: UNKNOWN = not measurable without real data or real AI calls.

## GIT STATE

- Base: `main` at `5d0c6e8b30fd8096def65f3787128e316ed2834b` (Phase 1 complete: 1A, 1B, 1C merged).
- Working branch: `claude/ecom-studio-ia-platform-8cwl79`.
- Phase 2.0 code commit: `3391b05c91fa9ae432375f6e5a073df843526b0b`. Pushed with a normal push (no force).
- This report is added in the next commit on the same branch. Its SHA is given in the chat message; a file cannot contain the SHA of the commit that adds it.
- Merge: NO. No PR opened yet for 2.0. Working tree clean after both commits.
- Sub-phase 2.1: NOT STARTED.
- No destructive Git operation, no history rewrite on the remote.

## FILES CREATED

| File | Content |
|---|---|
| `src/lib/brain/trade.ts` | Trade Registry: core canonical trades + aliases, declared combinations, sector fallback, generic fallback, global negatives; `resolveTrade()`, `tradeText()`, `norm()`, `coreTradeIds()` |
| `src/lib/brain/snapshot.ts` | `brainSnapshot()` (read-only, ≤ 4 SQL), `currentLogoOf()`; types `BrainSnapshot`, `CurrentLogo`, `AiPattern` |
| `src/lib/brain/hash.ts` | `BRAIN_VERSION` ("2.0.0"), `canonicalJSON()`, `stableHash()` |
| `src/lib/brain/views.ts` | `SCOPES` (13), `BUDGETS` (soft + hard ceiling), `brainItems()`, `contextFor()`; types `BrainItem`, `ContextView`, `Level`, `Scope` |
| `src/lib/brain/index.ts` | Public API re-exports, `viewSummary()`, `brainReport()` |
| `src/app/api/admin/brain/route.ts` | Admin-only diagnostic route `GET /api/admin/brain` |
| `scripts/brain.ts` | CLI "Que sait le studio de ce projet ?" |
| `tests/brain-lecture.test.ts` | 14 tests (snapshot, scopes, levels, budgets, hash, volatile, security, admin route, SQL count) |
| `tests/brain-metier.test.ts` | 6 tests (Trade Registry) |
| `reports/phase-2-0-report.md` | This report (development artefact, no runtime effect) |

## FILES MODIFIED

None. In particular:
- `src/lib/ai/context.ts` (projectContext) — unchanged;
- `src/lib/projects.ts` (memory / remember) — unchanged;
- every engine module — unchanged;
- `src/lib/stock/trade-queries.ts`, `src/lib/media/icon-library.ts` — unchanged;
- `src/lib/db.ts` — unchanged (no schema change).

## BRAIN SNAPSHOT

- FILE: `src/lib/brain/snapshot.ts`
- FUNCTION: `brainSnapshot(projectOrId: string | Project): BrainSnapshot`
- CHANGE: new read-only snapshot over existing data. SQL reads:
  1. `loadProject` (projects row: product, services, brand, strategy, settings, catalog, sources);
  2. `memory`, excluding kind `artifact`; ordered by created_at, id;
  3. `quality_checks` over the last 90 days (`QUALITY_WINDOW_MS`), max 500 rows. Only deliverable, verdict, fatal, checked, checker and codes are read. Scores stay in the table.
  4. `assets`: non-deleted, newest 80. Only `json_extract` of `meta.gate.verdict`, `meta.key` and `meta.label`; the full meta is never loaded.
- Derived fields:
  - `trade` = `resolveTrade(tradeText(project), project.product.sector)`;
  - `aiPatterns`: recurring defect codes per deliverable, from checks with `checked=1`, checker `ai` or `human`, and verdict REJECTED / RETRY or fatal;
  - `technicalFailures`: checks with `checked=0` or checker `none`. Counted, then ignored; never a preference or a rejection;
  - `currentLogo` (see SOURCE OF TRUTH);
  - `recentAssets`: 12 newest, non-upload, used only by the volatile context;
  - `counts`: memory, qualityChecks, assets.
- Never read: `settings`, `connections`, users, keys or tokens.
- No AI call, no write, no LLM.
- WHY: one structured, traceable answer to "what does the studio know about this project".
- TEST: "instantané…", "aucune donnée secrète…", "au plus 4 requêtes SQL…"

## SOURCE OF TRUTH

| Information | Source of truth | Brain treatment |
|---|---|---|
| Business kind, store type, platform | `projects` columns | read |
| Product, facts, questions, price, visual | `projects.product_json` | read; fact status preserved (confirmed / inferred / unknown) |
| Services offer, area, contact | `projects.business_json` | read |
| Brand identity, locks | `projects.brand_json` + `brand.validated` | read; locks render as HARD |
| Strategy / platform | `projects.strategy_json` | read |
| User decisions, corrections, preferences, goals, user rejections | `memory` (non-artifact) | read; `marque.*` decisions = history only (value rendered once, from brand_json); kind `fact` = journal (value lives in product_json) |
| Scores and verdicts | `quality_checks` | only aggregated recurring codes; nothing copied |
| Media | `assets` | read (current logo resolution + volatile recent list) |
| Current logo | `brand.logo.assetId` | `latestAsset("logo")` used only as `legacy_latest` fallback when no pointer exists |
| Trade knowledge | `src/lib/brain/trade.ts` (code registry) | not yet replacing the old tables (2.4) |

- FILE: `snapshot.ts`
- FUNCTION: `currentLogoOf(project, assets)`
- CHANGE: state = `provided` (logo.status provided) > `validated` (logo.status validated or "logo" in validated) > `PROVISIONAL` (brand.logo.provisional) > gate verdict of the proposal asset (`logo.proposalId`): FINAL, or PROVISIONAL for any other verdict > `proposed`. Without a pointer, the newest role `logo` asset is reported as `legacy_latest`, state `proposed`.
- WHY: modules must stop picking the latest generated logo silently.
- TEST: "logo actuel : le pointeur de la marque fait foi…", "logo validé…"

## CONTEXT SCOPES

- FILE: `src/lib/brain/views.ts`
- FUNCTION: `contextFor(snapshot, scope, { budget? }): ContextView`
- CHANGE: 13 scopes: `logo, brand, image, stock, theme, shop_copy, seo, blog, social, advertising, video, qc, all`.
  - Each item declares its scopes. `all` = every item the Brain knows, still under its hard ceiling.
- Main inclusions and exclusions (verified by tests):

| Scope | Contains | Excludes |
|---|---|---|
| logo | business kind, name, offer line, palette (+ lock), fonts, direction, personality, positioning, audience, summary, tagline, current logo, validated list, trade understanding + icon concepts, relevant memory / rejections, logo AI patterns | services detail, contact, honesty rules, strategy, facts list, social voice, volatile assets |
| stock | business kind, offer line, services names, area, trade understanding, positive and negative visuals, specific queries, stock/image rejections and patterns | palette, tone, strategy, contact |
| image | brand visual items (palette, direction, fonts not included), trade visuals, product visual, variants, inferred observations, claims to avoid, image rejections and patterns + volatile recent creations | tone, strategy, contact |
| theme | offer, facts, unknowns, answers, price, services, contact, honesty rules, brand (palette, fonts, tone, direction, logo), strategy | trade search queries, logo icon concepts |
| shop_copy | like theme for text, + proofs and objections | trade visuals and queries |
| seo | name, trade, services or product, area, facts, unknowns, rules, audience | palette, fonts, logo, contact |
| blog | seo + tone, story, strategy messages | palette, logo, contact |
| social / advertising | brand voice, social voice, strategy, facts, rules | logo icon concepts, contact |
| video | brand, offer, trade visuals, facts, rules | contact |
| qc | facts, unknowns, answers, claims, rules, proofs, price, name | palette, fonts, logo, trade |
| all | everything (ceiling 30,000 chars) | — |

- Legacy memory scope mapping (`MEMORY_SCOPE`):
  - `brand` → logo, brand, image, theme, social, advertising, video;
  - `shop` → theme, shop_copy, seo, blog;
  - `images` → image, stock;
  - `video` → video;
  - `social` → social, advertising;
  - `all` → every scope.
  - A Brain scope name stored in `memory.scope` is honoured as is.
- Contact details (phone, email, address, hours, booking link) appear only in `theme`, `shop_copy` and `all`.
- WHY: targeted views instead of one identical context for every task.
- TEST: "scopes : chaque vue…", "aucune donnée secrète ; coordonnées…", "vue logo nettement plus petite…"

## HARD / SOFT / ADVISORY

- FILE: `views.ts`
- FUNCTION: `brainItems(snapshot)`
- CHANGE: every item has a `level`, rendered in three separate blocks with explicit headers:
  - `### CONTRAINTES FERMES (faits confirmés, décisions validées, corrections et refus du client — à respecter)`
  - `### CONTRAINTES SOUPLES (préférences et marque — à suivre, adaptables si la création le justifie)`
  - `### INDICATIONS (déductions et constats automatiques — utiles, jamais des interdictions)`

| Level | Items |
|---|---|
| HARD | business kind; offer line when the name was provided; confirmed facts; unknown facts ("never invent"); client answers; claims to avoid; price (confirmed or "unknown, never invent"); variants; services honesty rules; unproven arguments; user corrections and user decisions (memory, source user); explicit user rejections (memory kind `rejection`); name when validated / provided; palette / fonts / tagline when validated; current logo when validated / provided; validated list |
| SOFT | non-locked brand (palette, fonts, tagline, tone, direction, positioning, audience, personality, story, social voice); user preferences and goals; services offer, area, contact; strategy messages, proofs, persona, objections; product visual; catalogue; current logo when FINAL / PROVISIONAL / proposed; sources |
| ADVISORY | inferred facts ("observation, formulate with caution"); trade understanding ("déduit, à confirmer"); AI-proposed preferences or decisions (source ≠ user, or status inferred); recurring quality-gate patterns ("indication sur le générateur, pas une préférence du client") |

- Rules enforced:
  - a user preference ("je préfère du bleu") stays a SOFT preference and never becomes a fact;
  - an AI quality pattern never becomes a user preference or a prohibition;
  - an unknown fact is never rendered as a confirmed fact.
- WHY: distinction between a real decision of the client and a signal about the generator.
- TEST: "ferme / souple / indication…", "constats automatiques du contrôle qualité…", "refus du client « mur vide »…"

## CONTEXT BUDGETS

- FILE: `views.ts`
- CONST: `BUDGETS` (characters; ≈ 3.2 chars per token). Soft values are initial hypotheses, to recalibrate with real data.

| Scope | Soft budget | Hard ceiling |
|---|---|---|
| logo | 2500 | 8000 |
| brand | 5000 | 14000 |
| image | 2000 | 7000 |
| stock | 1200 | 5000 |
| theme | 6000 | 18000 |
| shop_copy | 6000 | 18000 |
| seo | 1800 | 6000 |
| blog | 3500 | 10000 |
| social | 3000 | 10000 |
| advertising | 3500 | 10000 |
| video | 3000 | 10000 |
| qc | 3000 | 10000 |
| all | 12000 | 30000 |

- FUNCTION: `contextFor` (budget algorithm)
- CHANGE:
  - Items are sorted by tier (1 = corrections and user rejections … 7 = secondary), critical first within a tier.
  - **Soft budget:** a non-critical item enters only while room remains. A critical item always enters. An overrun sets `budgetExceeded = true`.
    - Critical = user corrections, user decisions, user rejections, confirmed facts, unknowns, answers, claims, honesty rules, unproven arguments, business kind, offer line, brand name, palette, current logo, validated list.
    - Also critical in their scopes: services offer and contact, price, locked tagline, and the trade understanding / visuals / queries for visual and search scopes.
  - **Hard ceiling:**
    - non-critical items are removed first, lowest priority first (`dropped`);
    - only if still above the ceiling, critical items are removed, each listed in `criticalDropped`, with `hardCeilingReached = true`;
    - never silent; `all` is not unlimited.
- WHY: owner rules 4, 5 and 18 (soft budgets, hard safety ceiling, no unlimited context, explicit signal).
- TEST: "budget souple…", "plafond de sécurité…"

## STABLE HASH

- FILE: `src/lib/brain/hash.ts`
- FUNCTION: `stableHash(scope, data)`
- CHANGE:
  - sha256 of `BRAIN_VERSION | scope | canonicalJSON(data)`, truncated to 16 hex characters.
  - `canonicalJSON` sorts object keys recursively.
- FILE: `views.ts`, FUNCTION: `contextFor`. Hash input:
  - the scope's items with `stable = true`, taken BEFORE budgeting;
  - as `[id, level, data]`, sorted by id;
  - data = structured values (palette object, fact key / value / status, logo state / name / concept…), never the rendered text.
- Behaviour (all asserted):

| Event | Effect on the hash |
|---|---|
| New asset or status change of a non-central asset | unchanged in every scope |
| Recurring AI quality pattern (`stable = false`) | unchanged in every scope |
| Technical failure (`checked = 0`) | ignored |
| User rejection scoped to image | image and all change; blog and logo unchanged |
| Logo proposed → validated | logo, brand, theme, social, advertising, all change (video too by scope); stock and seo unchanged |

- `brainVersion` is exposed in every `ContextView`, in the admin route and in the CLI.
- WHY: stable context = facts, corrections, decisions, validated constraints, active user preferences and rejections, active identity; prepares cache, idempotence and diagnostic.
- TEST: "empreinte stable : indépendante des créations récentes…", "constats automatiques…", "refus du client…", "logo validé…"

## VOLATILE CONTEXT

- FILE: `views.ts`
- FUNCTION: `contextFor` → `volatile`
- CHANGE: recent creations (up to 12, non-upload: kind / role / name / status / gate verdict) are rendered in a separate `<creations_recentes>` block, only for `image`, `theme`, `social` and `all`. They are never part of `stable` and never part of the hash.
- A central asset (the logo) affects the stable context through the brand pointer and logo state, not through the recent list.
- Not yet placed in LLM calls: the slot after the cache breakpoint belongs to 2.1.
- TEST: "empreinte stable : indépendante des créations récentes (contexte volatil séparé)"

## TRADE REGISTRY

- FILE: `src/lib/brain/trade.ts`
- FUNCTION: `resolveTrade(text, sector?)`, `tradeText(project)`
- CHANGE: compact, composable registry:
  - **Core canonical trades (19):** plasterer, painter, mason, electrician, plumber, carpenter, tiler, roofer, gardener, hairdresser, beautician, physiotherapist, coach, photographer, caterer, accountant (advice, legal), realtor, mechanic, cleaner. Each has:
    - FR/EN aliases (one regex on accent-free lowercase text);
    - actions;
    - positive and negative visuals;
    - 2–3 specific search queries;
    - icon keywords + icons to avoid;
    - logo symbol.
  - **Declared combinations:** plasterer + painter → `plasterer_painter` ("plâtrier peintre" / "plasterer / interior painter").
  - **Undeclared combinations:** id `a+b`, data merged in text order, one query per trade first.
  - **Sector fallback:** 11 service sectors.
  - **Generic fallback:** the client's own label.
  - **Global negatives (7):** empty room, bare wall, wall texture, background texture, isolated object, generic handshake, office stock photo.
- Query rule: ACTION + PROFESSION + ENVIRONMENT. "wall" is not banned. "plasterer applying skim coat to interior wall" is valid because it is a precise action of the trade; generic queries ("wall", "brick wall", "wall texture") are never produced.
- Negatives are DATA for reranking, quality gate and source-specific exclusions. They are not concatenated into queries.
- Result for "Plâtrier peintre" (sector batiment):
  - id `plasterer_painter`, source `combo`, parts `[plasterer, painter]`;
  - actions: plastering, skim coating, drywall installation, jointing, sanding, painting, wall preparation, filling, masking, finishing;
  - queries:
    1. plasterer applying skim coat to interior wall
    2. painter painting interior wall with roller
    3. drywall installer fixing plasterboard ceiling
    4. decorator preparing wall before painting
    5. plasterer smoothing plaster with trowel
    6. house painter painting living room ceiling
  - negatives: brick wall, stone wall, exterior facade, construction crane, art painting, canvas painting, isolated paint can, graffiti + global negatives;
  - icons: trowel, ruler, paint, brush, roller (avoid: wall, bricks, palette).
- Not wired: production `tradeStock()` still returns the old queries ("plasterer plastering wall", "painter paint roller wall", "drywall plasterboard installation", "house painter painting room"), which a test asserts. Wiring is sub-phase 2.4.
- WHY: one canonical trade identity instead of 8 independent tables; fixes the "plâtrier → wall" generic-query weakness once wired.
- TEST: `tests/brain-metier.test.ts` (6 tests)

## UNKNOWN TRADE FALLBACK

- FILE: `trade.ts`
- FUNCTION: `resolveTrade`
- CHANGE:
  - Unknown trade, known sector (e.g. "Ramoneur", batiment):
    - id `sector:batiment`, source `sector`;
    - the client's label first: query "Ramoneur professional at work";
    - then safe sector queries ("craftsman working on interior renovation", …);
    - global negatives.
  - Unknown trade, no sector (e.g. "Souffleur de verre"):
    - id `generic`, source `generic`;
    - queries "Souffleur de verre professional at work" and "Souffleur de verre working with a client";
    - global negatives.
  - Empty text: `generic` with no queries. Never an exception.
- No developer entry is ever required for the studio to understand a trade.
- Known limitation: the generic fallback cannot translate an unknown French trade into English for stock APIs without AI (see APPENDIX — KNOWN LIMITATIONS).
- TEST: "métier inconnu : repli par secteur…", "métier inconnu sans secteur…"

## ADMIN BRAIN ROUTE

- FILE: `src/app/api/admin/brain/route.ts`
- FUNCTION: `GET /api/admin/brain?project=<id>[&scope=a,b][&content=1]`
- CHANGE:
  - `requireAdmin()`: 401 without a session, 403 for a client (including with `content=1`).
  - 404 for a missing or unknown project.
  - Default response (no content):
    - `projectId`;
    - `counts`;
    - `technicalFailuresIgnored`;
    - `trade` {id, source, labels, sector};
    - `currentLogo` {state, source, name};
    - `aiPatterns` (count);
    - `views[]` with: scope, brainVersion, hash, chars, estTokens, softBudget, hardCeiling, budgetExceeded, hardCeilingReached, sections, dropped, criticalDropped, levels, sources, volatileChars.
  - `content=1` (authenticated admin only): adds `content` and `volatileContent`, both passed through the existing `redact()`.
- WHY: owner decision 15 (no content by default; content for an admin, redacted).
- TEST: "route d'administration…" (401 / 403 / 200 / 404; no project text without content=1; content present with content=1; a fake key stored in memory comes out masked; scope filter)

## CLI

- FILE: `scripts/brain.ts`
- Usage: `npx tsx scripts/brain.ts [<projectId>] [--scope logo,stock] [--content] [--json] [--legacy]`
  - Default: last modified project, summary of every view.
  - `--content`: view contents, redacted.
  - `--json`: same payload as the admin route.
  - `--legacy`: prints the current projectContext size per legacy scope, for comparison.
- Read-only; no AI. Uses the same `brainReport()` as the admin route.
- Verified manually on the Sébastien Blanc fixture in a temporary database (output of the logo and stock views checked for readability).

## CONTEXT SIZE BEFORE / AFTER

Method:
- temporary database (separate DATA_DIR);
- two fixtures: Sébastien Blanc (services, plâtrier peintre, local brand) and the product fixture "Sérum Éclat" (local brand);
- 12 generated assets added per project;
- no AI call;
- sizes in characters (`chars`); est. tokens ≈ chars / 3.2.

### Sébastien Blanc (services)

Legacy `projectContext`: **4076** for every scope (all, brand, shop, images, social, video). The text is identical whatever the task.

| Brain scope | chars | soft | budgetExceeded | hardCeilingReached | volatile | levels (hard / soft / advisory) | sections | dropped |
|---|---|---|---|---|---|---|---|---|
| all | 3803 | 12000 | no | no | 530 | 5 / 15 / 4 | identity, brand, facts, offer, rules, trade, strategy | — |
| logo | **1467** | 2500 | no | no | 0 | 2 / 9 / 2 | identity, brand, trade | — |
| image | 1564 | 2000 | no | no | 530 | 2 / 4 / 2 | identity, brand, offer, trade | — |
| stock | 1735 | 1200 | **yes (critical only)** | no | 0 | 1 / 3 / 3 | identity, offer, trade | — |
| theme | 2272 | 6000 | no | no | 530 | 5 / 13 / 0 | identity, brand, facts, offer, rules, strategy | — |
| seo | 1462 | 1800 | no | no | 0 | 5 / 5 / 1 | identity, brand, facts, offer, rules, trade | — |
| brand | 2251 | 5000 | no | no | 0 | 3 / 13 / 1 | identity, brand, facts, offer, trade, strategy | — |
| blog | 2097 | 3500 | no | no | 0 | 5 / 8 / 1 | identity, brand, facts, offer, rules, trade, strategy | — |
| social | 2279 | 3000 | no | no | 530 | 5 / 13 / 0 | identity, brand, facts, offer, rules, strategy | — |
| advertising | 2284 | 3500 | no | no | 0 | 5 / 13 / 0 | identity, brand, facts, offer, rules, strategy | — |
| video | 2903 | 3000 | no | no | 0 | 5 / 13 / 2 | identity, brand, facts, offer, rules, trade, strategy | — |
| qc | 969 | 3000 | no | no | 0 | 5 / 3 / 0 | identity, brand, facts, offer, rules | — |
| shop_copy | 2085 | 6000 | no | no | 0 | 5 / 10 / 0 | identity, brand, facts, offer, rules, strategy | — |

- Logo view = 36 % of legacy and 39 % of Brain `all`. The fixture objective (≤ 40 %) is reached.
- `criticalDropped` = [] on every scope.

### Product fixture (Sérum Éclat)

Legacy `projectContext`: **2065** for every scope.

| Brain scope | chars | budgetExceeded | hardCeilingReached | volatile | levels (hard / soft / advisory) |
|---|---|---|---|---|---|
| all | 2053 | no | no | 530 | 5 / 13 / 3 |
| logo | 932 | no | no | 0 | 2 / 8 / 1 |
| image | 893 | no | no | 530 | 2 / 3 / 2 |
| stock | 835 | no | no | 0 | 1 / 1 / 3 |
| theme | 1493 | no | no | 530 | 5 / 11 / 0 |
| seo | 727 | no | no | 0 | 5 / 2 / 1 |
| brand | 1376 | no | no | 0 | 3 / 11 / 1 |
| blog | 1360 | no | no | 0 | 4 / 7 / 1 |
| social | 1092 | no | no | 530 | 4 / 9 / 0 |
| advertising | 1564 | no | no | 0 | 5 / 12 / 0 |
| video | 1389 | no | no | 0 | 4 / 9 / 2 |
| qc | 594 | no | no | 0 | 5 / 2 / 0 |
| shop_copy | 1294 | no | no | 0 | 5 / 8 / 0 |

- Logo view = 45 % of legacy. Dropped = [] and criticalDropped = [] on every scope.

Real token counts, real cache hit rate and real cost effect: UNKNOWN (no AI call in 2.0; measurable with the Phase 1 diagnostic once views are wired and a real benchmark runs).

## SQL QUERY COUNT

- `brainSnapshot()` on a fixture with memory, quality_checks and assets rows present: ≤ 4 `db().prepare` calls, asserted by spying on `prepare`.
- Queries: project row, memory, quality_checks (90 days, ≤ 500), assets (≤ 80, json_extract of three meta fields).
- No millisecond assertion in CI (owner decision 21).

## TESTS ADDED

`tests/brain-lecture.test.ts` (14):

| # | Test | Owner requirement covered |
|---|---|---|
| 1 | snapshot: trade plasterer_painter / combo / batiment, services business, artifacts excluded, no logo, counts | snapshot correct |
| 2 | no Shopify token, no API key, no `access_token`/`apiKey` strings in the snapshot or any view; phone / email / address absent from logo, image, stock, seo, blog, social, advertising, video; present in theme / shop_copy | no secret data |
| 3 | logo view has name, trade, palette, icon concepts; no strategy, no rules; stock has specific queries, no palette, no tone; theme has services and rules, no stock queries | scopes correctly built |
| 4 | confirmed fact, unknown, user correction = HARD; user preference = SOFT; inferred fact, AI preference, trade = ADVISORY; preference never a fact; unknown never rendered as a fact; three distinct blocks | hard / soft / advisory distinguished; facts vs preferences |
| 5 | soft budget 100: every critical item present, budgetExceeded, non-critical dropped, no critical dropped | soft budget never drops a critical constraint |
| 6 | ceiling just above the critical size: secondary dropped, no critical dropped; very small ceiling: critical removals listed explicitly; `all` has a ceiling | hard ceiling drops secondary before critical |
| 7 | two new assets: every scope hash unchanged, stable text identical, new asset only in volatile, logo has no volatile | stableHash independent of recent assets; volatile separated |
| 8 | 2 AI rejections `empty_wall` (stock_photo): image view contains the advisory "Défaut récurrent détecté par le contrôle qualité (2×) : scènes de mur vide hors sujet — indication sur le générateur, pas une préférence du client", never "REFUS du client" / preference; every hash unchanged; 2 technical failures (`checked=0`) ignored; a single non-fatal rejection → nothing | stableHash independent of AI advisory patterns; test F as amended |
| 9 | user rejection "photos de mur vide" (scope image): HARD "REFUS du client"; image and all hash change; blog and logo unchanged; blog view does not mention it | user rejection changes the relevant hash |
| 10 | logo proposed → validated: hashes of logo, brand, theme, social, advertising, all change; stock and seo unchanged; currentLogo validated / brand; rendered in HARD | validated logo changes the relevant scopes |
| 11 | no logo → legacy latest fallback → brand pointer wins over a newer unchosen logo; provisional state | brand.logo.assetId source of truth |
| 12 | ≤ 4 SQL `prepare` calls for a full snapshot | ≤ 4 SQL queries |
| 13 | logo < 60 % of all (fixture objective ≤ 40 % reached: 39 %); required fields present (name, trade, palette, direction, typographies); unneeded sections absent (services, key messages, rules, contact) | test M as amended |
| 14 | admin route: 401 / 403 (also with content=1) / 200; no project text by default; content=1 shows content with a fake key masked; scope filter; 404 unknown project | admin route secured; content=1 admin only + redaction |

`tests/brain-metier.test.ts` (6):

| # | Test |
|---|---|
| 1 | PP: id, source, labels FR/EN, sector, parts, actions, visuals, negatives, icons and icons to avoid |
| 2 | PP queries: ≥ 4, each ≥ 4 words with a profession word and an action verb, never generic; "wall" allowed in a precise query; both trades first, in text order |
| 3 | aliases FR / EN / accents ("plâtrerie, placo, enduits", "Interior painter and decorator", "Plaquiste — peinture intérieure"); undeclared composition "électricien et plombier" |
| 4 | sector fallback ("Ramoneur", batiment) |
| 5 | generic fallback ("Souffleur de verre"); empty text never fails |
| 6 | production `tradeStock()` queries unchanged (registry not wired in 2.0) |

## EXISTING TESTS MODIFIED

None.

## TEST RESULTS

- TOTAL TESTS: 666 (83 files)
- PASSED: 666
- FAILED: 0
- SKIPPED: 0 (no `.skip`, `.only`, `.todo`, `xit` or `xdescribe` in `tests/`)
- Previous total (end of Phase 1): 646 → +20 new tests.
- GitHub CI: not run yet for 2.0 (no PR opened; CI runs on the merge PR).

## TYPESCRIPT RESULT

- `npx tsc --noEmit`: 0 errors.
- `npm run build` (Next.js production build): compiled successfully.
- Theme files (`theme-base/`, `src/lib/theme/`): not touched, so `verify-theme` was not required.

## BEHAVIOR CHANGES

None for the studio:
- no module calls the Brain;
- `projectContext()` output is unchanged;
- memory writers are unchanged;
- production stock queries are unchanged;
- no database schema change;
- no AI cost change.

New, admin / development only:
- `GET /api/admin/brain` (admin, read-only);
- `scripts/brain.ts` (read-only CLI);
- `reports/phase-2-0-report.md` (artefact).

## PROBLEMS

1. **`all` scope.** It initially excluded items declared for a single scope (a user rejection scoped to `image` did not reach `all`). Fixed: `all` includes every item, under its hard ceiling.
2. **Logo view rendering.** It printed an empty "Personnalité :" line and the raw English `nameStatus` ("provided"). Fixed: empty personality is skipped; the name status is rendered in French ("fourni par le client", "proposé", "VALIDÉ").
3. **Test settings key.** A test used a realistic provider settings key; renamed to a test-only key (`provider.braintest.apiKey`), so the shared test database never looks like it has a configured provider.
4. **Test M wording.** Its required-field list included "Personnalité", which is empty for the local-brand fixture; replaced by "Typographies" (always present in the logo view).
5. **Typecheck.** `tradeStock()` may return null; the test now uses optional chaining.

## DEVIATIONS

1. **In-process memo / LRU** of snapshots and views (plan §26) deferred to 2.1, when modules call views. 2.0 is diagnostic only.
2. **User rejections** are read from memory rows of kind `rejection` (supported read-only). No writer exists yet (2.3); tests insert rows directly.
3. **"What works" summary** from quality_checks (FINAL patterns) is not built. Only recurring defect patterns (advisory) are.
4. **Services offer is SOFT.** Its per-field origin (user vs AI) is not stored today. It is critical in text and search scopes, so it is never dropped by the soft budget.
5. **Product projects.** The registry contains service trades only. A product project gets the generic fallback ("déduit"); product sectors have no fallback entry yet.
6. **Current logo window.** The proposal gate is read from the 80 newest assets. An older proposal falls back to state `proposed` (documented).
7. **Budgets.** Soft budgets are initial values. PP `stock` exceeds its soft budget (1735 > 1200) with critical-only content; this is flagged, not truncated.
8. **AI pattern threshold.** A pattern becomes an advisory at ≥ 2 occurrences, or 1 if fatal. A single non-fatal rejection produces no advisory.

## READY FOR 2.1

- Technically ready:
  - `contextFor()` can back `projectContext()` as a compatibility façade (legacy scope mapping);
  - the volatile block is ready to be placed after the cache breakpoint;
  - `brainVersion`, `hash` and `scope` are ready to be recorded as `brain_scope` / `brain_hash` in `ai_calls`.
- Blocking items: owner validation of 2.0, and merge of 2.0 with green CI.
- 2.1 NOT STARTED.

## RISKS (for the next sub-phases)

| Risk | Mitigation planned |
|---|---|
| 2.1 façade changes the text the modules receive | keep legacy sections in 2.1; narrow scopes only in 2.7, module by module, each with a required-fields test |
| Soft budgets too small for real projects | budgets are soft; overruns flagged; recalibrate with admin route / CLI on real projects |
| Registry alias false positives (e.g. "peinture" in an art-products context) | registry not wired until 2.4; then adapters keep current outputs except the documented PP query change; add tests per alias |
| Compact views falling under the model's minimum cacheable size | acceptable (cheaper); measure with the Phase 1 diagnostic (UNKNOWN today) |
| Memory rows of kind `rejection` written by future code with a scope outside the mapping | unknown scopes default to every scope; 2.2 / 2.3 will normalise scopes |

## SUGGESTED NEXT STEP

Owner review of this report → merge 2.0 (PR + green CI) → authorisation for 2.1 (projectContext façade over the Brain, volatile slot after the cache breakpoint, `brain_scope` / `brain_hash` trace).

---

## APPENDIX — FILES CHANGED

| File | Status | Lines (approx.) |
|---|---|---|
| src/lib/brain/trade.ts | created | ~360 |
| src/lib/brain/snapshot.ts | created | ~115 |
| src/lib/brain/hash.ts | created | ~25 |
| src/lib/brain/views.ts | created | ~330 |
| src/lib/brain/index.ts | created | ~40 |
| src/app/api/admin/brain/route.ts | created | ~25 |
| scripts/brain.ts | created | ~50 |
| tests/brain-lecture.test.ts | created | ~330 |
| tests/brain-metier.test.ts | created | ~75 |
| reports/phase-2-0-report.md | created | this file |

No existing file modified.

## APPENDIX — TESTS

- New: 20 (14 + 6). Existing modified: 0. Total: 666 / 666 passed, 0 skipped.
- Fixtures: Sébastien Blanc (services, plâtrier peintre, local brand, confirmed / inferred / unknown facts, three services, phone / email / address for leak tests) and the existing product fixtures. Rows for memory, quality_checks, assets, connections and settings are inserted directly in the test database.
- Owner-required tests mapping (§25 of the 2.0 instruction):

| Requirement | Test |
|---|---|
| snapshot correct | brain-lecture #1 |
| no secret data | #2, #14 |
| scopes correctly built | #3, #13 |
| hard / soft / advisory distinguished | #4, #8, #9 |
| soft budget never drops a critical constraint | #5 |
| hard ceiling drops secondary before critical | #6 |
| stableHash independent of recent assets | #7 |
| stableHash independent of AI advisory patterns | #8 |
| user rejection changes the relevant hash | #9 |
| validated logo changes the relevant scopes | #10 |
| volatile assets separated | #7 |
| PP trade profile correctly understood | brain-metier #1–#3 |
| unknown trade fallback | brain-metier #4–#5 |
| admin route secured | #14 |
| content=1 admin only + redaction | #14 |
| ≤ 4 SQL queries on fixture | #12 |

## APPENDIX — METRICS

- Context sizes: see CONTEXT SIZE BEFORE / AFTER.
- Reduction, logo view vs legacy: PP −64 % (4076 → 1467); product −55 % (2065 → 932).
- Reduction, qc view vs legacy: PP −76 % (4076 → 969); product −71 % (2065 → 594).
- SQL per snapshot: ≤ 4.
- AI calls in 2.0: 0. Cost in 2.0: 0 €.
- Real tokens / cache / cost effect: UNKNOWN until wiring (2.1+) and a real benchmark.

## APPENDIX — KNOWN LIMITATIONS

1. Read-only: nothing in the studio uses the Brain yet.
2. The generic trade fallback cannot translate an unknown French trade label into English for stock APIs without AI. It reuses the client's label (plus sector concepts when a sector is known).
3. The registry covers 19 service trades + 11 service sectors; product categories fall back to generic.
4. User rejections are read but never written yet (2.3). AI patterns depend on the defect codes the Phase 1 quality gate records; deliverables without codes produce no pattern.
5. Services offer origin (user vs AI) is not tracked, so it is SOFT.
6. The current-logo proposal gate depends on the 80 newest assets.
7. Soft budgets are hypotheses; PP stock exceeds its soft budget by design (critical-only content), flagged.
8. No memo / cache of snapshots yet (each call reads the 4 queries).
