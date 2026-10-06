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
import { UserFacingError, type JobContext } from "../jobs";
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
import { effectivePalette } from "../route-palette";
import { colorSchemes, type BrandPalette, type DirectionId } from "../theme/directions";
import sharp from "sharp";
import { validCutouts } from "./cutouts";
import { assetData } from "../library";

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
export function symbolFor(p: Project): SymbolKind {
  const text = `${p.product.name} ${p.product.category} ${p.product.summary} ${p.catalog.map((c) => `${c.name} ${c.category}`).join(" ")}`;
  // Le mot-clé cité en premier l'emporte (« gant pour poils de chat… sur les vêtements » → patte, pas cintre).
  let best: { sym: SymbolKind; at: number } | null = null;
  for (const [re, sym] of KEYWORD_SYMBOL) {
    const m = new RegExp(re.source, re.flags.replace("g", "")).exec(text);
    if (m && (!best || m.index < best.at)) best = { sym, at: m.index };
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

/** Accès à l'IA de la direction artistique, branché sur les tâches réelles. */
function realRouteAi(p: Project, cutout: Buffer | null, avoid: RouteAvoid[] = []): CreativeAi {
  const base = { userId: p.userId, projectId: p.id };
  const k = (what: string) => `${what}:${p.id}:${Date.now().toString(36)}`;
  return {
    routes: () => aiCreativeRoutes({ ...base, usageKey: k("logo-routes") }, p, { photo: cutout ?? undefined, avoid }) as Promise<RouteDraft[]>,
    redraw: (key, feedback, previous) => aiCreativeRedraw({ ...base, usageKey: k(`logo-route-${key}`) }, p, { key, feedback, previous, photo: cutout ?? undefined, avoid }) as Promise<RouteDraft>,
    review: (route, board) => aiCreativeReview({ ...base, usageKey: k(`logo-route-review-${route.key}`) }, { photo: cutout ?? undefined, board, route }) as Promise<RouteReview>,
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
    const local = await localRoutes(binput, { cutout, library: symbolFor(p) });
    routes = previous.map((x) => {
      const r = x.info.route as CreativeRoute;
      if (r.source === "local") return local[r.key].find((c) => c.markKind === r.markKind) ?? local[r.key][0] ?? r;
      return r.roles ? { ...r, colors: roleColors(brand.palette, r.roles.ink, r.roles.accent, r.roles.ground, r.roles.tint) } : r;
    });
  } else {
    ctx?.progress(0.55, L("Pistes créatives du logo", "Logo creative routes"));
    // « Nouvelles pistes » : refonte radicale, sans reprendre les pistes déjà montrées (série précédente).
    const avoid = opts.redrawSymbol && previous.length ? avoidOf(previous.map((x) => x.info.route as CreativeRoute)) : [];
    const variant = opts.redrawSymbol ? logoBatches(projectId) : 0;
    const ai = opts.routeAi !== undefined ? opts.routeAi : llmConfigured() ? realRouteAi(p, cutout, avoid) : null;
    // Emplacements à créer : d'abord les familles absentes des pistes gardées (produit, concept, typo).
    const have = new Set(add ? previous.map((x) => x.info.key) : []);
    const keys = [...ROUTE_KEYS.filter((k) => !have.has(k)), ...ROUTE_KEYS.filter((k) => have.has(k))].slice(0, room);
    const design = await designRoutes({ brand: binput, cutout, library: symbolFor(p), ai, textIssues: routeTextIssues(p), avoid, variant, keys });
    routes = design.routes;
    notes = design.notes;
    aiState = design.ai;
    if (notes.length) console.info(`[logo] ${projectId} : ${notes.join(" | ")}`);
  }
  const common = { projectId, userId: p.userId, folderKey: "brand.logos", origin: "generated" as const };
  ctx?.progress(0.65, L("Planches de présentation", "Presentation boards"));
  const batch = Date.now().toString(36);
  const proposals: LogoProposal[] = [];
  for (const route of routes) {
    const full = routeLogoSpec(route, brand);
    const { color, accent, ...spec } = full;
    const pr: LogoProposal = { key: route.key, label: route.name, concept: route.why, spec: { ...spec, accent }, colors: { color, accent: accent ?? color }, route };
    proposals.push(pr);
    const png = await logoPng(full, 900);
    const asset = await saveAsset({ ...common, data: png, name: C(`piste-${route.key}.png`, `route-${route.key}.png`), mime: "image/png", role: "logo-proposal", meta: { key: pr.key, label: pr.label, concept: pr.concept, spec: pr.spec, colors: pr.colors, route, brandName: brand.name, batch, ai: aiState, notes, pool: 1 } });
    pr.id = asset.id;
    const board = await routeBoard({ route, brand, product: cutout });
    await saveAsset({ ...common, data: await sharp(board).jpeg({ quality: 86 }).toBuffer(), name: C(`planche-piste-${route.key}.jpg`, `route-board-${route.key}.jpg`), mime: "image/jpeg", role: "logo-route-board", sourceAssetId: asset.id, meta: { key: route.key, batch } });
  }
  // Série neuve ou reprise : les anciennes pistes sont remplacées. Ajout : elles restent à côté des nouvelles.
  if (!add) for (const old of previous) removeProposal(projectId, old.id);
  // Ajout : le logo en place ne change pas (le client choisit parmi ses pistes), sauf s'il n'y en avait aucun.
  if (add && brand.logo.route) return { main: null, proposal: brand.logo.proposal ?? null, added: proposals.length };
  const wanted = opts.choice ?? brand.logo.proposal;
  return applyLogo(ctx, projectId, proposals.find((x) => x.key === wanted) ?? proposals[0]);
}

/** Pistes présentées au client : au plus 3 à la fois. */
export const MAX_ROUTES = 3;

/** Retire une piste (et sa planche) de celles présentées. Le logo déjà appliqué n'est pas touché. */
export function removeProposal(projectId: string, proposalId: string) {
  run("UPDATE assets SET deleted_at = ? WHERE project_id = ? AND deleted_at IS NULL AND (id = ? OR (role = 'logo-route-board' AND source_asset_id = ?))", now(), projectId, proposalId, proposalId);
}

/** Déclinaisons livrables d'une proposition, puis remplacement du logo dans la boutique et kit réseaux sociaux. */
export async function applyLogo(ctx: JobContext | null, projectId: string, pr: LogoProposal) {
  const p = loadProject(projectId);
  const brand = p.brand!;
  const { color, accent } = pr.colors ?? logoColors(p);
  ctx?.progress(0.75, L("Déclinaisons du logo", "Logo variations"));
  const spec: LogoSpec = { ...pr.spec, name: brand.name, ...(pr.spec.layout === "badge" || pr.spec.layout === "vertical" ? { tagline: brand.tagline } : {}), color, accent };
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
  saveBrand(projectId, { ...brand, logo: { ...brand.logo, assetId: main.id, concept: r ? `${r.name} — ${r.why}` : pr.concept, status: "proposed", proposal: pr.key, proposalId: pr.id, route } });
  swapThemeLogos(projectId, { logo: horizontal.id, light: light.id, favicon: fav.id }, routeFonts(route), effectivePalette(loadProject(projectId).brand));
  // Kit réseaux sociaux aux couleurs et typographies de la piste choisie (sans nouvel appel à l'IA).
  if (r) {
    ctx?.progress(0.82, L("Kit réseaux sociaux", "Social media kit"));
    await saveSocialKit(projectId, { route: r }).catch((e) => console.error(`[kit social] ${projectId} : ${(e as Error).message}`));
  }
  return { main, proposal: pr.key };
}

/** Remplace les fichiers du logo dans la version actuelle du thème (nouvelle version, retouches conservées). */
export function swapThemeLogos(projectId: string, ids: { logo: string; light: string; favicon: string }, fonts?: { heading: string; body: string } | null, pal?: BrandPalette | null) {
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
  for (const f of Object.keys(spec.files)) {
    const next = /^es-logo-clair-/.test(f) ? ids.light : /^es-logo-/.test(f) ? ids.logo : /^es-favicon-/.test(f) ? ids.favicon : null;
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
