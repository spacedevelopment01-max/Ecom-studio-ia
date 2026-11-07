/**
 * Étape 1 du parcours SINA (#492) : 3 identités de marque VRAIMENT différentes (charte qualité 2026 § 2.1,
 * docs/syna/CHARTE-QUALITE-2026.md). Claude (modèle fort) les crée à partir de la fiche de départ ; le Studio contrôle
 * ensuite gratuitement ce qui se mesure (noms, slogans, palettes et contrastes, polices, styles de logo, éléments gardés
 * en refonte) ; une seule reprise, annoncée, si le contrôle échoue. Rien d'inventé : ni chiffre, ni avis, ni garantie.
 */
import { z } from "zod";
import { FONT_FILES, FONT_HANDLES } from "../theme/render";
import { BRAND_RULES } from "../media/identity-board";
import { contrast, hexToRgb, luminance, sameColor } from "../color";
import { FIELD_LABEL, START_FIELDS, type Journey } from "./journey";
import { referencesForPrompt } from "./brand-references";
import { FORBIDDEN_LOGO_RENDERS } from "../logo-v2/artwork";

/** Styles de logo de la charte (§ 2.2) : les 3 identités en prennent 3 différents. */
export const LOGO_STYLES = ["lettrage", "symbole", "monogramme", "embleme", "cachet", "mascotte", "trait", "abstrait", "pixel", "brutaliste", "isometrie", "aquarelle", "artdeco", "popart"] as const;
export const LOGO_STYLE_LABEL: Record<(typeof LOGO_STYLES)[number], string> = {
  lettrage: "lettrage seul raffiné", symbole: "symbole + nom", monogramme: "monogramme", embleme: "emblème ou badge fermé",
  cachet: "cachet ou tampon", mascotte: "mascotte illustrée", trait: "trait continu (line art)", abstrait: "icône abstraite colorée",
  pixel: "pixel", brutaliste: "brutaliste à ombre décalée", isometrie: "isométrie 3D", aquarelle: "tache d'aquarelle",
  artdeco: "art déco", popart: "pop art",
};

/**
 * Styles proposés : tous sauf l'aquarelle (tache floue), interdite par le propriétaire le 7 novembre 2026 (premier essai
 * réel des logos). Le style reste lisible pour les identités déjà enregistrées.
 */
export const PROPOSED_LOGO_STYLES: readonly (typeof LOGO_STYLES)[number][] = LOGO_STYLES.filter((s) => s !== "aquarelle");

/** Polices proposables (toutes sur Google Fonts et rendues par le thème), avec leur caractère. */
export const FONT_CHARACTER: Record<string, string> = {
  newsreader: "serif éditoriale", anton: "sans serif condensée très grasse", nunito: "ronde épaisse", lato: "sans serif humaniste",
  instrument_serif: "serif fine contrastée", cormorant: "serif fine contrastée, luxe", inter: "sans serif neutre", jost: "sans serif géométrique",
  dm_sans: "sans serif géométrique douce", archivo: "grotesque grasse", chivo: "grotesque", lora: "serif douce",
  work_sans: "sans serif simple", space_grotesk: "grotesque technique", montserrat: "sans serif géométrique large", karla: "grotesque légère",
  libre_baskerville: "serif classique", playfair_display: "serif contrastée", poppins: "sans serif géométrique ronde", space_mono: "chasse fixe",
  oswald: "sans serif condensée",
  manrope: "sans serif d'interface, géométrique",
  plus_jakarta_sans: "sans serif d'interface, moderne",
  outfit: "sans serif géométrique ronde",
  sora: "sans serif d'interface, technique",
  urbanist: "sans serif géométrique élancée",
  figtree: "sans serif d'interface, amicale",
  geist: "sans serif d'interface, tech",
  raleway: "sans serif élégante, polyvalente",
  nunito_sans: "sans serif douce, polyvalente",
  open_sans: "sans serif neutre, très lisible",
  source_sans_3: "sans serif lisible, polyvalente",
  rubik: "sans serif aux angles arrondis",
  barlow: "sans serif légèrement condensée",
  cormorant_garamond: "serif élégante, éditoriale",
  bodoni_moda: "serif très contrastée, mode et luxe",
  dm_serif_display: "serif d'affichage contrastée (titres)",
  prata: "serif didone élégante (titres)",
  merriweather: "serif robuste et lisible",
  fraunces: "serif « à l'ancienne » chaleureuse",
  bebas_neue: "capitales condensées d'affiche (grands titres)",
  archivo_black: "grotesque très grasse (grands titres)",
  unbounded: "display large et ronde (grands titres)",
  syne: "display artistique (grands titres)",
  righteous: "display rétro arrondie (grands titres)",
  abril_fatface: "didone très grasse (grands titres)",
  alfa_slab_one: "slab très grasse (grands titres)",
  yeseva_one: "serif d'affichage féminine (grands titres)",
  caveat: "manuscrite naturelle (accents, signatures)",
  dancing_script: "manuscrite liée (accents, signatures)",
  pacifico: "manuscrite ronde rétro (accents)",
  sacramento: "calligraphie fine (accents, signatures)",
  satisfy: "manuscrite brossée (accents)",
  allura: "calligraphie élégante (accents, signatures)",
  ibm_plex_mono: "chasse fixe technique",
  jetbrains_mono: "chasse fixe moderne",
  roboto_mono: "chasse fixe neutre",
};
const fontKey = (handle: string) => handle.replace(/_[ni]\d$/, "");
/**
 * Polices de titres seulement (affiche, une seule graisse), manuscrites et à chasse fixe : jamais pour les textes
 * (document du propriétaire du 7 novembre : « à associer à une police de texte lisible »).
 */
