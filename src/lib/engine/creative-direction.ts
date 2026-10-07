/**
 * Direction artistique du logo, comme en agence : trois PISTES créatives vraiment différentes, chacune avec
 * un concept nommé, sa justification, sa typographie, sa palette, sa composition et ses déclinaisons.
 *  (a) « produit »  : symbole inspiré de la forme du produit (silhouette, détail signature) ;
 *  (b) « concept »  : symbole conceptuel issu de l'idée de marque (métaphore, geste, émotion — jamais une icône cliché) ;
 *  (c) « typo »     : logotype travaillé, avec un monogramme dessiné (formes, jamais de texte).
 *
 * Avec l'IA : brief des trois pistes → SVG nettoyés par liste blanche → lisibilité 16/32 px → planche de mises en
 * situation → contrôle « directeur de création » → barrière de qualité (src/lib/quality) → reprises ciblées sur
 * diagnostic → sinon la piste de l'IA n'est jamais proposée : la version du studio prend la place, PROVISOIRE.
 * Sans IA : silhouette du produit (ou pictogramme de bibliothèque), monogramme géométrique construit localement,
 * logotype soigné — présentés comme tels, sans prétendre à une création par IA.
 */
import type { BrandPalette } from "../theme/directions";
import { contrast, hsl, hslToHex } from "../color";
import { CANVAS_FONTS } from "../media/fonts";
import { fitSymbol, sanitizeSymbolSvg, silhouetteSymbol, symbolLegibility, type CustomSymbol } from "../media/logo-symbol";
import { buildMonogram, monogramLetter, type MonogramFrame } from "../media/monogram";
import { ROUTE_CRITERIA, ROUTE_KEYS, routeBoard, safeColors, type CreativeRoute, type RouteColors, type RouteKey, type RouteReview } from "../media/brand-mockups";
import type { SymbolKind } from "../media/logo";
import { C, L } from "../i18n-server";
import { decide, type CheckInput, type GateDecision } from "../quality/gate";

export type PaletteRole = keyof BrandPalette;
const ROLES: PaletteRole[] = ["primary", "secondary", "accent", "light", "dark"];

/** Paires de polices disponibles (assets/fonts) : titre (logo) + texte. */
export const FONT_PAIRS: { heading: string; weight: number; body: string; mood: string }[] = [
  { heading: "Playfair Display", weight: 700, body: "Inter", mood: "éditorial, contrasté" },
  { heading: "Cormorant", weight: 600, body: "Jost", mood: "raffiné, luxe discret" },
  { heading: "Instrument Serif", weight: 400, body: "DM Sans", mood: "contemporain, sensible" },
  { heading: "Libre Baskerville", weight: 700, body: "Karla", mood: "classique, rassurant" },
  { heading: "Lora", weight: 600, body: "Work Sans", mood: "chaleureux, artisanal" },
  { heading: "Montserrat", weight: 800, body: "Inter", mood: "affirmé, direct" },
  { heading: "Archivo", weight: 800, body: "Work Sans", mood: "robuste, technique" },
  { heading: "Space Grotesk", weight: 700, body: "Inter", mood: "tech, précis" },
  { heading: "Bricolage Grotesque", weight: 800, body: "DM Sans", mood: "joyeux, singulier" },
  { heading: "Jost", weight: 600, body: "Lora", mood: "géométrique, doux" },
  { heading: "Chivo", weight: 800, body: "Karla", mood: "sportif, énergique" },
];

/** Brief d'une piste rédigé par l'IA (avant nettoyage et contrôle). */
export type RouteDraft = {
  key: RouteKey;
  name: string;
  why: string;
  /** Brief de dessin du symbole (formes, composition, parti pris), transmis à l'IA d'images. */
  drawing?: string;
  /** Dessin par l'IA d'images impossible : raison (montrée au client), le dessin du modèle de texte est gardé. */
  imageNote?: string;
  svg: string;
  heading: string;
  headingWeight: number;
  body: string;
  case: CreativeRoute["case"];
  tracking: number;
  composition: CreativeRoute["composition"];
  ink: PaletteRole;
  accent: PaletteRole;
  ground: PaletteRole;
};

/**
 * Accès à l'IA (injecté : réel dans le studio, simulé dans les tests). `attempt` : tentative de la piste (0 = premier
 * essai), pour des points de reprise et des clés d'usage stables.
 */
export type CreativeAi = {
  routes(): Promise<RouteDraft[]>;
  redraw(key: RouteKey, feedback: string, previous: RouteDraft | null, attempt?: number): Promise<RouteDraft>;
  review(route: CreativeRoute, board: Buffer, attempt?: number): Promise<RouteReview>;
};

