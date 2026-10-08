/**
 * Image & Search Engine V2 (phase 5A) — moteur central.
 *
 * PROJECT BRAIN → VISUAL INTENT → ART DIRECTION → SEARCH OR GENERATION → QUALITY GATE → SELECTION → ASSET LIBRARY → REUSE
 *
 *  - réutilisation d'abord : une image FINAL faite pour le même brief n'est ni recherchée ni regénérée ;
 *  - recherche dans les banques (gratuite) avant toute génération payante, pour les intentions qui s'y prêtent ;
 *    jamais pour une image du produit réel ;
 *  - seuls les meilleurs candidats sont contrôlés ; un candidat déjà refusé pour ce brief n'est ni retéléchargé ni
 *    recontrôlé ;
 *  - génération routée (Router V2), avec reprises CIBLÉES et limitées (jamais deux fois la même consigne) ; un produit
 *    transformé arrête la transformation (la photo d'origine reste la référence) ; une scène hors sujet change de
 *    direction artistique ;
 *  - plafond de dépense réel par tâche (vérifié avant chaque appel payant) ;
 *  - chaque essai laisse une trace : verdict (quality_checks), candidat (image_candidates), coût (ai_calls).
 */
import crypto from "node:crypto";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { aiActiveFor } from "../ai/access";
import { all } from "../db";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { brainSnapshot } from "../brain/snapshot";
import { gateSave, saveCheck } from "../quality/store";
import type { GateDecision } from "../quality/gate";
import { POLICIES } from "../quality/policies";
import { loadProject, type Project } from "../projects";
import { validCutouts } from "../engine/cutouts";
import { EUR } from "../billing";
import { buildBrief, briefHash, generationPrompt, type BriefRequest } from "./brief";
import { rejectedDirections } from "./direction";
import { frameTo } from "./formats";
import { PRODUCT_KINDS, stagesFor } from "./intent";
import { gateImage, localImageCheck } from "./quality";
import { candidateKey, searchCandidates, shortlist, type SearchStats } from "./search";
import { creditLine } from "./sources";
import { memoOf, projectHashes, rejectedKeys, remember, reusableFor, saveImageV2, usedStockKeys, briefSummary } from "./assets";
import { realImageDeps, type ImageV2Deps } from "./deps";
import type { ArtDirectionId, ImageOutcome, ImageReview, VisualBrief } from "./types";

export const IMAGE_V2_VERSION = "5a.1";

export type ImageRequestV2 = BriefRequest & {
  /** Nombre d'images (série diversifiée) ; 1 par défaut. */
  count?: number;
  /** Génération permise en dernier recours (sinon recherche seule). */
  allowGenerate?: boolean;
  /** Plafond de dépense RÉEL de la tâche, en euros (vérifié avant chaque appel payant). */
  maxCostEur?: number;
  /** Emplacement du site (meta.slot) et nom de fichier. */
  slot?: string | null;
  name?: string;
  /** Contrôles payants au plus par image voulue (photos de banque). */
  maxControls?: number;
};

export type ImageRunResult = {
  runId: string;
  outcomes: (ImageOutcome & { brief: ReturnType<typeof briefSummary>; artDirection: ArtDirectionId })[];
  search: SearchStats[];
  stats: { reused: number; candidatesSeen: number; controls: number; controlsSkippedByMemo: number; generations: number; retries: number; directionChanges: number };
  stoppedByCostCap: boolean;
  costMicro: number;
  notes: string[];
};

/** Plafond par défaut d'une tâche d'images (euros) quand le module n'en donne pas. */
export const DEFAULT_IMAGE_CAP_EUR = 2;

type Plan = { action: "regenerate" | "change_direction" | "abandon" | "stop"; instruction: string | null };

/** Correction ciblée à partir du verdict et de la relecture : jamais une reprise « à l'aveugle ». */
export function targetedCorrection(d: GateDecision, r: ImageReview | null, brief: VisualBrief): Plan {
  const codes = [...d.fatalCodes, ...d.blockingCodes];
  if (brief.productFidelity && (codes.includes("product_altered") || codes.includes("wrong_product") || r?.fix.target === "product"))
    return { action: "abandon", instruction: "produit transformé : la transformation est abandonnée, la photo d'origine (détourage) reste la référence" };
  if (codes.includes("off_topic") || r?.fix.target === "direction") return { action: "change_direction", instruction: r?.fix.instruction || "scène hors sujet : changer de direction artistique" };
  if (d.verdict !== "RETRY" || d.action !== "regenerate") return { action: "stop", instruction: null };
  const target = r?.fix.target ?? "none";
  const map: Record<string, string> = {
    lighting: "corriger l'éclairage",
    composition: "ajuster la composition",
    background: "remplacer le fond",
    crop: "recadrer pour le format demandé",
  };
  const instruction = [map[target], r?.fix.instruction, d.feedback].filter(Boolean).join(" — ");
  return instruction ? { action: "regenerate", instruction } : { action: "stop", instruction: null };
}

