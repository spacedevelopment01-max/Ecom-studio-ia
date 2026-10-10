/**
 * Brand & Logo Engine V2 (phase 4A) : DÉCOUVERTE → TERRITOIRES → CONSTRUCTION → BARRIÈRE V2 → REPRISE CIBLÉE /
 * ABANDON → PROPOSITIONS. Aucun mockup, aucune déclinaison ni charte avant le choix du client (choose.ts).
 *
 * Chaque étape payante est un point de reprise de la tâche (une reprise ne repaie rien). Le plafond de dépense
 * (trace.costCapMicro) arrête proprement la série : ce qui est déjà contrôlé reste.
 */
import crypto from "node:crypto";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused, UserFacingError } from "../jobs";
import { loadProject, remember } from "../projects";
import { saveAsset } from "../library";
import { logoPng } from "../media/logo";
import { traceSymbol } from "../media/trace-symbol";
import { saveCheck } from "../quality/store";
import { llmConfigured } from "../ai/llm";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { one } from "../db";
import { ARTWORK_SERIES, BUILT_SERIES, logoRedrawQuote, logoSeriesQuote } from "./quote";
import { liveTracker, type LiveTracker } from "./live";
import { C, L } from "../i18n-server";
import { realLogoV2Ai, type LogoV2Ai } from "./ai";
import { brandDiscovery } from "./discovery";
import { buildCandidate, cleanSymbol, expectedText, fontsFor, reviewBoard, type SymbolInput } from "./construct";
import { gateCandidate } from "./quality";
import { MIN_DISTANCE, defaultStyle, localTerritories, selectTerritories, territoryDistance, type TerritoryDraft } from "./territories";
import { POLICIES } from "../quality/policies";
import { decide } from "../quality/gate";
import { mediaProgress, type MediaProgress } from "../ai/openai-images";
import { hashDistance, isPlaceholderShape, SAME_LOGO_BITS, visualHash } from "./identity";
import { artworkBoard, artworkText, cleanArtwork, correctArtworkText, gateArtwork } from "./artwork";
import type { ArtworkReview, BrandBrief, Candidate, EngineRun, LogoReview, LogoStyle, ProposalResult, Territory } from "./types";

export type EngineOptions = {
  /** IA injectée (tests) ; null = sans IA ; absent = IA réelle si active pour le compte. */
  ai?: LogoV2Ai | null;
  /** Territoires construits (par défaut 4). */
  territories?: number;
  /** Territoires déjà montrés (« nouvelles directions ») : à ne pas reprendre. */
  avoid?: string[];
  /** Style choisi par le client (« auto » ou absent : l'IA propose plusieurs styles adaptés). */
  style?: LogoStyle | "auto";
  /** Plafond de la série (micro-euros) ; par défaut, le devis de la série. */
  capMicro?: number;
};

const stopping = (e: unknown) => e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached;

/**
 * LOGO COMPLET par le modèle d'images (phase LA) : une seule image payée par territoire, gardée telle quelle
 * (livrable principal) ; relecture avec les critères du style. Seule reprise automatique : le nom mal écrit est
 * RÉÉCRIT par le studio (vraie police, même endroit), sans redessiner l'illustration ni payer une nouvelle image.
 * Une nouvelle version dessinée ne se fait qu'à la demande du client (« Nouvelle version », avec accord du coût).
 */