/** Enregistrement d'un verdict de la barrière (injecté : base de données dans le studio, rien dans les tests). */
export type GateRecorder = (d: GateDecision, key: RouteKey, previousCheckId: string | null) => string | null;

export type BrandInput = {
  name: string;
  tagline?: string;
  palette: BrandPalette;
  direction: string;
  sector?: string | null;
};

/** Essais de l'IA par piste (première proposition + reprises ciblées avec les défauts relevés) avant la version du studio. */
export const MAX_ROUTE_DRAWS = 3;
/** Seuil d'exigence d'une piste de l'IA : aucune note sous 6, moyenne d'au moins 7,5. */
export const ROUTE_MIN_SCORE = 6;
export const ROUTE_MIN_MEAN = 7.5;
/** Lien avec le produit ou l'activité : au moins 7. */
export const ROUTE_MIN_RELEVANCE = 7;

const clamp10 = (n: unknown) => {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(10, x)) : 0;
};

/**
 * Une piste peut-elle être montrée ? Défauts rédhibitoires : cliché, ressemblance avec une marque connue,
 * monogramme illisible comme lettres. Piste de l'IA : toutes les notes ≥ 6 et moyenne ≥ 7,5.
 * Version du studio (repli) : on n'en attend pas d'originalité, mais elle doit être nette en petit, simple et cohérente.
 */
export function routePassed(r: RouteReview | null | undefined, source: "ai" | "local"): boolean {
  if (!r || r.cliche !== false || r.resemblesKnownBrand !== false || r.readsAsLetters === false) return false;
  const s = ROUTE_CRITERIA.map((k) => clamp10(r.scores?.[k]));
  if (source === "local") return ["smallSizes", "simplicity", "coherence"].every((k) => clamp10(r.scores?.[k as keyof RouteReview["scores"]]) >= ROUTE_MIN_SCORE);
  // Lien avec l'activité ou le produit : exigence plus haute (un logo hors sujet n'est jamais montré).
  return s.every((x) => x >= ROUTE_MIN_SCORE) && clamp10(r.scores?.relevance) >= ROUTE_MIN_RELEVANCE && s.reduce((a, b) => a + b, 0) / s.length >= ROUTE_MIN_MEAN;
}

const CRITERION_FR: Record<string, string> = { originality: "originalité", memorability: "mémorisation", relevance: "pertinence", simplicity: "simplicité", smallSizes: "lisibilité à 16 px et en noir et blanc", coherence: "cohérence typo/couleur", distinctiveness: "singularité (pas de cliché du secteur)" };

/** Défauts rédhibitoires : ressemblance avec une marque existante, monogramme qui ne se lit pas comme des lettres. */
export const hardFail = (r: RouteReview) => r.resemblesKnownBrand === true || r.readsAsLetters === false;

/** Note globale d'une piste sur la grille (moyenne), pénalisée si c'est un cliché du secteur. */
export function routeScore(r: RouteReview): number {
  const s = ROUTE_CRITERIA.map((k) => clamp10(r.scores?.[k]));
  return s.reduce((a, b) => a + b, 0) / s.length - (r.cliche ? 1.5 : 0);
}

/** Consignes de reprise ciblée tirées de la grille. */
export function reviewFeedback(r: RouteReview): string {
  const low = ROUTE_CRITERIA.filter((k) => clamp10(r.scores?.[k]) < 7).map((k) => `${CRITERION_FR[k]} ${clamp10(r.scores?.[k])}/10`);
  return [
    r.cliche && "cliché du secteur : à remplacer par une idée propre à la marque",
    r.resemblesKnownBrand && "ressemble à un logo existant : changer de forme",
    r.readsAsLetters === false && "le monogramme ne se lit pas comme les lettres voulues",
    low.length && `notes faibles : ${low.join(", ")}`,
    ...(r.issues ?? []),
    r.fix && `piste de correction : ${r.fix}`,
  ]
    .filter(Boolean)
    .join(" ; ");
}

/**
 * Contrôle d'une piste de l'IA, traduit pour la barrière de qualité : note de la grille (pénalité de cliché et des
 * défauts de lisibilité relevés par le studio), critères, défauts fatals (ressemblance avec une marque, monogramme
 * illisible) et bloquants (cliché, promesse dans le texte), consignes de reprise.
 */
