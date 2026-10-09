/**
 * Identité visuelle : trois propositions de logo (logotype, symbole + nom, emblème), application du
 * choix du client et déclinaisons livrables (SVG, PNG, version claire, marque réduite, favicon).
 * Le logo de la boutique existante est remplacé sans recomposer le thème (les retouches restent).
 */
import { all, json, now, one, run } from "../db";
import { saveAsset, type Asset } from "../library";
import { currentTheme, loadProject, saveBrand, saveThemeVersion, type Project } from "../projects";
import { logoPng, logoSet, type LogoSpec, type SymbolKind } from "../media/logo";
import { canvasFamily, CANVAS_FONTS } from "../media/fonts";
import { directionById } from "../theme/directions";
import { contrast, hsl, isDark, withLightness } from "../color";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { imageProviderAvailable, imageUnavailableReason, logoSymbolImage, refundMediaQuota } from "../ai/media-providers";
import { traceSymbol } from "../media/trace-symbol";
import { tradeIcon } from "../media/icon-library";
import { C, L } from "../i18n-server";
import { serviceSymbol, serviceTaglines } from "./services-text";
import type { CustomSymbol } from "../media/logo-symbol";
import { llmConfigured } from "../ai/llm";
import { aiCreativeRedraw, aiCreativeReview, aiCreativeRoutes, lintClaims, lintHollow } from "../ai/tasks";
import { avoidOf, designRoutes, localRoutes, roleColors, type BrandInput, type CreativeAi, type RouteAvoid, type RouteDraft } from "./creative-direction";
import { ROUTE_KEYS, routeBoard, routeLogoSpec, type CreativeRoute, type RouteReview } from "../media/brand-mockups";
import { monogramLetter } from "../media/monogram";
import { saveSocialKit } from "./social-kit";
import { routeFonts } from "./shop";
import { effectivePalette, exactRoles } from "../route-palette";
import { colorSchemes, type BrandPalette, type DirectionId } from "../theme/directions";
import sharp from "sharp";
import { validCutouts } from "./cutouts";
import { assetData, getAsset } from "../library";
import { stableKey } from "../ai/keys";
import { withCandidate } from "../ai/trace";
import { saveCheck } from "../quality/store";
import { isLocked, markBrandLogo } from "../brain/brand-locks";
import { resolveTrade } from "../brain/trade";

export type LogoProposal = {
  /** Identifiant du fichier de la piste (réserve de pistes). */
  id?: string;
  key: "logotype" | "symbole" | "embleme" | "produit" | "concept" | "typo";
  label: string;
  concept: string;
  spec: Omit<LogoSpec, "color">;
  /** Couleurs propres à la piste (sinon celles déduites de la palette). */
  colors?: { color: string; accent: string };
  /** Piste créative complète (typographie, palette, symbole, contrôle). */
  route?: CreativeRoute;
};

const SECTOR_SYMBOL: Record<string, SymbolKind> = {
  beaute: "drop", mode: "hanger", bijoux: "facet", maison: "arch", hightech: "orbit", sport: "wave",
  alimentation: "sun", enfants: "sun", animaux: "paw", artisanat: "spark",
};
const KEYWORD_SYMBOL: [RegExp, SymbolKind][] = [
  // Métiers et activités de services : le pictogramme évoque l'activité réelle, jamais un symbole hors sujet.
  [/carross|d[ée]bossel|garage|m[ée]cani|automobile|\bautos?\b|v[ée]hicule|voiture|\bcars?\b|auto ?body|bodyshop|pneu|tyre|tire\b|d[ée]pann/i, "car"],
  [/peintre|peinture|painting|painter|\bpaint\b|d[ée]co(ration)? int|ravalement/i, "brush"],
  [/coiff|barb|hair|salon de beaut/i, "scissors"],
  [/[ée]lectric|electrician|domotique/i, "bolt"],
  [/plomb|plumb|chauffag|heating/i, "drop"],
  [/serrur|locksmith|\bcl[ée]s? minute/i, "key"],
  [/immobili|real estate|agence immo|ma[çc]on|b[âa]timent|construction|r[ée]novation|toiture|couvreur|roofing|menuis/i, "house"],
  [/r[ée]paration|repair|d[ée]pannage|entretien|maintenance|bricol|handyman/i, "wrench"],
  [/(?<!\p{L})th[ée]s?(?!\p{L})|\bteas?\b|matcha|infusion|tisane|herbal/iu, "leaf"],
  [/caf[ée]|coffee|espresso|barista|mousseur|frother/i, "bean"],
  [/v[êe]tement|clothing|apparel|t-?shirt|sweat|hoodie|robe|\bdress|pantalon|trousers|\bpants\b|veste|jacket|textile|\blin\b|linen|coton|cotton/i, "hanger"],
  [/plante|\bplants?\b|botani|v[ée]g[ée]tal|bio\b|organic/i, "leaf"],
  [/\bchats?\b|\bcats?\b|chien|\bdogs?\b|animal|animaux|\bpets?\b/i, "paw"],
  [/lampe|\blamps?\b|lumi[èe]re|bougie|candle/i, "sun"],
  [/tasse|\bcups?\b|mug|th[ée]i[èe]re|teapot/i, "cup"],
];

/** Symbole cohérent avec l'univers : d'abord les mots du produit, puis le secteur. */
/** Texte qui décrit le métier ou le produit (recherche d'icône du métier). */
const tradeText = (p: Project) => `${p.product.category} ${p.product.name} ${p.product.summary} ${(p.services?.services ?? []).map((s) => s.name).join(" ")}`;

