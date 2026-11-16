/**
 * Ce qu'est une identité de marque pour SINA : sa forme (nom, signature, fond, palette, polices, ton, planche), les
 * polices proposables et leur caractère, et les contrôles gratuits qui se mesurent (palette et contrastes, couleurs
 * refusées par le client, polices de texte). La création elle-même passe par la chaîne (`brand-chain.ts`) ; l'ancienne
 * création en un seul appel a été retirée le 17 novembre 2026.
 */
import { z } from "zod";
import { FONT_FILES, FONT_HANDLES } from "../theme/render";
import { contrast, hexToRgb, luminance, sameColor } from "../color";
import { FIELD_LABEL, START_FIELDS, type Journey } from "./journey";
import { BoardSchema } from "./brand-board";

/** Styles de logo de la charte (§ 2.2) : les 3 identités en prennent 3 différents. */
export const LOGO_STYLES = ["lettrage", "symbole", "monogramme", "embleme", "cachet", "mascotte", "trait", "abstrait", "pixel", "brutaliste", "isometrie", "aquarelle", "artdeco", "popart"] as const;
export const LOGO_STYLE_LABEL: Record<(typeof LOGO_STYLES)[number], string> = {
  lettrage: "lettrage seul raffiné", symbole: "symbole + nom", monogramme: "monogramme", embleme: "emblème ou badge fermé",
  cachet: "cachet ou tampon", mascotte: "mascotte illustrée", trait: "trait continu (line art)", abstrait: "icône abstraite colorée",
  pixel: "pixel", brutaliste: "brutaliste à ombre décalée", isometrie: "isométrie 3D", aquarelle: "tache d'aquarelle",
  artdeco: "art déco", popart: "pop art",
};

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
/** Famille d'une poignée de police (« inter_n7 » → « inter »). */
export const fontKeyOf = fontKey;
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

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const IdentitySchema = z.object({
  /** Deux à quatre identités selon le forfait (décision du propriétaire du 12 novembre 2026) : clés A à D. */
  key: z.enum(["A", "B", "C", "D"]),
  name: z.string().min(1).max(40),
  nameStyle: z.string().max(120).default(""),
  /** Genre du nom (trois genres différents dans la série) : mot qui existe, mot inventé, nom en deux mots. */
  nameKind: z.enum(["mot", "invente", "deux_mots", "expression"]).optional().catch(undefined),
  nameWhy: z.string().max(400).default(""),
  /** Élément concret du PRODUIT dont part le nom (retour du propriétaire du 7 novembre : « rien à voir avec le produit »). */
  nameAnchor: z.string().max(120).default(""),
  /** Ce qu'un inconnu imagine en lisant le nom seul (test du lien au produit). */
  nameTest: z.string().max(200).default(""),
  /** Le mot ou l'expression tel qu'il existe en français, et son sens courant (« roue libre : avancer sans pédaler, être libre »). */
  nameExpression: z.string().max(200).default(""),
  /** Pistes réellement explorées pour cette identité (mots ou expressions existants), avant le choix. */
  nameCandidates: z.array(z.string().max(60)).max(30).default([]),
  slogan: z.string().max(90),
  sloganTone: z.string().max(160).default(""),
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
  /** Planche de marque (routes du 12 novembre 2026, `brand-routes.ts`) ; absente des identités créées avant. */
  board: BoardSchema.optional(),
});
export type Identity = z.infer<typeof IdentitySchema>;
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
  if (j.keep.includes("logo")) out.push("Logo gardé (image jointe s'il y en a une) : les 3 identités s'accordent avec lui (couleurs et polices compatibles).");
  return out.join("\n");
}

/** Mots d'une phrase : la ponctuation isolée du français (« ? », « ! », « : ») ne compte pas comme un mot. */
const words = (s: string) => s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
export const wordCount = words;
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** Texte ramené à ses lettres et chiffres, sans accents ni casse (comparaisons). */
export const normText = norm;
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
export const hueGap = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
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
      // Un vrai dégradé de couleurs : ni gris, ni beige ou crème pâle (un dégradé sombre reste une palette permise, mais
      // pas dans une série qui a déjà son fond sombre : voir routeIssues, `brand-routes.ts`).
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

/** Couleurs de l'identité qui ressemblent à une couleur refusée par le client dans sa fiche (« pas de rose »). */
export function refusedColorIssues(x: Pick<Identity, "palette">, j: Journey): string[] {
  const refused = j.start.image?.status === "answered" ? refusedColors(j.start.image.value) : [];
  const out: string[] = [];
  for (const c of refused) for (const role of ["primary", "secondary", "accent"] as const) {
    if (HUE_RANGE[c]?.(hueSat(x.palette[role]))) out.push(`${role} ${x.palette[role]} ressemble à une couleur refusée par le client (${c}).`);
  }
  return out;
}

/** Nom du genre « Éclat de thé » : un mot, puis « de / d' / du / des », puis un ou deux mots (4 mots au plus). */
export const EXPRESSION_NAME = /^[\p{L}’'-]+\s+(?:de\s+|d['’]\s*|du\s+|des\s+)[\p{L}’'-]+(?:\s+[\p{L}’'-]+)?$/iu;

/**
 * Genres de noms attendus (décisions du propriétaire : 7 novembre 2026, le mot inventé ; 9 novembre, le MOT FORT comme
 * SOLSTICE ou RUPTURE ; 10 novembre, la plus récente : « c'est ce genre de nom de marque que je veux que SINA trouve »
 * devant « Éclat de thé ») : produits = trois noms du genre « Éclat de thé » ; services = trois genres différents.
 */
export function nameKindsFor(j: Journey): "produits" | "services" {
  return j.start.business?.status === "answered" && j.start.business.value === "services" ? "services" : "produits";
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
