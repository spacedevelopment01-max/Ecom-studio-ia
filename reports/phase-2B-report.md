# PHASE 2B — PROJECT MEMORY & CONSISTENCY REPORT

Project: E-COM STUDIO IA — Phase 2 (Project Brain), sub-phase 2B. It replaces the former 2.2 Memory Model, 2.3 Rejections, 2.4 Trade, 2.5 Facts and 2.6 Brand Consistency.
Scope authorised by the owner: 2B only. 2C not started.
Notation: UNKNOWN = not measurable without real data or real AI calls.

## GIT STATE

- Base: `main` at `d70b49ac7476887c350d5626078c59e32808ed76`, the merge of Phase 2.1 (PR #51).
- Working branch: `claude/ecom-studio-ia-platform-8cwl79`, fast-forwarded to main before starting 2B.
- Phase 2B is a single commit (code + tests + this report). Its SHA is given in the chat message. Pushed with a normal push.
- Merge of 2B: NO. No PR opened for 2B.
- Phase 2C: NOT STARTED.
- No destructive Git operation, no force push.

## 2.1 MERGE

- PR #51 "Phase 2.1 : projectContext servi par le Project Brain…", head `c19cacb6da346a412c6c9268f3ea86110d6a67ff`.
- Checks before merge: main unchanged (`253392e`), mergeable_state "clean".
- CI on the head, both checks green:
  - "Typecheck, tests, Theme Check, build": success. The `theme-custom` test passed in CI.
  - "Image Docker (construction et démarrage)": success.
- Merged with the "merge" method and the expected head SHA. Merge commit: `d70b49ac7476887c350d5626078c59e32808ed76`.
- After merge:
  - branch fast-forwarded to main and pushed normally;
  - working tree clean;
  - PR activity subscription stopped.
- Local visual smoke test (requested before the 2.1 merge, then interrupted by the owner, who validated 2.1 directly):
  - partial result: the real local studio was started (temporary database, no provider key, no AI call);
  - two projects (Sébastien Blanc services, Sérum Éclat product) were created by the app's own local pipeline in a few seconds;
  - pilot, activity / product, brand, site, images, files and prompts screens all returned HTTP 200;
  - name, services, phone, area and price were present (in form fields);
  - cross-account access returned 404;
  - one console 404 on the pilot screen was not identified before the interruption.
  - The registration rate limit (5 per IP per hour) was reached by the test accounts, as designed.
  - Screenshots were kept in the session scratchpad only, not committed, since the test was interrupted. No verdict was issued.

## FILES CREATED

| File | Role |
|---|---|
| `src/lib/brain/memory-norm.ts` | Deterministic memory normalisation: `normalizeMemory()`, `oppositeKey()`, synonym map, cautious polarity |
| `src/lib/brain/rejections.ts` | User rejections: `recordLogoRouteRejection()`, `recordMediaRejection()`, `logoRouteConcept()` |
| `src/lib/brain/facts.ts` | `mergeProductProfile()`, `entityRelation()` (same / replaced API) |
| `src/lib/brain/brand-locks.ts` | `isLocked()`, `recordBrandDecision()`, `markBrandLogo()` |
| `tests/brain-memoire-coherence.test.ts` | 11 tests (memory, rejections, facts, brand consistency, wired trade) |
| `reports/phase-2B-report.md` | this report |

## FILES MODIFIED

| File | Change |
|---|---|
| `src/lib/db.ts` | `memory` columns `norm_key`, `state` (default active), `superseded_by`, `origin`, `evidence_json`; index `memory_active` |
| `src/lib/projects.ts` | `memory()` reads active rows; `remember()` with dedup, supersession, provenance; `insertMemory()` |
| `src/lib/brain/snapshot.ts` | memory read: active rows only, with origin and evidence |
| `src/lib/brain/views.ts` | user rejection shows its repetition count; validated fonts take precedence over route fonts |
| `src/lib/brain/trade.ts` | `matchAccented` (accent-sensitive alias); the mason entry no longer matches the city "Mâcon" |
| `src/lib/brain/hash.ts` | `BRAIN_VERSION` 2.1.0 → 2.2.0 |
| `src/app/api/projects/[id]/memory/route.ts` | GET lists active memory only |
| `worker/handlers.ts` | theme-chat preferences recorded as AI inference (source "ai", status "inferred", origin "inference"), not as user decisions |
| `src/app/api/projects/[id]/brand/logo/route.ts` | POST: a validated logo cannot be replaced by another route without `replace: true`; DELETE: the deleted route becomes a user rejection |
| `src/app/api/files/[fid]/route.ts` | PATCH status "rejected" on a creative media → user rejection (scope images) |
| `src/app/api/projects/[id]/brand/route.ts` | lock changes (validate / unvalidate) recorded as a brand decision |
| `src/lib/engine/identity.ts` | `applyLogo`: validated fonts never swapped on the site; brand logo usage recorded. `generateLogos` add mode: never replaces a validated logo. `symbolFor`: registry step |
| `src/lib/engine/brand.ts` | `buildBrand`: an uploaded client logo no longer replaces a VALIDATED logo |
| `src/lib/engine/full-logo.ts` | `useFullLogo`: validation adds "logo" to the lock list, records the decision, records the brand logo usage |
| `src/lib/engine/logo-job.ts` | the client's route choice is recorded as a brand decision |
| `src/lib/engine/pipeline.ts` | product and service re-analysis use `mergeProductProfile()` |
| `src/lib/stock/trade-queries.ts` | `tradeStock()` wired on the Trade Registry (legacy table as fallback and `must` source; returns `negative`); `rankStock()` demotes off-topic photos |
| `src/lib/engine/service-media.ts` | post stock photos pass the trade negatives to `rankStock` |
| `src/lib/engine/stock-universe.ts` | product universe photos: no negatives (a texture can be the point) |
| `src/lib/media/icon-library.ts` | `tradeKeywords()` wired on the registry (registry icons first, icons to avoid removed) |
| `src/lib/engine/local.ts` | `localServiceAnalysis()`: registry label for declared compound trades (plâtrier peintre) or trades missing from the local list |
| `src/components/studio/asset-viewer.tsx` | usage label "Marque / Brand" for target type `brand` |
| `tests/brain-metier.test.ts` | the "2.0 not wired" test replaced by a "2B wired" test (see EXISTING TESTS MODIFIED) |

## MEMORY

- FILE: `src/lib/db.ts`
- FUNCTION: `ADDED_COLUMNS`, `migrate`
- OLD: `memory` table without dedup or history columns; only index on `project_id`.
- NEW: additive columns `norm_key TEXT`, `state TEXT NOT NULL DEFAULT 'active'`, `superseded_by TEXT`, `origin TEXT`, `evidence_json TEXT NOT NULL DEFAULT '{}'`; index `memory_active(project_id, state, norm_key)`.
  - Existing rows become `active` with no data change.
  - Nothing is deleted.
- WHY: dedup, decision history, honest provenance.
- TEST: migration exercised by the whole suite (fresh test database); memory tests below.

- FILE: `src/lib/projects.ts`
- FUNCTION: `remember()`, `memory()`
- OLD: upsert on (project, kind, key), value overwritten in place; no history, no dedup, no provenance; `status = 'rejected'` filtered but never written.
- NEW:
  - artifacts and fact journal: unchanged in-place upsert (now with `origin`);
  - decisions: same normalised key with a different value → the new row is inserted and the previous active row becomes `state = 'superseded'` with `superseded_by` = new id; the same value repeated → no new row (evidence count + 1);
  - preferences / rejections / corrections / goals: deduplicated by normalised key (`evidence_json.count`, `lastAt`); the opposite polarity on the same concept supersedes the old row;
  - `origin`: user, inference (source ai), system (source local), import (link / photo / description), or explicit;
  - `memory()` reads active rows only, so superseded history is never re-read as a constraint.
- WHY: decision history and honest provenance without duplicates.
- TEST: "décision remplacée…", "mémoires équivalentes dédupliquées…", "provenance honnête…"

- FILE: `src/lib/brain/memory-norm.ts`
- FUNCTION: `normalizeMemory(kind, scope, key, value)`
- NEW: deterministic, no AI:
  - decision → `decision:<key>`;
  - preference / rejection / correction → `<scope>:<neg|pos>:<concept>`, only when the sentence starts with a negation or preference ("pas de", "éviter", "sans", "n'aime pas", "je préfère", "no", "avoid"…) or ends with "refusé", "à éviter", "interdit"…, and the target is short (≤ 4 words);
  - an explicit rejection without negation targets the concept itself;
  - otherwise: exact normalised text fallback (no invented normalisation);
  - small synonym map: badge ← écusson / emblème / blason / macaron; mur vide ← mur nu / empty wall / bare wall; mur de briques ← brick wall…; media prefixes ("photos de…") ignored.
- Verified cases:
  - "pas de badge", "éviter badge", "badge refusé", "n'aime pas les badges", "Je n'aime pas les écussons" → `brand:neg:badge` (1 row, count 4);
  - "peinture sans solvant" → exact fallback, never a rejection of "peinture";
  - "je préfère les badges" → `brand:pos:badge`, supersedes the negative row.
- WHY: owner rules 6 (cautious polarity) and 17 (dedup).

## REJECTIONS

- FILE: `src/lib/brain/rejections.ts` + routes
- NEW: user rejections are persisted as memory rows `kind = 'rejection'`, `origin = 'user'`:
  - **logo route deleted** by the client (brand/logo DELETE): concept = the route's form (badge / emblem, monogram, trade pictogram, product silhouette, single letter, drawn symbol, wordmark), never its colour; scope `logo`; key `logo:neg:<concept>`;
  - **creative media rejected** by the client (files PATCH `status = rejected` on lifestyle, ambiance, banner, scene, social, ad, post-photo): concept = the media's subject (or slot, or role); legacy scope `images` (→ Brain scopes image + stock);
  - non-creative media (an original product photo, a cutout set aside) are NOT recorded: "not this photo" is not a style preference;
  - repetition increases the evidence count, rendered as "(écarté N fois)".
- Brain rendering: HARD constraint "REFUS du client — … : ne pas reproduire cette direction" in the concerned scopes only (logo rejection: not in blog). It changes the hash of those scopes only.
- AI quality patterns: unchanged from 2.0. They are computed at read time, ADVISORY only ("indication sur le générateur, pas une préférence du client"), never written to memory and never in the stable hash.
- Technical failures (`checked = 0` / checker none): ignored, never a preference.
- TEST: "refus d'une piste de logo…", "média écarté par le client (route fichiers)…", "rejets du contrôle qualité = indication seulement ; panne technique = aucune préférence…"

## TRADE

- FILE: `src/lib/stock/trade-queries.ts`
- FUNCTION: `tradeStock()`, `rankStock()`
- OLD: 31-entry legacy table only. PP queries: "plasterer plastering wall", "painter paint roller wall", "drywall plasterboard installation", "house painter painting room".
- NEW:
  - the Trade Registry (core trades and combos) provides the queries: ACTION + PROFESSION + ENVIRONMENT;
  - the legacy table remains the fallback for trades not in the registry (locksmith, glazier…) and the source of the `must` description words;
  - `negative` concepts are returned;
  - same export name and compatible shape (`queries`, `must`, + `negative`).
- PP now: "plasterer applying skim coat to interior wall", "painter painting interior wall with roller", "drywall installer fixing plasterboard ceiling", "decorator preparing wall before painting", …
- `rankStock(found, must, visualCheck, negative = GLOBAL_NEGATIVES)`:
  - photos whose description only shows an off-topic concept (brick wall, wall texture, empty room…) go last;
  - a photo citing the trade is kept;
  - without a visual check, only trade-citing photos are kept (as before);
  - post stock photos pass the trade's own negatives;
  - product universe photos pass none (a material or texture can be wanted).
- FILE: `src/lib/media/icon-library.ts`, FUNCTION: `tradeKeywords()`
  - NEW: registry icon keywords first, legacy keywords kept, registry icons-to-avoid removed (never "wall" for a plasterer).
- FILE: `src/lib/engine/identity.ts`, FUNCTION: `symbolFor()`
  - NEW: after the legacy keyword symbols (unchanged), the registry symbol of a recognised trade, before the sector fallback.
- FILE: `src/lib/engine/local.ts`, FUNCTION: `localServiceAnalysis()`
  - NEW: a declared compound trade (plâtrier peintre) or a registry trade missing from the local list gives the category label and sector. Otherwise the local list is unchanged.
  - Before, PP was categorised "Peinture et décoration" (the plaster part was lost). Now: "Plâtrier peintre", sector batiment.
- FILE: `src/lib/brain/trade.ts`
  - Bug found and fixed: the city "Mâcon" matched the trade "maçon" (both are "macon" without accents), so PP at Mâcon was understood as plasterer + painter + mason. New `matchAccented` alias (`maçon` with ç).
- Unknown trade:
  - `tradeStock("Souffleur de verre")` → null (no invented query; callers keep their existing fallback: the trade label);
  - local analysis leaves the category empty;
  - the Brain's generic fallback (2.0) still applies in context views.
- No new parallel trade table: the registry is the canonical source and the legacy table is a fallback.
- TEST: brain-metier (updated), icones-metier (unchanged, passes), "plâtrier peintre compris partout…"

## FACTS

- FILE: `src/lib/brain/facts.ts`
- FUNCTION: `mergeProductProfile(prev, next, { relation })`, `entityRelation()`
- OLD: re-analysis rebuilt the whole ProductProfile from the original input; facts, answers, price and name entered afterwards were lost.
- NEW, applied in `pipeline.ts` for product and service analysis:
  - client facts (source "user", not unknown) win over the new analysis;
  - a known confirmed fact is never replaced by an "unknown" from the new analysis;
  - previous confirmed facts absent from the new analysis are kept;
  - an UNKNOWN fact is never promoted to confirmed by an inference;
  - client answers are carried over to equivalent questions (same id or fact key) or kept;
  - a confirmed price is never lost;
  - a client-provided name is kept;
  - variants are kept if the new analysis has none;
  - claims to avoid are unioned.
- Same / replaced entity:
  - API prepared (`relation: "replaced"` → the new profile only, no contamination);
  - no reliable signal exists yet in the studio, so the default is "same" (the re-analysis case);
  - documented limitation.
- Preferences ("je préfère du bleu") stay in memory and never become product facts.
- TEST: "fait du client > déduction ; inconnu reste inconnu ; relance d'analyse sans perte ; produit remplacé = nouveau profil"

## BRAND CONSISTENCY

- FILE: `src/lib/brain/brand-locks.ts`
- `isLocked(brand, key)`: "logo" also counts `logo.status = validated`.
- `recordBrandDecision()`: decision history through `remember` supersession.
- `markBrandLogo()`: one current "brand · logo" usage.

| Lock | Automatic path (never overrides) | Explicit user action (can replace) |
|---|---|---|
| Palette | `applyLogo` keeps a validated palette (existing rule, now tested) | brand PATCH (user edit) |
| Fonts | `applyLogo` no longer swaps the site fonts when "fonts" is validated (new); Brain views show validated fonts over route fonts | brand edits |
| Logo | `buildBrand`: an uploaded client logo no longer replaces a VALIDATED logo (new); `generateLogos` add mode never applies over a validated logo (new); automatic full-logo already refused | brand/logo POST with `replace: true` (new; without it: 409); `useFullLogo` from the user route |

- Previous state when a lock is replaced:
  - the lock list change and the replacement are recorded as decisions, the old one superseded;
  - choosing a route records `marque.logo`;
  - validating a full logo adds "logo" to the lock list and records `marque.logo`.
- `brand.logo.assetId` remains the source of truth:
  - `applyLogo` and `useFullLogo` set it and record the matching `asset_usages` row (`target_type = brand`, `label = logo`), one current row only;
  - Brain `currentLogo` = pointer (asserted equal to the usage row).
- UI unchanged: the logo route buttons were already disabled when the logo is validated, so the new server-side 409 only blocks direct calls.
- TEST: "palette et typographies validées…", "logo validé : une autre piste refusée sans demande explicite ; remplacement explicite possible…", "logo client téléversé : ne remplace pas un logo VALIDÉ…"

## ASSET RELATION

- Only one new usage type: `asset_usages(target_type = 'brand', target_id = <project>, label = 'logo')` for the current logo. It is kept unique, so the previous logo is no longer marked used.
- It does not block deletion (only posts block deletion) and is shown as "Marque / Brand" in the media viewer.
- No graph database; existing `assets`, `source_asset_id`, `version_of`, `asset_usages` and brand pointer are used.

## TESTS ADDED

`tests/brain-memoire-coherence.test.ts` (11):

| # | Test | Owner requirement |
|---|---|---|
| 1 | decision replaced → old superseded with `superseded_by`, only the new is active; same value → no new row | décision remplacée |
| 2 | 4 equivalent phrasings → 1 active row, count 4; "peinture sans solvant" kept exact; opposite preference supersedes | mémoires équivalentes dédupliquées |
| 3 | AI-inferred preference → origin inference, status inferred, rendered in INDICATIONS | provenance honnête |
| 4 | deleted logo routes (badge ×2) → HARD "REFUS du client … (écarté 2 fois)" in logo, absent from blog; logo hash changes, blog unchanged | user rejection → scope pertinent |
| 5 | files PATCH rejected on a stock lifestyle photo → rejection row (scope images, origin user, `images:neg:mur vide`), visible in image and stock, not logo; a rejected original photo records nothing | user rejection → scope pertinent |
| 6 | 2 AI REJECTED + 1 technical failure → no memory row; advisory "Défaut récurrent … (2×) : symboles clichés"; no "REFUS"; hashes unchanged | AI rejection → advisory only; technical failure → no preference |
| 7 | `mergeProductProfile`: user fact > inference; confirmed fact kept against unknown; unknown never promoted; confirmed price kept; user name kept; answers carried; replaced → new profile; blank prev → new; a preference is never a fact | fait utilisateur > inférence; UNKNOWN reste UNKNOWN; re-analysis conserve |
| 8 | `applyLogo` with a route having its own palette and fonts: locked project keeps palette and site fonts; free project takes them; logo view shows validated fonts; current logo = brand pointer = single brand usage | palette validée non écrasée; fonts validées non écrasées; current logo pointer cohérent |
| 9 | validated logo: other route → 409; `replace: true` → 200, lock lifted, decision recorded; regenerate (add routes) not blocked | logo validé non écrasé; remplacement explicite |
| 10 | `buildBrand` with an uploaded client logo and a validated logo → validated logo kept | logo validé non écrasé |
| 11 | PP through the wired adapters (stock queries, icons, symbol, local category "Plâtrier peintre" / batiment); "Mâcon" never read as mason, "Maçon" is; unknown trade → no invented query, empty local category | registry branché; métier inconnu |

## EXISTING TESTS MODIFIED

- FILE: `tests/brain-metier.test.ts`
- OLD: "2.0 ne change rien en production : les recherches de photos actuelles sont inchangées" (asserted the old PP queries, i.e. that the registry was NOT wired).
- NEW: "2B : les recherches de photos de production passent par le registre (action + métier + lieu), mots « must » conservés". It asserts:
  - queries = registry queries; the old "plasterer plastering wall" is gone;
  - `must` and `negative` are present;
  - a trade absent from the registry (locksmith) still uses the legacy table.
- WHY: 2B explicitly wires the adapters (owner instruction "branche les adapters existants sur le Trade Registry"). The old assertion described the 2.0 state.

No other existing test was modified. `tests/icones-metier.test.ts` passes unchanged with the wired `tradeKeywords()`.

## TEST RESULTS

- TOTAL TESTS: 686 (85 files)
- PASSED: 686
- FAILED: 0
- SKIPPED: 0 (no `.skip`, `.only`, `.todo`, `xit` or `xdescribe` in `tests/`)
- Previous total (end of 2.1): 675 → +11.
- Full suite run twice after the final code (before and after the BRAIN_VERSION bump): 686 / 686 both times.
- GitHub CI: not run yet for 2B (no PR opened).

## TYPESCRIPT RESULT

`npx tsc --noEmit`: 0 errors.

## BUILD RESULT

- `npm run build`: compiled successfully.
- Theme base files (`theme-base/`, `src/lib/theme/`): not modified. The engine's theme swap (`identity.ts`) only skips the font change when fonts are locked, so `verify-theme` was not required.

## BEHAVIOR CHANGES

1. **Memory:** decisions keep history; duplicates merge; AI-proposed theme preferences are now marked as inference (lower priority) instead of user decisions; the memory list shows active rows only.
2. **User rejections are remembered:** a deleted logo route or a rejected creative media becomes a hard constraint for that scope in AI contexts.
3. **Stock photo queries** (services) use the registry's precise queries. Off-topic photos (bare wall, brick wall, texture, empty room…) are ranked last.
4. **Logo symbol / icons:** a recognised trade gives its registry icons and symbol (legacy keywords keep priority for the symbol).
5. **Local analysis** of "plâtrier peintre": category "Plâtrier peintre" instead of "Peinture et décoration". The city Mâcon is no longer read as the mason trade.
6. **Re-analysis** no longer erases client facts, answers, confirmed price or provided name.
7. **Locks:**
   - validated fonts are no longer replaced by a logo route on the site;
   - a validated logo is no longer replaced by an uploaded client logo during a rebuild, by "add routes", or by choosing another route without explicit confirmation (API 409; UI already disabled it).
8. **Logo usage** "Marque" shown in the media viewer.
9. `BRAIN_VERSION` 2.2.0 (new context hashes).

## PROBLEMS

1. **Mâcon / maçon false positive** found by the PP test. Fixed with an accent-sensitive alias.
   - Limitation: a client writing "macon" without the cedilla will not be recognised as a mason by the registry (the legacy table still matches "macon" for stock queries).
2. **Font test design.** The first assertion used a font identical to the theme default; corrected to a distinct real family (Archivo) so locked vs free is observable.
3. **Previous intermittent `theme-custom` failure (2.1):** it passed in the 2.1 CI and in every 2B run (4 full runs). Root cause still UNKNOWN; no change made to that test.
4. **Visual smoke test** for 2.1 was interrupted by the owner before completion (see 2.1 MERGE): partial checks only, no verdict.

## DEVIATIONS

1. **Cutouts set aside** and non-creative media (original photos) are not recorded as rejections. Plan 2.3 mentioned cutouts; the owner rule "panne technique ≠ préférence" and the nature of the action ("not this photo") argue against making it a style constraint.
2. **Rejections are recorded on DELETE of a logo route** (route) and on "rejected" media (files PATCH). Restoring a rejected media does not yet retire the rejection row (the client can delete it from the memory list).
3. **Logo replacement through the API** requires `replace: true`. No UI change: the UI already disables route choice when the logo is validated, so the client unvalidates first, as before.
4. **The registry symbol** comes after the legacy keyword symbols, to avoid changing existing logos for trades already handled.
5. **Same / replaced entity:** API only; the default is "same" (no reliable signal yet).
6. **No memory backfill of `norm_key`** for pre-2B rows: they are matched by kind and key on their next update, then normalised.

## READY FOR 2C

- Ready, technically:
  - memory model, rejections, wired trade registry, facts merge and brand locks are in place and tested;
  - the Brain shows user rejections (HARD), AI patterns (ADVISORY), validated fonts and logo state.
- 2C (explicit module scopes logo / image / stock / blog / seo / qc / ads / video / theme + final measurements) can start after owner validation and merge of 2B with green CI.
- 2C NOT STARTED.

## RISKS

| Risk | Mitigation |
|---|---|
| New stock queries change which photos are found for registry trades | queries are more precise (action + profession + place); `must` filter unchanged; off-topic demotion; quality gate unchanged; to observe on the next real benchmark |
| Dedup merges two preferences the client meant differently | only on clearly structured negations / preferences with short targets; ambiguous text kept exact; the client can delete memory rows |
| A user rejection over-constrains future logos | only on explicit user deletion; scoped to logo; repetition shown; the client can delete it from memory |
| Lock 409 surprises an API client | message explains; `replace: true` documented; UI flow unchanged |
| Accent-sensitive mason alias misses "macon" without cedilla | documented; legacy stock table still matches it |

---

## APPENDIX — FILES CHANGED

| File | Status |
|---|---|
| src/lib/brain/memory-norm.ts | created |
| src/lib/brain/rejections.ts | created |
| src/lib/brain/facts.ts | created |
| src/lib/brain/brand-locks.ts | created |
| tests/brain-memoire-coherence.test.ts | created |
| reports/phase-2B-report.md | created |
| src/lib/db.ts | modified |
| src/lib/projects.ts | modified |
| src/lib/brain/snapshot.ts | modified |
| src/lib/brain/views.ts | modified |
| src/lib/brain/trade.ts | modified |
| src/lib/brain/hash.ts | modified |
| src/app/api/projects/[id]/memory/route.ts | modified |
| src/app/api/projects/[id]/brand/logo/route.ts | modified |
| src/app/api/projects/[id]/brand/route.ts | modified |
| src/app/api/files/[fid]/route.ts | modified |
| worker/handlers.ts | modified |
| src/lib/engine/identity.ts | modified |
| src/lib/engine/brand.ts | modified |
| src/lib/engine/full-logo.ts | modified |
| src/lib/engine/logo-job.ts | modified |
| src/lib/engine/pipeline.ts | modified |
| src/lib/engine/local.ts | modified |
| src/lib/engine/service-media.ts | modified |
| src/lib/engine/stock-universe.ts | modified |
| src/lib/stock/trade-queries.ts | modified |
| src/lib/media/icon-library.ts | modified |
| src/components/studio/asset-viewer.tsx | modified |
| tests/brain-metier.test.ts | modified (one test replaced, see above) |

## APPENDIX — TESTS

- New: 11. Modified: 1 (replaced, see EXISTING TESTS MODIFIED). Total: 686 / 686, 0 skipped.
- No AI call in any test. Routes are tested with real sessions (cookie mocked as in the other route tests).
- `applyLogo` is tested with `provisional: true` (no social kit or brand book rendering) to keep the test fast.

## APPENDIX — METRICS

- PP stock queries:
  - before: 4, 2 of which contain only "<trade> … wall";
  - after: 6, all ACTION + PROFESSION + ENVIRONMENT (≥ 4 words, profession and action verb).
- PP local category: before "Peinture et décoration"; after "Plâtrier peintre".
- PP trade understanding at Mâcon: before plasterer + painter + **mason** (false positive); after plasterer + painter.
- Memory: 4 equivalent phrasings → 1 row (count 4).
- AI calls in 2B: 0. Cost: 0 €.

## APPENDIX — KNOWN LIMITATIONS

1. The same / replaced product signal does not exist yet (API ready, default "same").
2. Restoring a rejected media does not retire its rejection automatically.
3. No backfill of `norm_key` for existing memory rows.
4. Product categories still use the generic trade fallback (kept as an explicit limitation from 2.0: the studio must later understand product categories as well as service trades).
5. Soft budgets unchanged (PP stock still exceeds its soft budget with critical-only content, flagged; calibration deferred to real data, as instructed).
6. The intermittent `theme-custom` failure seen once in 2.1 remains UNEXPLAINED (not reproduced since).
7. Media generation calls are still not Brain-traced (2C).