export function symbolFor(p: Project): SymbolKind {
  const text = `${p.product.name} ${p.product.category} ${p.product.summary} ${p.catalog.map((c) => `${c.name} ${c.category}`).join(" ")}`;
  // Le mot-clé cité en premier l'emporte (« gant pour poils de chat… sur les vêtements » → patte, pas cintre).
  let best: { sym: SymbolKind; at: number } | null = null;
  for (const [re, sym] of KEYWORD_SYMBOL) {
    const m = new RegExp(re.source, re.flags.replace("g", "")).exec(text);
    if (m && (!best || m.index < best.at)) best = { sym, at: m.index };
  }
  // Registre métier canonique : symbole du métier reconnu (après les mots-clés historiques, avant le repli secteur).
  if (!best) {
    const t = resolveTrade(text, p.product.sector ?? null);
    if ((t.source === "core" || t.source === "combo") && t.symbol) return t.symbol;
  }
  if (!best && p.business === "services") return serviceSymbol(p.product);
  return best?.sym ?? SECTOR_SYMBOL[p.product.sector ?? ""] ?? "spark";
}

/** Symbole sur mesure retenu (IA ou silhouette du produit) et son explication. */
export type CustomMark = { symbol: CustomSymbol; concept: string; source: "ai" | "silhouette" };

export function logoProposals(p: Project, base?: Omit<LogoSpec, "color">, custom?: CustomMark | null): LogoProposal[] {
  const brand = p.brand!;
  const d = directionById(brand.direction);
  const heading = canvasFamily(brand.fonts.heading ?? d.fonts.heading, "Cormorant");
  const body = canvasFamily(brand.fonts.body ?? d.fonts.body, "Jost");
  const family = CANVAS_FONTS[heading] ? heading : "Cormorant";
  const heavy = ["brut", "elan", "pop", "flux"].includes(d.id);
  const symbol = symbolFor(p);
  const word: Omit<LogoSpec, "color"> = base ?? {
    name: brand.name,
    family,
    weight: heavy ? 800 : 500,
    case: ["terroir", "pop", "gourmand"].includes(d.id) ? "title" : "upper",
    tracking: ["atelier", "galerie", "joaillerie"].includes(d.id) ? 0.18 : 0.04,
    layout: brand.name.length > 12 && brand.name.includes(" ") ? "stacked" : "wordmark",
    emblem: d.id === "elan" ? "line" : "none",
  };
  const sans = CANVAS_FONTS[body] && CANVAS_FONTS[body].kind !== "serif" ? body : "Jost";
  return [
    {
      key: "logotype",
      label: L("Logotype", "Wordmark"),
      concept: C(
        `Logotype typographique en ${word.family}, ${word.case === "upper" ? "capitales" : "minuscules"}${word.tracking >= 0.15 ? " espacées" : ""} : la marque par son nom seul.`,
        `Typographic wordmark in ${word.family}, ${word.tracking >= 0.15 ? "widely spaced " : ""}${word.case === "upper" ? "uppercase" : "lowercase"}: the brand, by its name alone.`,
      ),
      spec: { ...word, name: brand.name },
    },
    custom
      ? { key: "symbole", label: L("Symbole sur mesure + nom", "Custom symbol + name"), concept: `${custom.concept.replace(/[.\s]+$/, "")}. ${L(`Nom en ${heavy ? family : sans}.`, `Name set in ${heavy ? family : sans}.`)}`, spec: { name: brand.name, family: heavy ? family : sans, weight: heavy ? 800 : 500, case: "upper", tracking: 0.08, layout: "lockup", emblem: "none", symbol, custom: custom.symbol } }
      : { key: "symbole", label: L("Symbole + nom", "Symbol + name"), concept: C(`Symbole « ${SYMBOL_LABEL[symbol]} » au trait et nom en ${heavy ? family : sans} : lisible en petit, reconnaissable en icône.`, `Line-drawn "${SYMBOL_LABEL_EN[symbol]}" symbol with the name in ${heavy ? family : sans}: legible at small sizes, recognizable as an icon.`), spec: { name: brand.name, family: heavy ? family : sans, weight: heavy ? 800 : 500, case: "upper", tracking: 0.08, layout: "lockup", emblem: "none", symbol } },
    custom
      ? { key: "embleme", label: L("Emblème", "Emblem"), concept: p.business === "services" ? C("Emblème rond (symbole sur mesure) avec le nom et la signature : esprit sceau, idéal sur cartes de visite, devis, vitrine ou véhicule.", "Round emblem (custom symbol) with the name and tagline: a seal-like badge, ideal for business cards, quotes, storefronts or vehicles.") : C("Emblème rond (symbole sur mesure) avec le nom et la signature : esprit sceau, idéal sur étiquettes et emballages.", "Round emblem (custom symbol) with the name and tagline: a seal-like badge, ideal for labels and packaging."), spec: { name: brand.name, tagline: brand.tagline, family, weight: heavy ? 800 : 500, case: word.case, tracking: 0.06, layout: "badge", emblem: "circle", symbol, custom: custom.symbol } }
      : { key: "embleme", label: L("Emblème", "Emblem"), concept: p.business === "services" ? C(`Emblème rond (symbole « ${SYMBOL_LABEL[symbol]} ») avec le nom et la signature : esprit sceau, idéal sur cartes de visite, devis, vitrine ou véhicule.`, `Round emblem ("${SYMBOL_LABEL_EN[symbol]}" symbol) with the name and tagline: a seal-like badge, ideal for business cards, quotes, storefronts or vehicles.`) : C(`Emblème rond (symbole « ${SYMBOL_LABEL[symbol]} ») avec le nom et la signature : esprit sceau, idéal sur étiquettes et emballages.`, `Round emblem ("${SYMBOL_LABEL_EN[symbol]}" symbol) with the name and tagline: a seal-like badge, ideal for labels and packaging.`), spec: { name: brand.name, tagline: brand.tagline, family, weight: heavy ? 800 : 500, case: word.case, tracking: 0.06, layout: "badge", emblem: "circle", symbol } },
  ];
}

