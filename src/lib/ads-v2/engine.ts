import { withCommunicationStrategy, withStrategyScope, strategyReuseKey } from "../strategy-consumption";
import { assertAdvertising } from "../job-entitlements";
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
import { all, json, one, run } from "../db";
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
import { composeAd, type ComposeInput } from "./compose";
import { HERO_TEMPLATES } from "./library";
import { planDirections, templateFor } from "./direction";
import { confirmedFeatures } from "./poster";
import { ownScenePhotos } from "../engine/images";
import { assetData, getAsset } from "../library";
import { dHash, hamming } from "../image-v2/quality";

/** Distance minimale (dHash, 64 bits) entre deux publicités d'une campagne pour les dire différentes. */
const DIVERSITY_MIN = 10;
import { adArt, layoutForConcept, textZoneFor, toAdLayout, treatmentsFor, type AdArt, type LogoPlacement } from "./art";
import { gateAd, localAdChecks } from "./quality";
import { peopleAllowedFor } from "../people-policy";
import { CTAS, defaultPlatforms, formatsFor, strictestText } from "./platforms";
import { realAdDeps, type AdsV2Deps } from "./deps";
import { engineDocKey, latestDoc, saveVersion, userOwned } from "../ad-doc/store";
import type { AdConcept, AdCopy, AdInsight, AdOutcome, AdReview, AnglePlan, FormatSpec, Platform, VisualConcept } from "./types";
import { projectRights } from "../plan-gates";

export const ADS_V2_VERSION = "7.1";
export const DEFAULT_AD_CAP_EUR = 3;
/** Note à partir de laquelle une création sans défaut rédhibitoire est gardée « à améliorer » plutôt que refusée. */
export const AD_KEEP_FLOOR = 6;

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
  /** Formats voulus par le client (ex. ["4:5"]) parmi ceux des plateformes ; absent : tous. */
  aspects?: string[];
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
  /** Paires de publicités trop proches (rendus réels comparés), vide quand la campagne est variée. */
  diversity: { a: string; b: string; distance: number }[];
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
const orientation = (a: AspectId): AspectId => (a === "1:1" ? "1:1" : a === "16:9" || a === "1.91:1" || a === "3:2" || a === "3:1" || a === "4:1" ? "16:9" : "4:5");

export async function runAdEngineV2(ctx: JobContext | null, projectId: string, req: AdRequestV2 = {}, injected?: AdsV2Deps): Promise<AdRunResult> {
  return withCommunicationStrategy(projectId, () => runAdEngineV2InScope(ctx, projectId, req, injected));
}