export function routeCheck(review: RouteReview, extra: { soft?: string[]; words?: string[] } = {}): CheckInput {
  const soft = extra.soft ?? [];
  const words = extra.words ?? [];
  return {
    checker: "ai",
    score: Math.max(0, routeScore(review) - soft.length),
    criteria: Object.fromEntries(ROUTE_CRITERIA.map((k) => [k, clamp10(review.scores?.[k])])),
    codes: [review.resemblesKnownBrand === true && "resembles_known_brand", review.readsAsLetters === false && "unreadable_letters", review.cliche !== false && "cliche", words.length && "claim", soft.length && "small_sizes"].filter((x): x is string => !!x),
    issues: [reviewFeedback(review), ...soft, words.length ? `texte à corriger : ${words.join(", ")} (aucune promesse, aucune formule creuse)` : ""].filter(Boolean),
  };
}

/** Version du studio : remplacement technique provisoire (jamais présentée comme une proposition créative validée). */
function placeholder(route: CreativeRoute): CreativeRoute {
  const d = decide("logo_route", { checker: "local", score: null });
  return { ...route, gate: { verdict: "PROVISIONAL", score: null, reason: d.reason, provisional: d.provisional } };
}

const ELEGANT = ["atelier", "galerie", "joaillerie"];
const BOLD = ["brut", "elan", "flux", "pop", "nocturne"];
const pair = (h: string) => FONT_PAIRS.find((p) => p.heading === h)!;

/** Couleurs d'une piste et rôles d'origine (pour suivre un changement de palette). */
export function colorsOf(pal: BrandPalette, ink: PaletteRole, accent: PaletteRole, ground: PaletteRole, tint: PaletteRole = "secondary") {
  return { colors: roleColors(pal, ink, accent, ground, tint), roles: { ink, accent, ground, tint } };
}

/**
 * Palette d'une autre piste : même structure que celle de la marque (principale, secondaire douce, accent, fond clair,
 * texte sombre), autre dominante (teinte tournée), pour que chaque piste ait son propre code couleur.
 */
export function paletteVariant(pal: BrandPalette, i: number): BrandPalette {
  if (!i) return pal;
  const shift = [0, 150, 215, 70][i % 4];
  const rot = (hex: string) => {
    const [h, s, l] = hsl(hex);
    return hslToHex(h + shift, Math.max(s, 0.4), Math.min(Math.max(l, 0.28), 0.55));
  };
  const primary = rot(pal.primary);
  const accent = rot(pal.accent);
  const [ph, ps] = hsl(primary);
  return { primary, secondary: hslToHex(ph, Math.min(0.35, ps), 0.86), accent, light: hslToHex(ph, 0.25, 0.965), dark: hslToHex(ph, 0.3, 0.1) };
}

const HEX = /^#[0-9a-f]{6}$/i;
/** Palette proposée par l'IA pour une piste (cinq codes valides), ou null. */
export function draftPalette(p: unknown): BrandPalette | null {
  const x = p as Partial<BrandPalette> | null;
  return x && (["primary", "secondary", "accent", "light", "dark"] as const).every((k) => HEX.test(String(x[k] ?? ""))) ? ({ primary: x.primary!, secondary: x.secondary!, accent: x.accent!, light: x.light!, dark: x.dark! } as BrandPalette) : null;
}

/** Couleurs d'une piste à partir des rôles de la palette de la marque (la boutique reste cohérente). */
export function roleColors(pal: BrandPalette, ink: PaletteRole, accent: PaletteRole, ground: PaletteRole, tint: PaletteRole = "secondary"): RouteColors {
  return safeColors({ ink: pal[ink], accent: pal[accent], ground: pal[ground], tint: pal[tint] });
}

const LIB_LABEL: Record<SymbolKind, [string, string]> = {
  leaf: ["feuille", "leaf"], drop: ["goutte", "drop"], hanger: ["cintre", "hanger"], orbit: ["orbite", "orbit"], bean: ["grain", "bean"], paw: ["patte", "paw"], arch: ["arche", "arch"], wave: ["vague", "wave"], facet: ["facette", "facet"], sun: ["soleil", "sun"], cup: ["tasse", "cup"], spark: ["étoile", "star"],
  car: ["voiture", "car"], wrench: ["clé", "wrench"], brush: ["pinceau", "brush"], scissors: ["ciseaux", "scissors"], house: ["maison", "house"], bolt: ["éclair", "bolt"], key: ["clé de porte", "key"],
};

/**
 * Pistes déjà montrées au client. « Nouvelles pistes » = changement radical : autre idée, autre typographie,
 * autre construction ou autre traitement des couleurs, jamais une simple variante de la série précédente.
 */