export const SYMBOL_LABEL: Record<SymbolKind, string> = {
  leaf: "feuille", drop: "goutte", hanger: "cintre", orbit: "orbite", bean: "grain", paw: "patte", arch: "arche", wave: "vague", facet: "facette", sun: "soleil", cup: "tasse", spark: "étoile",
  car: "voiture", wrench: "clé", brush: "pinceau", scissors: "ciseaux", house: "maison", bolt: "éclair", key: "clé de porte",
};
export const SYMBOL_LABEL_EN: Record<SymbolKind, string> = {
  leaf: "leaf", drop: "drop", hanger: "hanger", orbit: "orbit", bean: "bean", paw: "paw", arch: "arch", wave: "wave", facet: "facet", sun: "sun", cup: "cup", spark: "star",
  car: "car", wrench: "wrench", brush: "brush", scissors: "scissors", house: "house", bolt: "bolt", key: "key",
};

/** Proposition retenue par défaut selon la direction de la boutique. */
export function defaultProposal(direction: string): LogoProposal["key"] {
  if (["atelier", "galerie", "joaillerie", "clinique"].includes(direction)) return "logotype";
  if (["terroir", "pop", "gourmand"].includes(direction)) return "embleme";
  return "symbole";
}

export function logoColors(p: Pick<Project, "brand">) {
  const pal = p.brand!.palette;
  const color = isDark(pal.dark) ? pal.dark : withLightness(pal.dark, 0.12);
  // Accent du symbole : la couleur principale si elle est franche et lisible sur fond clair ; une principale
  // neutre (graphite d'un produit gris) cède la place à l'accent de la palette, s'il reste lisible sur blanc.
  const vivid = (hex: string) => hsl(hex)[1] * (1 - Math.abs(2 * hsl(hex)[2] - 1)) >= 0.12;
  const accent = isDark(pal.primary) && vivid(pal.primary) ? pal.primary : vivid(pal.accent) && contrast(pal.accent, "#FFFFFF") >= 3 ? pal.accent : isDark(pal.primary) ? pal.primary : color;
  return { color, accent };
}

/** Clés des pistes créatives (nouvelles propositions) et des propositions de l'ancienne génération. */
export const PROPOSAL_KEYS = ["produit", "concept", "typo", "logotype", "symbole", "embleme"] as const;
export type ProposalKey = (typeof PROPOSAL_KEYS)[number];

/**
 * Accès à l'IA de la direction artistique, branché sur les tâches réelles. Avec une tâche de fond (`ctx`), chaque
 * appel est un point de reprise : une reprise réutilise les pistes, redessins et contrôles déjà payés. Clés d'usage
 * stables (projet, série, piste, tentative) ; les appels sont rattachés à leur piste (trace des coûts par candidat).
 */
function realRouteAi(p: Project, cutout: Buffer | null, avoid: RouteAvoid[] = [], ctx: JobContext | null = null, batch = "s0"): CreativeAi {
  const base = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const k = (...what: (string | number)[]) => stableKey(p.id, "logo", batch, ...what);
  const step = <T,>(key: string, fn: () => Promise<T>) => (ctx ? ctx.step(key, fn) : fn());
  const cand = (key: string) => stableKey(p.id, "logo", batch, key);
  // Chacun son métier : le modèle de texte pense l'idée et juge ; l'IA d'images dessine le symbole (pistes produit
  // et concept), vectorisé ensuite. Monogramme (piste typo) : dessiné à partir des vraies lettres de la police.
  const drawn = async (d: RouteDraft, attempt: number, feedback = ""): Promise<RouteDraft> => {
    if (!d || d.key === "typo") return d;
    if (!imageProviderAvailable()) return { ...d, imageNote: imageUnavailableReason() ?? undefined };
    const usageKey = k("symbol", d.key, attempt);
    const activity = [p.product.name, p.product.category, p.product.summary].filter(Boolean).join(" — ");
    try {
      // Le dessin part de l'idée (brief du directeur artistique), pas d'un calque de la photo du produit.
      const img = await logoSymbolImage({ ...base, usageKey }, { concept: `"${d.name}" for the brand ${p.brand?.name ?? p.name} (${activity.slice(0, 200)}). ${d.drawing ? `Drawing brief: ${d.drawing.slice(0, 600)}` : ""} Idea behind it: ${d.why}${feedback ? ` Fix these issues from the previous version: ${feedback}` : ""}` });
      const traced = await traceSymbol(img);
      if (!traced.ok) {
        console.warn(`[logo] symbole de l'IA d'images non vectorisable (${traced.reason}) : dessin du modèle de texte gardé`);
        refundMediaQuota(p.userId, usageKey);
        return { ...d, imageNote: L(`dessin non vectorisable : ${traced.reason}`, `drawing could not be vectorized: ${traced.reason}`) };
      }
      return { ...d, svg: traced.svg };
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      console.warn("[logo] IA d'images indisponible pour le symbole :", (e as Error).message);
      return { ...d, imageNote: (e as Error).message.slice(0, 200) };
    }
  };
  return {
    routes: () =>
      step(`logo:${batch}:routes`, async () => {
        const drafts = (await aiCreativeRoutes({ ...base, usageKey: k("routes") }, p, { photo: cutout ?? undefined, avoid })) as RouteDraft[];
        return Promise.all(drafts.map((d) => (d ? withCandidate(cand(d.key), 0, () => drawn(d, 0)) : d)));
      }),
    redraw: (key, feedback, previous, attempt = 1) =>
      step(`logo:${batch}:${key}:redraw:${attempt}`, () =>
        withCandidate(cand(key), attempt, async () => drawn((await aiCreativeRedraw({ ...base, usageKey: k("redraw", key, attempt) }, p, { key, feedback, previous, photo: cutout ?? undefined, avoid })) as RouteDraft, attempt, feedback)),
      ),
    review: (route, board, attempt = 0) =>
      step(`logo:${batch}:${route.key}:review:${attempt}`, () =>
        withCandidate(cand(route.key), attempt, () => aiCreativeReview({ ...base, usageKey: k("review", route.key, attempt) }, { photo: cutout ?? undefined, board, route }) as Promise<RouteReview>),
      ),
  };
}

