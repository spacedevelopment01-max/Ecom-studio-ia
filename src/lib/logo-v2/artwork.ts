/**
 * Logo V2 — logo complet dessiné par l'IA d'images (« œuvre ») : le modèle d'images de l'usage « Logos » dessine le
 * logo ENTIER d'un territoire, dans son style (illustré, minimaliste, typographique, monogramme, emblème, texturé,
 * dégradé). L'image originale haute définition est le livrable principal : aucune vectorisation imposée, aucun
 * redessin en formes simplifiées. Une version SVG n'est proposée que si elle reproduit fidèlement le dessin.
 *
 * Contrôle adapté au style : une texture, plusieurs couleurs ou un détail illustré ne sont pas des défauts ; la
 * lisibilité se juge aux tailles réellement prévues pour ce style (une version simplifiée sert aux favicons, tampons
 * et broderies). Le nom exact reste vérifié lettre par lettre ; s'il est mal écrit, le studio le RÉÉCRIT avec une
 * vraie police à l'endroit indiqué par la relecture, sans redessiner l'illustration (gratuit).
 */
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
// @ts-expect-error — module sans types
import ImageTracer from "imagetracerjs";
import { ensureFonts, font } from "../media/fonts";
import { decide, type GateDecision } from "../quality/gate";
import { WEIGHT, nearestWeight } from "./territories";
import { fontsFor } from "./construct";
import { ART_CRITERIA, type ArtCriterion, type ArtworkReview, type BrandBrief, type LogoStyle, type Territory, type TextBox } from "./types";

// ---------------------------------------------------------------- demande au modèle d'images

/** Ce que chaque style demande au dessin (aucun style n'est la règle par défaut). */
export const STYLE_GUIDE: Record<LogoStyle, string> = {
  illustrated:
    "ILLUSTRATED logo: a crafted illustrative icon or scene of the trade, drawn with a confident, consistent line; several brand colours and refined shading are welcome; rich but controlled detail, like a premium agency illustration — never clip-art.",
  minimal:
    "MINIMAL logo: a reduced, intelligent sign (negative space, a clever cut, a single strong gesture), flat colours, precise geometry, and a clean wordmark; it must stay strong at small sizes.",
  typographic:
    "TYPOGRAPHIC logo: the name itself is the design — custom-feeling lettering, a ligature or a typographic detail linked to the trade, contrast of weights or of two colours; no separate icon, or only a tiny integrated accent.",
  monogram:
    "MONOGRAM logo: the initials built into a distinctive mark (interlaced, cut, stacked, or combined with an element drawn from THIS business only when it adds meaning), placed above or beside the full name in clean capitals.",
  emblem:
    "EMBLEM logo: a seal, crest or badge that encloses a symbol and the name, structured and balanced, with a heritage or artisanal presence; fine but legible details.",
  textured:
    "TEXTURED logo: a mark with a real material chosen to fit THIS business (for example ink, grain, letterpress, engraving or a hand-drawn stroke), in two tones of the palette; the name stays crisp and clean.",
  premium:
    "PREMIUM logo: restraint and precision — a refined serif or an elegant sans-serif, generous spacing, one discreet signature detail, one or two colours, a timeless high-end feel; no gimmicks, no fake luxury.",
  gradient:
    "MODERN GRADIENT logo: a contemporary mark with smooth gradients built from the brand colours, depth through overlapping translucent shapes, paired with a clean sans-serif wordmark.",
};

/** Noms du style pour l'interface (FR, EN). */
export const STYLE_LABEL: Record<LogoStyle, [string, string]> = {
  illustrated: ["Illustré", "Illustrated"],
  minimal: ["Minimaliste", "Minimal"],
  typographic: ["Typographique", "Typographic"],
  monogram: ["Monogramme", "Monogram"],
  emblem: ["Emblème / badge", "Emblem / badge"],
  textured: ["Texturé, artisanal", "Textured, artisanal"],
  gradient: ["Dégradés modernes", "Modern gradients"],
  premium: ["Premium, haut de gamme", "Premium, high-end"],
};