export const HEADING_ONLY = new Set(["anton", "bebas_neue", "archivo_black", "righteous", "abril_fatface", "alfa_slab_one", "yeseva_one", "dm_serif_display", "prata", "unbounded", "syne", "oswald", "instrument_serif"]);
export const bodyFontOk = (handle: string) => {
  const k = fontKey(handle);
  return !HEADING_ONLY.has(k) && !["cursive", "monospace"].includes(FONT_FILES[k]?.fallback ?? "");
};
export const fontFamily = (handle: string) => FONT_FILES[fontKey(handle)]?.family ?? handle;
const FONT_LIST = Object.entries(FONT_FILES).map(([k, f]) => `${k} (${f.family}, ${FONT_CHARACTER[k] ?? f.fallback} ; graisses ${Object.keys(f.files).join("/")})`).join("\n");

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const IdentitySchema = z.object({
  key: z.enum(["A", "B", "C"]),
  name: z.string().min(1).max(40),
  nameStyle: z.string().max(120).default(""),
  nameWhy: z.string().max(400).default(""),
  /** Élément concret du PRODUIT dont part le nom (retour du propriétaire du 7 novembre : « rien à voir avec le produit »). */
  nameAnchor: z.string().max(120).default(""),
  /** Ce qu'un inconnu imagine en lisant le nom seul (test du lien au produit). */
  nameTest: z.string().max(200).default(""),
  slogan: z.string().max(90),
  sloganTone: z.string().max(80).default(""),
  promise: z.string().max(260),
  territory: z.string().max(160),
  /**
   * Fond de page (règles du propriétaire, 6 et 7 novembre) : un blanc, un dégradé de couleurs, un sombre par série.
   * « uni » (fond clair coloré) existe dans ses exemples de palettes ; il n'entre pas dans une série de trois.
   */
  ground: z.enum(["blanc", "degrade", "sombre", "uni"]),
  /** Fond en dégradé : ses deux couleurs (de haut en bas, en diagonale). */
  gradient: z.object({ from: hex, to: hex }).optional(),
  /**
   * Rôles (palettes du propriétaire du 7 novembre) : primary = BOUTON (couleur de marque et d'action), secondary =
   * SURFACE (cartes, bandeaux), accent = détails graphiques, light / dark = fond et texte (inversés sur fond sombre).
   * Les titres prennent la couleur du texte.
   */
  palette: z.object({ dark: hex, primary: hex, secondary: hex, accent: hex, light: hex }),
  paletteFamily: z.string().max(120).default(""),
  fonts: z.object({ heading: z.string().max(40), body: z.string().max(40) }),
  fontStyle: z.string().max(120).default(""),
  tone: z.object({ adjectives: z.array(z.string().max(40)).min(3).max(3), avoid: z.array(z.string().max(60)).min(3).max(3) }),
  logoStyle: z.enum(LOGO_STYLES),
  logoIdea: z.string().max(400),
  why: z.string().max(500),
});
export type Identity = z.infer<typeof IdentitySchema>;
export const IdentitiesSchema = z.object({
  identities: z.array(IdentitySchema).length(3),
  /** Comparaison axe par axe faite par Claude (charte : au moins 4 axes sur 6 différents, dont le territoire). */
  comparison: z.string().max(1500).default(""),
});

