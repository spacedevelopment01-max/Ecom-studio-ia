/**
 * Brand & Logo Engine V2 (phase 4A) : DÉCOUVERTE → TERRITOIRES → CONSTRUCTION → BARRIÈRE V2 → REPRISE CIBLÉE /
 * ABANDON → PROPOSITIONS. Aucun mockup, aucune déclinaison ni charte avant le choix du client (choose.ts).
 *
 * Chaque étape payante est un point de reprise de la tâche (une reprise ne repaie rien). Le plafond de dépense
 * (trace.costCapMicro) arrête proprement la série : ce qui est déjà contrôlé reste.
 */
import crypto from "node:crypto";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { loadProject, remember } from "../projects";
import { saveAsset } from "../library";
import { logoPng } from "../media/logo";
import { traceSymbol } from "../media/trace-symbol";
import { saveCheck } from "../quality/store";
import { llmConfigured } from "../ai/llm";
import { CostCapReached, withCandidate } from "../ai/trace";
import { C, L } from "../i18n-server";
import { realLogoV2Ai, type LogoV2Ai } from "./ai";
import { brandDiscovery } from "./discovery";
import { buildCandidate, cleanSymbol, expectedText, fontsFor, reviewBoard, type SymbolInput } from "./construct";
import { gateCandidate } from "./quality";
import { MIN_DISTANCE, localTerritories, selectTerritories, territoryDistance, type TerritoryDraft } from "./territories";
import { POLICIES } from "../quality/policies";
import type { BrandBrief, Candidate, EngineRun, LogoReview, ProposalResult, Territory } from "./types";

export type EngineOptions = {
  /** IA injectée (tests) ; null = sans IA ; absent = IA réelle si active pour le compte. */
  ai?: LogoV2Ai | null;
  /** Territoires construits (par défaut 4). */
  territories?: number;
  /** Territoires déjà montrés (« nouvelles directions ») : à ne pas reprendre. */
  avoid?: string[];
};

const specHash = (c: Candidate) => crypto.createHash("sha256").update(JSON.stringify({ ...c.spec, custom: c.spec.custom ? JSON.stringify(c.spec.custom) : null })).digest("hex").slice(0, 16);
const needsSymbol = (t: Territory) => (t.markType === "symbol_wordmark" || t.markType === "abstract_mark" || (t.markType === "emblem" && !!t.symbolIdea));