const COMPOSITION: Record<Territory["composition"], string> = {
  horizontal: "symbol on the left, name on the right",
  stacked: "symbol above the name, centered",
  wordmark_only: "the name alone (lettering), with any accent integrated into the letters",
  badge: "everything inside a badge or seal",
};
const TYPO: Record<Territory["typography"]["style"], string> = {
  geometric_sans: "geometric sans-serif",
  humanist_sans: "humanist sans-serif",
  grotesque: "grotesque sans-serif",
  high_contrast_serif: "high-contrast serif",
  classic_serif: "classic serif",
  contemporary_serif: "contemporary serif",
};

/** Texte que le logo doit montrer (nom exact, ligne d'activités réelle, slogan VALIDÉ par le client). */
export function artworkText(t: Territory, brief: BrandBrief) {
  return { name: brief.name, descriptor: t.descriptor, tagline: brief.tagline };
}

/**
 * Niveau de finition exigé, quel que soit le style (ce qui distinguait l'essai direct réussi des demandes du studio :
 * une vraie exigence de dessin, pas une liste d'options).
 */
export const QUALITY_BAR =
  "Quality bar: a real agency-quality logo, drawn with care and personality, every element deliberate; refined details and a precise finish; a deliberate typographic treatment of the name (weights, spacing, hierarchy with the activity line), not a default font simply typed; balanced proportions; a mark that could only belong to this business and would not look out of place in a premium branding portfolio.";

/**
 * Concepts pauvres, refusés pour toutes les marques (la simplicité reste permise quand elle porte une vraie idée).
 * Mots génériques seulement : aucun objet ni métier d'un client.
 */
export const POOR_CONCEPTS =
  "Avoid poor concepts: a plain circle, triangle or rounded square used as the symbol with no graphic idea; a generic stamp or seal with no personality; letters simply placed inside a square or circle frame; a standard font with no composition; a symbol that could belong to any company; decoration added without intent; stock-icon clichés. Simple shapes are welcome only when they carry a real idea (a cut, a negative space, a construction, a double reading).";

/** Partie du brief de direction artistique gardée dans la limite de taille de la demande (le texte exact reste entier). */
const fitBrief = (brief: string, room: number) => (Buffer.byteLength(brief, "utf8") <= room ? brief : `${Buffer.from(brief, "utf8").subarray(0, Math.max(0, room - 3)).toString("utf8").replace(/\uFFFD+$/, "").replace(/\s+\S*$/, "")}…`);