const hash = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);

export async function runImageEngineV2(ctx: JobContext | null, projectId: string, req: ImageRequestV2, injected?: ImageV2Deps): Promise<ImageRunResult> {
  const p = loadProject(projectId);
  const jobId = ctx?.job.id ?? null;
  const aiActive = aiActiveFor(p.userId);
  const deps = injected ?? realImageDeps(p, { jobId, aiActive });
  // Plafond de CETTE tâche d'images : ce que la tâche de fond a déjà dépensé avant (autres étapes d'un plan) n'est pas
  // compté contre lui. Un plafond plus strict déjà posé par l'appelant (benchmark) est conservé.
  const before = jobId ? (all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0) : 0;
  const own = before + Math.round((req.maxCostEur ?? DEFAULT_IMAGE_CAP_EUR) * EUR);
  const cur = currentTrace();
  const capMicro = cur.costCapMicro != null ? Math.min(cur.costCapMicro, own) : own;
  const run = () => engine(ctx, p, req, deps);
  return withTrace({ ...(jobId ? { jobId } : {}), projectId, ...(cur.intent ? {} : { intent: PRODUCT_KINDS.includes(req.kind) ? "GENERATE_IMAGE" : "FIND_STOCK_IMAGE" }), costCapMicro: capMicro }, run);
}

