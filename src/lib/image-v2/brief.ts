/**
 * Brief visuel (Image V2) : construit LOCALEMENT à partir du Project Brain (métier ou catégorie produit, marque,
 * public, palette, faits, refus du client), sans appel à l'IA quand l'information suffit — ce qui est le cas pour une
 * demande claire. Le même brief sert à la recherche, à la génération, au contrôle de qualité et à la réutilisation.
 */
import crypto from "node:crypto";
import type { Project } from "../projects";
import { resolveTrade, tradeText, GLOBAL_NEGATIVES, type TradeProfile } from "../brain/trade";
import { tradeStock } from "../stock/trade-queries";
import { POLICIES } from "../quality/policies";
import { productIdentity, resolveProductCategory, type ProductCategoryProfile } from "./categories";
import { chooseDirection, DIRECTIONS } from "./direction";
import { defaultAspect, FORMATS } from "./formats";
import { PRODUCT_KINDS } from "./intent";
import type { ArtDirectionId, AspectId, Support, VisualBrief, VisualKind } from "./types";

export const BRIEF_VERSION = "5a.1";

export type BriefRequest = {
  kind: VisualKind;
  support?: Support;
  aspect?: AspectId;
  /** Sujet précis demandé par le module (prestation, thème d'une publication, section du site). */
  topic?: string | null;
  /** Prestation précise (entreprise de services) : jamais la photo d'une autre prestation. */
  service?: { name: string; description?: string } | null;
  /** Index dans une série (diversité) ; null pour une image seule. */
  variant?: number | null;
  /** Détourages / photos de référence du produit. */
  references?: string[];
};

const uniq = <T,>(a: T[]) => [...new Set(a.filter(Boolean))];

/** Axes de variation d'une série : même direction, angles, lieux, lumières et intentions différents. */
const ANGLES = ["medium shot on hands and work", "wide shot showing the whole space", "close-up detail of the result", "three-quarter view of the person at work"];
const LIGHTS = ["soft side daylight", "bright even daylight", "warm late-afternoon light", "cool morning light"];
const INTENTS = ["show the skill", "show the setting", "show the result", "show the human"];