/** Demande complète au modèle d'images pour un territoire (en anglais : langue la mieux suivie par ces modèles). */
export function artworkPrompt(t: Territory, brief: BrandBrief, feedback?: string): string {
  const pal = brief.palette;
  const ink = pal[t.colorRole.ink];
  const accent = pal[t.colorRole.accent];
  const others = [...new Set(Object.values(pal))].filter((c) => c !== ink && c !== accent).slice(0, 3);
  const txt = artworkText(t, brief);
  const caseWord = t.typography.case === "upper" ? "capitals" : t.typography.case === "lower" ? "lowercase" : "title case";
  // Couleurs : celles de la direction quand la palette n'est pas validée (choisies pour la marque), sinon la palette.
  const own = !brief.paletteLocked && t.colors?.length ? t.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 4) : [];
  const colours = own.length
    ? `Colours: ${own.join(", ")} (chosen for this direction)${t.style === "gradient" ? "; gradients are built only from these colours" : ""}; white or near-black only if needed.`
    : `Colours: the brand palette — main ink ${ink}, accent ${accent}${others.length ? `, also available ${others.join(", ")}` : ""}${t.style === "gradient" ? "; gradients are built only from these colours" : ""}; white or near-black only if needed.`;
  const end = (x: string) => x.trim().replace(/[.\s]+$/, "");
  const who = [brief.positioning ? `Positioning: ${end(brief.positioning)}.` : "", brief.audience ? `Clients: ${end(brief.audience)}.` : "", brief.personality.length ? `Personality: ${brief.personality.slice(0, 4).join(", ")}.` : ""].filter(Boolean).join(" ");
  // Avec un brief de direction artistique, c'est lui qui décrit le dessin, la composition et la typographie : les
  // lignes génériques ne sont pas répétées (elles le contrediraient).
  const briefed = !!t.imageBrief?.trim();
  const head = [
    `Design a complete, professional logo for the brand "${brief.name}" (${brief.trade.label || brief.activity}${brief.activities.length ? `: ${brief.activities.slice(0, 3).join(", ")}` : ""}), as a top branding agency would present it — the logo artwork only, not a mockup.`,
    who,
    `Creative direction "${t.name}": ${t.concept}`,
  ];
  const tail = [
    `Style: ${STYLE_GUIDE[t.style]}`,
    !briefed && t.symbolIdea ? `Symbol idea: ${t.symbolIdea}.` : "",
    !briefed && t.distinctive ? `What makes it memorable: ${t.distinctive}.` : "",
    briefed ? "" : `Composition: ${COMPOSITION[t.composition]}. Typography: ${TYPO[t.typography.style]}, ${t.typography.weight} weight, ${caseWord}, ${t.typography.tracking} letter-spacing.`,
    colours,
    `Text in the logo, spelled EXACTLY with the same accents and spaces: the name "${txt.name}"${txt.descriptor ? `, and smaller, the activity line "${txt.descriptor}"` : ""}${txt.tagline ? `, and smallest, the slogan "${txt.tagline}"` : ""}. No other words, no slogan${txt.tagline ? " other than this one" : ""}, no fake or extra letters.`,
    briefed
      ? `${t.avoid.length ? `Also avoid: ${t.avoid.slice(0, 6).join(", ")}. ` : ""}Never copy or imitate an existing logo.`
      : `Nothing is imposed: no shape, object, initials, texture or composition is required beyond this direction. An object or gesture of this business${brief.trade.objects.length ? ` (here, for example: ${brief.trade.objects.slice(0, 3).join(", ")})` : ""} may be used when it is integrated in an original, professional way.${t.avoid.length ? ` Also avoid: ${t.avoid.slice(0, 6).join(", ")}.` : ""} Never copy or imitate an existing logo.`,
    QUALITY_BAR,
    POOR_CONCEPTS,
    feedback ? `Requested changes for this new version: ${feedback}.` : "",
    "No people: no person, face, hands or human silhouette.",
    "Output: crisp edges, centered, generous margins, on a plain transparent or pure white background. No mockup, no paper, no wall, no photo, no frame around the canvas.",
  ];
  // Brief de direction artistique écrit pour le modèle d'images : la place qui reste lui revient (le texte exact,
  // les règles et la sortie ne sont jamais coupés).
  const fixed = [...head, ...tail].filter(Boolean).join("\n");
  const room = PROMPT_BUDGET - Buffer.byteLength(fixed, "utf8") - 20;
  const art = t.imageBrief?.trim() ? `Art direction: ${fitBrief(t.imageBrief.trim(), room)}` : "";
  return [...head, art, ...tail].filter(Boolean).join("\n");
}

/** Taille maximale d'une demande (même borne que le devis : LOGO_PROMPT_MAX_BYTES du moteur multimédia). */
const PROMPT_BUDGET = 3800;

// ---------------------------------------------------------------- image : nettoyage, planche

/** Fond blanc retiré (modèles sans transparence) puis recadrage serré avec une marge — le dessin n'est pas touché. */
export async function cleanArtwork(img: Buffer): Promise<Buffer> {
  const meta = await sharp(img).metadata();
  let png = img;
  // Fond à retirer : image sans transparence réelle (pas de canal alpha, ou canal alpha entièrement opaque).
  const opaque = !meta.hasAlpha || (await sharp(img).ensureAlpha().stats()).channels[3].min === 255;
  if (opaque) {
    const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 4) if (data[i] > 242 && data[i + 1] > 242 && data[i + 2] > 242) data[i + 3] = 0;
    png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  }
  const trimmed = await sharp(png).trim({ threshold: 5 }).png().toBuffer().catch(() => png);
  const m = await sharp(trimmed).metadata();
  const pad = Math.round(Math.max(m.width ?? 0, m.height ?? 0) * 0.06) + 8;
  return sharp(trimmed).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
}