/** Nombre de séries de pistes déjà créées (chaque « Nouvelles pistes » en ajoute une). */
const logoBatches = (projectId: string) => one<{ n: number }>("SELECT COUNT(DISTINCT json_extract(meta, '$.batch')) n FROM assets WHERE project_id = ? AND role = 'logo-proposal'", projectId)?.n ?? 0;

/** Allégations et formules creuses dans le nom ou la justification d'une piste. */
const routeTextIssues = (p: Project) => (text: string) => [...lintClaims({ t: text }, p).map((c) => c.term), ...lintHollow({ t: text }).map((h) => h.term)];

/**
 * Crée (ou recrée) les trois pistes créatives, applique celle choisie et met à jour la boutique.
 * `redrawSymbol` : nouvelle création (nouvelle marque, « Recréer les propositions ») ; sinon les pistes précédentes
 * sont reprises (changement de nom ou de palette : mêmes dessins, couleurs et monogrammes mis à jour, sans IA).
 * `choice` : clé de piste ; à défaut, celle déjà choisie, puis la première.
 */
export async function generateLogos(ctx: JobContext | null, projectId: string, opts: { base?: Omit<LogoSpec, "color">; choice?: ProposalKey; redrawSymbol?: boolean; routeAi?: CreativeAi | null; add?: boolean } = {}) {
  const p = loadProject(projectId);
  if (!p.brand) throw new Error(L("La marque doit exister avant le logo.", "The brand must exist before the logo."));
  const brand = p.brand;
  const best = p.business === "services" ? undefined : validCutouts(p.id)[0];
  const cutout = best ? assetData(best) : null;
  const binput: BrandInput = { name: brand.name, tagline: brand.tagline, palette: brand.palette, direction: brand.direction, sector: p.product.sector };
  const previous = latestProposals(projectId).filter((x) => x.info.route);
  // « Nouvelles pistes » (add) : les pistes gardées restent, on complète jusqu'à 3. Sinon (nouvelle marque) : série neuve.
  const add = !!opts.add && previous.length > 0;
  // Pistes enregistrées avant la réserve : elles y entrent (elles ne disparaissent pas à l'ajout).
  if (add) for (const x of previous) if (!x.info.pool) run("UPDATE assets SET meta = json_set(meta, '$.pool', 1) WHERE id = ?", x.id);
  const room = add ? MAX_ROUTES - previous.length : MAX_ROUTES;
  if (room <= 0) throw new UserFacingError(L(`Vous avez déjà ${MAX_ROUTES} pistes : supprimez-en une pour en créer une nouvelle.`, `You already have ${MAX_ROUTES} routes: delete one to create a new one.`));
  let routes: CreativeRoute[];
  let notes: string[] = [];
  let aiState = "off";
  const sameInitial = previous.length && monogramLetter(previous[0].info.brandName ?? "") === monogramLetter(brand.name);
  if (!add && !opts.redrawSymbol && previous.length && sameInitial) {
    // Reprise : les dessins de l'IA restent, couleurs recalculées depuis la palette ; les versions du studio sont refaites.
    const local = await localRoutes(binput, { cutout, library: symbolFor(p), icon: await tradeIcon(tradeText(p)) });
    routes = previous.map((x) => {
      const r = x.info.route as CreativeRoute;
      if (r.source === "local") return local[r.key].find((c) => c.markKind === r.markKind) ?? local[r.key][0] ?? r;
      return r.roles ? { ...r, colors: roleColors(r.palette ?? brand.palette, r.roles.ink, r.roles.accent, r.roles.ground, r.roles.tint) } : r;
    });
  } else {
    ctx?.progress(0.55, L("Pistes créatives du logo", "Logo creative routes"));
    // « Nouvelles pistes » : refonte radicale, sans reprendre les pistes déjà montrées (série précédente).
    // Série (identifiant, variante, pistes à ne pas reprendre) figée au premier passage : une tâche reprise après une
    // interruption retrouve exactement la même série et relit ses points de reprise au lieu de tout repayer.
    const plan = async () => ({ series: `s${logoBatches(projectId) + 1}`, variant: opts.redrawSymbol ? logoBatches(projectId) : 0, avoid: opts.redrawSymbol && previous.length ? avoidOf(previous.map((x) => x.info.route as CreativeRoute)) : [] });
    const { series, variant, avoid } = ctx ? await ctx.step("logo:series", plan) : await plan();
    const ai = opts.routeAi !== undefined ? opts.routeAi : llmConfigured() ? realRouteAi(p, cutout, avoid, ctx, series) : null;
    // Chaque verdict de la barrière est enregistré (historique de la piste : notes, défauts, gain d'une reprise).
    const record = (d: Parameters<typeof saveCheck>[0], key: string, previousCheckId: string | null) => saveCheck(d, { userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: stableKey(projectId, "logo", series, key), previousCheckId });
    // Emplacements à créer : d'abord les familles absentes des pistes gardées (produit, concept, typo).
    const have = new Set(add ? previous.map((x) => x.info.key) : []);
    const keys = [...ROUTE_KEYS.filter((k) => !have.has(k)), ...ROUTE_KEYS.filter((k) => have.has(k))].slice(0, room);
    const design = await designRoutes({ brand: binput, cutout, library: symbolFor(p), icon: await tradeIcon(tradeText(p)), ai, textIssues: routeTextIssues(p), avoid, variant, keys, record });
    routes = design.routes;
    notes = design.notes;
    aiState = design.ai;
    if (notes.length) console.info(`[logo] ${projectId} : ${notes.join(" | ")}`);
  }
  const common = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const };
  ctx?.progress(0.65, L("Planches de présentation", "Presentation boards"));
  const batch = Date.now().toString(36); // identifiant de série affiché (pas une clé d'usage)
  const proposals: LogoProposal[] = [];
  for (const route of routes) {
    const full = routeLogoSpec(route, brand);
    const { color, accent, ...spec } = full;
    const pr: LogoProposal = { key: route.key, label: route.name, concept: route.why, spec: { ...spec, accent }, colors: { color, accent: accent ?? color }, route };
    proposals.push(pr);
    const png = await logoPng(full, 900);
    const provisional = route.gate?.verdict !== "FINAL";
    const gate = route.gate ? { verdict: route.gate.verdict, fatal: false, score: route.gate.score, checked: route.gate.verdict === "FINAL", deliverable: "logo_route", reason: route.gate.reason, checkId: route.gate.checkId ?? null, ...(route.gate.provisional ? { provisional: route.gate.provisional } : {}) } : undefined;
    const asset = await saveAsset({ ...common, data: png, name: C(`piste-${route.key}.png`, `route-${route.key}.png`), mime: "image/png", role: "logo-proposal", meta: { key: pr.key, label: pr.label, concept: pr.concept, spec: pr.spec, colors: pr.colors, route, brandName: brand.name, batch, ai: aiState, notes, pool: 1, ...(gate ? { gate } : {}) } });
    pr.id = asset.id;
    // Planche de mises en situation : seulement pour une proposition validée (un logo provisoire n'a pas de mockups).
    if (!provisional) {
      const board = await routeBoard({ route, brand, product: cutout });
      await saveAsset({ ...common, data: await sharp(board).jpeg({ quality: 86 }).toBuffer(), name: C(`planche-piste-${route.key}.jpg`, `route-board-${route.key}.jpg`), mime: "image/jpeg", role: "logo-route-board", sourceAssetId: asset.id, meta: { key: route.key, batch } });
    }
  }
  // Série neuve ou reprise : les anciennes pistes sont remplacées. Ajout : elles restent à côté des nouvelles.
  if (!add) for (const old of previous) removeProposal(projectId, old.id);
  // Ajout : le logo en place ne change pas (le client choisit parmi ses pistes), sauf s'il n'y en avait aucun.
  // Logo validé par le client (piste ou logo complet) : de nouvelles pistes s'ajoutent sans jamais le remplacer.
  if (add && (brand.logo.route || isLocked(brand, "logo"))) return { main: null, proposal: brand.logo.proposal ?? null, added: proposals.length };
  // Logo appliqué : le choix du client, sinon la piste qu'il avait validée, sinon la première proposition de l'IA
  // validée par la barrière ; à défaut seulement, une version du studio comme remplacement technique PROVISOIRE
  // (jamais présentée comme un logo final : ni planches, ni kit réseaux sociaux, ni charte finale).
  const wanted = opts.choice ?? (brand.logo.status === "validated" ? brand.logo.proposal : undefined);
  const chosen = proposals.find((x) => x.key === wanted) ?? proposals.find((x) => x.route?.gate?.verdict === "FINAL") ?? proposals.find((x) => x.key === brand.logo.proposal) ?? proposals[0];
  return applyLogo(ctx, projectId, chosen, { provisional: !opts.choice && chosen.route?.gate?.verdict !== "FINAL" });
}