export async function developArtwork(ctx: JobContext, ai: LogoV2Ai, t: Territory, brief: BrandBrief, notes: string[], opts: { feedback?: string; provider?: string | null; keyTag?: string; live?: LiveTracker } = {}): Promise<ProposalResult | null> {
  const expected = artworkText(t, brief);
  const family = fontsFor(t, brief)[0] ?? "Inter";
  // Construction typographique du studio : base de la version simplifiée (favicon, tampon, broderie) après le choix.
  const spec = buildCandidate(t, brief, { family, attempt: 0, symbol: null }).spec;
  const tag = opts.keyTag ?? "";
  let raw: Buffer;
  let billedMicro: number | null = null;
  try {
    // Avancement de la génération (envoi, aperçus du flux, réception) écrit en direct pour l'interface.
    const onProgress = (p: MediaProgress) => (p.phase === "billed" ? (billedMicro = p.costMicro ?? null) : opts.live?.dir(t.id, { progress: { phase: p.phase, partials: p.partials, atMs: p.atMs, streamed: p.streamed } }));
    const b64 = await withCandidate(`logo-v2:${t.id}${tag}`, 0, () => ctx.step(`v2:${t.id}${tag}:art:0`, () => mediaProgress.run(onProgress, async () => (await ai.drawArtwork!(t, brief, opts.feedback)).toString("base64"))));
    raw = Buffer.from(b64, "base64");
    // Image enregistrée comme point de reprise de la tâche (et original conservé par le moteur multimédia).
    const prev = opts.live?.state.directions.find((d) => d.id === t.id)?.progress;
    opts.live?.dir(t.id, { progress: { phase: "saved", partials: prev?.partials, atMs: prev?.atMs, streamed: prev?.streamed } });
  } catch (e) {
    if (stopping(e)) throw e;
    const reason = (e as Error).message.slice(0, 300);
    notes.push(`${t.name} : logo complet non dessiné (${reason})`);
    opts.live?.dir(t.id, { status: "failed", reason: `image non dessinée : ${reason}` });
    return null;
  }
  opts.live?.dir(t.id, { status: "checking" });
  const png = await cleanArtwork(raw);
  let cand: Candidate = { territoryId: t.id, attempt: 0, spec, change: opts.feedback ? `nouvelle version demandée : ${opts.feedback.slice(0, 160)}` : null, symbolSource: "artwork", artwork: { png, originalPng: raw, expected, textBox: null, textCorrected: false, provider: opts.provider ?? null, costMicro: billedMicro, hash: await visualHash(png) } };
  // Forme de remplissage (disque, carré, triangle plein d'une couleur au-dessus du nom) : jamais présentée comme un
  // logo, et aucune relecture payée pour elle. L'image reste visible parmi les essais écartés.
  if (await isPlaceholderShape(png)) {
    const d = decide("logo_artwork", { checker: "local", score: null, codes: ["placeholder_shape"] }, { attempt: POLICIES.logo_artwork.maxRetries });
    const checkId = saveCheck(d, { userId: loadProject(brief.projectId).userId, projectId: brief.projectId, jobId: ctx.job.id, candidateId: `logo-v2:${t.id}${tag}`, previousCheckId: null });
    return { territory: t, candidate: cand, verdict: "REJECTED", score: null, reason: "symbole réduit à une forme géométrique de base (forme de remplissage, pas un logo travaillé) — aucune nouvelle image sans votre accord (bouton « Nouvelle version »)", codes: ["placeholder_shape"], attempts: 1, checkId, artworkReview: null };
  }
  let previousCheckId: string | null = null;
  const userId = loadProject(brief.projectId).userId;
  const check = async (c: Candidate): Promise<{ result: ProposalResult; review: ArtworkReview | null }> => {
    const board = await artworkBoard(c.artwork!.png, t.style);
    let review: ArtworkReview | null = null;
    let d;
    try {
      review = await withCandidate(`logo-v2:${t.id}${tag}`, c.attempt, () => ctx.step(`v2:${t.id}${tag}:art-review:${c.attempt}`, () => ai.reviewArtwork!(board, t, brief, expected)));
      d = gateArtwork(review, t, expected, c.attempt);
    } catch (e) {
      // Plafond atteint au moment de la relecture : l'image déjà payée est gardée (essai non contrôlé), jamais perdue.
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      if (e instanceof CostCapReached) notes.push(`${t.name} : relecture non faite (${e.message})`);
      d = decide("logo_artwork", { checker: "ai", score: null, error: (e as Error).message.slice(0, 200) }, { attempt: c.attempt });
    }
    previousCheckId = saveCheck(d, { userId, projectId: brief.projectId, jobId: ctx.job.id, candidateId: `logo-v2:${t.id}${tag}`, previousCheckId });
    return { review, result: { territory: t, candidate: c, verdict: d.verdict, score: d.score, reason: d.reason, codes: [...d.fatalCodes, ...d.blockingCodes, ...d.weakCriteria.map((k) => `weak_${k}`)], attempts: c.attempt + 1, checkId: previousCheckId, artworkReview: review } };
  };
  let { result, review } = await check(cand);
  cand.artwork!.textBox = review?.nameBox ?? null;
  // Nom mal écrit, zone connue : réécrit par le studio (gratuit), puis relu une fois.
  if (result.verdict === "RETRY" && result.codes.includes("name_mismatch") && review?.nameBox) {
    const fixed = await correctArtworkText(png, review.nameBox, t, brief);
    if (fixed) {
      cand = { ...cand, attempt: 1, change: `nom réécrit par le studio (police ${family}) — l'illustration n'est pas redessinée`, artwork: { ...cand.artwork!, png: fixed, textCorrected: true } };
      const second = await check(cand);
      second.result.artworkReview = second.review ?? review;
      result = second.result;
    } else notes.push(`${t.name} : zone du nom inexploitable — texte non corrigé`);
  }
  // Aucune nouvelle image payée sans accord : un RETRY restant devient le verdict final de la politique.
  if (result.verdict === "RETRY") {
    const r = result.artworkReview;
    const d = r ? gateArtwork(r, t, expected, POLICIES.logo_artwork.maxRetries) : decide("logo_artwork", { checker: "ai", score: null, error: result.reason }, { attempt: POLICIES.logo_artwork.maxRetries });
    const verdict = d.verdict === "RETRY" ? "REJECTED" : d.verdict;
    result = { ...result, verdict, reason: verdict === "FINAL" ? d.reason : `${d.reason} — aucune nouvelle image sans votre accord (bouton « Nouvelle version »)` };
  }
  return result;
}