/** Tailles réellement prévues pour chaque style (largeur en pixels) : en-tête de site, carte, et petit format si le style le promet. */
export const INTENDED_SIZES: Record<LogoStyle, { widths: number[]; uses: string }> = {
  illustrated: { widths: [360, 180], uses: "en-tête de site, carte de visite, véhicule, enseigne (une version simplifiée sert au favicon)" },
  textured: { widths: [360, 180], uses: "en-tête de site, carte de visite, enseigne (une version simplifiée sert au favicon et au tampon)" },
  emblem: { widths: [360, 160], uses: "étiquettes, en-tête de site, tampon (une version simplifiée sert au favicon)" },
  gradient: { widths: [360, 160], uses: "site, application, réseaux sociaux (une version simplifiée sert à l'impression une couleur)" },
  premium: { widths: [360, 160, 80], uses: "étiquettes, emballages, site, papeterie" },
  minimal: { widths: [360, 160, 64], uses: "tous supports, y compris en petit" },
  monogram: { widths: [360, 160, 64], uses: "tous supports ; le monogramme seul sert en petit" },
  typographic: { widths: [360, 160, 80], uses: "tous supports ; le nom doit rester lisible en petit" },
};

/** Planche de relecture d'un logo complet : grand format sur fond neutre et sur blanc, sur fond sombre, puis aux tailles prévues. */
export async function artworkBoard(png: Buffer, style: LogoStyle): Promise<Buffer> {
  const fit = (w: number, h: number) => sharp(png).resize({ width: w, height: h, fit: "inside" }).png().toBuffer();
  const cell = async (w: number, h: number, bg: string, img: Buffer) => sharp({ create: { width: w, height: h, channels: 4, background: bg } }).composite([{ input: img, gravity: "center" }]).png().toBuffer();
  const a = await cell(900, 860, "#F4F3EF", await fit(820, 800));
  const b = await cell(680, 420, "#FFFFFF", await fit(600, 380));
  const c = await cell(680, 420, "#16161A", await fit(600, 380));
  const sizes = INTENDED_SIZES[style].widths;
  const row = await Promise.all(sizes.map((w) => fit(w, Math.round(w * 0.7))));
  let x = 30;
  const comps = row.map((input, i) => {
    const o = { input, left: x, top: 40 + Math.round((260 - Math.round(sizes[i] * 0.7)) / 2) };
    x += sizes[i] + 40;
    return o;
  });
  const d = await sharp({ create: { width: Math.max(x, 680), height: 340, channels: 4, background: "#FFFFFF" } }).composite(comps).png().toBuffer();
  return sharp({ create: { width: 1619, height: 1250, channels: 4, background: "#DADAD6" } })
    .composite([
      { input: a, left: 13, top: 13 },
      { input: b, left: 926, top: 13 },
      { input: c, left: 926, top: 446 },
      { input: d, left: 13, top: 893 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

// ---------------------------------------------------------------- contrôle adapté au style

/**
 * Poids des critères selon le style : un logo illustré est jugé d'abord sur le métier de l'illustration et la
 * pertinence, un signe minimaliste aussi sur sa tenue en petit, un logo typographique d'abord sur la typographie.
 */
export const STYLE_WEIGHTS: Record<LogoStyle, Record<ArtCriterion, number>> = {
  illustrated: { relevance: 1.3, originality: 1.1, craft: 1.5, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 0.8 },
  textured: { relevance: 1.2, originality: 1.1, craft: 1.5, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 0.8 },
  emblem: { relevance: 1.2, originality: 1, craft: 1.3, typography: 1.1, composition: 1.3, colour: 1, legibility: 1, memorability: 1.1, distinctiveness: 1.2, intendedUse: 0.9 },
  gradient: { relevance: 1.1, originality: 1.2, craft: 1.3, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 0.9 },
  premium: { relevance: 1.1, originality: 1.1, craft: 1.3, typography: 1.5, composition: 1.2, colour: 1, legibility: 1.1, memorability: 1.1, distinctiveness: 1.2, intendedUse: 1 },
  minimal: { relevance: 1.2, originality: 1.3, craft: 1.1, typography: 1.1, composition: 1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 1.2 },
  monogram: { relevance: 1.1, originality: 1.3, craft: 1.2, typography: 1.2, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 1.1 },
  typographic: { relevance: 1.1, originality: 1.2, craft: 1.1, typography: 1.6, composition: 1.1, colour: 1, legibility: 1.2, memorability: 1.1, distinctiveness: 1.2, intendedUse: 1 },
};

export function artworkScore(r: Pick<ArtworkReview, "criteria">, style: LogoStyle): number {
  const w = STYLE_WEIGHTS[style];
  const tot = ART_CRITERIA.reduce((s, k) => s + w[k], 0);
  return Math.round((ART_CRITERIA.reduce((s, k) => s + r.criteria[k] * w[k], 0) / tot) * 10) / 10;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase("fr-FR");

/** Défauts relevés par la relecture d'un logo complet. Le nom est comparé à la lecture, accents compris. */
export function artworkCodes(r: ArtworkReview, expected: { name: string }): string[] {
  const codes: string[] = [];
  if (!r.nameExact || !squash(r.textRead).includes(squash(expected.name))) codes.push("name_mismatch");
  if (r.extraText) codes.push("extra_text");
  if (r.clumsyCliche) codes.push("cliche");
  if (r.resemblesKnownBrand) codes.push("resembles_known_brand");
  if (r.amateur) codes.push("amateur");
  if (r.artifacts) codes.push("artifacts");
  if (r.genericConcept) codes.push("generic_concept");
  return codes;
}

/** Verdict de la barrière pour un logo complet (critères du style, nom exact, défauts bloquants et fatals). */
export function gateArtwork(r: ArtworkReview, t: Territory, expected: { name: string }, attempt: number): GateDecision {
  return decide("logo_artwork", { checker: "ai", score: artworkScore(r, t.style), criteria: r.criteria, codes: artworkCodes(r, expected), issues: r.issues }, { attempt });
}

export const ARTWORK_REVIEW_SYSTEM = (style: LogoStyle) => `Rôle : directeur de création exigeant d'une grande agence de branding. Tu juges UN logo complet dessiné par une IA d'images avant qu'il soit présenté au client, sur une planche : grand format sur fond neutre, sur blanc, sur fond sombre, puis aux tailles prévues pour ce style.
Style demandé : ${style}. Juge-le selon CE style : ${STYLE_GUIDE[style]}
Une texture, plusieurs couleurs, des dégradés ou un détail illustré ne sont PAS des défauts quand le style les demande. La lisibilité se juge aux usages réellement prévus (${INTENDED_SIZES[style].uses}), pas à 16 px pour un logo illustré : une version simplifiée distincte servira aux favicons, tampons et broderies.
Un objet ou un geste du métier de CETTE entreprise, bien intégré, est permis (jamais exigé) ; « clumsyCliche » = seulement un cliché MALADROIT (icône de banque d'images, assemblage convenu, rendu clip-art).
Note de 0 à 10 : relevance (évoque CETTE entreprise, son positionnement et sa clientèle), originality, craft (qualité d'exécution du dessin : traits, matière, cohérence, finition), typography (choix, dessin et traitement du texte : graisses, approches, hiérarchie nom / activité), composition (équilibre, proportions, hiérarchie), colour (accord et cohérence des couleurs, contraste), legibility (le nom se lit d'un coup d'œil aux tailles prévues), memorability, distinctiveness (n'appartient qu'à CETTE marque, se distingue des logos du secteur), intendedUse (tient aux usages professionnels prévus).
« genericConcept » = true quand la proposition repose SEULEMENT sur une forme banale sans idée : un cercle, un triangle ou un carré arrondi sans travail graphique, un cachet sans personnalité, des initiales simplement posées dans un cadre, une police standard sans composition, un symbole interchangeable entre plusieurs entreprises, une décoration ajoutée sans intention. Une forme simple portée par une vraie idée graphique (coupe, réserve, construction, double lecture) n'est PAS un concept pauvre : on refuse l'absence de créativité, pas la simplicité.
Lis tout le texte du logo LETTRE PAR LETTRE, accents compris, et recopie-le exactement dans « textRead ». « nameExact » : le nom attendu y figure exactement. « extraText » : un mot non autorisé (slogan inventé, lettres parasites). « nameBox » : rectangle du NOM seul en fractions de l'image (x, y, largeur, hauteur entre 0 et 1), ou null.
« artifacts » : lettres fantômes, formes fondues, détails incohérents typiques d'une IA. « resemblesKnownBrand » : rappelle un logo connu. « amateur » : rendu de générateur, déséquilibré, daté.
Sois strict : 8 se mérite ; un logo seulement correct n'est pas présenté. Ne relève pas une note pour faire passer un logo moyen. « issues » : défauts concrets et précis (ce qui ne va pas, où, pourquoi), jamais des généralités. « fix » : LA correction la plus utile pour une nouvelle version — cible (symbol, typography, composition, colour, concept) et consigne précise qui change vraiment la proposition (ex. « symbole trop générique : remplacer le cadre par une construction des deux lettres en réserve », « référence au métier trop littérale : garder le geste, abandonner l'objet ») ; « none » si rien à corriger. « needsSimplifiedMark » : une version simplifiée est-elle nécessaire pour les petites tailles ?`;

// ---------------------------------------------------------------- correction du texte sans redessin

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Couleur d'encre la plus présente dans une zone (pixels opaques), arrondie. */
async function dominantInk(png: Buffer, box: { left: number; top: number; width: number; height: number }): Promise<string> {
  const { data } = await sharp(png).ensureAlpha().extract(box).raw().toBuffer({ resolveWithObject: true });
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 160) continue;
    const k = [data[i], data[i + 1], data[i + 2]].map((v) => Math.min(255, Math.round(v / 16) * 16)).join(",");
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!best) return "#1A1A1A";
  return `#${best.split(",").map((v) => Number(v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Nom réécrit par le studio, au même endroit : la zone du nom indiquée par la relecture est effacée, puis le nom
 * EXACT est posé avec une vraie police du style du territoire, dans la couleur d'encre trouvée sur place. Le reste
 * du dessin n'est pas touché. Renvoie null si la zone est inexploitable.
 */
export async function correctArtworkText(png: Buffer, box: TextBox, t: Territory, brief: BrandBrief): Promise<Buffer | null> {
  const meta = await sharp(png).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H || box.w <= 0.05 || box.h <= 0.02) return null;
  const pad = 0.012;
  const x0 = Math.floor(clamp01(box.x - pad) * W);
  const y0 = Math.floor(clamp01(box.y - pad) * H);
  const x1 = Math.ceil(clamp01(box.x + box.w + pad) * W);
  const y1 = Math.ceil(clamp01(box.y + box.h + pad) * H);
  const bw = x1 - x0;
  const bh = y1 - y0;
  if (bw < 20 || bh < 8) return null;
  const ink = await dominantInk(png, { left: x0, top: y0, width: bw, height: bh });
  // Zone du nom effacée (transparente).
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[(y * info.width + x) * 4 + 3] = 0;
  const erased = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  // Nom exact, vraie police : la plus grande taille qui tient dans la zone.
  ensureFonts();
  const family = fontsFor(t, brief)[0] ?? "Inter";
  const weight = nearestWeight(family, WEIGHT[t.typography.weight]);
  const text = t.typography.case === "upper" ? brief.name.toLocaleUpperCase("fr-FR") : t.typography.case === "lower" ? brief.name.toLocaleLowerCase("fr-FR") : brief.name;
  const c = createCanvas(bw, bh);
  const ctx = c.getContext("2d");
  let size = Math.floor(bh * 0.9);
  for (; size > 6; size--) {
    ctx.font = font(family, weight, size);
    const m = ctx.measureText(text);
    if (m.width <= bw * 0.96 && m.actualBoundingBoxAscent + m.actualBoundingBoxDescent <= bh * 0.9) break;
  }
  ctx.font = font(family, weight, size);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bw / 2, bh / 2);
  const layer = await c.encode("png");
  return sharp(erased).composite([{ input: Buffer.from(layer), left: x0, top: y0 }]).png().toBuffer();
}

// ---------------------------------------------------------------- version vectorielle FACULTATIVE (fidèle ou rien)

/** Fidélité minimale d'une version SVG (part des pixels du dessin reproduits à l'identique). */
export const SVG_FIDELITY = 0.96;

/**
 * Version SVG seulement si elle reproduit fidèlement le dessin : aplats de 4 couleurs au plus (une texture ou un
 * dégradé ne se vectorise pas fidèlement), chaque couleur vectorisée puis le résultat recomparé pixel par pixel.
 */
export async function faithfulSvg(png: Buffer): Promise<{ ok: true; svg: string; fidelity: number } | { ok: false; reason: string }> {
  const { data, info } = await sharp(png).ensureAlpha().resize({ width: 512, height: 512, fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const N = info.width * info.height;
  const q = (v: number) => Math.round(v / 24) * 24;
  const hist = new Map<string, number>();
  let opaque = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    opaque++;
    const k = `${q(data[i])},${q(data[i + 1])},${q(data[i + 2])}`;
    hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  if (opaque < N * 0.01) return { ok: false, reason: "image vide" };
  const top = [...hist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const covered = top.reduce((s, [, n]) => s + n, 0) / opaque;
  if (covered < 0.93) return { ok: false, reason: `dégradés, textures ou nuances (${Math.round(covered * 100)} % du dessin en 4 aplats) : une version vectorielle ne serait pas fidèle` };
  const colours = top.filter(([, n]) => n / opaque > 0.01).map(([k]) => k.split(",").map(Number));
  const nearest = (r: number, g: number, b: number) => colours.reduce((best, c, i) => ((c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2 < (colours[best][0] - r) ** 2 + (colours[best][1] - g) ** 2 + (colours[best][2] - b) ** 2 ? i : best), 0);
  const label = new Int16Array(N).fill(-1);
  for (let p = 0; p < N; p++) if (data[p * 4 + 3] >= 128) label[p] = nearest(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
  const paths: string[] = [];
  for (const [ci, c] of colours.entries()) {
    const mask = new Uint8ClampedArray(N * 4);
    for (let p = 0; p < N; p++) {
      const v = label[p] === ci ? 0 : 255;
      mask[p * 4] = mask[p * 4 + 1] = mask[p * 4 + 2] = v;
      mask[p * 4 + 3] = 255;
    }
    const svg: string = ImageTracer.imagedataToSVG(
      { width: info.width, height: info.height, data: mask },
      { numberofcolors: 2, colorsampling: 0, pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], ltres: 1, qtres: 1, pathomit: 8, roundcoords: 1, blurradius: 0, viewbox: true, desc: false },
    );
    const ds = [...svg.matchAll(/<path fill="rgb\(0,0,0\)"[^>]*\sd="([^"]+)"/g)].map((m) => m[1].trim());
    if (ds.length) paths.push(`<path fill="#${c.map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("")}" fill-rule="evenodd" d="${ds.join(" ").replace(/\s+/g, " ")}"/>`);
  }
  if (!paths.length) return { ok: false, reason: "aucune forme vectorisable" };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${info.width} ${info.height}">${paths.join("")}</svg>`;
  // Recomparaison : la version vectorielle rendue doit retrouver le dessin (forme ET couleur) presque partout.
  const back = await sharp(Buffer.from(svg)).resize(info.width, info.height).ensureAlpha().raw().toBuffer();
  let same = 0;
  let inked = 0;
  for (let p = 0; p < N; p++) {
    const a = data[p * 4 + 3] >= 128;
    const b = back[p * 4 + 3] >= 128;
    if (!a && !b) continue;
    inked++;
    if (a && b && label[p] >= 0) {
      const c = colours[label[p]];
      if (Math.abs(back[p * 4] - c[0]) + Math.abs(back[p * 4 + 1] - c[1]) + Math.abs(back[p * 4 + 2] - c[2]) < 60) same++;
    }
  }
  const fidelity = inked ? same / inked : 0;
  return fidelity >= SVG_FIDELITY ? { ok: true, svg, fidelity } : { ok: false, reason: `version vectorielle trop éloignée du dessin (${Math.round(fidelity * 100)} % fidèle, ${Math.round(SVG_FIDELITY * 100)} % exigé)` };
}