/**
 * Palette changée par le client sur la piste retenue : la même piste (même dessin, mêmes typographies) est recolorée
 * avec les nouvelles couleurs, puis réappliquée partout — logo et déclinaisons, site, bannières, kit réseaux sociaux,
 * charte. Les autres pistes ne bougent pas. Sans IA. Renvoie false s'il n'y a pas de piste retenue à recolorer.
 * `oldPalette` : palette d'avant, pour retrouver d'où venaient les couleurs d'une piste ancienne sans rôles enregistrés.
 */
export async function recolorChosenRoute(projectId: string, oldPalette: BrandPalette, opts: { exact?: boolean } = {}): Promise<boolean> {
  const p = loadProject(projectId);
  const brand = p.brand;
  const chosen = brand?.logo?.route;
  if (!brand || !chosen || hasClientLogo(projectId)) return false;
  const row = latestProposals(projectId).find((x) => x.id === brand.logo.proposalId) ?? latestProposals(projectId).find((x) => x.info.route?.key === chosen.key && x.info.key === brand.logo.proposal);
  const route = row?.info.route as CreativeRoute | undefined;
  if (!row || !route) return false;
  // D'où viennent les couleurs de la piste : rôles enregistrés, sinon retrouvés dans l'ancienne palette.
  const roleOf = (hex: string) => (Object.keys(oldPalette) as (keyof BrandPalette)[]).find((k) => oldPalette[k]?.toLowerCase() === hex?.toLowerCase());
  const roles = route.roles ?? (() => {
    const ink = roleOf(route.colors.ink), accent = roleOf(route.colors.accent), ground = roleOf(route.colors.ground), tint = roleOf(route.colors.tint);
    return ink && accent && ground ? { ink, accent, ground, tint: tint ?? ("secondary" as const) } : null;
  })();
  if (!roles) return false;
  // Palette saisie telle qu'affichée : les rôles de la piste pointent sur les cases que le client a réglées.
  const finalRoles = opts.exact ? exactRoles({ palette: oldPalette, logo: { ...brand.logo, route: { ...chosen, roles } } as NonNullable<typeof brand>["logo"] }, roles) : roles;
  const recolored: CreativeRoute = { ...route, palette: brand.palette, roles: finalRoles, colors: roleColors(brand.palette, finalRoles.ink, finalRoles.accent, finalRoles.ground, finalRoles.tint) };
  const full = routeLogoSpec(recolored, brand);
  const { color, accent, ...spec } = full;
  const pr: LogoProposal = { key: row.info.key, label: row.info.label ?? recolored.name, concept: row.info.concept ?? recolored.why, spec: { ...spec, accent }, colors: { color, accent: accent ?? color }, route: recolored };
  // Vignette de la piste et planche refaites aux nouvelles couleurs ; la piste garde sa place dans la liste.
  const common = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const };
  const asset = await saveAsset({ ...common, data: await logoPng(full, 900), name: row.name, mime: "image/png", role: "logo-proposal", meta: { ...row.info, spec: pr.spec, colors: pr.colors, route: recolored } });
  run("UPDATE assets SET created_at = ? WHERE id = ?", row.created_at, asset.id);
  pr.id = asset.id;
  const best = p.business === "services" ? undefined : validCutouts(p.id)[0];
  const board = await routeBoard({ route: recolored, brand, product: best ? assetData(best) : null }).catch(() => null);
  if (board) await saveAsset({ ...common, data: await sharp(board).jpeg({ quality: 86 }).toBuffer(), name: C(`planche-piste-${pr.key}.jpg`, `route-board-${pr.key}.jpg`), mime: "image/jpeg", role: "logo-route-board", sourceAssetId: asset.id, meta: { key: pr.key, batch: row.info.batch } });
  removeProposal(projectId, row.id);
  // Logo validé par le client : il le reste (seules ses couleurs ont changé, à sa demande).
  const wasValidated = brand.logo.status === "validated";
  await applyLogo(null, projectId, pr, { provisional: !wasValidated && !!brand.logo.provisional });
  if (wasValidated) {
    const after = loadProject(projectId).brand!;
    saveBrand(projectId, { ...after, logo: { ...after.logo, status: "validated" } });
  }
  return true;
}