async function runAdEngineV2InScope(ctx: JobContext | null, projectId: string, req: AdRequestV2 = {}, injected?: AdsV2Deps): Promise<AdRunResult> {
  assertAdvertising(projectId);
  const p = loadProject(projectId);
  const jobId = ctx?.job.id ?? null;
  const deps = injected ?? realAdDeps(ctx, p, aiActiveFor(p.userId, p.id));
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
  // Variantes selon le forfait du projet : essentielles (1 annonce), avancées (jusqu'à 3), complètes (jusqu'à 6).
  const rights = projectRights(p.id);
  // (Sans forfait : aucun appel payant possible, la limite ne change rien aux droits.)
  const maxVariants = !rights || rights.ads === "full" ? 6 : rights.ads === "advanced" ? 3 : 1;
  const count = Math.max(1, Math.min(maxVariants, req.count ?? 3));
  const { angles, missing } = planAngles(insight, count);
  if (missing) notes.push(`${missing} angle(s) de moins que demandé : pas assez de matière confirmée (rien n'est inventé)`);
  notes.push(...insight.gaps.map((g) => `à compléter : ${g}`));
  const stats = { copyCalls: 0, reviews: 0, images: 0, reused: 0, retries: 0, layoutChanges: 0 };
  const strategy = localAdStrategy(p, lang, { count: angles.length, objective: req.objective ?? undefined, audience: req.audience ?? undefined, networks: platforms.map((x) => (x.startsWith("meta") ? "instagram" : x)) });
  const result: AdRunResult = { runId, insight, concepts: [], outcomes: [], strategy, stats, stoppedByCostCap: false, costMicro: 0, notes, diversity: [] };
  if (!angles.length) {
    notes.push("aucun angle possible : complétez les faits du produit ou les prestations");
    return result;
  }

  try {
    // 1. Textes : version locale pour tous, puis IA (un appel pour la série, une reprise ciblée au plus).
    const ctas = CTAS[p.business][lang];
    const local = new Map(angles.map((a) => [a.id, localCopy(insight, a, lang, limits)]));
    const copies = new Map<string, { copy: AdCopy; by: "ai" | "local" }>(angles.map((a) => [a.id, { copy: local.get(a.id)!, by: "local" as const }]));
    const fromAi = (x: { hook: string; hookB?: string; primary: string; headline: string; description: string; cta: string; sub?: string; visual?: string }): AdCopy => ({ hook: x.hook.trim(), hookB: x.hookB?.trim() || null, primary: x.primary.trim(), headline: x.headline.trim(), description: x.description.trim(), cta: ctas.includes(x.cta) ? x.cta : local.get(angles[0].id)!.cta, sub: x.sub?.trim() || null, visual: x.visual?.trim() || null });
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
    const logoLight = deps.logoLight?.() ?? null;
    const pal = palette(p);
    const typo = brandTypo(p);
    // Direction artistique du projet : chaque création de la campagne a sa propre composition.
    const art = adArt(p, typo);
    // Direction artistique par publicité (V3) : un concept différent pour chaque angle (prise de vue, mise en page).
    const feats = confirmedFeatures(p);
    const dirs = planDirections(angles, p.business, feats.length >= 2);
    const taken = new Set<string>();
    const fr = lang === "fr";
    angles.forEach((a, k) => {
      const v = visualFor(a, insight, !!cut);
      const d = dirs[k];
      const direction = { id: d.id, name: fr ? d.name.fr : d.name.en, objective: fr ? d.objective.fr : d.objective.en, layout: templateFor(d, taken, feats.length >= 2), shot: d.shot, textZone: d.textZone, templates: d.templates.map((t) => `tpl:${t}`) };
      result.concepts.push({ id: a.id, angle: a, copy: copies.get(a.id)!.copy, visual: { ...v, layout: layoutForConcept(art, k) }, direction, copyBy: copies.get(a.id)!.by, claims: allClaims.get(a.id)! });
    });
    const ownPhotos = p.business === "products" && !cut ? ownScenePhotos(p.id) : [];
    // Référence des photos publicitaires générées quand le produit n'est montré que sur les photos du client : le
    // produit seul, recadré dans la première photo (jamais la photo entière, où il n'est qu'un détail).
    const refId = ownPhotos[0] && deps.canGenerate && !req.copyOnly ? await deps.productReference?.(ownPhotos[0].id).catch(() => null) ?? null : null;
    const renders: { id: string; angle: string; hash: string; layout: string | null }[] = [];

    if (req.copyOnly) return result;
    // 2. Créations par concept et par format.
    const all = formatsFor(platforms);
    const wanted = req.aspects?.length ? all.filter((f) => req.aspects!.includes(f.aspect)) : all;
    const formats = wanted.length ? wanted : all;
    for (const [ci, concept] of result.concepts.entries()) {
      const images = new Map<AspectId, { assetId: string; data: Buffer; withProduct: boolean } | null>();
      // Produit montré seulement sur les photos du client (en situation, rien à détourer) : une photo ENTIÈRE par
      // concept, la même dans tous les formats du concept.
      // Avec l'IA d'images : chaque concept a sa propre photo publicitaire, générée à partir de la vraie photo du
      // produit (référence) ; le concept « mise en situation » garde la photo entière du client.
      // Une seule publicité demandée : la photo générée (le produit seul, en scène) plutôt que la photo d'origine.
      const own = ownPhotos.length && (!deps.canGenerate || (concept.direction?.id === "lifestyle" && result.concepts.length > 1)) ? ownPhotos[ci % ownPhotos.length] : null;
      if (own) for (const a of ["1:1", "4:5", "16:9"]) for (const v of [0, 1, 2]) images.set(`${a}:${v}` as AspectId, { assetId: own.id, data: assetData(own), withProduct: true });
      let conceptReview: AdReview | null = null;
      let reviewed = false;
      for (const [fi, f] of formats.entries()) {
        const out = await oneFormat({ p, ctx, deps, concept, f, main: fi === 0 || !reviewed, images, pal, typo, art, logo, logoLight, cut, refPhoto: ownPhotos[0] ?? null, refId, insight, limits, stats, prior: conceptReview, features: feats, maxCostEur:Math.max(0,((currentTrace().costCapMicro ?? (req.maxCostEur ?? DEFAULT_AD_CAP_EUR)*EUR)-(jobId?one<{c:number}>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE job_id=?",jobId)?.c ?? 0:0))/EUR) });
        if (out.review) {
          conceptReview = out.review;
          reviewed = true;
        }
        result.outcomes.push(out.outcome);
        // Diversité contrôlée sur les rendus réels (format principal) : une publicité trop proche d'une autre de la
        // campagne (même composition sur une image quasi identique) est signalée, jamais livrée comme « différente ».
        if (fi === 0 && out.outcome.assetId) {
          const a = one<Asset>("SELECT * FROM assets WHERE id = ?", out.outcome.assetId);
          if (a) {
            const hsh = await dHash(assetData(a));
            const twin = renders.find((r) => hamming(r.hash, hsh) <= 6 || (hamming(r.hash, hsh) <= DIVERSITY_MIN && r.layout === (concept.direction?.layout ?? null)));
            if (twin) {
              notes.push(`publicité « ${concept.angle.type} » trop proche de « ${twin.angle} » (même composition sur une image quasi identique)`);
              result.diversity.push({ a: twin.id, b: concept.id, distance: hamming(twin.hash, hsh) });
            }
            renders.push({ id: concept.id, angle: concept.angle.type, hash: hsh, layout: concept.direction?.layout ?? null });
          }
        }
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

/**
 * Ligne secondaire de la création : celle du rédacteur (contrôlée), sinon des faits confirmés du projet
 * (prestations réelles, catégorie, titre court) — jamais une promesse.
 */
/** Traitement de la photo et place du logo d'une création (stables pour un concept, différents d'un concept à l'autre). */
function adVariant(art: AdArt, layout: ReturnType<typeof toAdLayout>, conceptId: string) {
  const n = [...conceptId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const ts = treatmentsFor(layout, art.style);
  const logos: LogoPlacement[] = ["column", "corner", "foot"];
  return { treatment: ts[n % ts.length], logo: logos[Math.floor(n / 7) % 3] };
}

export function sublineFor(i: AdInsight, copy: AdCopy): string | null {
  if (copy.sub?.trim() && !/\[(À|A) compléter/i.test(copy.sub)) return copy.sub.trim();
  if (i.business === "services" && i.services.length) {
    const heads = i.services.map((s) => s.name.split(/\s+(?:et|and|&)\s+|,/i)[0].trim()).filter(Boolean).slice(0, 3);
    const line = heads.join(" • ");
    if (line.length <= 48) return line;
  }
  const head = copy.headline?.trim();
  if (head && head.length <= 44 && head.toLowerCase() !== copy.hook.trim().toLowerCase()) return head;
  return i.category.label && i.category.label.length <= 44 ? i.category.label.charAt(0).toUpperCase() + i.category.label.slice(1) : null;
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
  maxCostEur?: number;
  images: Map<AspectId, { assetId: string; data: Buffer; withProduct: boolean } | null>;
  pal: ReturnType<typeof palette>;
  typo: ReturnType<typeof brandTypo>;
  art: AdArt;
  logo: { id: string; data: Buffer } | null;
  logoLight: { id: string; data: Buffer } | null;
  cut: { id: string; data: Buffer } | null;
  /** Photo du client montrant le produit (sans détourage) : référence de la photo publicitaire générée. */
  refPhoto: Asset | null;
  /** Produit recadré dans cette photo (référence de la génération), null si non repéré. */
  refId?: string | null;
  insight: AdInsight;
  limits: ReturnType<typeof strictestText>;
  stats: AdRunResult["stats"];
  prior: AdReview | null;
  features: string[];
};

async function oneFormat(o: OneInput): Promise<{ outcome: AdOutcome; review: AdReview | null }> {
  const { p, deps, concept, f, stats } = o;
  const jobId = o.ctx?.job.id ?? null;
  const h = hash({ marketingStrategy: strategyReuseKey(p.id), policy:"campaign-2", identity:p.brand, strategy:p.strategy, v: ADS_V2_VERSION, c: concept.id, copy: concept.copy, f: `${f.platform}:${f.aspect}`, pal: o.pal, typo: o.typo, layout: concept.visual.layout, dir: concept.direction ? `${concept.direction.id}:${concept.direction.layout}` : null, art: o.art.style, gen: !!deps.canGenerate });
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
  // Publicité finale créée ENTIÈREMENT par l'IA (branchement réel) : jamais une composition de gabarit. Bloquée
  // (IA indisponible, budget, essais refusés) : aucune création, la raison est dite.
  if (deps.finalAd) {
    const aspect = f.aspect;
    const r = await deps.finalAd({ conceptId: concept.id, confirmedOffer:o.insight.offer, campaignContext:JSON.stringify({insight:o.insight,angle:concept.angle,direction:concept.direction,copy:concept.copy,visual:concept.visual,audience:o.insight.audience,platform:f}), platform:f.platform, copyApproved:(concept as AdConcept & {copyBy?:string}).copyBy==="ai", angle: concept.angle.type, hook: concept.copy.hook, cta: concept.copy.cta, subject: [concept.visual.subject, concept.copy.visual].filter(Boolean).join(" — "), aspect, maxCostEur: o.maxCostEur ?? DEFAULT_AD_CAP_EUR });
    stats.images++;
    if (r.assetId) run("UPDATE assets SET meta = json_set(meta, '$.adV2', json(?)) WHERE id = ?", JSON.stringify({ version: ADS_V2_VERSION, hash: h, conceptId: concept.id, angle: { type: concept.angle.type, material: concept.angle.material, lever: concept.angle.lever }, copy: concept.copy, platform: f.platform, aspect: f.aspect, layout: "ai", aiFinal: true }), r.assetId);
    return { outcome: { conceptId: concept.id, platform: f.platform, aspect: f.aspect, verdict: r.assetId ? "PROVISIONAL" : "REJECTED", score: null, codes: r.assetId ? [] : ["ai_blocked"], reason: r.assetId ? "publicité entièrement créée par l'IA, contrôlée (textes, produit, logo)" : r.reason ?? "publicité IA non créée", assetId: r.assetId, imageAssetId: null, attempts: 1, reused: false }, review: null };
  }
  let copy = concept.copy;
  let layout = concept.visual.layout;
  let dirLayout: string | null = null;
  let variant = 0;
  let claims = concept.claims;
  let last: { outcome: AdOutcome; review: AdReview | null } | null = null;
  const maxAttempts = POLICIES.ad_v2.maxRetries + 1;
  const tried = new Set<string>();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Image (Image Engine V2) : une par orientation et par variante, réutilisée entre formats.
    const key = `${orientation(f.aspect)}:${variant}` as AspectId;
    // Photo générée (payée) pour ce concept dans un autre format : la même photo sert à tous ses formats, recadrée sur
    // le produit par la mise en page — jamais une nouvelle image payée pour un autre format.
    if (!o.images.has(key)) {
      const paid = [...o.images.entries()].find(([k, v]) => k.endsWith(`:${variant}`) && v && getAsset(v.assetId)?.origin === "generated");
      if (paid) o.images.set(key, paid[1]);
    }
    if (!o.images.has(key)) {
      stats.images++;
      const aspect = orientation(f.aspect);
      const fmt = { "1:1": [1080, 1080], "16:9": [1920, 1080] }[aspect as string] ?? [1080, 1350];
      const textZone = textZoneFor(toAdLayout(layout), fmt[0], fmt[1]);
      const topic = [concept.visual.subject, copy.visual].filter(Boolean).join(" — ").slice(0, 300);
      const dir = concept.direction;
      const common = { support: "ad" as const, aspect, topic, variant: variant || null, allowGenerate: true, noStock: true /* règle du propriétaire : jamais une photo libre de droits dans une publicité */, name: `pub-${concept.angle.type}`, maxControls: 3, textZone: dir?.textZone ?? textZone, ...(dir ? { shot: dir.shot } : {}) };
      // Produit : d'abord une vraie mise en scène publicitaire AVEC le produit réel (photo de référence, pixels
      // d'origine remis par-dessus) ; à défaut, un décor d'univers et le détourage posé par la composition.
      let got: { assetId: string; data: Buffer; withProduct: boolean } | null = null;
      const ref = o.cut?.id ?? (deps.canGenerate ? (o.refId ?? undefined) : undefined);
      if (p.business === "products" && ref) {
        const scene = await o.deps.image({ ...common, kind: "lifestyle", references: [ref] });
        if (scene) got = { ...scene, withProduct: true };
      }
      // Génération impossible ou refusée : la photo entière du client (jamais un produit inventé).
      if (!got && !o.cut && o.refPhoto && p.business === "products") got = { assetId: o.refPhoto.id, data: assetData(o.refPhoto), withProduct: true };
      // Jamais de produit collé sur une photo d'univers qui ne le montre pas (échelle, perspective et lumière fausses) :
      // sans mise en scène réelle du produit, la publicité le pose sur le décor de studio de la marque.
      if (!got && !(p.business === "products" && o.cut)) {
        const plain = await o.deps.image({ ...common, kind: concept.visual.kind });
        got = plain ? { ...plain, withProduct: false } : null;
      }
      o.images.set(key, got);
    }
    const img = o.images.get(key) ?? null;
    const sig = `${layout}|${copy.hook}|${key}`;
    if (tried.has(sig)) break;
    tried.add(sig);
    // Le produit réel est posé par la composition seulement quand l'image ne le montre pas déjà.
    const pasteProduct = !!o.cut && p.business === "products" && !img?.withProduct && (concept.visual.productOnTop || !img);
    // Sans photo du produit en situation : affiche « produit héros » (produit en grand dans un décor dessiné à la
    // marque), une par concept, plutôt qu'une composition typographique avec un produit posé dans un coin.
    const hero = !img && pasteProduct ? `tpl:${HERO_TEMPLATES.slice(0, 3)[(parseInt(crypto.createHash("sha256").update(`${concept.id}:${variant}`).digest("hex").slice(0, 6), 16) + attempt) % 3]}` : null;
    // Image qui montre le produit (photo du client, photo publicitaire générée) ou photo du métier : la mise en page
    // de la direction artistique du concept (photo entière) ; sinon la composition du moteur.
    const directed: string | null = img && concept.direction && (img.withProduct || p.business === "services") ? (dirLayout ?? concept.direction.layout) : null;
    const used: string = hero ?? directed ?? (img ? layout : "typographic");
    const { jpg, metrics, doc } = await composeAd({ format: f, layout: used as ComposeInput["layout"], palette: o.pal, typo: o.typo, art: o.art, brand: o.insight.brand, headline: copy.hook, subline: sublineFor(o.insight, copy), eyebrow: o.insight.category.label || null, cta: copy.cta, tagline: p.brand?.tagline ?? null, productName: p.product.name ?? null, features: o.features, background: img?.data ?? null, product: pasteProduct ? (o.cut?.data ?? null) : null, logo: o.logo?.data ?? null, logoLight: o.logoLight?.data ?? null, ids: { background: img?.assetId ?? null, product: o.cut?.id ?? null, logo: o.logo?.id ?? null, logoLight: o.logoLight?.id ?? null }, conceptId: concept.id, variant: adVariant(o.art, toAdLayout(layout), concept.id) });
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
    const d0 = gateAd({ local, review, reviewError, attempt, peopleAllowed: peopleAllowedFor(p) });
    // Essais épuisés sans défaut rédhibitoire et note correcte (≥ 6/10) : la création reste visible et modifiable,
    // marquée « à améliorer » (jamais jetée pour une accroche jugée banale ou un critère un peu faible).
    const d = d0.verdict === "REJECTED" && !d0.fatal && d0.checked && (d0.score ?? 0) >= AD_KEEP_FLOOR ? { ...d0, verdict: "PROVISIONAL" as const, reason: `${d0.reason} — gardée, à améliorer` } : d0;
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
        adV2: { version: ADS_V2_VERSION, docKey: d.verdict === "REJECTED" ? null : docKey, hash: d.verdict === "FINAL" ? h : `trial:${h}`, conceptId: concept.id, angle: { type: concept.angle.type, material: concept.angle.material, lever: concept.angle.lever }, copy, platform: f.platform, aspect: f.aspect, layout: used, imageAssetId: img?.assetId ?? null, metrics, claims: claims.map((c) => c.fix), attempt },
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
    if (target === "layout" && concept.direction && used === (dirLayout ?? concept.direction.layout)) {
      // Autre mise en page du même concept (gratuite), jamais la même deux fois.
      const list = concept.direction.templates;
      const next: string = list[(list.indexOf(used) + 1) % list.length];
      if (next === used) break;
      dirLayout = next;
      stats.layoutChanges++;
    } else if (target === "layout") {
      // Composition suivante de la direction artistique du projet (gratuite) : jamais la même deux fois.
      const cycle = o.art.cycle;
      const at = cycle.indexOf(toAdLayout(layout) as never);
      layout = at >= 0 ? cycle[(at + 1) % cycle.length] : LAYOUTS[(LAYOUTS.indexOf(layout) + 1) % LAYOUTS.length];
      stats.layoutChanges++;
    } else if (target === "hook" || target === "copy" || target === "cta") {
      // Seconde accroche du concept (déjà écrite, gratuite) ; sinon version locale contrôlée.
      const next = copy.hookB && copy.hookB !== copy.hook ? { ...copy, hook: copy.hookB, hookB: null } : localCopy(o.insight, concept.angle, contentLang(), o.limits);
      if (next.hook === copy.hook && next.primary === copy.primary) break;
      copy = next;
      claims = claimIssues([{ id: concept.id, copy }], p, o.insight, o.limits).get(concept.id)!;
    } else {
      // Nouvelle image : seulement si l'actuelle n'a rien coûté (photo du client, banque d'images). Une photo générée
      // (payée) n'est jamais remplacée par une autre photo payée : une seule image payante par création.
      const cur = img?.assetId ? getAsset(img.assetId) : undefined;
      if (cur?.origin === "generated") break;
      variant++;
    }
  }
  // Reprises arrêtées (rien de gratuit à tenter) : une création correcte sans défaut rédhibitoire reste « à améliorer ».
  if (last && last.outcome.verdict === "RETRY" && (last.outcome.score ?? 0) >= AD_KEEP_FLOOR && !last.outcome.codes.some((c) => POLICIES.ad_v2.fatal.includes(c)))
    last = { ...last, outcome: { ...last.outcome, verdict: "PROVISIONAL", reason: `${last.outcome.reason} — gardée, à améliorer` } };
  return last!;
}