export type RouteAvoid = { name: string; why: string; heading: string; markKind: CreativeRoute["markKind"]; composition: CreativeRoute["composition"]; ground?: PaletteRole; accent?: PaletteRole };
export const avoidOf = (routes: CreativeRoute[]): RouteAvoid[] => routes.map((r) => ({ name: r.name, why: r.why, heading: r.heading, markKind: r.markKind, composition: r.composition, ground: r.roles?.ground, accent: r.roles?.accent }));
const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Trop proche d'une piste déjà montrée ? Raison (consigne de reprise), sinon null. */
export function tooClose(r: CreativeRoute, avoid: RouteAvoid[]): string | null {
  for (const a of avoid) {
    if (r.source === "ai" && norm(r.name) === norm(a.name)) return `même nom que la piste « ${a.name} » déjà montrée : il faut une idée nouvelle`;
    if (r.heading === a.heading) return `même typographie (${a.heading}) que la piste « ${a.name} » déjà montrée : changer de famille de caractères`;
    if (r.markKind === a.markKind && r.composition === a.composition && r.roles?.ground === a.ground && r.roles?.accent === a.accent) return `même construction et mêmes couleurs que « ${a.name} » : changer la composition ou le traitement des couleurs`;
  }
  return null;
}

/** Ordre de préférence des typographies selon l'univers, décalé à chaque nouvelle série et sans celles déjà montrées. */
function fontOrder(brand: BrandInput, variant: number, avoid: RouteAvoid[]): string[] {
  const elegant = ELEGANT.includes(brand.direction);
  const bold = BOLD.includes(brand.direction);
  const soft = ["enfants", "animaux", "alimentation"].includes(brand.sector ?? "");
  const pref = bold
    ? ["Archivo", "Bricolage Grotesque", "Chivo", "Montserrat", "Space Grotesk", "Playfair Display", "Jost", "Libre Baskerville"]
    : elegant
      ? ["Jost", "Cormorant", "Instrument Serif", "Playfair Display", "Libre Baskerville", "Lora", "Montserrat", "Space Grotesk"]
      : soft
        ? ["Jost", "Bricolage Grotesque", "Lora", "Instrument Serif", "Montserrat", "Playfair Display", "Chivo", "Libre Baskerville"]
        : ["Montserrat", "Playfair Display", "Libre Baskerville", "Space Grotesk", "Lora", "Archivo", "Instrument Serif", "Chivo", "Cormorant"];
  const shown = new Set(avoid.map((a) => a.heading));
  const free = pref.filter((h) => !shown.has(h));
  const list = free.length >= 3 ? free : pref;
  const k = variant ? (variant * 3) % list.length : 0;
  return [...list.slice(k), ...list.slice(0, k)];
}

/** Traitements de couleur (encre, accent, fond, teinte), dans l'ordre essayé ; décalés à chaque série. */
const TREATMENTS: [PaletteRole, PaletteRole, PaletteRole, PaletteRole][] = [
  ["dark", "primary", "primary", "secondary"],
  ["dark", "primary", "dark", "light"],
  ["dark", "accent", "accent", "secondary"],
  ["primary", "accent", "light", "secondary"],
  ["dark", "accent", "dark", "primary"],
  ["primary", "secondary", "primary", "light"],
];

/**
 * Pistes du studio, sans IA, dans l'ordre des emplacements : silhouette du produit (sinon pictogramme de la
 * bibliothèque, signalé comme générique), monogramme géométrique construit localement, logotype soigné.
 */