const specHash = (c: Candidate) => crypto.createHash("sha256").update(JSON.stringify({ ...c.spec, custom: c.spec.custom ? JSON.stringify(c.spec.custom) : null })).digest("hex").slice(0, 16);
const needsSymbol = (t: Territory) => (t.markType === "symbol_wordmark" || t.markType === "abstract_mark" || (t.markType === "emblem" && !!t.symbolIdea));

/**
 * Symbole d'un territoire :
 *  1. CONCEPT graphique par le modèle d'images choisi pour l'usage « Logos » (Administration › Images & Vidéos) ;
 *  2. vectorisation automatique du concept, nettoyée et testée en petite taille ;
 *  3. sinon FINALISATION vectorielle du concept par la tâche « logo_symbol » (le concept lui est montré) ;
 *  4. sans modèle d'images utilisable : symbole conçu en vectoriel par la tâche « logo_symbol » — écrit dans les notes.
 * Une image n'est jamais livrée telle quelle ; à défaut de symbole propre, le territoire reste sans symbole.
 */
async function territorySymbol(ctx: JobContext, ai: LogoV2Ai | null, t: Territory, brief: BrandBrief, notes: string[], feedback?: string, attempt = 0): Promise<SymbolInput> {
  if (!ai || !needsSymbol(t)) return null;
  const accent = brief.palette[t.colorRole.accent];
  let concept: Buffer | null = null;
  const route = ai.conceptRoute?.() ?? null;
  if (route && "unavailable" in route) notes.push(`${t.name} : aucun modèle d'images utilisable pour les logos (${route.unavailable}) — symbole conçu en vectoriel par l'IA de texte`);
  else if (t.symbolIdea) {
    try {
      const img = await withCandidate(`logo-v2:${t.id}`, attempt, () => ctx.step(`v2:${t.id}:concept:${attempt}`, async () => (await ai.exploreSymbol(t, brief, feedback))?.toString("base64") ?? null));
      concept = img ? Buffer.from(img, "base64") : null;
      if (!concept) notes.push(`${t.name} : aucun concept d'image produit — symbole conçu en vectoriel par l'IA de texte`);
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      notes.push(`${t.name} : concept d'image indisponible (${(e as Error).message.slice(0, 160)}) — symbole conçu en vectoriel par l'IA de texte`);
    }
    if (concept) {
      const used = route ? ` (${route.provider}:${route.model})` : "";
      const tr = await traceSymbol(concept);
      if (tr.ok) {
        const c2 = cleanSymbol(tr.svg, accent);
        if (c2.ok) {
          notes.push(`${t.name} : concept du modèle d'images${used}, vectorisé`);
          return { symbol: c2.symbol, source: "ai_image_traced" };
        }
        notes.push(`${t.name} : concept${used} vectorisé mais refusé (${c2.reason}) — finalisation vectorielle`);
      } else notes.push(`${t.name} : concept${used} non vectorisable automatiquement (${tr.reason}) — finalisation vectorielle`);
    }
  }
  const drawn = await withCandidate(`logo-v2:${t.id}`, attempt, () => ctx.step(`v2:${t.id}:symbol:${attempt}${concept ? ":c" : ""}`, () => ai.drawSymbol(t, brief, feedback, concept)));
  const clean = cleanSymbol(drawn.svg, accent);
  if (clean.ok) return { symbol: clean.symbol, source: concept ? "ai_image_finalized" : "ai_svg" };
  notes.push(`${t.name} : symbole SVG refusé (${clean.reason})`);
  return null;
}

