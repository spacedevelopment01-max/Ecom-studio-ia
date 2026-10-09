/**
 * Advertising Engine V2 (phase 6A) — moteur central.
 *
 * INSIGHT → ANGLES différents → TEXTES (local ou IA, une reprise ciblée) → CONTRÔLE DES AFFIRMATIONS → IMAGE
 * (Image Engine V2 : réutilisation, recherche, génération routée, barrière) → COMPOSITION par plateforme (zones de
 * sécurité, typographie de marque, hiérarchie, bouton, produit réel aux pixels d'origine) → BARRIÈRE PUBLICITAIRE
 * (contrôles locaux gratuits, relecture IA sur le format principal seulement) → reprise ciblée (mise en page :
 * gratuite ; accroche : seconde accroche ou réécriture ; visuel : autre image) → BIBLIOTHÈQUE → RÉUTILISATION.
 *
 * Coûts : un seul appel de rédaction pour toute la série (+ une reprise si le contrôle l'exige), une relecture par
 * concept (pas par format), images réutilisées entre formats et entre campagnes ; plafond réel par tâche.
 */
import crypto from "node:crypto";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { aiActiveFor } from "../ai/access";
import { all, json } from "../db";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { gateSave } from "../quality/store";
import { isAutoUsable } from "../quality/usable";
import { POLICIES } from "../quality/policies";
import { saveAsset, type Asset } from "../library";
import { loadProject, type Project } from "../projects";
import { contentLang } from "../i18n-server";
import { EUR } from "../billing";
import { brandTypo, palette } from "../engine/images";
import { localAdStrategy, type AdStrategy } from "../engine/ads";
import type { AspectId } from "../image-v2/types";
import { adInsight } from "./insight";
import { planAngles } from "./angles";
import { copyPrompt, copySystem, localCopy } from "./copy";
import { claimIssues, type ClaimIssue } from "./claims";
import { composeAd } from "./compose";
import { gateAd, localAdChecks } from "./quality";
import { CTAS, defaultPlatforms, formatsFor, strictestText } from "./platforms";
import { realAdDeps, type AdsV2Deps } from "./deps";
import { engineDocKey, latestDoc, saveVersion, userOwned } from "../ad-doc/store";
import type { AdConcept, AdCopy, AdInsight, AdOutcome, AdReview, AnglePlan, FormatSpec, Platform, VisualConcept } from "./types";

export const ADS_V2_VERSION = "6a.1";
export const DEFAULT_AD_CAP_EUR = 3;

export type AdRequestV2 = {
  count?: number;
  platforms?: Platform[];
  objective?: string | null;
  audience?: string | null;
  /** Offre RÉELLE de la campagne (sinon aucune promotion). */
  offer?: string | null;
  maxCostEur?: number;
  /** Textes seulement (fenêtre « Campagne ») : angles, textes contrôlés et plan de test, sans création d'image. */
  copyOnly?: boolean;
};

export type AdRunResult = {
  runId: string;
  insight: AdInsight;
  concepts: (AdConcept & { copyBy: "ai" | "local"; claims: ClaimIssue[] })[];
  outcomes: AdOutcome[];
  strategy: AdStrategy;
  stats: { copyCalls: number; reviews: number; images: number; reused: number; retries: number; layoutChanges: number };
  stoppedByCostCap: boolean;
  costMicro: number;
  notes: string[];
};

/** Mise en page et image selon l'angle (le visuel sert l'idée de l'annonce). */
export function visualFor(a: AnglePlan, i: AdInsight, hasCutout: boolean): VisualConcept {
  const services = i.business === "services";
  if (services) {
    const layout: VisualConcept["layout"] = a.type === "objection" || a.type === "offer" || a.type === "proof" ? "split" : "full_bleed";
    return { kind: "trade_photo", subject: a.material, layout, productOnTop: false };
  }
  const map: Partial<Record<AnglePlan["type"], VisualConcept["layout"]>> = { detail: "hero_center", gift: "hero_center", proof: "typographic", objection: "typographic", offer: "typographic", problem_solution: "split", demonstration: "hero_left", use_case: "full_bleed", origin_craft: "full_bleed" };
  const layout = map[a.type] ?? "hero_left";
  // Le produit réel est posé tel quel sur la création (jamais regénéré) ; sans détourage : visuel d'univers seul.
  return { kind: "ambiance", subject: a.material, layout: !hasCutout && layout === "hero_center" ? "typographic" : layout, productOnTop: hasCutout && layout !== "full_bleed" };
}

const LAYOUTS: VisualConcept["layout"][] = ["hero_left", "split", "full_bleed", "hero_center", "typographic"];
const hash = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);
const orientation = (a: AspectId): AspectId => (a === "1:1" ? "1:1" : a === "16:9" || a === "3:2" || a === "3:1" || a === "4:1" ? "16:9" : "4:5");

