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
import { mentionsPerson, NO_PEOPLE_EN, peopleAllowedFor, peopleFreeQueries } from "../people-policy";
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
  /** Zone à garder calme pour le texte, imposée par la composition qui utilisera l'image (publicités). */
  textZone?: "none" | "left" | "right" | "top" | "bottom" | "center";
  /** Prise de vue imposée par la direction artistique d'une publicité (cadrage, lumière, décor). */
  shot?: { composition: string; lighting: string; framing: string; environment?: string | null } | null;
};

const uniq = <T,>(a: T[]) => [...new Set(a.filter(Boolean))];

/** Axes de variation d'une série : même direction, angles, lieux, lumières et intentions différents. */
const ANGLES = ["medium shot on hands and work", "wide shot showing the whole space", "close-up detail of the result", "three-quarter view of the person at work"];
const LIGHTS = ["soft side daylight", "bright even daylight", "warm late-afternoon light", "cool morning light"];
const INTENTS = ["show the skill", "show the setting", "show the result", "show the human"];
/** Mêmes axes sans personne (règle de présence humaine) : outils, lieu, résultat, matière. */
const ANGLES_NO_PEOPLE = ["medium shot on tools and work surface", "wide shot showing the whole space", "close-up detail of the result", "three-quarter view of the workspace and materials"];
const INTENTS_NO_PEOPLE = ["show the tools", "show the setting", "show the result", "show the materials"];
/** Directions artistiques dont la composition, le cadrage ou l'ambiance supposent une personne : version sans personne. */
const DIRECTION_NO_PEOPLE: Partial<Record<ArtDirectionId, { composition?: string; framing?: string; mood?: string }>> = {
  documentary_trade: { composition: "real job site, tools, materials and work in progress clearly visible, nobody in frame", framing: "35-50 mm, medium shot on tools and work, eye level" },
  natural_lifestyle: { composition: "real everyday place, the subject ready to use, candid, nobody in frame" },
  product_demo: { composition: "the product set up on a real task, result visible, no hands" },
  warm_universe: { mood: "welcoming, generous, warm" },
};