/**
 * Reprise CIBLÉE : la partie désignée par le contrôle est retravaillée, le reste est gardé. Renvoie null quand rien
 * de pertinent ne peut changer (on ne relance pas un contrôle sur la même proposition).
 */
async function targetedChange(
  ctx: JobContext,
  ai: LogoV2Ai | null,
  t: Territory,
  brief: BrandBrief,
  cur: Candidate,
  state: { fonts: string[]; fontIndex: number; symbol: SymbolInput },
  review: LogoReview | null,
  codes: string[],
  notes: string[],
): Promise<Candidate | null> {
  const target = codes.includes("name_mismatch") || codes.includes("text_unreadable") ? "typography" : codes.includes("cliche") ? "symbol" : (review?.fix.target ?? "none");
  const next = cur.attempt + 1;
  const base = { attempt: next, symbol: state.symbol };
  if (target === "typography" || (target === "none" && codes.includes("weak_typography"))) {
    if (state.fontIndex + 1 < state.fonts.length) {
      state.fontIndex++;
      const family = state.fonts[state.fontIndex];
      return buildCandidate(t, brief, { ...base, family, layout: cur.spec.layout, change: `typographie : ${cur.spec.family} → ${family}${review?.fix.instruction ? ` (${review.fix.instruction})` : ""}` });
    }
    const weight = cur.spec.weight >= 700 ? 400 : 800;
    return buildCandidate(t, brief, { ...base, family: cur.spec.family, weight, layout: cur.spec.layout, change: `graisse : ${cur.spec.weight} → ${weight}` });
  }
  if (target === "symbol" && ai && needsSymbol(t)) {
    const feedback = [review?.fix.instruction, ...(review?.issues ?? [])].filter(Boolean).join(" ; ") || codes.join(", ");
    const sym = await territorySymbol(ctx, ai, t, brief, notes, feedback, next);
    if (!sym) return null;
    state.symbol = sym;
    return buildCandidate(t, brief, { ...base, symbol: sym, family: cur.spec.family, layout: cur.spec.layout, change: `symbole redessiné (${feedback.slice(0, 120)})` });
  }
  if (target === "composition" && cur.spec.custom) {
    const layout = cur.spec.layout === "lockup" ? "vertical" : "lockup";
    return buildCandidate(t, brief, { ...base, family: cur.spec.family, layout, change: `composition : ${cur.spec.layout} → ${layout}` });
  }
  if (target === "spacing") {
    const tracking = cur.spec.tracking >= 0.1 ? 0.03 : cur.spec.tracking + 0.08;
    return buildCandidate(t, brief, { ...base, family: cur.spec.family, layout: cur.spec.layout, tracking, change: `interlettrage : ${cur.spec.tracking} → ${tracking}` });
  }
  if (target === "color") {
    const swapped: Territory = { ...t, colorRole: { ...t.colorRole, accent: t.colorRole.ink } };
    return buildCandidate(swapped, brief, { ...base, family: cur.spec.family, layout: cur.spec.layout, change: "couleur : accent ramené à l'encre (une couleur)" });
  }
  return null;
}