/** Pistes présentées au client : au plus 3 à la fois. */
export const MAX_ROUTES = 3;

/** Retire une piste (et sa planche) de celles présentées. Le logo déjà appliqué n'est pas touché. */
export function removeProposal(projectId: string, proposalId: string) {
  run("UPDATE assets SET deleted_at = ? WHERE project_id = ? AND deleted_at IS NULL AND (id = ? OR (role = 'logo-route-board' AND source_asset_id = ?))", now(), projectId, proposalId, proposalId);
}

/** Déclinaisons livrables d'une proposition, puis remplacement du logo dans la boutique et kit réseaux sociaux. */
export async function applyLogo(ctx: JobContext | null, projectId: string, pr: LogoProposal, opts: { provisional?: boolean; noTagline?: boolean } = {}) {
  const p = loadProject(projectId);
  const brand = p.brand!;
  const { color, accent } = pr.colors ?? logoColors(p);
  ctx?.progress(0.75, L("Déclinaisons du logo", "Logo variations"));
  // Logo V2 : aucun texte en plus du nom exact (pas de signature ajoutée d'office).
  const spec: LogoSpec = { ...pr.spec, name: brand.name, ...((pr.spec.layout === "badge" || pr.spec.layout === "vertical") && !opts.noTagline ? { tagline: brand.tagline } : {}), color, accent };
  const set = await logoSet(spec, "#FFFFFF");
  // Un emblème rond ou une composition empilée servent sur les étiquettes et emballages ; le site utilise la version horizontale.
  const webSpec: LogoSpec = spec.layout === "badge" || spec.layout === "vertical" ? { ...spec, layout: "lockup", tagline: undefined } : spec;
  const web = webSpec === spec ? null : await logoSet(webSpec, "#FFFFFF");
  const base = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const, meta: { spec: pr.spec, concept: pr.concept, proposal: pr.key, route: pr.route?.name } };
  const main = await saveAsset({ ...base, data: set.mainPng, name: C("logo-principal.png", "logo-main.png"), mime: "image/png", role: "logo", status: "review" });
  await saveAsset({ ...base, data: Buffer.from(set.mainSvg), name: C("logo-principal.svg", "logo-main.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-svg", sourceAssetId: main.id });
  const light = await saveAsset({ ...base, data: (web ?? set).lightPng, name: C("logo-clair.png", "logo-light.png"), mime: "image/png", role: "logo-light", sourceAssetId: main.id });
  await saveAsset({ ...base, data: Buffer.from((web ?? set).lightSvg), name: C("logo-clair.svg", "logo-light.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-light-svg", sourceAssetId: main.id });
  const horizontal = web ? await saveAsset({ ...base, data: web.mainPng, name: "logo-horizontal.png", mime: "image/png", role: "logo-horizontal", sourceAssetId: main.id }) : main;
  if (web) await saveAsset({ ...base, data: Buffer.from(web.mainSvg), name: "logo-horizontal.svg", mime: "image/svg+xml", kind: "logo", role: "logo-horizontal-svg", sourceAssetId: main.id });
  await saveAsset({ ...base, data: set.monoPng, name: C("marque-reduite.png", "brand-mark.png"), mime: "image/png", role: "logo-mark", sourceAssetId: main.id });
  await saveAsset({ ...base, data: Buffer.from(set.monoSvg), name: C("marque-reduite.svg", "brand-mark.svg"), mime: "image/svg+xml", kind: "logo", role: "logo-mark-svg", sourceAssetId: main.id });
  const fav = await saveAsset({ ...base, data: set.faviconPng, name: "favicon.png", mime: "image/png", role: "favicon", sourceAssetId: main.id });
  const r = pr.route;
  const route = r ? { key: r.key, name: r.name, heading: r.heading, headingWeight: r.headingWeight, body: r.body, colors: r.colors, roles: r.roles, source: r.source } : undefined;
  // Piste avec sa propre palette : elle devient la palette de la marque (sauf palette validée par le client).
  const palette = r?.palette && !(brand.validated ?? []).includes("palette") ? r.palette : brand.palette;
  saveBrand(projectId, { ...brand, palette, logo: { ...brand.logo, assetId: main.id, concept: r ? `${r.name} — ${r.why}` : pr.concept, status: "proposed", proposal: pr.key, proposalId: pr.id, route, provisional: !!opts.provisional, engine: undefined } });
  // Site de services : bannières sans photo redessinées aux couleurs de la piste (sans IA), reprises par le site.
  const { refreshSiteBanners } = await import("./service-media");
  const banners = await refreshSiteBanners(projectId).catch((e) => (console.error(`[bannières] ${projectId} : ${(e as Error).message}`), []));
  markBrandLogo(projectId, main.id);
  // Typographies validées par le client : la piste ne les remplace pas sur le site (verrou « fonts »).
  swapThemeLogos(projectId, { logo: horizontal.id, light: light.id, favicon: fav.id }, isLocked(brand, "fonts") ? null : routeFonts(route), effectivePalette(loadProject(projectId).brand), banners);
  // Logo provisoire (version du studio, aucune proposition validée) : pas de kit réseaux sociaux ni de charte finale ;
  // ils seront faits quand un logo sera choisi ou validé.
  if (opts.provisional) return { main, proposal: pr.key, provisional: true };
  // Kit réseaux sociaux aux couleurs et typographies de la piste choisie (la ligne éditoriale peut appeler l'IA).
  if (r) {
    ctx?.progress(0.82, L("Kit réseaux sociaux", "Social media kit"));
    await saveSocialKit(projectId, { route: r }).catch((e) => console.error(`[kit social] ${projectId} : ${(e as Error).message}`));
  }
  // Charte de marque refaite avec le logo, les typographies et les couleurs de la piste choisie.
  ctx?.progress(0.9, L("Charte de marque", "Brand guidelines"));
  const { saveBrandBook, saveBrandGuide } = await import("./brand");
  await saveBrandGuide(projectId).catch((e) => console.error(`[charte] ${projectId} : ${(e as Error).message}`));
  await saveBrandBook(projectId).catch((e) => console.error(`[charte] ${projectId} : ${(e as Error).message}`));
  return { main, proposal: pr.key };
}

/** Remplace les fichiers du logo dans la version actuelle du thème (nouvelle version, retouches conservées). */
export function swapThemeLogos(projectId: string, ids: { logo: string; light: string; favicon: string }, fonts?: { heading: string; body: string } | null, pal?: BrandPalette | null, banners: string[] = []) {
  const cur = currentTheme(projectId);
  if (!cur) return null;
  const spec = structuredClone(cur.spec);
  let changed = false;
  // Typographies de la piste retenue : le site les reprend (thème importé du client : on n'y touche pas).
  if (fonts && !spec.imported && (spec.settings.type_heading_font !== fonts.heading || spec.settings.type_body_font !== fonts.body)) {
    spec.settings.type_heading_font = fonts.heading;
    spec.settings.type_body_font = fonts.body;
    changed = true;
  }
  // Couleurs de la piste retenue : schémas de couleurs du site recalculés (retouches de mise en page conservées).
  if (pal && !spec.imported && spec.direction) {
    const schemes = colorSchemes(spec.direction as DirectionId, pal);
    if (JSON.stringify(schemes) !== JSON.stringify(spec.settings.color_schemes)) {
      spec.settings.color_schemes = schemes as any;
      changed = true;
    }
  }
  // Bannières générées d'un site de services : remplacées par leur version aux nouvelles couleurs (même modèle).
  const templateOf = (id: string) => {
    const a = getAsset(id);
    if (!a || a.role !== "banner" || a.origin !== "generated") return null;
    const m = JSON.parse(a.meta || "{}") as { business?: string; template?: string };
    return m.business === "services" ? m.template ?? null : null;
  };
  const fresh = new Map(banners.map((id) => [templateOf(id), id] as const).filter(([t]) => t));
  for (const f of Object.keys(spec.files)) {
    const tpl = fresh.size ? templateOf(spec.files[f]) : null;
    const next = /^es-logo-clair-/.test(f) ? ids.light : /^es-logo-/.test(f) ? ids.logo : /^es-favicon-/.test(f) ? ids.favicon : tpl ? fresh.get(tpl) ?? null : null;
    if (next && spec.files[f] !== next) {
      spec.files[f] = next;
      changed = true;
    }
  }
  return changed ? saveThemeVersion(projectId, spec, fonts ? L("Logo et typographies mis à jour", "Logo and typography updated") : L("Logo mis à jour", "Logo updated"), "system") : null;
}

/** Dernières propositions enregistrées : celles du dernier lot (une par clé), pistes d'abord. */
export function latestProposals(projectId: string) {
  // Réserve de pistes (au plus 3, dans l'ordre de création) : les pistes s'ajoutent, le client supprime celles qu'il ne veut pas.
  const pooled = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-proposal' AND deleted_at IS NULL AND json_extract(meta, '$.pool') = 1 ORDER BY created_at ASC", projectId);
  if (pooled.length) return pooled.slice(-MAX_ROUTES).map((r) => ({ ...r, info: json<any>(r.meta as any, {}) }));
  // Pistes enregistrées avant la réserve : le dernier lot.
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'logo-proposal' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 12", projectId);
  const seen = new Map<string, Asset & { info: any }>();
  let batch: string | undefined;
  for (const r of rows) {
    const info = json<any>(r.meta as any, {});
    if (batch === undefined) batch = info.batch;
    if (info.batch !== batch) continue;
    if (!seen.has(info.key)) seen.set(info.key, { ...r, info });
  }
  return PROPOSAL_KEYS.map((k) => seen.get(k)).filter(Boolean) as (Asset & { info: any })[];
}

/** Logo du client : envoyé par lui, ou repris de son site existant. */
export const hasClientLogo = (projectId: string) => !!one("SELECT 1 FROM assets WHERE project_id = ? AND role = 'logo' AND origin IN ('upload','site') AND deleted_at IS NULL", projectId);

// ---------------------------------------------------------------- signatures

const SECTOR_LINES_FR: Record<string, string[]> = {
  beaute: ["Le soin, simplement.", "Des gestes simples, chaque jour.", "L'essentiel, sans détour.", "Prendre soin, tout naturellement."],
  mode: ["L'allure, simplement.", "Des pièces à vivre au quotidien.", "S'habiller sans compliquer.", "Le style qui vous ressemble."],
  bijoux: ["Des détails qui comptent.", "Briller sans en faire trop.", "À porter, à offrir, à garder."],
  maison: ["Des objets à vivre.", "La maison, en plus doux.", "Chez soi, simplement mieux."],
  hightech: ["La technologie, sans détour.", "Pensé pour être utilisé.", "Simple à prendre en main."],
  sport: ["Fait pour bouger.", "Le mouvement, au quotidien.", "Équipé pour sortir."],
  alimentation: ["Le goût des bonnes choses.", "À savourer, tout simplement.", "Un moment pour soi."],
  enfants: ["Pour les petits, avec soin.", "Les petits moments comptent."],
  animaux: ["Pour nos compagnons.", "Le quotidien de votre animal, en mieux.", "Pensé pour eux, choisi par vous."],
  artisanat: ["Fait avec soin.", "Le geste et la matière."],
};
const KEYWORD_LINES_FR: [RegExp, string[]][] = [
  [/th[ée] glac|boisson|canette|soda|limonade/i, ["La fraîcheur en canette.", "Un moment de fraîcheur, à toute heure."]],
  [/\bth[ée]s?\b|infusion|matcha/i, ["Le thé, prenez le temps.", "Une tasse, un moment."]],
  [/caf[ée]|espresso/i, ["Le café, à votre façon.", "Votre café, votre rituel."]],
  [/v[êe]tement|t-?shirt|sweat|hoodie|robe/i, ["Des basiques bien faits.", "L'essentiel du vestiaire."]],
];

const SECTOR_LINES_EN: Record<string, string[]> = {
  beaute: ["Skincare, simplified.", "Simple steps, every day.", "Just the essentials.", "Self-care, naturally."],
  mode: ["Effortless style.", "Pieces for everyday life.", "Getting dressed, made easy.", "Style that feels like you."],
  bijoux: ["The details that matter.", "Shine without trying too hard.", "To wear, to give, to keep."],
  maison: ["Objects to live with.", "Home, made softer.", "Home, simply better."],
  hightech: ["Tech, without the fuss.", "Built to be used.", "Easy from day one."],
  sport: ["Made to move.", "Movement, every day.", "Geared up to get out."],
  alimentation: ["A taste for good things.", "Simply savor it.", "A moment for yourself."],
  enfants: ["For little ones, with care.", "Little moments matter."],
  animaux: ["For our companions.", "Your pet's everyday, made better.", "Made for them, chosen by you."],
  artisanat: ["Made with care.", "Craft and material."],
};
const KEYWORD_LINES_EN: [RegExp, string[]][] = [
  [/th[ée] glac|iced tea|boisson|drink|beverage|canette|\bcans?\b|soda|limonade|lemonade/i, ["Refreshment in a can.", "A refreshing moment, any time."]],
  [/\bth[ée]s?\b|\bteas?\b|infusion|matcha/i, ["Tea: take your time.", "One cup, one moment."]],
  [/caf[ée]|coffee|espresso/i, ["Coffee-shop coffee, right at home.", "Your coffee, your ritual."]],
  [/v[êe]tement|clothing|apparel|t-?shirt|sweat|hoodie|robe|\bdress/i, ["Basics, done right.", "Wardrobe essentials."]],
];

/** Signatures proposées : courtes, sans promesse invérifiable ; la liste des goûts ou gammes réelle quand elle existe. */
export function proposeTaglines(p: Project): string[] {
  // Entreprise de services : signatures du métier (et métier + zone quand ils sont connus), sans promesse.
  if (p.business === "services") return serviceTaglines(p.product, p.services, p.brand?.name).filter((x) => x.length <= 70).slice(0, 6);
  const text = `${p.product.name} ${p.product.category} ${p.product.summary} ${p.catalog.map((c) => `${c.name} ${c.category}`).join(" ")}`;
  const en = C(false, true);
  const sectorLines = en ? SECTOR_LINES_EN : SECTOR_LINES_FR;
  const out: string[] = [];
  for (const [re, lines] of en ? KEYWORD_LINES_EN : KEYWORD_LINES_FR) if (re.test(text)) out.push(...lines);
  out.push(...(sectorLines[p.product.sector ?? ""] ?? sectorLines.maison));
  // Gamme réelle : variantes du produit ou catégories du catalogue.
  const range = p.product.variants[0]?.values?.length ? p.product.variants[0].values : [...new Set(p.catalog.map((c) => c.category).filter(Boolean))];
  if (range.length >= 2 && range.length <= 4) {
    const loc = en ? "en-US" : "fr-FR";
    const list = range.map((x) => x.toLocaleLowerCase(loc));
    const line = en ? `${list.slice(0, -1).join(", ")} or ${list[list.length - 1]}: your choice.` : `${list.slice(0, -1).join(", ")} ou ${list[list.length - 1]} : à vous de choisir.`;
    out.push(line.replace(/^./, (c) => c.toLocaleUpperCase(loc)));
  }
  if (p.brand?.name) out.push(en ? `${p.brand.name}, every day.` : `${p.brand.name}, au quotidien.`);
  return [...new Set(out)].filter((x) => x.length <= 70).slice(0, 6);
}