const SHAPE = `{"identities": [{"key": "A", "name": "", "nameStyle": "", "nameWhy": "", "nameAnchor": "", "nameTest": "", "slogan": "", "sloganTone": "", "promise": "", "territory": "", "ground": "blanc|degrade|sombre", "gradient": {"from": "#RRGGBB", "to": "#RRGGBB"}, "palette": {"dark": "#RRGGBB", "primary": "#RRGGBB", "secondary": "#RRGGBB", "accent": "#RRGGBB", "light": "#RRGGBB"}, "paletteFamily": "", "fonts": {"heading": "playfair_display_n7", "body": "inter_n4"}, "fontStyle": "", "tone": {"adjectives": ["", "", ""], "avoid": ["", "", ""]}, "logoStyle": "${LOGO_STYLES.join("|")}", "logoIdea": "", "why": ""}, {"key": "B", …}, {"key": "C", …}], "comparison": ""}`;

/** Consignes stables (mises en cache) : charte § 2.1 et 2.2, règles de cohésion de marque. */
export const IDENTITY_SYSTEM = `Tu es directrice de création d'une agence de marque de premier plan, en 2026. Tu crées pour UN client trois identités de marque complètes et VRAIMENT différentes, au niveau des meilleures marques de 2026 (jamais une finition « années 2000 »).

Les trois identités diffèrent sur au moins 4 des 6 axes, dont toujours le premier :
1. Territoire émotionnel (ex. évasion / fierté artisanale / complicité joyeuse).
2. Style du nom (ex. mot inventé court / mot français évocateur / nom composé ou initiales).
3. Famille de couleurs et fond de page (un fond blanc, un fond en dégradé de couleurs, un fond sombre ; teintes nettement différentes).
4. Famille de polices (ex. serif fine contrastée / sans serif condensée très grasse / ronde épaisse).
5. Ton du slogan (ex. poétique / direct et impératif / complice et léger).
6. Style de logo : trois styles DIFFÉRENTS parmi ${PROPOSED_LOGO_STYLES.map((s) => `${s} (${LOGO_STYLE_LABEL[s]})`).join(", ")}, choisis pour le métier du client et pour chaque identité. Rendus INTERDITS par le propriétaire (jamais dans une idée de logo) : ${FORBIDDEN_LOGO_RENDERS.join(" ; ")}.

Chaque identité contient :
- name : applique la MÉTHODE DE NOMMAGE du propriétaire (ci-dessous) : un détail réel du métier du client + un mot ou une expression qui lui donne une deuxième lecture. Le nom part TOUJOURS DU PRODUIT LUI-MÊME (pour un service : du geste ou de l'outil du métier) : une partie qu'on peut montrer du doigt (comme la mèche d'une bougie ou le carré d'une tablette), sa matière, sa forme, ou le geste de s'en servir. Lu seul, sans slogan ni image, le nom fait penser au produit ou à sa matière : un inconnu devine ce qu'on vend ou de quoi c'est fait. Un nom qui ne parle que d'un bénéfice, d'une ambiance, d'un moment ou d'une valeur, sans rien du produit, est REFUSÉ (le propriétaire l'a refusé : « rien à voir avec le produit »). nameAnchor = l'élément concret du produit dont part le nom (2 à 6 mots) ; nameTest = ce qu'un inconnu imagine en lisant le nom seul ; si nameTest ne cite ni le produit ni sa matière, cherche un autre nom. Pour CHAQUE identité, explore mentalement au moins 20 pistes et garde la plus forte ; trois noms de logiques différentes (trois détails différents). Jamais une sonorité vide de sens, jamais le nom d'une marque connue ni un nom des exemples. nameStyle dit le détail de départ, nameWhy explique la logique comme dans les exemples (« Pars de … ; … »).
- slogan : une phrase courte et concrète (9 mots au plus), en français, souvent au tutoiement ou à l'impératif, qui dit le bénéfice avec une image simple, sans promesse invérifiable ; sloganTone dit son ton.
- promise : la promesse en une phrase, du point de vue du client final.
- territory : le territoire émotionnel en quelques mots.
- ground : le fond de page de l'identité. Les trois identités ont trois fonds DIFFÉRENTS : une « blanc » (fond blanc pur ou presque, ex. #FFFFFF), une « degrade » (fond en dégradé de deux couleurs franches et actuelles, donné dans gradient {from, to}, ex. pêche lumineux vers lilas, jamais beige ni crème), une « sombre » (fond très foncé, presque noir ou nuit profonde, texte clair dessus).
- palette : 5 couleurs en hexadécimal, avec les rôles des exemples du propriétaire. light = le clair (le fond si ground est blanc ; le texte si ground est sombre) ; dark = le texte foncé TEINTÉ (encre, aubergine, graphite vert…, jamais un noir pur ; c'est le fond si ground est sombre) ; primary = le BOUTON, couleur de marque et d'action ; secondary = la SURFACE (cartes, bandeaux : version très claire et douce, ou foncée sur fond sombre) ; accent = les détails graphiques. Les titres prennent la couleur du texte. Contraste d'au moins 4,5:1 pour texte/fond (sur un dégradé : sur ses deux couleurs), texte/surface et texte du bouton/bouton. paletteFamily = le nom d'ambiance en 2 à 4 mots (ex. « Verger électrique », « Cacao et lavande »).
- Couleurs de 2026 : accordées entre elles et actuelles, dans l'esprit des palettes du propriétaire : parfois franches (dégradés lumineux, boutons vifs), parfois fines et sourdes, jamais ternes au hasard, boueuses ou criardes. D'une identité à l'autre, la couleur du bouton appartient à des familles de teintes NETTEMENT différentes (jamais trois orangés, jamais trois verts).
- fonts : deux poignées « clé_nN » de la liste autorisée (titres expressifs et manuscrites : seulement pour les titres, toujours associés à une police de texte lisible ; jamais une manuscrite ni une chasse fixe pour les textes) (N = graisse / 100 disponible pour cette police) ; heading = titres, body = textes (graisse 4). Trois polices de titres différentes d'une identité à l'autre. fontStyle nomme la famille de polices.
- tone : 3 adjectifs du ton de voix et 3 choses à ne jamais dire ou faire.
- logoStyle et logoIdea : l'idée du logo, simple et astucieuse, où le concept du projet et le nom se rejoignent dans le dessin, poussée plus loin qu'une simple illustration du produit (ex. un éclair qui forme le V d'un électricien, une goutte qui contient une gourde), décrite en une ou deux phrases ; aucun WordArt, aucun dégradé gratuit.
- why : en une ou deux phrases, pourquoi cette identité convient à CE client (cible, image voulue, différence).

Règles de cohésion de toute création : ${BRAND_RULES.join(" ")}

Interdits : inventer un chiffre, un avis, une note, une certification, une garantie, un délai, un prix ; reprendre une couleur que le client refuse ; utiliser une police hors liste ; copier une marque existante. Le vocabulaire du client est repris tel quel. Tout est rédigé en français et en tutoyant le client quand tu t'adresses à lui (why, nameWhy).

${referencesForPrompt()}

Polices autorisées (clé, famille, caractère, graisses) :
${FONT_LIST}

Réponds UNIQUEMENT avec un objet JSON de cette forme exacte :
${SHAPE}
« comparison » : ta comparaison axe par axe des trois identités (au moins 4 axes différents par paire, dont le territoire).`;

