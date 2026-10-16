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
    "Logo ILLUSTRÉ : une icône ou une petite scène du métier, dessinée d'un trait sûr et régulier ; plusieurs couleurs de la marque et des ombres fines sont bienvenues ; des détails riches mais maîtrisés, comme une illustration d'agence haut de gamme, jamais une image de banque.",
  minimal:
    "Logo MINIMALISTE : un signe réduit et intelligent (un vide qui dessine une forme, une coupe habile, un seul geste fort), des aplats de couleur, une géométrie précise et un nom net ; il reste fort en petite taille.",
  typographic:
    "Logo TYPOGRAPHIQUE : le nom lui-même est le dessin, un lettrage qui semble fait sur mesure, une ligature ou un détail de lettre lié au métier, un contraste de graisses ou de deux couleurs ; pas d'icône séparée, au plus un petit accent intégré aux lettres.",
  monogram:
    "Logo MONOGRAMME : les initiales construites en une marque singulière (entrelacées, coupées, superposées, ou réunies avec un élément propre à CETTE entreprise quand il apporte du sens), placée au-dessus ou à côté du nom complet en capitales nettes.",
  emblem:
    "Logo EMBLÈME : un sceau, un blason ou un badge qui réunit un symbole et le nom, structuré et équilibré, avec une présence artisanale ou patrimoniale ; des détails fins mais lisibles.",
  textured:
    "Logo TEXTURÉ : une marque avec une vraie matière choisie pour CETTE entreprise (par exemple encre, grain, impression typographique, gravure ou trait à la main), en deux tons de la palette ; le nom reste net et propre.",
  premium:
    "Logo PREMIUM : retenue et précision, un empattement raffiné ou une linéale élégante, un interlettrage généreux, un seul détail signature discret, une ou deux couleurs, une allure haut de gamme intemporelle, sobre et sans artifice.",
  gradient:
    "Logo À DÉGRADÉS MODERNES : une marque contemporaine aux dégradés doux tirés des couleurs de la marque, de la profondeur par des formes translucides superposées, avec un nom en linéale nette.",
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
  horizontal: "symbole à gauche, nom à droite",
  stacked: "symbole au-dessus du nom, centré",
  wordmark_only: "le nom seul (lettrage), tout accent étant intégré aux lettres",
  badge: "le tout dans un badge ou un sceau",
};
const WEIGHT_FR: Record<string, string> = { light: "légère", regular: "normale", medium: "moyenne", semibold: "demi-grasse", bold: "grasse", black: "très grasse" };
const TYPO: Record<Territory["typography"]["style"], string> = {
  geometric_sans: "linéale géométrique",
  humanist_sans: "linéale humaniste",
  grotesque: "linéale grotesque",
  high_contrast_serif: "police à empattements très contrastée",
  classic_serif: "police à empattements classique",
  contemporary_serif: "police à empattements contemporaine",
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
  "Niveau attendu : un vrai logo d'agence, dessiné avec soin et personnalité, chaque élément voulu ; des détails raffinés et une finition précise ; un vrai travail typographique du nom (graisses, espacement, hiérarchie avec la ligne d'activités), pas une police par défaut simplement tapée ; des proportions équilibrées ; une marque qui ne pourrait appartenir qu'à cette entreprise et tiendrait sa place dans un portfolio d'agence haut de gamme.";

/**
 * Concepts pauvres, refusés pour toutes les marques (la simplicité reste permise quand elle porte une vraie idée).
 * Mots génériques seulement : aucun objet ni métier d'un client.
 */
export const POOR_CONCEPTS =
  "Concepts pauvres à écarter : un simple cercle, triangle ou carré arrondi en guise de symbole, sans idée graphique ; un cachet ou un sceau générique sans personnalité ; des lettres simplement posées dans un cadre carré ou rond ; une police standard sans composition ; un symbole qui pourrait appartenir à n'importe quelle entreprise ; une décoration sans intention ; les clichés d'icônes de banque d'images. Une forme simple n'est bienvenue que si elle porte une vraie idée (une coupe, un vide qui dessine, une construction, une double lecture).";

/** Partie du brief de direction artistique gardée dans la limite de taille de la demande (le texte exact reste entier). */
const fitBrief = (brief: string, room: number) => (Buffer.byteLength(brief, "utf8") <= room ? brief : `${Buffer.from(brief, "utf8").subarray(0, Math.max(0, room - 3)).toString("utf8").replace(/\uFFFD+$/, "").replace(/\s+\S*$/, "")}…`);

/**
 * Demande complète au modèle d'images pour un territoire, EN FRANÇAIS (règle du propriétaire : consignes concrètes,
 * seuls les textes à écrire dans le logo entre guillemets — le nom de la direction n'en a pas, pour ne pas être écrit).
 */
export function artworkPrompt(t: Territory, brief: BrandBrief, feedback?: string): string {
  const pal = brief.palette;
  const ink = pal[t.colorRole.ink];
  const accent = pal[t.colorRole.accent];
  const txt = artworkText(t, brief);
  const upper = t.typography.case === "upper";
  // Couleurs : celles de la direction quand la palette n'est pas validée (choisies pour la marque), sinon la palette.
  const own = !brief.paletteLocked && t.colors?.length ? t.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 3) : [];
  const colours = own.length ? `Couleurs : ${own.join(", ")}.` : `Couleurs : ${[...new Set([ink, accent])].join(" et ")}, tirées de la palette de la marque.`;
  const end = (x: string) => x.trim().replace(/[.\s]+$/, "");
  const trade = brief.trade.label || brief.activity;
  const acts = brief.activities.filter((a) => a.toLowerCase() !== trade.toLowerCase()).slice(0, 3);
  const name = upper ? txt.name.toLocaleUpperCase("fr-FR") : txt.name;
  // Même forme que l'essai direct réussi : peu de consignes, toutes positives, une marque forte décrite précisément.
  // Le brief de direction artistique décrit le dessin ; sans brief, la direction, le style et l'idée de symbole.
  const art = t.imageBrief?.trim()
    ? `Un vrai logo d'agence : ${end(briefWithoutText(t.imageBrief.trim(), brief.name))}.`
    : [
        `Un vrai logo d'agence, direction créative ${t.name} : ${end(t.concept)}.`,
        `Style : ${STYLE_GUIDE[t.style]}`,
        t.symbolIdea ? `Idée du symbole : ${end(t.symbolIdea)}.` : "",
        `Composition : ${COMPOSITION[t.composition]}. Typographie : ${TYPO[t.typography.style]}, graisse ${WEIGHT_FR[t.typography.weight] ?? t.typography.weight}.`,
      ]
        .filter(Boolean)
        .join("\n");
  const lines = [
    `Dessine un beau logo professionnel pour « ${brief.name} », ${trade}${acts.length ? ` (${acts.join(", ")})` : ""}.`,
    art,
    colours,
    `Le nom, parfaitement lisible${upper ? ", en capitales" : ""} : « ${name} »${txt.descriptor ? ` ; plus petite et espacée en dessous, la ligne d'activités : « ${txt.descriptor} »` : ""}${txt.tagline ? ` ; en plus petit encore, le slogan : « ${txt.tagline} »` : ""}.`,
    "Chaque mot écrit exactement, lettre par lettre, avec ses accents. Aucun autre texte.",
    feedback ? `Changements pour cette version : ${end(feedback)}.` : "",
    "Logo centré, marges généreuses, fond blanc uni, dessin du logo à plat seulement : aucune maquette, aucun mur, aucun papier, aucune photo, aucune personne.",
  ];
  const fixed = lines.filter(Boolean).join("\n");
  // Taille bornée (devis) : seul le brief est raccourci, jamais le texte exact ni la sortie.
  if (Buffer.byteLength(fixed, "utf8") <= PROMPT_BUDGET) return fixed;
  const room = PROMPT_BUDGET - (Buffer.byteLength(fixed, "utf8") - Buffer.byteLength(art, "utf8")) - 20;
  return lines.map((l) => (l === art ? fitBrief(art, room) : l)).filter(Boolean).join("\n");
}