/** Construit, contrôle et reprend (de façon ciblée) un territoire ; abandonne une direction faible. */
async function developTerritory(ctx: JobContext, ai: LogoV2Ai | null, t: Territory, brief: BrandBrief, notes: string[], art: { provider: string } | null, live?: LiveTracker): Promise<ProposalResult | null> {
  if (ai && art) return developArtwork(ctx, ai, t, brief, notes, { provider: art.provider, live });
  const fonts = fontsFor(t, brief);
  if (!fonts.length) {
    notes.push(`${t.name} : aucune police du style ${t.typography.style} n'écrit exactement « ${brief.name} » — territoire écarté`);
    return null;
  }
  const state = { fonts, fontIndex: 0, symbol: await territorySymbol(ctx, ai, t, brief, notes) };
  let cand: Candidate | null = buildCandidate(t, brief, { family: fonts[0], attempt: 0, symbol: state.symbol });
  const seen = new Set<string>();
  let best: ProposalResult | null = null;
  let previousCheckId: string | null = null;
  const max = POLICIES.logo_v2.maxRetries;
  while (cand && cand.attempt <= max) {
    const h = specHash(cand);
    if (seen.has(h)) break; // aucun contrôle répété sans changement
    seen.add(h);
    const board = await reviewBoard(cand.spec);
    const c = cand;
    const review = ai ? await withCandidate(`logo-v2:${t.id}`, c.attempt, () => ctx.step(`v2:${t.id}:review:${c.attempt}`, () => ai.review(board, t, brief, expectedText(c.spec)))) : null;
    const d = gateCandidate(c, t, brief, review, c.attempt);
    const checkId = saveCheck(d, { userId: loadProject(brief.projectId).userId, projectId: brief.projectId, jobId: ctx.job.id, candidateId: `logo-v2:${t.id}`, previousCheckId });
    previousCheckId = checkId;
    const result: ProposalResult = { territory: t, candidate: c, verdict: d.verdict, score: d.score, reason: d.reason, codes: [...d.fatalCodes, ...d.blockingCodes, ...d.weakCriteria.map((k) => `weak_${k}`)], attempts: c.attempt + 1, checkId };
    if (!best || (result.score ?? -1) > (best.score ?? -1) || result.verdict === "FINAL") best = result;
    if (d.verdict !== "RETRY") break; // FINAL, PROVISIONAL ou REJECTED (direction abandonnée : aucune génération brûlée)
    cand = await targetedChange(ctx, ai, t, brief, c, state, review, result.codes, notes);
  }
  return best;
}

/**
 * Plafond d'une série : le devis (logoSeriesQuote) — ce que la tâche a déjà dépensé avant (autres étapes d'un plan)
 * n'est pas compté contre lui ; un plafond plus strict déjà posé (devis accepté du Pilote, benchmark) est conservé.
 */
function withSeriesCap<T>(ctx: JobContext, quoteMicro: number, capMicro: number | undefined, fn: () => Promise<T>): Promise<T> {
  const before = one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", ctx.job.id)?.c ?? 0;
  const own = before + (capMicro ?? quoteMicro);
  const cur = currentTrace();
  return withTrace({ jobId: ctx.job.id, costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, own) : own }, fn);
}

/** Série complète de propositions pour un projet (tâche de fond « brand.logo.v2 »), dans la limite de son devis. */
export async function runLogoEngineV2(ctx: JobContext, projectId: string, opts: EngineOptions = {}): Promise<EngineRun> {
  let quote: ReturnType<typeof logoSeriesQuote>;
  try {
    quote = logoSeriesQuote();
  } catch (e) {
    // Devis impossible (tarif manquant…) : écrit comme échec de la série, avec sa raison.
    liveTracker(projectId, ctx.job.id).set({ stage: "failed", error: (e as Error).message.slice(0, 500) });
    throw e;
  }
  return withSeriesCap(ctx, quote.maxMicro, opts.capMicro, () => seriesRun(ctx, projectId, opts));
}

async function seriesRun(ctx: JobContext, projectId: string, opts: EngineOptions): Promise<EngineRun> {
  const live = liveTracker(projectId, ctx.job.id);
  try {
    return await seriesSteps(ctx, projectId, opts, live);
  } catch (e) {
    // Pause et annulation : la tâche reprendra ou s'arrête à la demande du client (pas une erreur).
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    // Toute autre interruption est ÉCRITE (étape « échec » et raison) avant de remonter : jamais une barre qui disparaît.
    live.set({ stage: "failed", error: (e as Error).message.slice(0, 500) });
    for (const d of live.state.directions) if (d.status === "waiting" || d.status === "drawing" || d.status === "checking") live.dir(d.id, { status: "failed", reason: "série interrompue" });
    throw e;
  }
}