/** Ce que le client a dit à l'étape 0, rubrique par rubrique (seules les réponses données). */
export function briefFromJourney(j: Journey): string {
  const lines = START_FIELDS.filter((f) => j.start[f]).map((f) => {
    const a = j.start[f]!;
    const v = a.status === "answered" ? (f === "business" ? (a.value === "services" ? "des services" : "des produits") : a.value) : a.status === "later" ? "plus tard" : "rien de particulier";
    return `- ${FIELD_LABEL[f].fr} : ${v}`;
  });
  return lines.join("\n");
}

/** Contraintes de refonte : ce qui est gardé tel quel se retrouve à l'identique dans les 3 identités. */
export function keepConstraints(j: Journey): string {
  if (!j.keep.length) return "Création complète : tout est à créer.";
  const site = j.imported[0];
  const out = [`Refonte : le client garde TEL QUEL ${j.keep.join(", ")} ; ces éléments sont IDENTIQUES dans les 3 identités, tout le reste diffère.`];
  if (j.keep.includes("nom")) out.push(`Nom gardé, mot pour mot dans les 3 identités : « ${j.keptValues?.name || site?.name || "[À compléter : nom]"} » (name identique ; nameStyle = « nom gardé »).`);
  if (j.keep.includes("slogan")) out.push(`Slogan gardé, mot pour mot dans les 3 identités : « ${j.keptValues?.slogan || site?.tagline || "[À compléter : slogan]"} ».`);
  if (j.keep.includes("couleurs")) out.push(`Couleurs gardées : ${site?.colors?.length ? site.colors.join(", ") : "celles du logo joint"} ; la même palette dans les 3 identités, construite à partir de ces couleurs.`);
  if (j.keep.includes("polices")) out.push(`Polices gardées : ${site?.fonts?.length ? site.fonts.join(", ") : "celles du client"} ; prends la police autorisée la plus proche, la même dans les 3 identités.`);
  if (j.keep.includes("logo")) out.push("Logo gardé (image jointe s'il y en a une) : les 3 identités s'accordent avec lui (couleurs et polices compatibles) ; logoStyle décrit le style du logo existant, logoIdea dit comment il sera décliné.");
  return out.join("\n");
}

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** Couleurs refusées par le client (« pas de rose », « surtout pas le noir »…), repérées dans sa réponse « image ». */
const REFUSED_COLORS: Record<string, RegExp> = {
  rose: /\bros(e|es)\b|fuchsia|magenta/i, rouge: /\brouges?\b/i, orange: /\boranges?\b/i, jaune: /\bjaunes?\b/i, vert: /\bverts?\b|\bvertes?\b/i,
  bleu: /\bbleus?\b|\bbleues?\b/i, violet: /\bviolets?\b|\bviolettes?\b|\bmauves?\b/i, marron: /\bmarron\b|\bbruns?\b/i, noir: /\bnoirs?\b|\bnoires?\b/i, gris: /\bgris\b|\bgrises?\b/i,
};
/** Teinte d'une couleur (0-360) et saturation, pour vérifier une couleur refusée. */
function hueSat(hexColor: string): { h: number; s: number; l: number } {
  const n = parseInt(hexColor.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  return { h: (h + 360) % 360, s, l };
}
const HUE_RANGE: Record<string, (c: { h: number; s: number; l: number }) => boolean> = {
  rose: (c) => c.s > 0.25 && c.h >= 300 && c.h < 345 && c.l > 0.35,
  rouge: (c) => c.s > 0.35 && (c.h >= 345 || c.h < 12), orange: (c) => c.s > 0.4 && c.h >= 15 && c.h < 40 && c.l > 0.3,
  jaune: (c) => c.s > 0.4 && c.h >= 45 && c.h < 65, vert: (c) => c.s > 0.25 && c.h >= 75 && c.h < 165,
  bleu: (c) => c.s > 0.25 && c.h >= 190 && c.h < 250, violet: (c) => c.s > 0.25 && c.h >= 255 && c.h < 300,
  marron: (c) => c.s > 0.2 && c.h >= 10 && c.h < 40 && c.l < 0.35, noir: (c) => c.l < 0.08, gris: (c) => c.s < 0.08 && c.l > 0.2 && c.l < 0.8,
};
/** Couleurs que le client ne veut « surtout pas » (seulement après une négation : « pas de », « sans », « surtout pas »). */
export function refusedColors(text: string): string[] {
  const neg = text.match(/(?:pas d[eu']|pas de la|pas le|pas la|surtout pas|jamais|sans|aucun(?:e)?|ni)\s*[^.;\n]*/gi) ?? [];
  return Object.keys(REFUSED_COLORS).filter((c) => neg.some((part) => REFUSED_COLORS[c].test(part)));
}

/** OKLab : clarté, saturation perçue (chroma) et teinte (degrés), pour juger « vif » et « différent » comme l'œil. */
export function oklch(hexColor: string): { l: number; c: number; h: number } {
  const [r, g, b] = hexToRgb(hexColor).map((v) => { const n = v / 255; return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4; });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, c: Math.hypot(A, B), h: (Math.atan2(B, A) * 180 / Math.PI + 360) % 360 };
}
const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
/** Écart minimal de teinte entre les boutons de deux identités (règle du propriétaire : jamais trois orangés). */
export const COLOR_RULES = { hueGap: 40 };

type Gradient = { from: string; to: string };
/** Contraste le plus faible d'une couleur sur un fond (uni, ou les deux couleurs d'un dégradé). */
const minContrast = (fg: string, bgs: string[]) => Math.min(...bgs.map((b) => contrast(fg, b)));
/** Couleurs de l'interface d'une identité selon son fond (fond sombre : texte clair ; dégradé : le plus lisible). */
export function groundPresentation(p: Identity["palette"], ground: Identity["ground"], gradient?: Gradient) {
  const bgs = ground === "sombre" ? [p.dark] : ground === "degrade" && gradient ? [gradient.from, gradient.to] : [p.light];
  const text = ground === "sombre" ? p.light : ground === "degrade" ? (minContrast(p.dark, bgs) >= minContrast(p.light, bgs) ? p.dark : p.light) : p.dark;
  // Palettes du propriétaire : titres dans la couleur du texte, bouton = couleur de marque (primary).
  // Texte posé sur une couleur : celui de la palette, ou un noir / blanc presque purs s'ils se lisent mieux
  // (palettes du propriétaire : texte presque noir sur un bouton rose vif, n° 21).
  const on = (bg: string) => [p.dark, p.light, "#141414", "#FFFFFF"].reduce((a, b) => (contrast(b, bg) > contrast(a, bg) ? b : a));
  return { backgrounds: bgs, text, heading: text, surface: p.secondary, surfaceText: on(p.secondary), button: p.primary, buttonText: on(p.primary) };
}

/** Contrôle d'une palette : fond conforme à son type, contrastes, rôles distincts (calé sur les 49 palettes du propriétaire). */
export function paletteIssues(p: Identity["palette"], ground: Identity["ground"], gradient?: Gradient): string[] {
  const issues: string[] = [];
  const L = (x: string) => oklch(x);
  if (ground === "blanc" && (luminance(p.light) < 0.9 || L(p.light).c > 0.012)) issues.push(`fond « blanc » ${p.light} : un blanc pur ou presque est attendu (ex. #FFFFFF).`);
  if (ground === "degrade") {
    if (!gradient) issues.push("fond « dégradé » : ses deux couleurs (gradient from / to) manquent.");
    else {
      const a = L(gradient.from), b = L(gradient.to);
      if (sameColor(gradient.from, gradient.to) || (hueGap(a.h, b.h) < 25 && Math.abs(a.l - b.l) < 0.04 && Math.abs(a.c - b.c) < 0.04)) issues.push(`fond « dégradé » ${gradient.from} → ${gradient.to} : deux couleurs nettement différentes sont attendues.`);
      // Un vrai dégradé de couleurs : ni gris, ni beige ou crème pâle (un dégradé sombre et sourd, ou pâle de deux teintes, reste permis : n° 26 et 39).
      if (Math.max(a.c, b.c) < 0.03 || (Math.min(a.l, b.l) > 0.85 && Math.max(a.c, b.c) < 0.06 && hueGap(a.h, b.h) < 40)) issues.push(`fond « dégradé » ${gradient.from} → ${gradient.to} : un dégradé de couleurs est attendu (ni gris, ni beige, ni crème).`);
    }
  }
  if (ground === "uni" && luminance(p.light) < 0.6) issues.push(`fond « uni » ${p.light} : un fond clair est attendu.`);
  if (ground === "sombre" && luminance(p.dark) > 0.05) issues.push(`fond « sombre » ${p.dark} : un fond très foncé est attendu.`);
  if ((ground === "blanc" || ground === "uni") && luminance(p.dark) > 0.12) issues.push(`dark ${p.dark} : le texte doit être foncé.`);
  if (ground === "sombre" && luminance(p.light) < 0.65) issues.push(`light ${p.light} : le texte sur fond sombre doit être clair.`);
  const v = groundPresentation(p, ground, gradient);
  for (const [role, fg, bgs, min] of [["texte/fond", v.text, v.backgrounds, 4.5], ["texte/surface", v.surfaceText, [v.surface], 4.5], ["texte/bouton", v.buttonText, [v.button], 4.5]] as const) {
    const c = minContrast(fg, [...bgs]);
    if (c < min) issues.push(`${role} : contraste ${c.toFixed(2)}:1 inférieur à ${String(min).replace(".", ",")}:1.`);
  }
  for (const [a, b] of [["primary", "secondary"], ["primary", "accent"], ["secondary", "accent"]] as const) if (sameColor(p[a], p[b])) issues.push(`${a}/${b} : couleurs indiscernables.`);
  return issues;
}

/** Contrôles gratuits (sans IA) de la série : ce qui se mesure ; la comparaison des axes reste à Claude. */
export function identityIssues(list: Identity[], j: Journey): string[] {
  const issues: string[] = [];
  const keptName = j.keep.includes("nom") ? (j.keptValues?.name || j.imported[0]?.name || "") : "";
  const keptSlogan = j.keep.includes("slogan") ? (j.keptValues?.slogan || j.imported[0]?.tagline || "") : "";
  if (list.map((x) => x.key).join("") !== "ABC") issues.push("Les trois identités doivent avoir les clés A, B et C, dans l'ordre.");
  for (const x of list) {
    const tag = `Identité ${x.key}`;
    if (keptName && x.name.trim() !== keptName.trim()) issues.push(`${tag} : le nom gardé « ${keptName} » doit être repris mot pour mot.`);
    if (keptSlogan && x.slogan.trim() !== keptSlogan.trim()) issues.push(`${tag} : le slogan gardé « ${keptSlogan} » doit être repris mot pour mot.`);
    if (!keptSlogan && words(x.slogan) > 9) issues.push(`${tag} : slogan de ${words(x.slogan)} mots (9 au plus).`);
    if (!keptName && words(x.name.replace(/&/g, "")) > 3) issues.push(`${tag} : nom trop long (3 mots au plus).`);
    if (!keptName && !x.nameAnchor.trim()) issues.push(`${tag} : nameAnchor vide — dis de quel élément concret du produit (partie, matière, forme, geste) part le nom « ${x.name} » ; s'il ne part de rien du produit, change de nom.`);
    if (!FONT_HANDLES.includes(x.fonts.heading)) issues.push(`${tag} : police de titres « ${x.fonts.heading} » hors liste (clé_nN d'une graisse disponible).`);
    if (!FONT_HANDLES.includes(x.fonts.body)) issues.push(`${tag} : police de textes « ${x.fonts.body} » hors liste.`);
    else if (!bodyFontOk(x.fonts.body)) issues.push(`${tag} : « ${fontFamily(x.fonts.body)} » est une police de titres, manuscrite ou à chasse fixe : elle ne sert jamais pour les textes (choisis une police de texte lisible).`);
    for (const p of paletteIssues(x.palette, x.ground, x.gradient)) issues.push(`${tag} — ${p}`);
    if (!PROPOSED_LOGO_STYLES.includes(x.logoStyle)) issues.push(`${tag} : style de logo « ${LOGO_STYLE_LABEL[x.logoStyle]} » interdit (tache floue) ; choisis un autre style.`);
    const refused = j.start.image?.status === "answered" ? refusedColors(j.start.image.value) : [];
    for (const c of refused) for (const role of ["primary", "secondary", "accent"] as const) {
      if (HUE_RANGE[c]?.(hueSat(x.palette[role]))) issues.push(`${tag} : ${role} ${x.palette[role]} ressemble à une couleur refusée par le client (${c}).`);
    }
  }
  if (!keptName) {
    const names = list.map((x) => norm(x.name));
    if (new Set(names).size < names.length) issues.push("Deux identités ont le même nom : trois noms différents sont attendus.");
  }
  if (!keptSlogan && new Set(list.map((x) => norm(x.slogan))).size < list.length) issues.push("Deux identités ont le même slogan.");
  if (!j.keep.includes("logo") && new Set(list.map((x) => x.logoStyle)).size < list.length) issues.push("Deux identités ont le même style de logo : trois styles différents sont attendus.");
  if (!j.keep.includes("polices") && new Set(list.map((x) => fontKey(x.fonts.heading))).size < list.length) issues.push("Deux identités ont la même police de titres : trois familles différentes sont attendues.");
  if (!j.keep.includes("couleurs")) {
    // Trois fonds de page : un blanc, un dégradé de couleurs, un sombre (règles du propriétaire des 6 et 7 novembre).
    if ([...list.map((x) => x.ground)].sort().join() !== "blanc,degrade,sombre") issues.push(`Fonds de page : ${list.map((x) => `${x.key} ${x.ground}`).join(", ")} ; il faut un fond blanc, un fond en dégradé de couleurs et un fond sombre.`);
    for (const [i, a] of list.entries()) for (const b of list.slice(i + 1)) {
      const gap = hueGap(oklch(a.palette.primary).h, oklch(b.palette.primary).h);
      if (gap < COLOR_RULES.hueGap) issues.push(`Identités ${a.key}/${b.key} : boutons (couleur de marque) de la même famille (${a.palette.primary} / ${b.palette.primary}) ; des teintes nettement différentes sont attendues.`);
    }
  }
  return [...new Set(issues)];
}

/** Demande à Claude : fiche de départ, contraintes de refonte, éventuelles consignes du client et corrections du contrôle. */
export function identityPrompt(j: Journey, opts: { guidance?: string; feedback?: string[]; previous?: Identity[]; redo?: string[]; namesOnly?: boolean } = {}): string {
  const parts = [
    "# Fiche de départ du client (étape 0, ses mots)",
    briefFromJourney(j),
    "",
    "# Existant et refonte",
    keepConstraints(j),
  ];
  if (j.imported.length) parts.push(`Site existant lu : ${j.imported.map((s) => `${s.url} (nom « ${s.name ?? "?"} », slogan « ${s.tagline ?? "?"} », couleurs ${s.colors?.join(" ") || "?"}, polices ${s.fonts?.join(", ") || "?"})`).join(" ; ")}.`);
  if (opts.guidance) parts.push("", "# Ce que le client demande pour cette nouvelle proposition", opts.guidance);
  if (opts.previous?.length && opts.namesOnly) {
    parts.push("", "# Propositions actuelles : refais SEULEMENT les noms (name, nameStyle, nameWhy), les slogans (slogan, sloganTone) et, si le nouveau nom le demande, l'idée du logo (logoIdea, même logoStyle). Tout le reste (territoire, fond, dégradé, palette, polices, ton, promesse, pourquoi) reste À L'IDENTIQUE.", JSON.stringify(opts.previous));
  } else if (opts.previous?.length && opts.redo?.length) {
    parts.push("", `# Propositions précédentes : refais seulement ${opts.redo.join(", ")}, garde les autres À L'IDENTIQUE (même contenu, mêmes clés)`, JSON.stringify(opts.previous));
  } else if (opts.previous?.length && opts.feedback?.length) {
    parts.push("", "# Ta proposition précédente (corrige-la selon le contrôle ci-dessous, garde ce qui est bon)", JSON.stringify(opts.previous));
  }
  if (opts.feedback?.length) parts.push("", "# Corrections exigées par le contrôle du Studio (à appliquer impérativement)", ...opts.feedback.map((f) => `- ${f}`));
  parts.push("", "Crée les trois identités A, B et C. Réponds avec l'objet JSON demandé.");
  return parts.join("\n");
}

/** Remise en forme tolérante (police donnée par son nom de famille, style de logo avec accent…). */
export function prepareIdentities(raw: any): any {
  const list = Array.isArray(raw) ? raw : raw?.identities;
  if (!Array.isArray(list)) return raw;
  const byFamily = (v: string, role: "heading" | "body") => {
    if (typeof v !== "string" || FONT_HANDLES.includes(v)) return v;
    const key = Object.keys(FONT_FILES).find((k) => norm(k) === norm(v) || norm(FONT_FILES[k].family) === norm(v.replace(/_?[ni]\d$/, "")));
    if (!key) return v;
    const ws = Object.keys(FONT_FILES[key].files).map(Number);
    const want = role === "body" ? 400 : 700;
    const w = ws.sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
    return `${key}_n${String(w)[0]}`;
  };
  return {
    ...(Array.isArray(raw) ? {} : raw),
    identities: list.map((x: any, i: number) => ({
      ...x,
      key: x?.key ?? "ABC"[i],
      logoStyle: typeof x?.logoStyle === "string" ? norm(x.logoStyle).replace(/^embleme.*/, "embleme").replace(/^artdeco.*/, "artdeco") : x?.logoStyle,
      fonts: x?.fonts ? { heading: byFamily(x.fonts.heading, "heading"), body: byFamily(x.fonts.body, "body") } : x?.fonts,
    })),
  };
}

/** Fichier de police d'une poignée « clé_nN » (cartes du fil : la vraie police est montrée au client). */
export function fontFace(handle: string): { family: string; file: string; weight: number } | null {
  const m = /^(.*)_n(\d)$/.exec(handle);
  const def = m ? FONT_FILES[m[1]] : undefined;
  if (!m || !def) return null;
  const want = Number(m[2]) * 100;
  const w = Object.keys(def.files).map(Number).sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0];
  return { family: def.family, file: def.files[w], weight: want };
}