/** Taille maximale d'une demande (même borne que le devis : LOGO_PROMPT_MAX_BYTES du moteur multimédia). */
const PROMPT_BUDGET = 3800;

/**
 * Brief sans texte recopié : un texte cité (nom ou ligne d'activités réécrite à sa façon) contredirait le texte exact
 * imposé plus loin et ferait écrire au modèle d'images de mauvais mots. Le nom cité devient « le nom », un mot du
 * nom ou des initiales (3 lettres au plus) restent tels quels, toute autre citation devient « la ligne d'activités ».
 */
export function briefWithoutText(text: string, name: string): string {
  const fold = (x: string) => x.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim().toLowerCase();
  return text.replace(/[“"«]\s*([^”"»]{1,120}?)\s*[”"»]/g, (m, q: string) => (fold(q) === fold(name) ? "le nom" : fold(name).includes(fold(q)) || q.replace(/[^\p{L}]/gu, "").length <= 3 ? m : "la ligne d'activités"));
}


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

/**
 * Version pour fonds sombres, fidèle au dessin : seuls les traits NOIRS ou gris foncé (contours, texte noir) passent
 * en blanc ; les couleurs du logo sont gardées. Si des couleurs foncées de la marque restent (brun, bordeaux, bleu
 * nuit…), elles disparaîtraient sur fond sombre : le logo garde alors ses couleurs et reçoit un liseré clair tout
 * autour (version « autocollant »), au lieu d'être délavé en blanc.
 */
export async function onDarkVersion(png: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0;
  let colouredDark = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    opaque++;
    const mx = Math.max(data[i], data[i + 1], data[i + 2]);
    const mn = Math.min(data[i], data[i + 1], data[i + 2]);
    const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    const sat = (mx - mn) / 255;
    if (lum < 0.35 && sat < 0.16) data[i] = data[i + 1] = data[i + 2] = 255;
    else if (lum < 0.3) colouredDark++;
  }
  const flipped = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  if (!opaque || colouredDark / opaque < 0.1) return flipped;
  const r = Math.max(4, Math.round(Math.max(info.width, info.height) * 0.014));
  const pad = { top: r * 2, bottom: r * 2, left: r * 2, right: r * 2, background: { r: 0, g: 0, b: 0, alpha: 0 } };
  const ext = await sharp(png).extend(pad).png().toBuffer();
  const m = await sharp(ext).metadata();
  const mask = await sharp(ext).extractChannel("alpha").blur(r * 0.7).threshold(6).png().toBuffer();
  const halo = await sharp({ create: { width: m.width!, height: m.height!, channels: 3, background: "#FBF8F2" } }).joinChannel(mask).png().toBuffer();
  return sharp(halo).composite([{ input: ext }]).png().toBuffer();
}