/** Symbole d'un territoire : SVG de l'IA, sinon (construction illustrative) image de l'IA vectorisée ; sinon aucun (monogramme). */
async function territorySymbol(ctx: JobContext, ai: LogoV2Ai | null, t: Territory, brief: BrandBrief, notes: string[], feedback?: string, attempt = 0): Promise<SymbolInput> {
  if (!ai || !needsSymbol(t)) return null;
  const accent = brief.palette[t.colorRole.accent];
  const drawn = await withCandidate(`logo-v2:${t.id}`, attempt, () => ctx.step(`v2:${t.id}:symbol:${attempt}`, () => ai.drawSymbol(t, brief, feedback)));
  const clean = cleanSymbol(drawn.svg, accent);
  if (clean.ok) return { symbol: clean.symbol, source: "ai_svg" };
  notes.push(`${t.name} : symbole SVG refusé (${clean.reason})`);
  if (t.construction === "illustrative" && attempt === 0) {
    // Exploration par l'IA d'images, puis vectorisation : l'image n'est jamais livrée telle quelle.
    const img = await withCandidate(`logo-v2:${t.id}`, attempt, () => ctx.step(`v2:${t.id}:explore`, async () => (await ai.exploreSymbol(t, brief))?.toString("base64") ?? null));
    if (img) {
      const tr = await traceSymbol(Buffer.from(img, "base64"));
      if (tr.ok) {
        const c2 = cleanSymbol(tr.svg, accent);
        if (c2.ok) return { symbol: c2.symbol, source: "ai_image_traced" };
        notes.push(`${t.name} : image vectorisée refusée (${c2.reason})`);
      } else notes.push(`${t.name} : image non vectorisable (${tr.reason})`);
    }
  }
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
async function developTerritory(ctx: JobContext, ai: LogoV2Ai | null, t: Territory, brief: BrandBrief, notes: string[]): Promise<ProposalResult | null> {
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

/** Série complète de propositions pour un projet (tâche de fond « brand.logo.v2 »). */
export async function runLogoEngineV2(ctx: JobContext, projectId: string, opts: EngineOptions = {}): Promise<EngineRun> {
  const p = loadProject(projectId);
  const brief = brandDiscovery(p);
  const n = opts.territories ?? 4;
  const ai = opts.ai !== undefined ? opts.ai : llmConfigured() ? realLogoV2Ai(ctx, { userId: p.userId, projectId }) : null;
  const notes: string[] = [];
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
  const results: ProposalResult[] = [];
  for (const [i, t] of sel.kept.entries()) {
    if (stoppedByCostCap) break;
    ctx.progress(0.2 + (0.6 * i) / Math.max(1, sel.kept.length), L(`Direction « ${t.name} »`, `Direction "${t.name}"`));
    try {
      const r = await developTerritory(ctx, t.source === "local" ? null : ai, t, brief, notes);
      if (r) results.push(r);
    } catch (e) {
      if (e instanceof CostCapReached) {
        stoppedByCostCap = true;
        notes.push((e as Error).message);
        break;
      }
      throw e;
    }
  }
  // 3. Enregistrement : le client ne voit que les propositions FINALES ; le reste reste au diagnostic.
  ctx.progress(0.9, L("Propositions", "Proposals"));
  const shown = results.filter((r) => r.verdict === "FINAL");
  const studio = results.filter((r) => r.verdict === "PROVISIONAL");
  const discarded = results.filter((r) => r.verdict !== "FINAL" && r.verdict !== "PROVISIONAL");
  const ids = await ctx.step("v2:save", async () => {
    const out: Record<string, string> = {};
    for (const r of results) {
      const png = await logoPng(r.candidate.spec, 900);
      const a = await saveAsset({
        projectId,
        userId: p.userId,
        data: png,
        name: C(`logo-v2-${r.territory.id}.png`, `logo-v2-${r.territory.id}.png`),
        mime: "image/png",
        // FINAL : proposition ; PROVISIONAL (version du studio, sans relecture IA) : proposée à part, jamais comme finale ;
        // le reste : essai écarté (diagnostic).
        role: r.verdict === "FINAL" ? "logo-v2" : r.verdict === "PROVISIONAL" ? "logo-v2-studio" : "logo-v2-trial",
        folderKey: "brand.logos",
        origin: "generated",
        status: r.verdict === "FINAL" || r.verdict === "PROVISIONAL" ? "review" : "rejected",
        meta: { engine: "logo-v2", run: ctx.job.id, territory: r.territory, spec: r.candidate.spec, change: r.candidate.change, symbolSource: r.candidate.symbolSource, gate: { verdict: r.verdict, score: r.score, reason: r.reason, codes: r.codes, attempts: r.attempts, checkId: r.checkId } },
      });
      out[r.territory.id] = a.id;
    }
    return out;
  });
  for (const r of results) r.assetId = ids[r.territory.id];
  const run: EngineRun = { runId: ctx.job.id, territories: sel.kept, shown, studio, discarded, territoryRejections: sel.rejected, ai: aiState, stoppedByCostCap, notes };
  remember(projectId, { kind: "artifact", key: "logo_v2_run", value: JSON.stringify({ runId: run.runId, at: Date.now(), territories: run.territories.map((t) => ({ id: t.id, name: t.name, markType: t.markType, source: t.source })), shown: shown.map((r) => r.assetId), studio: studio.map((r) => r.assetId), discarded: discarded.map((r) => r.assetId), rejected: sel.rejected, ai: aiState, stoppedByCostCap, notes: notes.slice(0, 20) }), source: ai ? "ai" : "local" });
  return run;
}