async function engine(ctx: JobContext | null, p: Project, req: ImageRequestV2, deps: ImageV2Deps): Promise<ImageRunResult> {
  const runId = crypto.randomUUID();
  const jobId = ctx?.job.id ?? null;
  const notes: string[] = [];
  const result: ImageRunResult = { runId, outcomes: [], search: [], stats: { reused: 0, candidatesSeen: 0, controls: 0, controlsSkippedByMemo: 0, generations: 0, retries: 0, directionChanges: 0 }, stoppedByCostCap: false, costMicro: 0, notes };
  const memory = brainSnapshot(p).memory;
  const rejectedDirs = rejectedDirections(memory);
  const stages = stagesFor(req.kind);
  const count = Math.max(1, Math.min(8, req.count ?? 1));
  const seriesHashes: string[] = [];
  // Détourage valide du produit (référence obligatoire pour toute image du produit).
  const refs = req.references ?? (PRODUCT_KINDS.includes(req.kind) && p.business === "products" ? validCutouts(p.id).slice(0, 1).map((a) => a.id) : []);
  const refsUsed = refs.length ? refs : undefined;

  try {
    for (let i = 0; i < count; i++) {
      let brief = buildBrief(p, { ...req, references: refsUsed, variant: count > 1 ? i : (req.variant ?? null) }, { rejectedDirections: rejectedDirs });
      const out = await one(ctx, p, req, deps, brief, stages, seriesHashes, result);
      if (out.outcome.verdict === "REJECTED" && out.changeDirection && stages.includes("generate")) {
        // Scène hors sujet : une seule nouvelle direction, choisie localement (refus de celle-ci ajouté).
        result.stats.directionChanges++;
        brief = buildBrief(p, { ...req, references: refsUsed, variant: count > 1 ? i : (req.variant ?? null) }, { rejectedDirections: [...rejectedDirs, brief.artDirection] });
        notes.push(`image ${i + 1} : direction changée (${out.outcome.reason})`);
        const second = await one(ctx, p, req, deps, brief, stages.filter((s) => s !== "search" && s !== "reuse"), seriesHashes, result);
        result.outcomes.push({ ...second.outcome, brief: briefSummary(brief), artDirection: brief.artDirection });
      } else result.outcomes.push({ ...out.outcome, brief: briefSummary(brief), artDirection: brief.artDirection });
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    result.stoppedByCostCap = true;
    notes.push(`arrêt au plafond de dépense : ${e.message}`);
  }
  if (jobId) result.costMicro = all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0;
  return result;
}

/** Une image : réutilisation → recherche → génération (avec reprises ciblées). */
async function one(ctx: JobContext | null, p: Project, req: ImageRequestV2, deps: ImageV2Deps, brief: VisualBrief, stages: ReturnType<typeof stagesFor>, seriesHashes: string[], result: ImageRunResult): Promise<{ outcome: ImageOutcome; changeDirection: boolean }> {
  const bh = briefHash(brief);
  const jobId = ctx?.job.id ?? null;
  const base = { userId: p.userId, projectId: p.id, jobId };
  const none = (reason: string, extra: Partial<ImageOutcome> = {}): ImageOutcome => ({ briefHash: bh, verdict: "REJECTED", score: null, codes: [], reason, origin: "none", assetId: null, attempts: 0, candidateKey: null, ...extra });

  // 1. Réutilisation : même brief, image FINAL, réutilisable automatiquement.
  if (stages.includes("reuse")) {
    const prev = reusableFor(p.id, bh);
    if (prev) {
      result.stats.reused++;
      seriesHashes.push(String((JSON.parse(prev.meta || "{}") as any).imageV2?.phash ?? ""));
      return { outcome: { briefHash: bh, verdict: "FINAL", score: null, codes: [], reason: "image FINAL réutilisée (même brief)", origin: "reused", assetId: prev.id, attempts: 0, candidateKey: null }, changeDirection: false };
    }
  }
  const projectH = projectHashes(p.id);
  let lastReason = "aucune image retenue";

  // 2. Recherche (banques d'images).
  if (stages.includes("search") && brief.queries.length) {
    const exclude = new Set([...usedStockKeys(p.id), ...rejectedKeys(p.id, bh)]);
    const { ranked, stats } = await searchCandidates(brief, deps.providers, { exclude, fallbackFr: p.business === "services" ? (p.product.category || null) : null });
    result.search.push(stats);
    result.stats.candidatesSeen += ranked.length;
    for (const c of shortlist(ranked, deps.canReview, req.maxControls ?? 4)) {
      const key = candidateKey(c);
      const memo = memoOf(p.id, key, bh);
      if (memo && memo.verdict === "REJECTED") {
        result.stats.controlsSkippedByMemo++;
        continue;
      }
      let raw: Buffer;
      try {
        raw = await deps.download(c);
      } catch {
        remember(p.id, key, "*", { verdict: "REJECTED", codes: ["corrupt"] });
        continue;
      }
      const img = await frameTo(raw, brief.format.aspect);
      if (!img) {
        remember(p.id, key, bh, { verdict: "REJECTED", codes: ["bad_crop"] });
        continue;
      }
      const local = await localImageCheck(img, brief, [...projectH, ...seriesHashes]);
      let review: ImageReview | null = null;
      let reviewError: string | null = null;
      if (local.ok && deps.canReview) {
        result.stats.controls++;
        try {
          review = await withCandidate(`img2:${bh}:${key}`, 0, () => deps.review(brief, img, null, `${jobId ?? "img2"}:img2:review:${bh}:${key}`, "stock"));
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
          reviewError = (e as Error).message;
        }
      }
      const d = gateImage({ brief, origin: "stock", local, review, reviewError, metadataMatch: c.metadataMatch, attempt: 0 });
      const usable = d.verdict === "FINAL" || (d.verdict === "PROVISIONAL" && d.provisional?.use === "auto");
      if (!usable) {
        const checkId = saveCheck(d, { ...base, candidateId: key });
        // Contrôle en panne : rien n'est mémorisé (il pourra être refait) ; sinon le refus est retenu pour ce brief.
        if (d.checked) remember(p.id, key, bh, { verdict: d.verdict === "RETRY" ? "REJECTED" : d.verdict, score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], check_id: checkId, phash: local.hash });
        lastReason = d.reason;
        continue;
      }
      const g = gateSave({ ...base, candidateId: key }, d);
      const asset = await saveImageV2({
        projectId: p.id,
        userId: p.userId,
        img,
        name: `${req.name ?? `${brief.kind}-${(brief.variant?.index ?? 0) + 1}`}.jpg`,
        business: p.business,
        brief,
        meta: { version: IMAGE_V2_VERSION, origin: "stock", provider: c.source, model: null, briefHash: bh, brief: briefSummary(brief), score: d.score, verdict: d.verdict, codes: [], license: c.license, productRef: null, corrections: [], phash: local.hash, attempts: 1 },
        gate: g,
        stock: { source: c.source, id: c.id, page: c.page, author: c.author, license: c.license.name },
        recipe: creditLine(c),
        status: "review",
        slot: req.slot ?? null,
        service: req.service?.name ?? null,
      });
      remember(p.id, key, bh, { verdict: d.verdict, score: d.score, check_id: g.meta.gate.checkId, asset_id: asset.id, phash: local.hash });
      seriesHashes.push(local.hash);
      return { outcome: { briefHash: bh, verdict: d.verdict, score: d.score, codes: [], reason: d.reason, origin: "stock", assetId: asset.id, attempts: 1, candidateKey: key }, changeDirection: false };
    }
  }

  // 3. Génération (dernier recours pour le métier ; seul parcours pour le produit réel).
  if (!stages.includes("generate") || req.allowGenerate === false) return { outcome: none(lastReason), changeDirection: false };
  if (!deps.canGenerate) return { outcome: none(`${lastReason} ; génération non disponible (forfait ou fournisseur)`), changeDirection: false };
  const path = deps.path(brief);
  if (path === "none") return { outcome: none(brief.productFidelity ? "aucune image du produit sans photo de référence détourée et un parcours fidèle (aucun produit inventé)" : "aucun fournisseur d'images disponible"), changeDirection: false };
  const reference = brief.references[0] ? deps.reference(brief.references[0]) : null;
  if (brief.productFidelity && !reference) return { outcome: none("photo de référence du produit introuvable"), changeDirection: false };

  const maxAttempts = POLICIES.image_v2.maxRetries + 1;
  const prompts = new Set<string>();
  const corrections: string[] = [];
  let correction: string | null = null;
  let last: ImageOutcome = none(lastReason);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prompt = generationPrompt(brief, correction);
    const ph = hash(prompt);
    // Jamais deux fois la même consigne (une reprise identique ne changerait rien, et se paierait).
    if (prompts.has(ph) || memoOf(p.id, `gen:${ph}`, bh)?.verdict === "REJECTED") break;
    prompts.add(ph);
    const key = `${jobId ?? "img2"}:img2:gen:${bh}:${attempt}:${ph}`;
    result.stats.generations++;
    if (attempt > 0) result.stats.retries++;
    const gen = await withCandidate(`img2:${bh}`, attempt, () => deps.generate(brief, prompt, reference, key));
    const img = (await frameTo(gen.img, brief.format.aspect)) ?? gen.img;
    const local = await localImageCheck(img, brief, [...projectH, ...seriesHashes]);
    let review: ImageReview | null = null;
    let reviewError: string | null = null;
    if (local.ok && deps.canReview) {
      result.stats.controls++;
      try {
        review = await withCandidate(`img2:${bh}`, attempt, () => deps.review(brief, img, reference, `${key}:review`, "generated"));
      } catch (e) {
        if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
        reviewError = (e as Error).message;
      }
    }
    const d = gateImage({ brief, origin: "generated", local, review, reviewError, attempt });
    const g = gateSave({ ...base, candidateId: `img2:${bh}` }, d);
    const plan = targetedCorrection(d, review, brief);
    // Image payée : gardée (refusée ou à vérifier) pour le diagnostic ; seule une FINAL est réutilisable automatiquement.
    const asset = await saveImageV2({
      projectId: p.id,
      userId: p.userId,
      img,
      name: `${req.name ?? `${brief.kind}-${(brief.variant?.index ?? 0) + 1}`}${attempt ? `-essai-${attempt + 1}` : ""}.jpg`,
      business: p.business,
      brief,
      meta: { version: IMAGE_V2_VERSION, origin: brief.productFidelity ? "edited" : "generated", provider: gen.provider, model: gen.model, briefHash: d.verdict === "FINAL" ? bh : `trial:${bh}`, brief: briefSummary(brief), score: d.score, verdict: d.verdict, codes: [...d.fatalCodes, ...d.blockingCodes], license: null, productRef: brief.references[0] ?? null, corrections: [...corrections], phash: local.hash, attempts: attempt + 1 },
      gate: g,
      status: d.verdict === "FINAL" ? "review" : "rejected",
      slot: req.slot ?? null,
      service: req.service?.name ?? null,
      sourceAssetId: brief.references[0] ?? null,
    });
    remember(p.id, `gen:${ph}`, bh, { verdict: d.verdict === "FINAL" ? "FINAL" : "REJECTED", score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], check_id: g.meta.gate.checkId, asset_id: asset.id, phash: local.hash });
    last = { briefHash: bh, verdict: d.verdict, score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], reason: d.reason, origin: "generated", assetId: d.verdict === "FINAL" ? asset.id : null, attempts: attempt + 1, candidateKey: `gen:${ph}` };
    if (d.verdict === "FINAL") {
      seriesHashes.push(local.hash);
      return { outcome: last, changeDirection: false };
    }
    if (plan.action === "abandon") return { outcome: { ...last, verdict: "REJECTED", reason: plan.instruction ?? d.reason }, changeDirection: false };
    if (plan.action === "change_direction") return { outcome: { ...last, verdict: "REJECTED" }, changeDirection: true };
    if (plan.action !== "regenerate" || !plan.instruction) break;
    // Contrôle en panne : on ne repaie pas une image pour refaire un contrôle.
    if (!d.checked) break;
    correction = plan.instruction;
    corrections.push(plan.instruction);
  }
  return { outcome: { ...last, verdict: last.verdict === "FINAL" ? "FINAL" : last.verdict === "PROVISIONAL" ? "PROVISIONAL" : "REJECTED" }, changeDirection: false };
}