export async function runAdEngineV2(ctx: JobContext | null, projectId: string, req: AdRequestV2 = {}, injected?: AdsV2Deps): Promise<AdRunResult> {
  const p = loadProject(projectId);
  const jobId = ctx?.job.id ?? null;
  const deps = injected ?? realAdDeps(ctx, p, aiActiveFor(p.userId));
  const before = jobId ? (all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0) : 0;
  const own = before + Math.round((req.maxCostEur ?? DEFAULT_AD_CAP_EUR) * EUR);
  const cur = currentTrace();
  return withTrace({ ...(jobId ? { jobId } : {}), projectId, ...(cur.intent ? {} : { intent: "CREATE_AD" }), costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, own) : own }, () => engine(ctx, p, req, deps));
}

async function engine(ctx: JobContext | null, p: Project, req: AdRequestV2, deps: AdsV2Deps): Promise<AdRunResult> {
  const lang = contentLang();
  const jobId = ctx?.job.id ?? null;
  const runId = crypto.randomUUID();
  const notes: string[] = [];
  const platforms = req.platforms?.length ? req.platforms : defaultPlatforms(p.business);
  const limits = strictestText(platforms);
  const insight = adInsight(p, { audience: req.audience, offer: req.offer });
  const count = Math.max(1, Math.min(6, req.count ?? 3));
  const { angles, missing } = planAngles(insight, count);
  if (missing) notes.push(`${missing} angle(s) de moins que demandé : pas assez de matière confirmée (rien n'est inventé)`);
  notes.push(...insight.gaps.map((g) => `à compléter : ${g}`));
  const stats = { copyCalls: 0, reviews: 0, images: 0, reused: 0, retries: 0, layoutChanges: 0 };
  const strategy = localAdStrategy(p, lang, { count: angles.length, objective: req.objective ?? undefined, audience: req.audience ?? undefined, networks: platforms.map((x) => (x.startsWith("meta") ? "instagram" : x)) });
  const result: AdRunResult = { runId, insight, concepts: [], outcomes: [], strategy, stats, stoppedByCostCap: false, costMicro: 0, notes };
  if (!angles.length) {
    notes.push("aucun angle possible : complétez les faits du produit ou les prestations");
    return result;
  }

  try {
    // 1. Textes : version locale pour tous, puis IA (un appel pour la série, une reprise ciblée au plus).
    const ctas = CTAS[p.business][lang];
    const local = new Map(angles.map((a) => [a.id, localCopy(insight, a, lang, limits)]));
    const copies = new Map<string, { copy: AdCopy; by: "ai" | "local" }>(angles.map((a) => [a.id, { copy: local.get(a.id)!, by: "local" as const }]));
    const fromAi = (x: { hook: string; hookB?: string; primary: string; headline: string; description: string; cta: string }): AdCopy => ({ hook: x.hook.trim(), hookB: x.hookB?.trim() || null, primary: x.primary.trim(), headline: x.headline.trim(), description: x.description.trim(), cta: ctas.includes(x.cta) ? x.cta : local.get(angles[0].id)!.cta });
    if (deps.canWrite) {
      const sys = copySystem(lang, insight, ctas, limits);
      let feedback: string | undefined;
      let pending = angles;
      for (let round = 0; round < 2 && pending.length; round++) {
        stats.copyCalls++;
        let set;
        try {
          set = await deps.writeCopy(sys, copyPrompt(insight, pending, feedback), `${jobId ?? "ads2"}:ads2:copy:${hash(pending.map((a) => a.id))}:${round}`);
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
          notes.push(`rédaction IA indisponible (${(e as Error).message.slice(0, 80)}) : version locale gardée`);
          break;
        }
        pending.forEach((a, k) => set.ads[k] && copies.set(a.id, { copy: fromAi(set.ads[k]), by: "ai" }));
        const issues = claimIssues(pending.map((a) => ({ id: a.id, copy: copies.get(a.id)!.copy })), p, insight, limits);
        const failing = pending.filter((a) => issues.get(a.id)!.length);
        feedback = failing.map((a) => `Annonce « ${a.type} » : ${issues.get(a.id)!.map((x) => x.fix).join(" ; ")}`).join("\n");
        pending = failing;
      }
      // Ce qui reste fautif après la reprise repasse à la version locale (jamais une affirmation non confirmée).
      for (const a of pending) copies.set(a.id, { copy: local.get(a.id)!, by: "local" });
    }
    const allClaims = claimIssues(angles.map((a) => ({ id: a.id, copy: copies.get(a.id)!.copy })), p, insight, limits);
    const cut = deps.cutout();
    const logo = deps.logo();
    for (const a of angles) result.concepts.push({ id: a.id, angle: a, copy: copies.get(a.id)!.copy, visual: visualFor(a, insight, !!cut), copyBy: copies.get(a.id)!.by, claims: allClaims.get(a.id)! });

    if (req.copyOnly) return result;
    // 2. Créations par concept et par format.
    const pal = palette(p);
    const typo = brandTypo(p);
    const formats = formatsFor(platforms);
    for (const concept of result.concepts) {
      const images = new Map<AspectId, { assetId: string; data: Buffer } | null>();
      let conceptReview: AdReview | null = null;
      let reviewed = false;
      for (const [fi, f] of formats.entries()) {
        const out = await oneFormat({ p, ctx, deps, concept, f, main: fi === 0 || !reviewed, images, pal, typo, logo, cut, insight, limits, stats, prior: conceptReview });
        if (out.review) {
          conceptReview = out.review;
          reviewed = true;
        }
        result.outcomes.push(out.outcome);
      }
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    result.stoppedByCostCap = true;
    notes.push(`arrêt au plafond de dépense : ${e.message}`);
  }
  if (jobId) result.costMicro = all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0;
  return result;
}

/** Création validée existante pour la même empreinte (même concept, même format, même charte) : réutilisée. */
export function reusableAd(projectId: string, h: string): Asset | null {
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'ad' AND deleted_at IS NULL AND status != 'rejected' AND json_extract(meta, '$.adV2.hash') = ? ORDER BY created_at DESC LIMIT 3", projectId, h);
  return rows.find((a) => isAutoUsable(a) && json<any>(a.meta as any, {}).gate?.verdict === "FINAL") ?? null;
}

type OneInput = {
  p: Project;
  ctx: JobContext | null;
  deps: AdsV2Deps;
  concept: AdConcept & { claims: ClaimIssue[] };
  f: FormatSpec;
  main: boolean;
  images: Map<AspectId, { assetId: string; data: Buffer } | null>;
  pal: ReturnType<typeof palette>;
  typo: ReturnType<typeof brandTypo>;
  logo: { id: string; data: Buffer } | null;
  cut: { id: string; data: Buffer } | null;
  insight: AdInsight;
  limits: ReturnType<typeof strictestText>;
  stats: AdRunResult["stats"];
  prior: AdReview | null;
};

async function oneFormat(o: OneInput): Promise<{ outcome: AdOutcome; review: AdReview | null }> {
  const { p, deps, concept, f, stats } = o;
  const jobId = o.ctx?.job.id ?? null;
  const h = hash({ v: ADS_V2_VERSION, c: concept.id, copy: concept.copy, f: `${f.platform}:${f.aspect}`, pal: o.pal, typo: o.typo, layout: concept.visual.layout });
  // Création modifiée par le client (éditeur visuel) : jamais écrasée en silence par une régénération.
  const docKey = engineDocKey(p.id, concept.id, f.platform, f.aspect);
  if (userOwned(p.id, docKey)) {
    const cur = latestDoc(p.id, docKey)!;
    stats.reused++;
    return { outcome: { conceptId: concept.id, platform: f.platform, aspect: f.aspect, verdict: "FINAL", score: null, codes: [], reason: "création modifiée par le client : conservée telle quelle", assetId: cur.version.renderedAssetId, imageAssetId: null, attempts: 0, reused: true }, review: null };
  }
  const prev = reusableAd(p.id, h);
  if (prev) {
    stats.reused++;
    return { outcome: { conceptId: concept.id, platform: f.platform, aspect: f.aspect, verdict: "FINAL", score: null, codes: [], reason: "création validée réutilisée", assetId: prev.id, imageAssetId: json<any>(prev.meta as any, {}).adV2?.imageAssetId ?? null, attempts: 0, reused: true }, review: null };
  }
  let copy = concept.copy;
  let layout = concept.visual.layout;
  let variant = 0;
  let claims = concept.claims;
  let last: { outcome: AdOutcome; review: AdReview | null } | null = null;
  const maxAttempts = POLICIES.ad_v2.maxRetries + 1;
  const tried = new Set<string>();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Image (Image Engine V2) : une par orientation et par variante, réutilisée entre formats.
    const key = `${orientation(f.aspect)}:${variant}` as AspectId;
    if (!o.images.has(key)) {
      stats.images++;
      const services = p.business === "services";
      o.images.set(key, await o.deps.image({ kind: concept.visual.kind, support: "ad", aspect: orientation(f.aspect), topic: concept.visual.subject, variant: variant || null, allowGenerate: true, name: `pub-${concept.angle.type}`, maxControls: 3, ...(services ? {} : {}) }));
    }
    const img = o.images.get(key) ?? null;
    const sig = `${layout}|${copy.hook}|${key}`;
    if (tried.has(sig)) break;
    tried.add(sig);
    const { jpg, metrics, doc } = await composeAd({ format: f, layout: img ? layout : layout === "full_bleed" || layout === "split" || layout === "hero_left" ? "typographic" : layout, palette: o.pal, typo: o.typo, brand: o.insight.brand, headline: copy.hook, cta: copy.cta, background: img?.data ?? null, product: concept.visual.productOnTop ? (o.cut?.data ?? null) : null, logo: o.logo?.data ?? null, ids: { background: img?.assetId ?? null, product: o.cut?.id ?? null, logo: o.logo?.id ?? null }, conceptId: concept.id });
    const local = localAdChecks(metrics, claims, f.platform);
    let review: AdReview | null = null;
    let reviewError: string | null = null;
    if (!local.codes.length && deps.canReview && (o.main || attempt > 0)) {
      stats.reviews++;
      try {
        review = await withCandidate(`ads2:${concept.id}:${f.platform}:${f.aspect}`, attempt, () => deps.review(jpg, `Plateforme : ${f.label}. Accroche : « ${copy.hook} ». Texte : ${copy.primary}\nTitre : ${copy.headline}. Bouton : ${copy.cta}. Marque : ${o.insight.brand}. Audience : ${o.insight.audience.declared ?? "large"}.`, `${jobId ?? "ads2"}:ads2:review:${h}:${attempt}`));
      } catch (e) {
        if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
        reviewError = (e as Error).message;
      }
    } else if (!local.codes.length && o.prior) review = o.prior; // autre format du même concept : relecture du format principal reprise
    const d = gateAd({ local, review, reviewError, attempt });
    const g = gateSave({ userId: p.userId, projectId: p.id, jobId, candidateId: `ads2:${concept.id}:${f.platform}:${f.aspect}` }, d);
    const asset = await saveAsset({
      projectId: p.id,
      userId: p.userId,
      data: jpg,
      name: `pub-${concept.angle.type}-${f.platform}-${f.aspect.replace(":", "x")}${attempt ? `-essai-${attempt + 1}` : ""}.jpg`,
      mime: "image/jpeg",
      role: "ad",
      folderKey: "images.ads",
      origin: "generated",
      sourceAssetId: img?.assetId ?? null,
      status: d.verdict === "REJECTED" ? "rejected" : "review",
      meta: {
        adV2: { version: ADS_V2_VERSION, docKey: d.verdict === "REJECTED" ? null : docKey, hash: d.verdict === "FINAL" ? h : `trial:${h}`, conceptId: concept.id, angle: { type: concept.angle.type, material: concept.angle.material, lever: concept.angle.lever }, copy, platform: f.platform, aspect: f.aspect, layout, imageAssetId: img?.assetId ?? null, metrics, claims: claims.map((c) => c.fix), attempt },
        format: f.aspect,
        text: { headline: copy.hook },
        ...g.meta,
      },
    });
    // Document en calques conservé (éditeur visuel) : version « moteur » de la lignée, jamais pour un essai refusé.
    if (d.verdict !== "REJECTED") saveVersion(p.id, docKey, doc, { note: `moteur — essai ${attempt + 1} (${d.verdict})`, renderedAssetId: asset.id });
    last = { outcome: { conceptId: concept.id, platform: f.platform, aspect: f.aspect, verdict: d.verdict, score: d.score, codes: [...d.fatalCodes, ...d.blockingCodes], reason: d.reason, assetId: asset.id, imageAssetId: img?.assetId ?? null, attempts: attempt + 1, reused: false }, review };
    if (d.verdict !== "RETRY" || d.action !== "regenerate" || !d.checked) break;
    // Reprise ciblée : la cause décide de la correction (mise en page gratuite d'abord).
    stats.retries++;
    const codes = [...d.blockingCodes];
    const target = review?.fix.target ?? (codes.some((c) => c === "illegible" || c === "safe_zone" || c === "product_overlap" || c === "too_much_text") ? "layout" : codes.some((c) => c === "unverified_claim" || c === "copy_policy") ? "copy" : "visual");
    if (target === "layout") {
      layout = LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length];
      stats.layoutChanges++;
    } else if (target === "hook" || target === "copy" || target === "cta") {
      // Seconde accroche du concept (déjà écrite, gratuite) ; sinon version locale contrôlée.
      const next = copy.hookB && copy.hookB !== copy.hook ? { ...copy, hook: copy.hookB, hookB: null } : localCopy(o.insight, concept.angle, contentLang(), o.limits);
      if (next.hook === copy.hook && next.primary === copy.primary) break;
      copy = next;
      claims = claimIssues([{ id: concept.id, copy }], p, o.insight, o.limits).get(concept.id)!;
    } else variant++;
  }
  return last!;
}