export async function localRoutes(brand: BrandInput, opts: { cutout: Buffer | null; library: SymbolKind; variant?: number; avoid?: RouteAvoid[]; icon?: { name: string; svg: string } | null }): Promise<Record<RouteKey, CreativeRoute[]>> {
  const pal = brand.palette;
  const elegant = ELEGANT.includes(brand.direction);
  const bold = BOLD.includes(brand.direction);
  // Nouvelle série (« Nouvelles pistes ») : autres typographies, autres cadres, autres traitements de couleur.
  const variant = opts.variant ?? 0;
  const avoid = opts.avoid ?? [];
  const fonts = fontOrder(brand, variant, avoid);
  const serifFirst = fonts.find((h) => CANVAS_FONTS[h]?.kind === "serif" && h !== fonts[0]) ?? fonts[1];
  const A = pair(fonts[0]);
  const B = pair(variant % 2 ? serifFirst : fonts[1]);
  const Cp = pair(fonts.find((h) => h !== A.heading && h !== B.heading)!);
  const treat = (slot: number, markKind: CreativeRoute["markKind"], composition: CreativeRoute["composition"]) => {
    for (let i = 0; i < TREATMENTS.length; i++) {
      const [ink, accent, ground, tint] = TREATMENTS[(variant + slot + i) % TREATMENTS.length];
      if (!avoid.some((a) => a.markKind === markKind && a.composition === composition && a.ground === ground && a.accent === accent)) return colorsOf(pal, ink, accent, ground, tint);
    }
    return colorsOf(pal, ...TREATMENTS[(variant + slot) % TREATMENTS.length]);
  };
  const produitComp: CreativeRoute["composition"] = variant % 2 ? "stacked" : "horizontal";
  const notes: string[] = [];
  const produit: CreativeRoute[] = [];
  if (opts.cutout) {
    const sil = await silhouetteSymbol(opts.cutout).catch((e) => ({ ok: false as const, reason: (e as Error).message }));
    if (sil.ok)
      produit.push({
        key: "produit",
        name: C("Silhouette", "Silhouette"),
        why: C(`Le symbole reprend la silhouette réelle du produit, simplifiée en aplat : on reconnaît l'objet d'un coup d'œil, jusque dans un onglet de navigateur. Le nom, en ${A.heading}, l'accompagne sans lui voler la vedette.`, `The symbol is the product's real silhouette, simplified into a solid shape: the object is recognizable at a glance, down to a browser tab. The name, set in ${A.heading}, supports it without stealing the show.`),
        source: "local",
        markKind: "silhouette",
        mark: sil.symbol,
        heading: A.heading,
        headingWeight: bold ? 800 : 600,
        body: A.body,
        case: "upper",
        tracking: 0.1,
        composition: produitComp,
        ...treat(0, "silhouette", produitComp),
        notes: [],
      });
    else notes.push(`silhouette écartée : ${sil.reason}`);
  }
  // Symbole du métier tiré de la bibliothèque d'icônes libres (Tabler, licence MIT) : rouleau, truelle, ciseaux…
  const icon = opts.icon ? sanitizeSymbolSvg(opts.icon.svg, { maxShapes: 3 }) : null;
  if (icon?.ok)
    produit.push({
      key: "produit",
      name: C("Symbole du métier", "Trade symbol"),
      why: C(`Un symbole qui dit votre métier au premier regard (icône libre « ${opts.icon!.name} », licence MIT), posé avec le nom en ${A.heading}. Lisible jusque dans un onglet de navigateur ; c'est une icône générique, pas un dessin exclusif à la marque.`, `A symbol that tells your trade at a glance (free icon "${opts.icon!.name}", MIT license), set with the name in ${A.heading}. Readable down to a browser tab; it is a generic icon, not a drawing exclusive to the brand.`),
      source: "local",
      markKind: "library",
      mark: fitSymbol(icon.symbol, 0.04),
      heading: A.heading,
      headingWeight: bold ? 800 : 600,
      body: A.body,
      case: variant % 2 ? "title" : "upper",
      tracking: 0.08,
      composition: produitComp,
      ...treat(0, "library", produitComp),
      notes: [],
    });
  const [fr, en] = LIB_LABEL[opts.library];
  produit.push({
    key: "produit",
    name: C("Pictogramme", "Pictogram"),
    why: C(`Version de secours : un pictogramme simple de la bibliothèque du studio (« ${fr} »), choisi d'après l'univers du produit. Il n'est pas propre à la marque : à remplacer par un symbole sur mesure dès que possible.`, `Fallback version: a simple pictogram from the studio library ("${en}"), chosen from the product's world, It isn't unique to the brand: replace it with a custom symbol when possible.`),
    source: "local",
    markKind: "library",
    mark: null,
    library: opts.library,
    heading: A.heading,
    headingWeight: bold ? 800 : 600,
    body: A.body,
    case: variant % 2 ? "title" : "upper",
    tracking: 0.08,
    composition: produitComp,
    ...treat(0, "library", produitComp),
    notes,
  });

  const concept: CreativeRoute[] = [];
  const baseFrames: MonogramFrame[] = CANVAS_FONTS[B.heading]?.kind === "serif" ? ["arch", "inversion", "disc", "corner"] : ["corner", "disc", "inversion"];
  const shift = variant % baseFrames.length;
  const frames: MonogramFrame[] = [...baseFrames.slice(shift), ...baseFrames.slice(0, shift)];
  const conceptComp: CreativeRoute["composition"] = variant % 2 ? "emblem" : "stacked";
  for (const frame of frames) {
    const mark = buildMonogram(brand.name, { family: B.heading, weight: B.weight, frame, tone: "accent" });
    if (!mark) continue;
    const letter = monogramLetter(brand.name);
    concept.push({
      key: "concept",
      name: C(`Monogramme ${letter}`, `${letter} monogram`),
      why: C(`L'initiale de ${brand.name}, en ${B.heading}, est découpée dans une forme géométrique : une marque compacte qui tient dans un avatar rond comme dans un onglet. Monogramme construit automatiquement par le studio, sans création par IA.`, `The initial of ${brand.name}, set in ${B.heading}, is cut out of a geometric shape: a compact mark that fits a round avatar as well as a browser tab. Monogram built automatically by the studio, not created by AI.`),
      source: "local",
      markKind: "monogram",
      mark,
      heading: B.heading,
      headingWeight: B.weight,
      body: B.body,
      case: (elegant ? 1 : 0) ^ (variant % 2) ? "upper" : "title",
      tracking: elegant ? 0.16 : 0.02,
      composition: conceptComp,
      ...treat(1, "monogram", conceptComp),
      notes: [],
    });
    break;
  }

  const typo: CreativeRoute[] = [];
  const letterMark = buildMonogram(brand.name, { family: Cp.heading, weight: Cp.weight, frame: "none", tone: "main", dot: true }) ?? buildMonogram(brand.name, { family: "Montserrat", weight: 800, frame: "none", tone: "main", dot: true });
  const baseCase: CreativeRoute["case"] = bold ? "upper" : elegant ? "title" : brand.name.length <= 8 ? "upper" : "title";
  const tcase: CreativeRoute["case"] = variant % 2 ? (baseCase === "upper" ? "title" : "upper") : baseCase;
  typo.push({
    key: "typo",
    name: C("Logotype", "Wordmark"),
    why: C(`Le nom seul, en ${Cp.heading}${tcase === "upper" ? " capitales" : ""}, ponctué d'un point dans la couleur d'accent : la marque s'impose par son nom, comme une affirmation. Dans les petits formats (avatar, favicon), l'initiale et son point prennent le relais.`, `The name alone, set in ${Cp.heading}${tcase === "upper" ? " capitals" : ""}, closed by a dot in the accent color: the brand stands on its name, like a statement. In small formats (avatar, favicon), the initial and its dot take over.`),
    source: "local",
    markKind: "letter",
    mark: letterMark,
    heading: Cp.heading,
    headingWeight: Cp.weight,
    body: Cp.body,
    case: tcase,
    tracking: tcase === "upper" ? (bold ? 0.04 : 0.14) : 0.01,
    composition: "wordmark",
    dot: true,
    // Première série — fond de couleur : l'accent s'il porte le blanc sans être assombri (sinon il tournerait au brun),
    // sinon la principale. Séries suivantes : autres traitements.
    ...(variant ? treat(2, "letter", "wordmark") : colorsOf(pal, "dark", "accent", contrast(pal.accent, "#FFFFFF") >= 3.5 ? "accent" : "primary")),
    notes: [],
  });
  return { produit, concept, typo };
}