/**
 * Version une couleur (noir seul, blanc seul) qui GARDE le dessin : tout ce qui est coloré ou foncé devient l'encre ;
 * seules les parties très claires (fond d'assiette, cadran crème, reflets blancs) deviennent des réserves
 * transparentes, comme un tampon ou une gravure — jamais une tache pleine, et aucun mot coloré perdu.
 */
export async function oneColourVersion(png: Buffer, hex: string): Promise<Buffer> {
  const [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const T = 0.8 * 255;
  const soft = 12;
  let opaque = 0;
  let reserve = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    opaque++;
    if (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] > T) reserve++;
  }
  // Logo presque entièrement clair (encre pâle) : version pleine, sinon il disparaîtrait.
  const keepAll = !opaque || reserve / opaque > 0.85;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    const k = keepAll ? 1 : Math.max(0, Math.min(1, (T + soft - lum) / (2 * soft)));
    data[i] = cr;
    data[i + 1] = cg;
    data[i + 2] = cb;
    data[i + 3] = Math.round(data[i + 3] * k);
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Planche de relecture d'un logo complet : grand format sur fond neutre et sur blanc, sur fond sombre, puis aux tailles prévues. */
export async function artworkBoard(png: Buffer, style: LogoStyle): Promise<Buffer> {
  const fit = (w: number, h: number) => sharp(png).resize({ width: w, height: h, fit: "inside" }).png().toBuffer();
  const cell = async (w: number, h: number, bg: string, img: Buffer) => sharp({ create: { width: w, height: h, channels: 4, background: bg } }).composite([{ input: img, gravity: "center" }]).png().toBuffer();
  const a = await cell(900, 860, "#F4F3EF", await fit(820, 800));
  const b = await cell(680, 420, "#FFFFFF", await fit(600, 380));
  // Fond sombre : la version claire que le studio produit à partir de ce logo (l'original sombre n'y est jamais utilisé).
  const c = await cell(680, 420, "#16161A", await sharp(await onDarkVersion(png)).resize({ width: 600, height: 380, fit: "inside" }).png().toBuffer());
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
 * Ligne des petites entreprises (emblème illustré, icône + nom, signature script) : l'originalité et la
 * singularité pèsent moins que la beauté du dessin et le métier compris au premier regard — ce que le propriétaire
 * a validé. Le signe minimaliste et le monogramme, eux, vivent de leur idée : leurs poids restent forts.
 */
export const STYLE_WEIGHTS: Record<LogoStyle, Record<ArtCriterion, number>> = {
  illustrated: { relevance: 1.3, originality: 0.8, craft: 1.5, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 0.9, intendedUse: 0.8 },
  textured: { relevance: 1.2, originality: 0.8, craft: 1.5, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 0.9, intendedUse: 0.8 },
  emblem: { relevance: 1.2, originality: 0.8, craft: 1.3, typography: 1.1, composition: 1.3, colour: 1, legibility: 1, memorability: 1.1, distinctiveness: 0.9, intendedUse: 0.9 },
  gradient: { relevance: 1.1, originality: 1.2, craft: 1.3, typography: 1, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 0.9 },
  premium: { relevance: 1.1, originality: 1.1, craft: 1.3, typography: 1.5, composition: 1.2, colour: 1, legibility: 1.1, memorability: 1.1, distinctiveness: 1.2, intendedUse: 1 },
  minimal: { relevance: 1.2, originality: 1.3, craft: 1.1, typography: 1.1, composition: 1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 1.2 },
  monogram: { relevance: 1.1, originality: 1.3, craft: 1.2, typography: 1.2, composition: 1.1, colour: 1, legibility: 1, memorability: 1.2, distinctiveness: 1.2, intendedUse: 1.1 },
  typographic: { relevance: 1.1, originality: 0.9, craft: 1.1, typography: 1.6, composition: 1.1, colour: 1, legibility: 1.2, memorability: 1.1, distinctiveness: 0.9, intendedUse: 1 },
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

export const ARTWORK_REVIEW_SYSTEM = (style: LogoStyle) => `Rôle : directeur artistique qui crée les logos de PETITES ENTREPRISES (artisans, commerces, restaurants, services de proximité). Tu juges UN logo complet dessiné par une IA d'images avant qu'il soit présenté au client, sur une planche : grand format sur fond neutre, sur blanc, sur fond sombre (la VERSION CLAIRE produite automatiquement par le studio à partir de ce logo : juge sa tenue, pas le contraste des couleurs d'origine sur fond sombre), puis aux tailles prévues pour ce style.
Style demandé : ${style}. Juge-le selon CE style : ${STYLE_GUIDE[style]}
Une texture, plusieurs couleurs, des dégradés ou un détail illustré ne sont PAS des défauts quand le style les demande. La lisibilité se juge aux usages réellement prévus (${INTENDED_SIZES[style].uses}), pas à 16 px pour un logo illustré : une version simplifiée distincte servira aux favicons, tampons et broderies.
Juge comme le ferait le client final (une petite entreprise et sa clientèle) : le logo est-il BEAU, chaleureux, soigné, professionnel, et fait-il comprendre le métier au premier regard ? C'est ce qu'on attend ici, pas un logo conceptuel de grande agence. Les éléments attendus du métier (outils, matières, produits, lieu), un emblème rond ou un arc, une écriture script, deux couleurs franches ne sont PAS des défauts quand ils sont bien dessinés ; « clumsyCliche » = seulement un dessin grossier, mal exécuté, façon clip-art bas de gamme.
Note de 0 à 10 : relevance (évoque CETTE entreprise, son positionnement et sa clientèle), originality, craft (qualité d'exécution du dessin : traits, matière, cohérence, finition), typography (choix, dessin et traitement du texte : graisses, approches, hiérarchie nom / activité), composition (équilibre, proportions, hiérarchie), colour (accord et cohérence des couleurs, contraste), legibility (le nom se lit d'un coup d'œil aux tailles prévues), memorability, distinctiveness, intendedUse (tient aux usages professionnels prévus).
originality et distinctiveness se jugent PARMI LES LOGOS DE PETITES ENTREPRISES du même métier : montrer le métier par ses éléments attendus n'est pas un manque d'originalité ; un dessin propre à la marque (composition, couleurs, un détail lié au nom, au lieu ou au caractère de l'enseigne) suffit pour 7 à 8. Réserve les notes basses aux logos interchangeables, à une image de banque posée à côté d'un nom.
Une ligne d'activité très fine qui devient difficile à lire à la PLUS PETITE taille de la planche est un point d'amélioration à citer dans « issues », pas une raison de descendre legibility sous 7 tant que le NOM se lit.
Échelle (la même pour chaque critère) : 9-10 = remarquable ; 8 = beau, lisible, soigné, métier compris au premier regard — de petites imperfections qu'on ne voit qu'en cherchant ne retirent rien : le patron serait content de l'afficher sur sa devanture, son camion, ses cartes ; 7 = présentable, avec un défaut que le client remarquerait (dessin maladroit par endroits, déséquilibre net, couleurs ternes) ; 5-6 = faible ou banal ; 0-4 = raté. Un logo qui plairait à la plupart des petites entreprises du métier mérite au moins 8.
« genericConcept » = true quand la proposition repose SEULEMENT sur une forme vide sans rien du métier (cercle, triangle ou carré sans contenu), une abstraction que personne ne peut relier au métier, une police standard posée sans composition ou une décoration sans intention. Une icône du métier bien dessinée, un emblème rond réunissant les éléments du métier ou une signature script soignée ne sont PAS des concepts pauvres.
Lis tout le texte du logo LETTRE PAR LETTRE, accents compris, et recopie-le exactement dans « textRead ». « nameExact » : le nom attendu y figure exactement. « extraText » : un mot non autorisé (slogan inventé, lettres parasites). « nameBox » : rectangle du NOM seul en fractions de l'image (x, y, largeur, hauteur entre 0 et 1), ou null.
« artifacts » : lettres fantômes, formes fondues, détails incohérents typiques d'une IA. « resemblesKnownBrand » : rappelle un logo connu. « amateur » : rendu de générateur, déséquilibré, daté.
Sois juste et bienveillant comme un client : note ce que tu vois selon l'échelle ; ne baisse pas une note pour un détail que seul un graphiste remarquerait, ni parce que le logo montre simplement le métier ; garde les notes basses pour les défauts réellement visibles. « issues » : défauts concrets et précis (ce qui ne va pas, où, pourquoi), jamais des généralités. « fix » : LA correction la plus utile pour une nouvelle version — cible (symbol, typography, composition, colour, concept) et consigne précise qui change vraiment la proposition (ex. « symbole trop générique : remplacer le cadre par une construction des deux lettres en réserve », « référence au métier trop littérale : garder le geste, abandonner l'objet ») ; « none » si rien à corriger. « needsSimplifiedMark » : une version simplifiée est-elle nécessaire pour les petites tailles ?`;

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
  // Nom qui EST le dessin (logotype) ou nom en grand : une réécriture en police standard détruirait le logo. Rien
  // n'est réécrit ; la proposition reste refusée avec sa faute, l'original intact (« Nouvelle version » pour corriger).
  if (t.markType === "wordmark" || t.markType === "lettermark" || box.h > 0.16 || box.w * box.h > 0.12) return null;
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
