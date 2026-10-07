# PHASE 2.1 FACADE + CACHE REPORT

Project: E-COM STUDIO IA — Phase 2 (Project Brain), sub-phase 2.1 "projectContext façade + cache + Brain trace".
Scope authorised by the owner: 2.1 only. 2.2 not started.
Notation: UNKNOWN = not measurable without real data or real AI calls.

## GIT STATE

- Base: `main` at `253392e425920f5d744edda20133b3cb4123540a`, the merge of Phase 2.0 (PR #50).
- Working branch: `claude/ecom-studio-ia-platform-8cwl79`, fast-forwarded to main before starting 2.1.
- Phase 2.1 is a single commit containing code, tests and this report. Its SHA is given in the chat message (a file cannot contain the SHA of the commit that adds it). Pushed with a normal push.
- Merge of 2.1: NO. No PR opened for 2.1.
- Sub-phase 2.2: NOT STARTED.
- No destructive Git operation, no force push, no history rewrite.

## 2.0 MERGE

- PR #50 "Phase 2.0 : Project Brain en lecture seule", head `4dce15628bd2f7dced2ca5d4eed4530ed705f19f` (code `3391b05` + report `4dce156`).
- Checks before merge:
  - main unchanged (`5d0c6e8`) and an ancestor of the branch;
  - mergeable_state "clean".
- CI on the head, both checks green:
  - "Typecheck, tests, Theme Check, build": success;
  - "Image Docker (construction et démarrage)": success.
- Merged with the "merge" method and the expected head SHA. Merge commit: `253392e425920f5d744edda20133b3cb4123540a`.
- After merge:
  - the branch was fast-forwarded to main and pushed normally;
  - the working tree was clean;
  - the PR activity subscription was stopped.

## FILES CREATED

| File | Role |
|---|---|
| `src/lib/brain/facade.ts` | Legacy scope mapping (`LEGACY_SCOPES`), `legacyView()`, metadata registry, `brainMetaOf()` |
| `src/lib/brain/texts.ts` | `servicesRulesText(ph)`: single source of the services rules text, shared by the old renderer (`servicesContext`) and the Brain |
| `tests/brain-facade.test.ts` | 9 tests (mapping, stable / volatile, cache stability, LLM block order, trace, compatibility service + product, `marque.*` duplicates, no secret) |
| `reports/phase-2-1-report.md` | this report |

## FILES MODIFIED

| File | Change |
|---|---|
| `src/lib/ai/context.ts` | `projectContext()` becomes a façade over the Brain. `servicesContext()` and `platformContext()` are kept (same output; the rules text now comes from `brain/texts.ts`). Unused imports removed. |
| `src/lib/ai/llm.ts` | `LlmCall.volatile` and `LlmCall.brain`; `brainOf()`; volatile block after the cache breakpoint; volatile counted in the cost estimate; Brain trace fields passed to `recordCall` |
| `src/lib/ai/trace.ts` | `CallRow.brainScope`, `brainHash`, `brainVersion`; written to `ai_calls` |
| `src/lib/db.ts` | `ADDED_COLUMNS`: `ai_calls.brain_scope`, `brain_hash`, `brain_version` (TEXT, nullable, additive) |
| `src/lib/ai/diagnostic.ts` | calls carry `brainScope` / `brainHash` / `brainVersion`; new aggregates `byBrainScope`, `byBrainVersion` |
| `scripts/diagnostic-ia.ts` | prints "Par portée du Project Brain" and "Par version du Project Brain" |
| `src/lib/brain/views.ts` | façade options in `contextFor` (`extra`, `label`, `volatileFor`); `label` in `ContextView`; `VOLATILE_SCOPES`; richer items so no legacy information is lost (see LEGACY COMPATIBILITY) |
| `src/lib/brain/hash.ts` | `BRAIN_VERSION` 2.0.0 → 2.1.0 (view composition changed) |

Not modified, as instructed:
- memory writers (`remember`, routes);
- decisions;
- `brand.validated` handling;
- every engine module and their call sites;
- stock queries;
- theme files.

## PROJECTCONTEXT FACADE

- FILE: `src/lib/ai/context.ts`
- FUNCTION: `projectContext(p, scope = "all")`
- OLD: a monolithic builder.
  - Product, facts, price, variants, colours, the full brand block, social voice (social / all only), strategy + platform, memory decisions filtered by scope (including the raw JSON of `marque.*`).
  - The 12 latest non-upload assets with their status ("Créations récentes"), and sources.
  - Nearly identical text for every scope; the cached prefix changed whenever an asset was created or changed status.
- NEW: `return legacyView(p, scope).stable`.
  - Same signature, same callers, no module changed.
  - The text is the Brain's stable view: HARD / SOFT / ADVISORY blocks, no recent assets, no `marque.*` duplicates, trade understanding included.
  - Each call records its view metadata (scope label, hash, version, volatile) in the façade registry, for `llm.ts`.
- WHY: relevance and stability of the context, cache efficiency, traceability. No big-bang migration.
- TEST: brain-facade "mapping legacy…", "compatibilité — service…", "compatibilité — produit riche…", "doublons « marque.* »…"

## LEGACY SCOPE MAPPING

- FILE: `src/lib/brain/facade.ts`
- CONST: `LEGACY_SCOPES`

| Legacy scope | Brain scope | Added on top of the Brain scope ("what the old context always carried") | Label (trace / tag) |
|---|---|---|---|
| brand | brand | CORE minus social voice | `legacy:brand` |
| shop | theme | CORE minus social voice | `legacy:shop` |
| images | image | CORE minus social voice | `legacy:images` |
| video | video | CORE minus social voice | `legacy:video` |
| social | social | CORE + contact details + proofs + objections + brand platform (used by `draftAds`) | `legacy:social` |
| all | all | — | `all` |

- CORE = every item of the sections identity, facts (confirmed facts, unknowns, inferred observations, answers, claims to avoid), rules (services rules, unproven arguments) and brand (name, tagline, palette, fonts, direction, personality, positioning, audience, tone, story, validated list, current logo), plus price, variants, product visual, label text, catalogue, services offer, area, key messages and angles.
- Memory items keep their scope filtering (legacy memory scope → Brain scopes, as in 2.0).
- Budget for every legacy view: the `all` budget (soft 12,000 / hard 30,000 characters). It is not unlimited. Fine budgets per module come with the explicit migration in 2.7.
- WHY: owner instruction 1 and 8 (legacy mapping in 2.1; explicit module scopes only in 2.7).
- TEST: "mapping legacy : chaque ancien scope est servi par le Brain, sous un nom traçable"

## STABLE CONTEXT

- Content: the items of the mapped scope + CORE, rendered in three blocks (CONTRAINTES FERMES / CONTRAINTES SOUPLES / INDICATIONS).
- Never in the stable text:
  - recent assets;
  - asset statuses;
  - timestamps;
  - ids;
  - recurring AI quality patterns' effect on the hash (they may appear as advisory text in the relevant scopes but are excluded from the hash, as validated in 2.0).
- Hash: `stableHash(label, data)` (BRAIN_VERSION + label + canonical structured data). For a legacy view the label is `legacy:<scope>`, so the hash describes exactly what was sent.
- A central decision (e.g. a validated logo: brand pointer + lock) changes the stable text and the hash. A new non-central asset changes neither.
- TEST: "stabilité : une nouvelle création change le volatil, pas le contexte stable ni l'empreinte ; un logo validé les change"

## VOLATILE CONTEXT

- FILE: `facade.ts` + `views.ts` (`VOLATILE_SCOPES` = image, theme, social, all)
- OLD: the 12 recent assets were inside the cached context of every scope.
- NEW:
  - recent creations go to a separate `<creations_recentes>` block;
  - produced only for the legacy scopes images, shop, social and all — not brand, not video;
  - never part of the stable text or the hash.
- `brainMetaOf(context, projectId)` returns the volatile only when the call's `projectId` equals the project of the view: a volatile block is never sent for another project.
- WHY: owner instructions 2 and 7 (recent assets must stop invalidating the stable context; only scopes that need them).
- TEST: "créations récentes : jamais dans le contexte stable ; dans le volatil des seuls scopes qui en ont besoin, du bon projet"

## LLM BLOCK ORDER

- FILE: `src/lib/ai/llm.ts`
- FUNCTION: `buildContent(call)`
- OLD: system (breakpoint) → context → reference (breakpoint on the last of the two) → images → prompt.
- NEW: SYSTEM (breakpoint #1) → STABLE CONTEXT → STABLE REFERENCE if present (breakpoint #2 on the last stable block) → VOLATILE → IMAGES → PROMPT.
- Volatile source:
  - explicit `call.volatile`, or
  - the volatile recorded by the façade for the `<contexte_projet …>` block found in `call.context` (also found when a caller appended text after it, e.g. video craft notes).
- The cost pre-estimate (`estimateMicro`) now includes the volatile length.
- Unchanged:
  - the JSON-repair turns and the non-strict JSON instruction (appended after the user content as before);
  - the system text and `prompt_hash` (system text only).
- TEST: "ordre des blocs : système, contexte stable, référence, POINT DE CACHE, volatil, images, demande ; trace Brain enregistrée"

## CACHE BREAKPOINTS

- Checked before changing `buildContent`:
  - breakpoint #1 is on the system block (`system[0].cache_control: ephemeral`);
  - breakpoint #2 is on the LAST of [context, reference] present in the first user message;
  - when neither is present, there is no breakpoint in the user message;
  - only 2 breakpoints are used (below the API maximum of 4).
- After 2.1:
  - the same two breakpoints, at the same places;
  - the volatile block is inserted just after breakpoint #2, without `cache_control`;
  - asserted in tests: exactly one block with `cache_control` in the user message, and it is the last stable block (with and without a reference).
- Expected effect: a new or re-statused asset no longer changes the cached prefix, because the stable text is identical for the same hash.
- Real cache hit rate: UNKNOWN until real calls; measurable with the Phase 1 diagnostic (cache read / write tokens per `brain_scope` and `brain_version`).
- TEST: the two LLM tests in `brain-facade.test.ts`.

## BRAIN TRACE

- FILE: `llm.ts`, `trace.ts`, `db.ts`, `diagnostic.ts`, `scripts/diagnostic-ia.ts`
- OLD: no context information in `ai_calls`.
- NEW:
  - every LLM call whose context comes from the façade (or that passes `call.brain` explicitly) records `brain_scope` (e.g. `legacy:images`), `brain_hash` and `brain_version` in `ai_calls`;
  - calls without a Brain context record NULL;
  - the diagnostic exposes them per call and aggregates cost, tokens, cache and errors by Brain scope and by Brain version;
  - the CLI prints both tables.
- Storage: three additive nullable TEXT columns, added through the existing `ADDED_COLUMNS` migration. No existing data is touched; old rows have NULL.
- Media calls: none uses the Brain in 2.1, so they have no Brain trace (expected until 2.7).
- WHY: owner instruction 3 (compare cost, cache and quality per Brain version later).
- TEST:
  - the explicit trace "sans référence…" test;
  - the façade trace "ordre des blocs…" test: `brain_scope = "legacy:images"`, `brain_hash` = view hash, `brain_version` = `BRAIN_VERSION`;
  - NULL for a call without context.

## BRAIN VERSION

- `BRAIN_VERSION` = `2.1.0` (was 2.0.0). The composition of the views changed: richer services rules, label text, brand platform, audience objections, façade labels.
- Recorded in every Brain-traced call (`ai_calls.brain_version`) and exposed in every `ContextView`, the admin route and the CLI.
- A new column was chosen over packing the version into `brain_hash`: it is the cleanest, it is queryable on its own, and it costs nothing.

## APPLICATION CACHE

- Decision: **no application memo / LRU cache of snapshots or views in 2.1.**
- Reason: owner instruction 10 (correctness first). Reliable invalidation would need a version key combining `projects.updated_at`, memory, quality_checks and assets, but some writes do not bump `projects.updated_at` (direct asset inserts, memory upserts). A wrong key could serve a stale context.
- Cost of not caching: 4 SQL reads per `projectContext()` call (measured ≤ 4 in 2.0), negligible next to an AI call.
- The façade registry (`facade.ts`) is NOT a context cache:
  - the context is recomputed on every call;
  - the registry only links a stable text to its metadata (scope, hash, version, volatile of the latest computation), bounded to 500 entries;
  - lookups also check the project id.
- The Anthropic prompt cache stays distinct and unchanged in principle (same breakpoints).

## LEGACY COMPATIBILITY

- Method: for each legacy scope (brand, shop, images, video, social, all) on two fixtures, assert that the necessary information is present. Textual equality is not required.

**SERVICE — Sébastien Blanc, plâtrier peintre.** Present in every legacy scope:
- name;
- trade "Plâtrier peintre";
- confirmed fact (zone);
- unknown ("INCONNU — Années d'expérience");
- the three services, with the price "tarif : sur devis";
- palette;
- tone;
- services rules, including "Ne jamais inventer".
- Contact phone: in shop, social and all; not in images.

**PRODUCT — rich fixture (Sérum Éclat).** Present in every legacy scope:
- name;
- category;
- confirmed fact (Contenance 30 ml);
- unknown (Livraison);
- confirmed price (34.90 EUR);
- variants (15 ml, 30 ml);
- claims to avoid;
- unproven argument ("Arguments SANS PREUVE … Résultats visibles en 7 jours");
- key message;
- client answer ("Fabriqué en France");
- label text;
- palette.
- Objections with the language placeholder: in shop, social and all. Brand platform (persona, problem, alternatives): in shop.

To keep every legacy information, the Brain items were enriched (FILE `views.ts`, FUNCTION `brainItems`):
- services rules = the exact legacy text, through `servicesRulesText`;
- services list shows duration and "tarif : non communiqué" like the legacy text;
- contact shows main and secondary contact modes with labels;
- unknown and missing values use the content-language placeholder;
- product colours with share %;
- label text (HARD);
- brand platform: persona, problem, alternatives, difference;
- objections with the placeholder;
- audience objections when the platform has none.

Intended differences (documented):
- `marque.*` duplicates removed;
- recent assets moved to volatile;
- contact details no longer sent to brand / images / video tasks;
- "Sources importées" only in brand / shop / all;
- social voice only in social / all (as before);
- three-level presentation.

TEST: "compatibilité — service…", "compatibilité — produit riche…"

## DUPLICATE CONTEXT REMOVED

- FILE: `views.ts`
- FUNCTION: `brainItems` (memory loop)
- OLD: memory decisions `marque.name / tagline / positioning / audience / story / tone / palette / direction` (written by the brand PATCH route, values stored as raw JSON for objects) were printed again under "Décisions…" although the same values are in `brand_json`.
- NEW: memory decisions with key `marque.*` are not rendered in the context.
  - The memory rows stay in the database as history and provenance; nothing is deleted.
  - Other decisions (e.g. `theme.hero`) are still rendered.
- TEST: "doublons « marque.* » retirés du contexte, lignes de mémoire conservées ; autres décisions toujours transmises"

## CONTEXT SIZE BEFORE / AFTER

Method:
- temporary database;
- legacy = the exact `projectContext` of main `253392e` (before 2.1);
- new = façade `legacyView()`;
- 12 generated assets and one `marque.palette` decision per project (as the brand route writes it);
- characters; no AI call.

### Sébastien Blanc (services)

| Legacy scope | Legacy context | New stable | New volatile | New total | budgetExceeded | dropped / critical dropped |
|---|---|---|---|---|---|---|
| brand | 4257 | 3679 | 0 | 3679 | no | 0 / 0 |
| shop | 4034 | 3638 | 548 | 4186 | no | 0 / 0 |
| images | 4034 | 4233 | 548 | 4781 | no | 0 / 0 |
| video | 4034 | 4232 | 0 | 4232 | no | 0 / 0 |
| social | 4034 | 3640 | 548 | 4188 | no | 0 / 0 |
| all | 4257 | 4898 | 548 | 5446 | no | 0 / 0 |

### Sérum Éclat (rich product)

| Legacy scope | Legacy context | New stable | New volatile | New total | budgetExceeded | dropped / critical dropped |
|---|---|---|---|---|---|---|
| brand | 2324 | 1858 | 0 | 1858 | no | 0 / 0 |
| shop | 2101 | 1737 | 548 | 2285 | no | 0 / 0 |
| images | 2101 | 1918 | 548 | 2466 | no | 0 / 0 |
| video | 2101 | 1917 | 0 | 1917 | no | 0 / 0 |
| social | 2101 | 1739 | 548 | 2287 | no | 0 / 0 |
| all | 2324 | 2349 | 548 | 2897 | no | 0 / 0 |

Reading:
- The stable (cached) part shrinks for brand, shop and social, and for every scope of the product fixture except all (+1 %).
- For PP, images (+5 %), video (+5 %) and all (+15 %) grow: they now carry the trade understanding (actions, positive and negative visuals, and for all the search queries and icon concepts), the full services rules and the level headers.
- The total sent (stable + volatile) is close to before. What changes is that the stable part no longer depends on recent creations, so it can stay cached.
- Real narrowing per module (logo ≈ 1.5 k, qc ≈ 1 k measured in 2.0) comes with the explicit scopes in 2.7.
- Real token and cost effect: UNKNOWN (no AI call).

## TESTS ADDED

`tests/brain-facade.test.ts` (9):

| # | Test | Owner requirement |
|---|---|---|
| 1 | legacy mapping table; every legacy scope tagged `legacy:<scope>` (all → `all`); `projectContext` = `legacyView().stable` | projectContext legacy mapping |
| 2 | recent asset never in stable for any legacy scope; in volatile only for shop, images, social, all; never the volatile of another project | stable / volatile; recent assets only where needed |
| 3 | new asset → identical stable text and identical hash, different volatile; validated logo → hash changes and stable shows "Logo actuel : VALIDÉ par le client" | recent asset does not change hash; central decision changes hash |
| 4 | LLM request: system breakpoint; context without breakpoint, reference with breakpoint; volatile after it without breakpoint; image label + image; prompt last; exactly one user-message breakpoint; `ai_calls` row has `brain_scope=legacy:images`, `brain_hash` = view hash, `brain_version` = `BRAIN_VERSION` | LLM block order; brain_scope / brain_hash / brain_version recorded |
| 5 | without a reference the breakpoint is on the context; explicit `volatile` and `brain` are honoured and traced; a call without context has NULL trace; a context with appended text is still recognised | LLM block order; trace |
| 6 | service fixture: necessary information in every legacy scope; contact only in shop / social / all | legacy compatibility (service) |
| 7 | rich product fixture: necessary information in every legacy scope; objections with placeholder; brand platform | legacy compatibility (product) |
| 8 | `marque.palette` / `marque.tone` not rendered; other decisions rendered; memory rows still present | no `marque.*` duplication |
| 9 | no `access_token`, `apiKey`, `APP_SECRET` or test key in any legacy context or volatile | no secret |

The 2.0 Brain tests (20) still pass with the enriched views.

## EXISTING TESTS MODIFIED

None.

Tests that mock `projectContext` (e.g. qualite-textes-marque, excellence-*, idempotence-reprise, logo-complet-ia) are untouched and pass. `servicesContext` / `platformContext` keep their outputs (services-copy and excellence-strategie-redaction pass).

## TEST RESULTS

- TOTAL TESTS: 675 (84 files)
- PASSED: 675
- FAILED: 0
- SKIPPED: 0 (no `.skip`, `.only`, `.todo`, `xit` or `xdescribe` in `tests/`)
- Previous total (end of 2.0): 666 → +9.
- Stability check: the full suite was run 6 times during 2.1. 5 runs were fully green. 1 run had a single failure in `tests/theme-custom.test.ts` ("plan + sections valides…"), which did not reproduce in 5 isolated runs of that file nor in the 5 other full runs, and its message was not captured (see PROBLEMS). The final run before commit: 675 / 675.
- GitHub CI: not run yet for 2.1 (no PR opened).

## TYPESCRIPT RESULT

`npx tsc --noEmit`: 0 errors.

## BUILD RESULT

- `npm run build` (Next.js production build): compiled successfully.
- Theme files (`theme-base/`, `src/lib/theme/`): not touched, so `verify-theme` was not required.

## BEHAVIOR CHANGES

1. **AI context text.** Every module that uses `projectContext` receives the Brain's stable view of its legacy scope instead of the old monolithic text:
   - three-level presentation;
   - trade understanding;
   - no `marque.*` duplicates;
   - no recent assets;
   - contact details only for shop / social / all.
   - Necessary information is preserved (asserted).
2. **Recent creations** reach the model in a volatile block after the cache breakpoint, for shop, images, social and all. Brand and video tasks no longer receive them.
3. **New `ai_calls` columns:** brain_scope, brain_hash, brain_version (filled for Brain-context calls). The diagnostic shows cost and cache per Brain scope / version.
4. **Cost pre-estimate** includes the volatile block (slightly more accurate).
5. Unchanged:
   - memory writers;
   - decisions;
   - locks;
   - modules;
   - stock queries;
   - theme;
   - AI access rules;
   - billing.

## PROBLEMS

1. **Intermittent test failure, once in 6 full runs:** `tests/theme-custom.test.ts` › "plan + sections valides → nouvelle version, Theme Check propre ; section refusée → bibliothèque à cet endroit, signalée".
   - It passed 5 / 5 in isolation and 5 / 5 in the other full runs; the failure message was not captured.
   - That test mocks `llmJson` entirely (the façade's text is not asserted there) and claims a job from the shared job queue (`claimNext` + `expect(claimed.id).toBe(job.id)`). A shared test-database queue race with another test file is a plausible but UNCONFIRMED cause.
   - No change was made to it in 2.1 (out of scope, no test skipped or weakened). To watch in CI.
2. **Context sizes.** The stable text of PP images / video / all grew (trade understanding + full rules + headers); documented in CONTEXT SIZE.
3. Earlier attempts: none failed; the 9 new tests passed on the first full implementation.

## DEVIATIONS

1. **No application cache** (memo / LRU) — deliberate, see APPLICATION CACHE.
2. **Legacy views use the `all` budget** (soft 12,000 / hard 30,000) instead of their scope budget, so that 2.1 never truncates information the modules relied on. Per-module budgets apply from 2.7.
3. **Contact details** (phone, e-mail, address, hours, booking) are no longer sent to brand, images and video tasks. They are kept for shop, social (posts and ads) and all. This narrowing was judged safe and is asserted.
4. **Social legacy view** includes proofs, objections and the brand platform, because `draftAds` uses the legacy social scope.
5. **`BRAIN_VERSION` bumped to 2.1.0**, so 2.0 and 2.1 contexts are distinguishable in `ai_calls`.
6. **Media calls** carry no Brain trace yet (they do not use `projectContext`).

## READY FOR 2.2

- Ready, technically:
  - the façade is in place;
  - the volatile slot and the Brain trace work;
  - memory is still read-only from the Brain's point of view.
- 2.2 (memory model: columns, dedup, supersession, provenance fix) can start after owner validation and merge of 2.1 with green CI.
- 2.2 NOT STARTED.

## RISKS

| Risk | Mitigation |
|---|---|
| A module relied on a piece of the old text that the façade no longer carries for its scope (e.g. contact details in an image task) | necessary-information tests per legacy scope; contact kept where texts are written; narrowing reviewed module by module in 2.7 |
| Larger stable text for some scopes (PP all +15 %) | it is cacheable now (stable across assets); per-module narrowing in 2.7; measure with diagnostic per brain_version |
| Registry miss (e.g. a caller rewrites the context block) → no volatile and no trace | harmless fallback (no volatile, NULL trace); lookup works even with appended text |
| Intermittent theme-custom failure in CI | monitor; investigate the shared job-queue race if it reappears (separate fix, not mixed into 2.1) |

---

## APPENDIX — FILES CHANGED

| File | Status |
|---|---|
| src/lib/brain/facade.ts | created |
| src/lib/brain/texts.ts | created |
| tests/brain-facade.test.ts | created |
| reports/phase-2-1-report.md | created |
| src/lib/ai/context.ts | modified (façade; servicesContext uses the shared rules text) |
| src/lib/ai/llm.ts | modified (volatile slot, Brain trace) |
| src/lib/ai/trace.ts | modified (Brain trace columns) |
| src/lib/db.ts | modified (ADDED_COLUMNS for ai_calls) |
| src/lib/ai/diagnostic.ts | modified (Brain fields + aggregates) |
| scripts/diagnostic-ia.ts | modified (two tables) |
| src/lib/brain/views.ts | modified (façade options, richer items) |
| src/lib/brain/hash.ts | modified (BRAIN_VERSION 2.1.0) |

## APPENDIX — TESTS

- New: 9. Modified: 0. Total: 675 / 675 passed, 0 skipped.
- Mocking strategy for LLM tests: the Anthropic SDK is mocked (requests captured, nothing sent). The test account has an active plan and an AI budget (no access bypass). The provider key is a fake test value; the global `fetch` is stubbed.
- Owner-required tests mapping (§11 of the 2.1 instruction):

| Requirement | Test |
|---|---|
| projectContext legacy mapping | #1 |
| stable / volatile | #2, #3 |
| LLM block order | #4, #5 |
| brain_scope recorded | #4, #5 |
| brain_hash recorded | #4, #5 |
| brain_version recorded | #4, #5 |
| recent asset does not change hash | #3 |
| central decision changes hash | #3 |
| service / product contexts keep necessary information | #6, #7 |
| no `marque.*` duplication | #8 |
| no secret | #9 |
| existing tests still green | full suite 675 / 675 |

## APPENDIX — METRICS

- Context sizes: see CONTEXT SIZE BEFORE / AFTER.
- Stable vs legacy:

| Fixture | brand | shop | images | video | social | all |
|---|---|---|---|---|---|---|
| PP | −14 % | −10 % | +5 % | +5 % | −10 % | +15 % |
| Product | −20 % | −17 % | −9 % | −9 % | −17 % | +1 % |

- Volatile size with 12 recent assets: 548 characters (shop, images, social, all).
- SQL per `projectContext()` call: ≤ 4 (snapshot), no application cache.
- AI calls in 2.1: 0. Cost: 0 €.
- Cache hit rate / real tokens / real cost: UNKNOWN until real calls; now measurable per `brain_scope` and `brain_version`.

## APPENDIX — KNOWN LIMITATIONS

1. Legacy views carry the CORE everywhere (by design for compatibility). Real per-module relevance gains come in 2.7.
2. No application cache (correctness first).
3. Product projects still use the generic trade fallback (accepted in 2.0; kept as an explicit limitation: the studio must later understand product categories as well as service trades).
4. Soft budgets are still the initial hypotheses (PP stock exceeds its 1,200 soft budget with critical-only content; not changed, as instructed).
5. User rejections are read but not written yet (2.3); memory dedup / supersession not done (2.2).
6. Media generation calls are not Brain-traced yet.
7. One intermittent, unconfirmed test failure (theme-custom) observed once locally; see PROBLEMS.