/** Coupe un texte à `max` caractères au plus, en fin de phrase si possible, sinon sur un mot. */
function clipText(t: string, max: number, sentences = 2): string {
  const parts = t.match(/[^.!?…]+[.!?…]+["»”)]*\s*/g) ?? [t];
  let out = parts.slice(0, sentences).join("").trim() || t;
  if (out.length <= max) return out;
  out = out.slice(0, max);
  const cut = Math.max(out.lastIndexOf(". "), out.lastIndexOf(" "));
  return `${out.slice(0, cut > max * 0.6 ? cut : max).replace(/[\s,;:]+$/, "")}${/[.!?…]$/.test(out.slice(0, cut)) ? "" : "…"}`;
}

/**
 * Piste construite à partir du brief de l'IA. Les écarts de forme (texte trop long, police ou rôle de couleur hors
 * liste) sont corrigés sans jeter le dessin : seuls un SVG dangereux ou inexploitable font refuser la piste.
 * `soft` : défauts à signaler (lisibilité en petit) sans refuser — le contrôle visuel tranche.
 */
export function routeFromDraft(d: RouteDraft, brand: BrandInput): { ok: true; route: CreativeRoute; soft: string[] } | { ok: false; reason: string } {
  const no = (reason: string) => ({ ok: false as const, reason });
  if (!d || !ROUTE_KEYS.includes(d.key)) return no("piste inconnue");
  const typo = d.key === "typo";
  const fixes: string[] = [];
  let name = (d.name ?? "").trim();
  if (name.length > 40) { name = clipText(name, 40, 1).replace(/…$/, ""); fixes.push("nom raccourci"); }
  if (name.length < 2) name = typo ? L("Monogramme", "Monogram") : L("Proposition de l'IA", "AI proposal");
  let why = (d.why ?? "").trim();
  if (why.length > 360) { why = clipText(why, 360); fixes.push("justification raccourcie"); }
  if (why.length < 20) return no("« pourquoi ce logo » absent : deux phrases sur l'idée du symbole");
  const fallback = FONT_PAIRS[0];
  const heading = CANVAS_FONTS[d.heading] ? d.heading : (fixes.push(`police ${d.heading} remplacée`), fallback.heading);
  const body = CANVAS_FONTS[d.body] ? d.body : (fixes.push(`police ${d.body} remplacée`), fallback.body);
  const role = (r: PaletteRole, def: PaletteRole) => (ROLES.includes(r) ? r : (fixes.push("couleur hors palette remplacée"), def));
  const ink = role(d.ink, "dark");
  const accent = role(d.accent, "accent");
  const ground = role(d.ground, "light");
  // Palette propre à la piste quand l'IA en propose une (sinon celle de la marque, variée plus loin).
  const own = draftPalette((d as { palette?: unknown }).palette);
  const pal = own ?? brand.palette;
  const accentHex = pal[accent];
  const clean = sanitizeSymbolSvg(d.svg, { accent: accentHex, maxShapes: typo ? 5 : 3 });
  if (!clean.ok) return no(`SVG refusé par la validation : ${clean.reason}`);
  const mark: CustomSymbol = fitSymbol(clean.symbol, 0.04);
  const leg = symbolLegibility(mark);
  const soft = leg.ok ? [] : [`lisibilité en petit à améliorer : ${leg.issues.join(" ; ")} — formes plus grandes et plus simples, traits plus épais`];
  const composition = (["horizontal", "stacked", "emblem", "wordmark"] as const).includes(d.composition) ? d.composition : typo ? "wordmark" : "horizontal";
  const weights = Object.keys(CANVAS_FONTS[heading].file).map(Number);
  const weight = weights.reduce((a, b) => (Math.abs(b - d.headingWeight) < Math.abs(a - d.headingWeight) ? b : a), weights[0]);
  return {
    ok: true,
    soft,
    route: {
      key: d.key,
      name,
      why,
      source: "ai",
      markKind: typo ? "ai-monogram" : "ai-symbol",
      mark,
      heading,
      headingWeight: weight,
      body,
      case: (["upper", "title", "lower", "asis"] as const).includes(d.case) ? d.case : "upper",
      tracking: Math.max(0, Math.min(0.3, Number(d.tracking) || 0.04)),
      composition,
      // Logotype seul d'une piste typographique dont le monogramme a un détail d'accent : le nom reprend ce détail (point final).
      dot: typo && composition === "wordmark" && mark.shapes.some((x) => x.tone === "accent"),
      ...colorsOf(pal, ink, accent, ground, ground === "secondary" ? "light" : "secondary"),
      ...(own ? { palette: own } : {}),
      notes: fixes.length ? [`Corrigé automatiquement : ${fixes.join(", ")}.`] : [],
    },
  };
}

export type RoutesDesign = { routes: CreativeRoute[]; notes: string[]; ai: "used" | "unavailable" | "off" };

/**
 * Trois pistes passées par la barrière de qualité. Une piste de l'IA n'est proposée que si elle est FINAL (grille du
 * directeur de création au niveau, aucun défaut bloquant ni fatal). Sinon : reprise ciblée seulement avec un
 * diagnostic précis et dans la limite de la politique ; défaut fatal ou note trop basse : direction abandonnée ;
 * contrôle en panne : jamais proposée. L'emplacement reçoit alors la version du studio, marquée PROVISOIRE
 * (remplacement technique, pas une création validée).
 */
export async function designRoutes(input: { brand: BrandInput; cutout: Buffer | null; library: SymbolKind; icon?: { name: string; svg: string } | null; ai: CreativeAi | null; textIssues?: (text: string) => string[]; variant?: number; avoid?: RouteAvoid[]; keys?: RouteKey[]; record?: GateRecorder }): Promise<RoutesDesign> {
  const { brand, ai } = input;
  const avoid = input.avoid ?? [];
  const notes: string[] = [];
  const fallback = await localRoutes(brand, { cutout: input.cutout, library: input.library, icon: input.icon, variant: input.variant, avoid });
  const board = (route: CreativeRoute) => routeBoard({ route, brand, product: input.cutout });
  const out: CreativeRoute[] = [];
  let aiState: RoutesDesign["ai"] = ai ? "used" : "off";
  let drafts: RouteDraft[] = [];
  if (ai) {
    try {
      drafts = await ai.routes();
    } catch (e) {
      notes.push(`IA indisponible pour les pistes : ${(e as Error).message}`);
      aiState = "unavailable";
    }
  }
  for (const key of input.keys ?? ROUTE_KEYS) {
    let accepted: CreativeRoute | null = null;
    if (ai && aiState === "used") {
      let draft: RouteDraft | null = drafts.find((d) => d?.key === key) ?? null;
      let feedback = "";
      let prevCheck: string | null = null;
      for (let attempt = 0; attempt < MAX_ROUTE_DRAWS && !accepted; attempt++) {
        // Reprise ciblée : seule cette piste est redessinée, avec les défauts relevés.
        if (attempt > 0 || !draft) {
          try {
            draft = await ai.redraw(key, feedback || "piste absente de la première réponse", draft, attempt);
          } catch (e) {
            notes.push(`${key} : reprise impossible (${(e as Error).message})`);
            break;
          }
        }
        if (draft?.imageNote && !notes.some((n) => n.includes(draft!.imageNote!))) notes.push(`${key} : symbole non dessiné par l'IA d'images (${draft.imageNote})`);
        const built = routeFromDraft(draft!, brand);
        if (!built.ok) {
          notes.push(`${key} : piste de l'IA inexploitable (${built.reason})`);
          feedback = built.reason;
          continue;
        }
        const close = tooClose(built.route, [...avoid, ...avoidOf(out)]);
        if (close) {
          notes.push(`${key} : piste de l'IA trop proche d'une piste déjà montrée (${close})`);
          feedback = close;
          continue;
        }
        const words = input.textIssues?.(`${built.route.name}. ${built.route.why}`) ?? [];
        if (words.length) built.route.why = L(`Piste « ${built.route.name} » proposée par l'IA pour ${brand.name}.`, `“${built.route.name}” route proposed by the AI for ${brand.name}.`);
        let review: RouteReview | null = null;
        let error = "";
        try {
          review = await ai.review(built.route, await board(built.route), attempt);
        } catch (e) {
          error = (e as Error).message;
        }
        // Barrière de qualité : un contrôle en panne n'est jamais FINAL ; la piste n'est pas proposée.
        const d = decide("logo_route", review ? routeCheck(review, { soft: built.soft, words }) : { checker: "ai", score: null, error: error || "contrôle sans réponse" }, { attempt });
        prevCheck = input.record?.(d, key, prevCheck) ?? null;
        if (d.verdict === "FINAL") {
          accepted = { ...built.route, review, gate: { verdict: "FINAL", score: d.score, reason: d.reason, checkId: prevCheck } };
          break;
        }
        notes.push(`${key} : piste « ${built.route.name} » ${d.verdict === "RETRY" && d.action === "regenerate" ? "à reprendre" : "écartée"} (${d.reason}${d.feedback ? ` — ${d.feedback}` : ""})`);
        // Reprise seulement sur diagnostic précis ; défaut fatal, note trop basse ou contrôle en panne : on s'arrête.
        if (d.verdict !== "RETRY" || d.action !== "regenerate") break;
        feedback = d.feedback;
      }
    }
    if (!accepted) {
      // Version du studio : d'abord celles qui ne reprennent pas une piste déjà montrée. Provisoire.
      const cand = [...fallback[key].filter((c) => !tooClose(c, avoid)), ...fallback[key].filter((c) => tooClose(c, avoid))][0];
      if (cand) accepted = placeholder(cand);
      if (cand && ai && aiState === "used") notes.push(L(`${key} : aucune proposition de l'IA n'a franchi la barrière de qualité ; version du studio PROVISOIRE à la place.`, `${key}: no AI proposal passed the quality gate; PROVISIONAL studio version instead.`));
    }
    if (accepted) out.push(accepted);
    else notes.push(L(`${key} : aucune piste n'a atteint le niveau exigé ; elle n'est pas présentée.`, `${key}: no route reached the required standard; it isn't shown.`));
  }
  // Jamais aucune piste : le logotype du studio (pure typographie), provisoire.
  if (!out.length) {
    out.push(placeholder({ ...fallback.typo[0], notes: [...fallback.typo[0].notes, L("Seule proposition restante après contrôle.", "Only proposal left after review.")] }));
  }
  // Chaque piste a son propre code couleur : la première garde la palette de la marque, les autres une palette de
  // l'IA ou une variante d'une autre dominante (choisie, la palette de la piste devient celle de la marque).
  const used: number[] = [];
  const colored = out.map((r, i) => {
    let pal = r.palette ?? paletteVariant(brand.palette, i);
    const hue = hsl(pal.accent)[0];
    if (used.some((u) => Math.min(Math.abs(u - hue), 360 - Math.abs(u - hue)) < 35)) pal = paletteVariant(brand.palette, i + 1);
    used.push(hsl(pal.accent)[0]);
    const roles = r.roles;
    return roles ? { ...r, palette: pal, colors: roleColors(pal, roles.ink, roles.accent, roles.ground, roles.tint) } : { ...r, palette: pal };
  });
  return { routes: colored, notes: [...notes, ...fallback.produit.flatMap((r) => r.notes)], ai: aiState };
}
