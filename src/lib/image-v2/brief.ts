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
import { mentionsPerson, NO_PEOPLE_FR, peopleAllowedFor, peopleFreeQueries } from "../people-policy";
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
const ANGLES = ["plan moyen sur les mains et l'ouvrage", "plan large qui montre tout l'espace", "gros plan sur un détail du résultat", "vue de trois quarts de la personne au travail"];
const LIGHTS = ["lumière du jour douce de côté", "lumière du jour vive et égale", "lumière chaude de fin d'après-midi", "lumière fraîche du matin"];
const INTENTS = ["montrer le savoir-faire", "montrer le lieu", "montrer le résultat", "montrer l'humain"];
/** Mêmes axes sans personne (règle de présence humaine) : outils, lieu, résultat, matière. */
const ANGLES_NO_PEOPLE = ["plan moyen sur les outils et le plan de travail", "plan large qui montre tout l'espace", "gros plan sur un détail du résultat", "vue de trois quarts du poste de travail et des matériaux"];
const INTENTS_NO_PEOPLE = ["montrer les outils", "montrer le lieu", "montrer le résultat", "montrer les matériaux"];
/** Directions artistiques dont la composition, le cadrage ou l'ambiance supposent une personne : version sans personne. */
const DIRECTION_NO_PEOPLE: Partial<Record<ArtDirectionId, { composition?: string; framing?: string; mood?: string }>> = {
  documentary_trade: { composition: "vrai chantier, outils, matériaux et travail en cours bien visibles, personne dans le cadre", framing: "35-50 mm, plan moyen sur les outils et l'ouvrage, à hauteur d'œil" },
  natural_lifestyle: { composition: "vrai lieu du quotidien, le sujet prêt à servir, naturel, personne dans le cadre" },
  product_demo: { composition: "le produit installé pour une vraie tâche, résultat visible, aucune main" },
  warm_universe: { mood: "accueillant, généreux, chaleureux" },
};

const WEAK_MUST = new Set(["interior", "exterior", "renovation", "construction", "tools", "repair", "diy", "builder", "design", "home", "work", "service", "professional"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);

export function buildBrief(p: Project, req: BriefRequest, opts: { rejectedDirections?: ArtDirectionId[]; peopleAllowed?: boolean } = {}): VisualBrief {
  const services = p.business === "services";
  // Règle de présence humaine : sans photo du client avec une personne ni accord explicite, aucune personne demandée.
  // Photo du produit réel générée d'après sa photo (référence) : jamais de personne (la consigne du modèle l'interdit ;
  // un brief qui en demanderait une se contredirait, et la personne d'une photo du client ne se reproduit pas).
  const people = (req.references?.length ? false : undefined) ?? opts.peopleAllowed ?? peopleAllowedFor(p);
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

/** Zone du cadre gardée calme, en français. */
const ZONE_FR: Record<string, string> = { left: "à gauche", right: "à droite", top: "en haut", bottom: "en bas", center: "au centre" };

/**
 * Consigne de génération tirée du brief, EN FRANÇAIS (règle du propriétaire pour Qwen-Image) : concrète (sujet, geste,
 * lieu, lumière, cadrage), aucun texte voulu dans l'image (rien entre guillemets), produit ENTIER exigé.
 */
export function generationPrompt(b: VisualBrief, extra?: string | null): string {
  const d = { ...DIRECTIONS[b.artDirection], ...(b.people === false ? DIRECTION_NO_PEOPLE[b.artDirection] : {}) };
  return [
    `Photographie, style ${d.label}. Sujet : ${b.subject}.`,
    // Publicité : niveau campagne d'agence (lumière travaillée, matières, profondeur), un seul point focal, de l'air.
    b.support === "ad" ? "Photographie de campagne publicitaire haut de gamme pour les réseaux sociaux : un seul point focal net, lumière naturelle ou dorée travaillée, matières et textures riches, faible profondeur de champ, étalonnage soigné, bel espace libre, réaliste et crédible (jamais un rendu 3D, jamais un dessin)." : "",
    b.action ? `Action : ${b.action}.` : "",
    b.environment ? `Décor : ${b.environment}.` : "",
    `Composition : ${b.composition}. Lumière : ${b.lighting}. Prise de vue : ${b.framing}. Ambiance : ${d.mood}.`,
    b.palette.length ? `Touches de couleur en accord avec ${b.palette.join(", ")}.` : "",
    `Format ${b.format.aspect}${b.format.textZone !== "none" ? `, zone ${ZONE_FR[b.format.textZone] ?? b.format.textZone} gardée calme pour un texte ajouté plus tard` : ""}.`,
    b.productFidelity ? PRODUCT_FIDELITY_FR : "",
    `Ne jamais montrer : ${b.negative.slice(0, 8).join(", ")} ; aucun texte, aucune lettre, aucun logo, aucun filigrane.`,
    b.people === false ? NO_PEOPLE_FR : "",
    extra ? `Correction pour cet essai : ${extra}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Fidélité au vrai produit, et produit entier dans le cadre (exigence du propriétaire, ex. bracelet complet d'une montre). */
export const PRODUCT_FIDELITY_FR =
  "Le produit reste EXACTEMENT comme sur la référence : même forme, mêmes couleurs, même logo, mêmes inscriptions, mêmes proportions ; ne pas le redessiner. Le produit ENTIER est dans le cadre, aucune partie coupée, cachée ou manquante (ex. une montre : le bracelet complet avec sa boucle).";