const WEAK_MUST = new Set(["interior", "exterior", "renovation", "construction", "tools", "repair", "diy", "builder", "design", "home", "work", "service", "professional"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);

export function buildBrief(p: Project, req: BriefRequest, opts: { rejectedDirections?: ArtDirectionId[]; peopleAllowed?: boolean } = {}): VisualBrief {
  const services = p.business === "services";
  // Règle de présence humaine : sans photo du client avec une personne ni accord explicite, aucune personne demandée.
  const people = opts.peopleAllowed ?? peopleAllowedFor(p);
  const angles = people ? ANGLES : ANGLES_NO_PEOPLE;
  const intents = people ? INTENTS : INTENTS_NO_PEOPLE;
  const noPerson = (xs: string[]) => (people ? xs : xs.filter((x) => !mentionsPerson(x)));
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
    const gesture = trade.actions.length ? trade.actions[v % trade.actions.length] : null;
    const scenes = noPerson(trade.visuals.positive);
    if (people) {
      action = gesture;
      environment = scenes.length ? scenes[v % scenes.length] : null;
      subject = req.service ? `${req.service.name} — ${prof} at work` : `${prof} at work`;
    } else {
      // Sans personne : le métier se prouve par ses outils, ses matériaux, le chantier et le résultat.
      action = gesture ? `${gesture} shown through its tools, materials and finished result, nobody in frame` : "tools, materials and finished result of the trade, nobody in frame";
      environment = scenes.length ? scenes[v % scenes.length] : `${gesture ?? "work"} site with tools and materials in place, nobody in frame`;
      // Le nom du métier désigne une personne (« plasterer ») : le sujet est l'ouvrage, pas l'artisan.
      subject = `${req.service ? `${req.service.name} — ` : ""}${gesture ?? "trade"} work: tools, materials and finished result (no people)`;
    }
    positive = uniq(noPerson([...trade.visuals.positive, ...trade.actions]));
    // Mots trop généraux pour prouver le métier (« interior », « renovation », « tools »…) : jamais suffisants seuls.
    must = uniq([...legacyMust, ...(trade.source === "generic" || trade.source === "sector" ? [] : words(trade.labels.en))]).filter((w) => !WEAK_MUST.has(w));
    negative = uniq([...trade.search.negative, ...GLOBAL_NEGATIVES]);
    // MÉTIER + ACTION + ENVIRONNEMENT + INTENTION : requêtes du registre (déjà composées), puis composées pour la variante.
    const reg = trade.search.queries;
    const composed = action ? `${prof.split(/[ /]/)[0]} ${action} ${req.kind === "banner" ? "finished interior" : "interior"}` : null;
    queries = people
      ? uniq([reg[v % Math.max(1, reg.length)], composed ?? "", ...reg.filter((_, i) => i !== v % Math.max(1, reg.length))]).slice(0, 3)
      : // Sans personne : requêtes d'outils, de matériaux et de résultat d'abord, puis le registre sans mots de personne.
        uniq([...(gesture ? [`${gesture} tools materials`, `finished ${gesture} ${req.kind === "banner" ? "interior" : "work"}`] : []), ...peopleFreeQueries([reg[v % Math.max(1, reg.length)] ?? "", ...reg])]).slice(0, 3);
    understanding = { source: trade.source === "generic" ? "generic" : "trade", id: trade.id, confidence: trade.source === "core" || trade.source === "combo" ? "high" : trade.source === "sector" ? "medium" : "low" };
  } else {
    category = resolveProductCategory(p.product);
    environment = category.environments[v % category.environments.length] ?? null;
    if (productKind) {
      const id = productIdentity(p, { hasReference: !!req.references?.length });
      subject = `the real product "${id.name || p.product.category}"${id.colors.length ? ` (${id.colors.join(", ")})` : ""}`;
      action = req.kind === "usage_scene" || req.kind === "lifestyle" ? (people ? (category.usage[v % category.usage.length] ?? null) : "the product ready to use in its real everyday setting, nobody in frame") : null;
      positive = uniq([id.name, p.product.category]);
      // Images du produit : aucune recherche dans les banques (elles n'ont pas votre produit).
      queries = [];
    } else {
      // Univers du produit : lieu, matière, usage — jamais le produit lui-même.
      subject = `world of ${category.labels.en || p.product.category || "the product"} (without the product itself)`;
      const usage = noPerson(category.usage);
      action = people ? (category.usage[v % category.usage.length] ?? null) : usage.length ? `${usage[v % usage.length]}, objects only, nobody in frame` : "objects and materials of everyday use in place, nobody in frame";
      positive = uniq(noPerson([...category.environments, ...category.usage]));
      const uq = [category.universeQueries[v % Math.max(1, category.universeQueries.length)], ...category.universeQueries];
      queries = uniq(people ? uq : peopleFreeQueries(uq)).slice(0, 3);
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
  const d = { ...DIRECTIONS[dir.id], ...(people ? {} : DIRECTION_NO_PEOPLE[dir.id]) };
  const identity = productKind ? productIdentity(p, { hasReference: !!req.references?.length }) : null;
  const palette = brand?.palette ? uniq(Object.values(brand.palette).filter((x): x is string => typeof x === "string" && /^#/.test(x))).slice(0, 5) : [];

  return {
    version: BRIEF_VERSION,
    kind: req.kind,
    support,
    subject,
    action,
    environment: req.shot?.environment ?? environment,
    purpose: `${req.kind} for ${support}${(req.textZone ?? FORMATS[aspect].textZone) !== "none" && (support === "ad" || support === "banner" || support === "social") ? `, keep the ${req.textZone ?? FORMATS[aspect].textZone} area calm for text` : ""}`,
    audience: brand?.audience && !/\[(À|A) compléter/i.test(brand.audience) ? brand.audience : null,
    artDirection: dir.id,
    composition: req.shot?.composition ?? d.composition,
    lighting: req.shot?.lighting ?? (vIndex == null ? d.lighting : `${d.lighting}; ${LIGHTS[v % LIGHTS.length]}`),
    framing: req.shot?.framing ?? (vIndex == null ? d.framing : `${d.framing}; ${angles[v % angles.length]}`),
    palette,
    format: req.textZone ? { ...FORMATS[aspect], textZone: req.textZone } : FORMATS[aspect],
    positive,
    must,
    queries,
    negative,
    facts: [...(identity ? identity.neverInvent : ["no invented reviews, figures, certifications or results", "no text, logo or watermark added"]), ...(people ? [] : ["no people: no person, face, hands or silhouette"])],
    references: req.references ?? [],
    productFidelity: productKind,
    expectedQuality: POLICIES.image_v2.final,
    variant: vIndex == null ? null : { index: vIndex, angle: angles[v % angles.length], setting: environment ?? "", light: LIGHTS[v % LIGHTS.length], intent: intents[v % intents.length] },
    understanding,
    people,
    ...(req.shot ? { shotKey: crypto.createHash("sha256").update(JSON.stringify(req.shot)).digest("hex").slice(0, 12) } : {}),
  };
}

/** Empreinte stable du brief : même brief → même image réutilisable, même contrôle déjà payé. */
export function briefHash(b: VisualBrief): string {
  // Sans personne : clé distincte (une image faite quand les personnes étaient permises n'est pas réutilisée).
  const key = { v: b.version, k: b.kind, s: b.support, sub: b.subject, a: b.action, e: b.environment, d: b.artDirection, f: b.format.aspect, var: b.variant?.index ?? null, ref: b.references, fid: b.productFidelity, ...(b.shotKey ? { sh: b.shotKey } : {}), ...(b.people === false ? { np: 1 } : {}), ...(b.format.textZone !== FORMATS[b.format.aspect].textZone ? { tz: b.format.textZone } : {}) };
  return crypto.createHash("sha256").update(JSON.stringify(key)).digest("hex").slice(0, 16);
}

/** Consigne de génération tirée du brief (anglais) : sujet, geste, lieu, direction, lumière, cadrage, interdits. */
export function generationPrompt(b: VisualBrief, extra?: string | null): string {
  const d = { ...DIRECTIONS[b.artDirection], ...(b.people === false ? DIRECTION_NO_PEOPLE[b.artDirection] : {}) };
  return [
    `${d.label} photograph. Subject: ${b.subject}.`,
    // Publicité : niveau campagne d'agence (lumière travaillée, matières, profondeur), un seul point focal, de l'air.
    b.support === "ad" ? "Premium advertising campaign photograph for social media: one clear focal point, crafted natural or golden light, rich textures and materials, shallow depth of field, refined colour grading, generous negative space, realistic and believable (never a 3D render, never clip-art)." : "",
    b.action ? `Action: ${b.action}.` : "",
    b.environment ? `Setting: ${b.environment}.` : "",
    `Composition: ${b.composition}. Lighting: ${b.lighting}. Camera: ${b.framing}. Mood: ${d.mood}.`,
    b.palette.length ? `Colour accents in harmony with ${b.palette.join(", ")}.` : "",
    `Format ${b.format.aspect}${b.format.textZone !== "none" ? `, ${b.format.textZone} area kept calm for text` : ""}.`,
    b.productFidelity ? "The product must stay EXACTLY as in the reference: same shape, colours, logo, label text and proportions; do not redraw or restyle it." : "",
    `Never show: ${b.negative.slice(0, 8).join(", ")}; no text, letters, logos or watermarks.`,
    b.people === false ? NO_PEOPLE_EN : "",
    extra ? `Correction for this attempt: ${extra}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