const WEAK_MUST = new Set(["interior", "exterior", "renovation", "construction", "tools", "repair", "diy", "builder", "design", "home", "work", "service", "professional"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);

export function buildBrief(p: Project, req: BriefRequest, opts: { rejectedDirections?: ArtDirectionId[] } = {}): VisualBrief {
  const services = p.business === "services";
  const productKind = PRODUCT_KINDS.includes(req.kind) && !services;
  const support = req.support ?? "site";
  const aspect = req.aspect ?? defaultAspect(support, req.kind);
  const brand = p.brand;
  const vIndex = req.variant ?? null;
  const v = vIndex ?? 0;

  let trade: TradeProfile | null = null;
  let category: ProductCategoryProfile | null = null;
  let subject = "";
  let action: string | null = null;
  let environment: string | null = null;
  let positive: string[] = [];
  let must: string[] = [];
  let negative: string[] = [];
  let queries: string[] = [];
  let understanding: VisualBrief["understanding"];

  if (services) {
    // Métier du projet, puis celui de la prestation demandée quand elle est reconnue (« carrelage » ≠ « peinture »).
    const base = resolveTrade(tradeText(p), p.product.sector ?? null);
    const own = req.service ? resolveTrade(`${req.service.name} ${req.service.description ?? ""}`, p.product.sector ?? null) : null;
    trade = own && (own.source === "core" || own.source === "combo") ? own : base;
    const ts = tradeStock(`${req.service?.name ?? ""} ${tradeText(p)}`) ?? tradeStock(tradeText(p));
    const legacyMust = req.service ? (tradeStock(`${req.service.name} ${req.service.description ?? ""}`)?.must ?? ts?.must ?? []) : (ts?.must ?? []);
    const prof = trade.labels.en || trade.labels.fr || "professional";
    action = trade.actions.length ? trade.actions[v % trade.actions.length] : null;
    environment = trade.visuals.positive.length ? trade.visuals.positive[v % trade.visuals.positive.length] : null;
    subject = req.service ? `${req.service.name} — ${prof} at work` : `${prof} at work`;
    positive = uniq([...trade.visuals.positive, ...trade.actions]);
    // Mots trop généraux pour prouver le métier (« interior », « renovation », « tools »…) : jamais suffisants seuls.
    must = uniq([...legacyMust, ...(trade.source === "generic" || trade.source === "sector" ? [] : words(trade.labels.en))]).filter((w) => !WEAK_MUST.has(w));
    negative = uniq([...trade.search.negative, ...GLOBAL_NEGATIVES]);
    // MÉTIER + ACTION + ENVIRONNEMENT + INTENTION : requêtes du registre (déjà composées), puis composées pour la variante.
    const reg = trade.search.queries;
    const composed = action ? `${prof.split(/[ /]/)[0]} ${action} ${req.kind === "banner" ? "finished interior" : "interior"}` : null;
    queries = uniq([reg[v % Math.max(1, reg.length)], composed ?? "", ...reg.filter((_, i) => i !== v % Math.max(1, reg.length))]).slice(0, 3);
    understanding = { source: trade.source === "generic" ? "generic" : "trade", id: trade.id, confidence: trade.source === "core" || trade.source === "combo" ? "high" : trade.source === "sector" ? "medium" : "low" };
  } else {
    category = resolveProductCategory(p.product);
    environment = category.environments[v % category.environments.length] ?? null;
    if (productKind) {
      const id = productIdentity(p, { hasReference: !!req.references?.length });
      subject = `the real product "${id.name || p.product.category}"${id.colors.length ? ` (${id.colors.join(", ")})` : ""}`;
      action = req.kind === "usage_scene" || req.kind === "lifestyle" ? (category.usage[v % category.usage.length] ?? null) : null;
      positive = uniq([id.name, p.product.category]);
      // Images du produit : aucune recherche dans les banques (elles n'ont pas votre produit).
      queries = [];
    } else {
      // Univers du produit : lieu, matière, usage — jamais le produit lui-même.
      subject = `world of ${category.labels.en || p.product.category || "the product"} (without the product itself)`;
      action = category.usage[v % category.usage.length] ?? null;
      positive = uniq([...category.environments, ...category.usage]);
      queries = uniq([category.universeQueries[v % Math.max(1, category.universeQueries.length)], ...category.universeQueries]).slice(0, 3);
    }
    negative = uniq([...category.negative, ...GLOBAL_NEGATIVES.filter((n) => n !== "isolated object")]);
    understanding = { source: category.source === "generic" ? "generic" : "product", id: category.id, confidence: category.source === "core" ? "high" : category.source === "sector" ? "medium" : "low" };
  }

  if (req.topic?.trim()) subject = `${subject} — ${req.topic.trim().slice(0, 160)}`;
  const dir = chooseDirection({
    business: p.business,
    sector: p.product.sector ?? null,
    categoryDirections: category?.directions ?? [],
    personality: brand?.personality ?? [],
    positioning: brand?.positioning ?? null,
    kind: req.kind,
    support,
    rejected: opts.rejectedDirections ?? [],
  });
  const d = DIRECTIONS[dir.id];
  const identity = productKind ? productIdentity(p, { hasReference: !!req.references?.length }) : null;
  const palette = brand?.palette ? uniq(Object.values(brand.palette).filter((x): x is string => typeof x === "string" && /^#/.test(x))).slice(0, 5) : [];

  return {
    version: BRIEF_VERSION,
    kind: req.kind,
    support,
    subject,
    action,
    environment,
    purpose: `${req.kind} for ${support}${FORMATS[aspect].textZone !== "none" && (support === "ad" || support === "banner" || support === "social") ? `, keep the ${FORMATS[aspect].textZone} area calm for text` : ""}`,
    audience: brand?.audience && !/\[(À|A) compléter/i.test(brand.audience) ? brand.audience : null,
    artDirection: dir.id,
    composition: d.composition,
    lighting: vIndex == null ? d.lighting : `${d.lighting}; ${LIGHTS[v % LIGHTS.length]}`,
    framing: vIndex == null ? d.framing : `${d.framing}; ${ANGLES[v % ANGLES.length]}`,
    palette,
    format: FORMATS[aspect],
    positive,
    must,
    queries,
    negative,
    facts: identity ? identity.neverInvent : ["no invented reviews, figures, certifications or results", "no text, logo or watermark added"],
    references: req.references ?? [],
    productFidelity: productKind,
    expectedQuality: POLICIES.image_v2.final,
    variant: vIndex == null ? null : { index: vIndex, angle: ANGLES[v % ANGLES.length], setting: environment ?? "", light: LIGHTS[v % LIGHTS.length], intent: INTENTS[v % INTENTS.length] },
    understanding,
  };
}

/** Empreinte stable du brief : même brief → même image réutilisable, même contrôle déjà payé. */
export function briefHash(b: VisualBrief): string {
  const key = { v: b.version, k: b.kind, s: b.support, sub: b.subject, a: b.action, e: b.environment, d: b.artDirection, f: b.format.aspect, var: b.variant?.index ?? null, ref: b.references, fid: b.productFidelity };
  return crypto.createHash("sha256").update(JSON.stringify(key)).digest("hex").slice(0, 16);
}

/** Consigne de génération tirée du brief (anglais) : sujet, geste, lieu, direction, lumière, cadrage, interdits. */
export function generationPrompt(b: VisualBrief, extra?: string | null): string {
  const d = DIRECTIONS[b.artDirection];
  return [
    `${d.label} photograph. Subject: ${b.subject}.`,
    b.action ? `Action: ${b.action}.` : "",
    b.environment ? `Setting: ${b.environment}.` : "",
    `Composition: ${b.composition}. Lighting: ${b.lighting}. Camera: ${b.framing}. Mood: ${d.mood}.`,
    b.palette.length ? `Colour accents in harmony with ${b.palette.join(", ")}.` : "",
    `Format ${b.format.aspect}${b.format.textZone !== "none" ? `, ${b.format.textZone} area kept calm for text` : ""}.`,
    b.productFidelity ? "The product must stay EXACTLY as in the reference: same shape, colours, logo, label text and proportions; do not redraw or restyle it." : "",
    `Never show: ${b.negative.slice(0, 8).join(", ")}; no text, letters, logos or watermarks.`,
    extra ? `Correction for this attempt: ${extra}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