async function seriesSteps(ctx: JobContext, projectId: string, opts: EngineOptions, live: LiveTracker): Promise<EngineRun> {
  const p = loadProject(projectId);
  const brief = brandDiscovery(p, { style: opts.style });
  const ai = opts.ai !== undefined ? opts.ai : llmConfigured() ? realLogoV2Ai(ctx, { userId: p.userId, projectId }) : null;
  const notes: string[] = [];
  // Logo complet par le modèle d'images quand il sait écrire le nom (3 créations) ; sinon construction avec de vraies
  // polices (4 directions).
  let art: { provider: string } | null = null;
  if (ai?.artworkRoute && ai.drawArtwork && ai.reviewArtwork) {
    const r = ai.artworkRoute();
    if ("unavailable" in r) notes.push(`logo complet par l'IA d'images indisponible (${r.unavailable}) — logos construits avec de vraies polices`);
    else art = { provider: `${r.provider}:${r.model}` };
  }
  const n = opts.territories ?? (art ? ARTWORK_SERIES : BUILT_SERIES);
  live.set({ stage: "prepare", art: art?.provider ?? null });
  let aiState: EngineRun["ai"] = ai ? "used" : "off";
  let stoppedByCostCap = false;
  // 1. Territoires (un seul appel) — concept AVANT toute image.
  ctx.progress(0.1, L("Territoires créatifs", "Creative territories"));
  let drafts: (TerritoryDraft & { source?: Territory["source"] })[] | null = null;
  if (ai) {
    try {
      drafts = await ctx.step("v2:territories", () => ai.territories(brief, n + 2, opts.avoid ?? []));
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      if (e instanceof CostCapReached) stoppedByCostCap = true;
      notes.push(`territoires IA indisponibles : ${(e as Error).message}`);
      aiState = "unavailable";
    }
  }
  const sel = selectTerritories(drafts ?? localTerritories(brief).map((d) => ({ ...d, source: "local" as const })), brief, n);
  // Pas assez de territoires distincts : la version du studio complète, toujours avec la règle de diversité.
  if (sel.kept.length < 2 && drafts) {
    for (const d of localTerritories(brief)) {
      const t: Territory = { ...d, id: `t${sel.kept.length + 1}`, source: "local", symbolIdea: d.symbolIdea ?? null };
      if (sel.kept.length < n && sel.kept.every((k) => territoryDistance(k, t) >= MIN_DISTANCE)) sel.kept.push(t);
    }
  }
  // 2. Construction, contrôle, reprises ciblées — territoire par territoire.
  live.directions(sel.kept.map((t) => ({ id: t.id, name: t.name, style: t.style ?? null })));
  live.set({ stage: "images" });
  const results: ProposalResult[] = [];
  for (const [i, t] of sel.kept.entries()) {
    if (stoppedByCostCap) {
      live.dir(t.id, { status: "failed", reason: "non faite : plafond de dépense atteint" });
      continue;
    }
    const useArt = t.source !== "local" && !!art;
    ctx.progress(0.2 + (0.6 * i) / Math.max(1, sel.kept.length), useArt ? L(`Image de « ${t.name} » (IA d'images)`, `Image for "${t.name}" (image AI)`) : L(`Direction « ${t.name} »`, `Direction "${t.name}"`));
    live.dir(t.id, { status: "drawing" });
    try {
      const r = await developTerritory(ctx, t.source === "local" ? null : ai, t, brief, notes, t.source === "local" ? null : art, live);
      if (r) {
        results.push(r);
        live.dir(t.id, { status: "done", verdict: r.verdict, score: r.score, reason: r.reason });
      } else if (live.state.directions.find((d) => d.id === t.id)?.status !== "failed") live.dir(t.id, { status: "failed", reason: notes.filter((x) => x.startsWith(`${t.name} :`)).at(-1)?.slice(t.name.length + 3) ?? "aucune proposition construite" });
    } catch (e) {
      if (e instanceof CostCapReached) {
        stoppedByCostCap = true;
        notes.push((e as Error).message);
        live.dir(t.id, { status: "failed", reason: `plafond de dépense atteint : ${(e as Error).message}` });
        continue;
      }
      throw e;
    }
  }
  // Copies : une image quasi identique à une autre de la série n'est jamais présentée comme une création distincte.
  for (const [i, r] of results.entries()) {
    const h = r.candidate.artwork?.hash;
    const twin = h ? results.slice(0, i).find((o) => o.candidate.artwork?.hash && hashDistance(o.candidate.artwork.hash, h) <= SAME_LOGO_BITS) : null;
    if (!twin) continue;
    Object.assign(r, { verdict: "REJECTED", codes: [...r.codes, "duplicate"], reason: `copie quasi identique de « ${twin.territory.name} » : pas une création distincte` });
    live.dir(r.territory.id, { status: "done", verdict: "REJECTED", score: r.score, reason: r.reason });
  }
  // 3. Enregistrement : propositions FINALES, versions du studio, essais écartés (image gardée) et échecs.
  ctx.progress(0.9, L("Enregistrement des propositions", "Saving the proposals"));
  live.set({ stage: "save" });
  const shown = results.filter((r) => r.verdict === "FINAL");
  const studio = results.filter((r) => r.verdict === "PROVISIONAL");
  const discarded = results.filter((r) => r.verdict !== "FINAL" && r.verdict !== "PROVISIONAL");
  const ids = await ctx.step("v2:save", async () => {
    const out: Record<string, string> = {};
    for (const r of results) out[r.territory.id] = await saveProposal(ctx, p.userId, projectId, r);
    return out;
  });
  for (const r of results) {
    r.assetId = ids[r.territory.id];
    live.dir(r.territory.id, { assetId: r.assetId });
  }
  const failures = live.state.directions.filter((d) => d.status === "failed").map((d) => ({ id: d.id, name: d.name, style: d.style, reason: d.reason ?? "" }));
  const run: EngineRun = { runId: ctx.job.id, territories: sel.kept, shown, studio, discarded, territoryRejections: sel.rejected, ai: aiState, stoppedByCostCap, notes };
  remember(projectId, { kind: "artifact", key: "logo_v2_run", value: JSON.stringify({ runId: run.runId, at: Date.now(), style: brief.style, territories: run.territories.map((t) => ({ id: t.id, name: t.name, markType: t.markType, style: t.style, source: t.source })), shown: shown.map((r) => r.assetId), studio: studio.map((r) => r.assetId), discarded: discarded.map((r) => r.assetId), rejected: sel.rejected, failures, ai: aiState, art: art?.provider ?? null, stoppedByCostCap, notes: notes.slice(0, 20) }), source: ai ? "ai" : "local" });
  live.set({ stage: "done" });
  return run;
}

/**
 * Enregistre une proposition : logo complet → l'image de l'IA (fond retiré, dessin intact), et à part le fichier
 * ORIGINAL reçu du fournisseur, tel quel ; logo construit → rendu PNG de sa construction. Les essais écartés gardent aussi
 * leur image (diagnostic, jamais perdue).
 */
export async function saveProposal(ctx: JobContext, userId: string, projectId: string, r: ProposalResult, extraMeta: Record<string, unknown> = {}): Promise<string> {
  const art = r.candidate.artwork;
  const png = art ? art.png : await logoPng(r.candidate.spec, 900);
  const role = r.verdict === "FINAL" ? "logo-v2" : r.verdict === "PROVISIONAL" ? "logo-v2-studio" : "logo-v2-trial";
  const rv = r.artworkReview;
  const a = await saveAsset({
    projectId,
    userId,
    data: png,
    name: C(`logo-v2-${r.territory.id}.png`, `logo-v2-${r.territory.id}.png`),
    mime: "image/png",
    // FINAL : proposition ; PROVISIONAL (version du studio, sans relecture IA) : proposée à part, jamais comme finale ;
    // le reste : essai écarté (diagnostic, image gardée).
    role,
    folderKey: "brand.logos",
    origin: "generated",
    status: r.verdict === "FINAL" || r.verdict === "PROVISIONAL" ? "review" : "rejected",
    meta: {
      engine: "logo-v2",
      run: ctx.job.id,
      territory: r.territory,
      spec: r.candidate.spec,
      change: r.candidate.change,
      symbolSource: r.candidate.symbolSource,
      ...(art ? { artwork: { expected: art.expected, textBox: art.textBox, textCorrected: art.textCorrected, provider: art.provider, costMicro: art.costMicro ?? null, hash: art.hash ?? null, fix: rv?.fix && rv.fix.target !== "none" && rv.fix.instruction ? rv.fix : null, aiGenerated: true, needsSimplifiedMark: rv?.needsSimplifiedMark ?? true, criteria: rv?.criteria ?? null, issues: rv?.issues ?? [] } } : {}),
      gate: { verdict: r.verdict, score: r.score, reason: r.reason, codes: r.codes, attempts: r.attempts, checkId: r.checkId },
      ...extraMeta,
    },
  });
  if (art?.originalPng) {
    await saveAsset({ projectId, userId, data: art.originalPng, name: C(`logo-v2-${r.territory.id}-original.png`, `logo-v2-${r.territory.id}-original.png`), mime: "image/png", role: "logo-v2-original", folderKey: "brand.logos", origin: "generated", status: "review", sourceAssetId: a.id, meta: { engine: "logo-v2", run: ctx.job.id, original: true, note: "fichier reçu du fournisseur, tel quel (avant nettoyage du fond et réécriture éventuelle du nom)" } });
  }
  return a.id;
}

/**
 * NOUVELLE VERSION d'un logo complet, à la demande du client (bouton « Nouvelle version », coût confirmé avant) :
 * une seule image payée pour ce territoire, avec ses remarques éventuelles ; la version précédente reste dans la
 * série (jamais remplacée ni supprimée). Rien n'est relancé automatiquement.
 */
export async function redrawArtwork(ctx: JobContext, projectId: string, assetId: string, opts: { feedback?: string; ai?: LogoV2Ai | null; capMicro?: number } = {}): Promise<{ assetId: string | null; verdict: string | null; notes: string[] }> {
  const p = loadProject(projectId);
  const { getAsset } = await import("../library");
  const { json } = await import("../db");
  const src = getAsset(assetId);
  const meta = src && src.project_id === projectId ? json<any>(src.meta as any, {}) : null;
  if (!meta?.artwork || !meta.territory) throw new UserFacingError(L("Logo complet introuvable.", "Full logo not found."));
  const ai = opts.ai !== undefined ? opts.ai : llmConfigured() ? realLogoV2Ai(ctx, { userId: p.userId, projectId }) : null;
  const route = ai?.artworkRoute?.();
  if (!ai?.drawArtwork || !ai.reviewArtwork || !route || "unavailable" in route) throw new UserFacingError(L(`Nouvelle version impossible : ${route && "unavailable" in route ? route.unavailable : "IA d'images non disponible"}.`, `New version unavailable: ${route && "unavailable" in route ? route.unavailable : "image AI not available"}.`));
  const brief = brandDiscovery(p);
  const t: Territory = { ...meta.territory, style: meta.territory.style ?? defaultStyle(meta.territory), descriptor: meta.territory.descriptor ?? null };
  const notes: string[] = [];
  ctx.progress(0.2, L(`Nouvelle version de « ${t.name} »`, `New version of "${t.name}"`));
  // Nouvelle version : les remarques du client ET la critique du contrôle sur la version précédente (défauts, correction
  // proposée) — pour corriger réellement le concept au lieu de refaire presque la même image.
  const critique = [meta.artwork.fix?.instruction ? `fix — ${meta.artwork.fix.instruction}` : "", (meta.artwork.issues ?? []).length ? `defects of the previous version to correct — ${(meta.artwork.issues as string[]).slice(0, 4).join("; ")}` : ""].filter(Boolean).join(". ");
  const feedback = [opts.feedback?.trim(), critique].filter(Boolean).join(". ") || "a genuinely new interpretation of the same direction";
  const quote = logoRedrawQuote();
  let r: ProposalResult | null;
  try {
    r = await withSeriesCap(ctx, quote?.maxMicro ?? 0, opts.capMicro, () => developArtwork(ctx, ai, t, brief, notes, { feedback, provider: `${route.provider}:${route.model}`, keyTag: `:v${ctx.job.id.slice(0, 8)}` }));
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    notes.push(e.message);
    return { assetId: null, verdict: null, notes };
  }
  if (!r) return { assetId: null, verdict: null, notes };
  const id = await ctx.step("v2:redraw:save", () => saveProposal(ctx, p.userId, projectId, r, { run: meta.run, previous: assetId }));
  return { assetId: id, verdict: r.verdict, notes };
}
