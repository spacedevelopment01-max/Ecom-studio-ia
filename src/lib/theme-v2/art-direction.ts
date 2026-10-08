/**
 * Direction artistique (Theme Engine V2) : une identité web STRUCTURÉE, pas seulement une palette et une police.
 * Chaque langage visuel a sa propre grammaire : typographies, échelle des titres, densité, rythme des sections,
 * style photographique, langage graphique, formes, rayons, animations, style des appels à l'action, en-tête,
 * ouverture et pied de page. Choisi par score (type de site, personnalité, préférences) — jamais par nom de client.
 * Décisions validées du client (palette, typographies) : reprises telles quelles (isLocked), jamais remplacées.
 */
import { contrast, ensureContrast, hsl, hslToHex, isDark, mix, onColor, withLightness } from "../color";
import { isLocked } from "../brain/brand-locks";
import type { Project } from "../projects";
import { routeFonts } from "../engine/shop";
import type { WebsiteIntent } from "./intent";

export type LanguageId = "craft" | "maison" | "precision" | "bistro" | "product";
export type HeroLayout = "stage" | "split" | "type" | "frame" | "board";

export type Palette = { bg: string; surface: string; text: string; muted: string; accent: string; inverseBg: string; inverseText: string; source: "brand-locked" | "brand" | "language" };

export type ArtDirection = {
  language: LanguageId;
  label: string;
  positioning: string;
  personality: string[];
  audience: string;
  mood: string;
  palette: Palette;
  typography: { heading: string; body: string; ratio: number; headingCase: "none" | "uppercase"; source: "brand-locked" | "logo" | "language" };
  density: "airy" | "balanced" | "compact";
  rhythm: string;
  photoStyle: string;
  graphicLanguage: string;
  shapes: { buttonRadius: number; cardRadius: number };
  motion: "subtle" | "normal" | "expressive";
  ctaStyle: string;
  header: Record<string, unknown>;
  footer: { style: string; scheme: string };
  hero: { layouts: HeroLayout[]; texture: "none" | "plaster" | "paper" | "grid" | "glow" };
  /** Préréglage V1 compatible (classes dir-*) le moins intrusif pour ce langage. */
  preset: string;
  pageWidth: number;
  scores: Record<LanguageId, number>;
};

type LanguageDef = {
  id: LanguageId;
  label: string;
  score: (i: WebsiteIntent) => number;
  fonts: { heading: string; body: string };
  ratio: number;
  density: ArtDirection["density"];
  motion: ArtDirection["motion"];
  shapes: ArtDirection["shapes"];
  mood: string;
  rhythm: string;
  photoStyle: string;
  graphicLanguage: string;
  ctaStyle: string;
  /** Teintes d'accent acceptables (degrés) : une couleur de marque non validée hors de ces plages est remplacée. */
  accentHues: [number, number][];
  /** Neutres et accent par défaut ; `warmAccent` : accent quand le client préfère des tons chauds. */
  base: { bg: string; surface: string; text: string; accent: string; warmAccent?: string; dark: boolean };
  header: Record<string, unknown>;
  footer: { style: string; scheme: string };
  hero: ArtDirection["hero"];
  preset: string;
  pageWidth: number;
};

export const LANGUAGES: LanguageDef[] = [
  {
    id: "craft",
    label: "Atelier précis",
    score: (i) => (i.site === "services_trade" ? 10 : i.site === "local_service" ? 6 : 0) + (i.warm ? 1 : 0),
    fonts: { heading: "archivo_n6", body: "work_sans_n4" },
    ratio: 1.3,
    density: "balanced",
    motion: "subtle",
    shapes: { buttonRadius: 2, cardRadius: 4 },
    mood: "Précision du geste, matière et finition : clair, net, sans effet gratuit.",
    rhythm: "Ouverture typographique, index numéroté des prestations, méthode en frise, infos pratiques en registre, appel au devis en bande sombre.",
    photoStyle: "Photos de chantiers réels, lumière naturelle, détails de finition (angles, joints, enduits) ; jamais de mur générique.",
    graphicLanguage: "Filets fins, numérotation, aplat de matière enduite dessiné en CSS, accent terre cuite.",
    ctaStyle: "Bouton plein rectangulaire « Demander un devis » + téléphone toujours visible.",
    accentHues: [[0, 50], [340, 360]],
    base: { bg: "#F4F1EB", surface: "#EAE5DB", text: "#1D1B18", accent: "#A9502C", warmAccent: "#A9502C", dark: false },
    header: { layout: "logo-left", shape: "bar", icons: "plain", mobile_menu: "sheet", show_search: false, show_cart: false, sticky: true },
    footer: { style: "columns", scheme: "scheme-3" },
    hero: { layouts: ["split", "type"], texture: "plaster" },
    preset: "galerie",
    pageWidth: 1320,
  },
  {
    id: "maison",
    label: "Maison éditoriale",
    score: (i) => (i.site.startsWith("shop") ? 3 : 0) + (i.beauty ? 6 : 0) + (i.premium ? 3 : 0) + (i.tech ? -4 : 0),
    fonts: { heading: "cormorant_n5", body: "jost_n4" },
    ratio: 1.36,
    density: "airy",
    motion: "normal",
    shapes: { buttonRadius: 40, cardRadius: 22 },
    mood: "Calme, lumière douce, matières : le produit regardé de près.",
    rhythm: "Produit en scène, texture et usage, caractéristiques confirmées en filets, questions, appel sobre en carte.",
    photoStyle: "Packshots lumineux sur fonds pastel, textures en très gros plan, mains et gestes.",
    graphicLanguage: "Arches, filets fins, italiques ponctuelles, beaucoup d'air.",
    ctaStyle: "Pilule pleine sombre, libellé court ; second lien discret.",
    accentHues: [[0, 70], [300, 360]],
    base: { bg: "#F7F3EE", surface: "#EFE7DD", text: "#241C16", accent: "#8E5426", dark: false },
    header: { layout: "logo-center", shape: "theme", icons: "plain", mobile_menu: "drawer", show_search: true, show_cart: true, sticky: true },
    footer: { style: "centered", scheme: "scheme-2" },
    hero: { layouts: ["stage", "split", "type"], texture: "none" },
    preset: "atelier",
    pageWidth: 1280,
  },
  {
    id: "precision",
    label: "Précision technique",
    score: (i) => (i.site.startsWith("shop") ? 3 : 0) + (i.tech && i.site !== "saas" ? 7 : 0) + (i.beauty ? -4 : 0),
    fonts: { heading: "space_grotesk_n7", body: "inter_n4" },
    ratio: 1.33,
    density: "balanced",
    motion: "normal",
    shapes: { buttonRadius: 10, cardRadius: 14 },
    mood: "Sombre, précis, lumineux : l'objet technique mis en lumière.",
    rhythm: "Ouverture photo, mosaïque d'images, caractéristiques en tableau, atouts en cartes, questions, appel final.",
    photoStyle: "Produit réel, éclairage maîtrisé, fonds sombres ou ciel, détails mécaniques.",
    graphicLanguage: "Trame discrète, contours fins, chiffres tabulaires, halo d'accent.",
    ctaStyle: "Bouton plein lumineux à rayon moyen, ombre colorée.",
    accentHues: [[180, 300]],
    base: { bg: "#0D0F13", surface: "#161A20", text: "#F1F3F6", accent: "#8E89E6", dark: true },
    header: { layout: "menu-right", shape: "bar", icons: "plain", mobile_menu: "fullscreen", show_search: true, show_cart: true, sticky: true },
    footer: { style: "split", scheme: "scheme-2" },
    hero: { layouts: ["stage", "split"], texture: "grid" },
    preset: "flux",
    pageWidth: 1360,
  },
  {
    id: "bistro",
    label: "Bistrot",
    score: (i) => (i.site === "restaurant" ? 10 : 0) + (i.food && i.site.startsWith("shop") ? 4 : 0),
    fonts: { heading: "libre_baskerville_n7", body: "karla_n4" },
    ratio: 1.4,
    density: "balanced",
    motion: "subtle",
    shapes: { buttonRadius: 40, cardRadius: 6 },
    mood: "Chaleureux, papier et encre, l'enseigne du quartier.",
    rhythm: "Enseigne et ardoise, carte, ambiance, infos pratiques, appel à réserver ou appeler.",
    photoStyle: "Assiettes et salle réelles, lumière chaude ; aucune photo de plat inventé.",
    graphicLanguage: "Serif gras, pointillés de carte, ardoise sombre légèrement inclinée, papier.",
    ctaStyle: "Pilule pleine couleur lie-de-vin, téléphone en clair.",
    accentHues: [[330, 360], [0, 45]],
    base: { bg: "#F5EEE1", surface: "#ECE2CF", text: "#2B201A", accent: "#8C2A2E", dark: false },
    header: { layout: "split", shape: "bar", icons: "plain", mobile_menu: "fullscreen", show_search: false, show_cart: false, sticky: true },
    footer: { style: "brand-left", scheme: "scheme-3" },
    hero: { layouts: ["board"], texture: "paper" },
    preset: "terroir",
    pageWidth: 1280,
  },
  {
    id: "product",
    label: "Produit numérique",
    score: (i) => (i.site === "saas" ? 10 : 0),
    fonts: { heading: "dm_sans_n7", body: "dm_sans_n4" },
    ratio: 1.28,
    density: "balanced",
    motion: "normal",
    shapes: { buttonRadius: 12, cardRadius: 16 },
    mood: "Clair, aéré, l'interface au centre.",
    rhythm: "Promesse centrée et capture d'interface, atouts en tuiles, usage en texte et image, questions, appel à la démonstration.",
    photoStyle: "Captures d'interface réelles dans un cadre de navigateur ; pas de photos d'illustration génériques.",
    graphicLanguage: "Tuiles arrondies, halo d'accent, pastilles.",
    ctaStyle: "Bouton plein accent « Demander une démo », second lien vers les fonctionnalités.",
    accentHues: [[190, 290]],
    base: { bg: "#FFFFFF", surface: "#F4F6FA", text: "#0E1525", accent: "#4F46E5", dark: false },
    header: { layout: "logo-left", shape: "bar", icons: "plain", mobile_menu: "drawer", show_search: false, show_cart: false, sticky: true },
    footer: { style: "columns", scheme: "scheme-2" },
    hero: { layouts: ["frame"], texture: "glow" },
    preset: "clinique",
    pageWidth: 1280,
  },
];

const inHues = (hex: string, ranges: [number, number][]) => {
  const [h, s] = hsl(hex);
  return s > 0.18 && ranges.some(([a, b]) => h >= a && h <= b);
};

/** Palette du langage, la marque d'abord : validée = reprise telle quelle ; proposée = gardée si elle convient au langage. */
function paletteFor(def: LanguageDef, p: Project, intent: WebsiteIntent): Palette {
  const b = p.brand;
  const prefersWarm = intent.preferences.some((x) => /chaud|terre|sable|ocre/i.test(x));
  const base = def.base;
  let accent = base.accent;
  let source: Palette["source"] = "language";
  let bg = base.bg;
  let text = base.text;
  if (b?.palette && isLocked(b, "palette")) {
    // Décision du client : sa couleur principale devient l'accent, ses clair et foncé les fonds (langage sombre ou clair).
    source = "brand-locked";
    accent = b.palette.primary;
    bg = base.dark ? (isDark(b.palette.dark) ? b.palette.dark : withLightness(b.palette.dark, 0.08)) : b.palette.light;
    text = base.dark ? b.palette.light : b.palette.dark;
  } else if (b?.palette) {
    // La couleur de marque la plus franche d'abord (un accent terne affaiblit les boutons).
    const cands = [b.palette.primary, b.palette.accent].filter((c) => inHues(c, def.accentHues)).sort((x, y) => hsl(y)[1] - hsl(x)[1]);
    if (cands.length) {
      source = "brand";
      accent = cands[0];
    }
    if (prefersWarm && base.warmAccent && !inHues(accent, [[0, 60], [330, 360]])) {
      accent = base.warmAccent;
      source = "language";
    }
  }
  // Accent lisible sur le fond (boutons, liens, chiffres).
  if (base.dark) accent = contrast(accent, bg) < 4.5 ? withLightness(accent, Math.max(0.66, hsl(accent)[2]), 1.1) : accent;
  else accent = contrast(accent, bg) < 4.5 ? ensureContrast(accent, bg, 4.5) : accent;
  const surface = source === "brand-locked" ? mix(bg, text, 0.05) : base.surface;
  const muted = ensureContrast(mix(text, bg, 0.38), bg, 4.6);
  const inverseBg = base.dark ? withLightness(accent, 0.94, 0.4) : withLightness(hslToHex(hsl(text)[0], hsl(text)[1], 0.1), 0.1);
  return { bg, surface, text, muted, accent, inverseBg, inverseText: onColor(inverseBg, "#141414", base.dark ? "#141414" : "#F7F4EF"), source };
}

export function artDirection(p: Project, intent: WebsiteIntent, opts: { language?: LanguageId } = {}): ArtDirection {
  const scores = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.score(intent)])) as Record<LanguageId, number>;
  const def = opts.language ? LANGUAGES.find((l) => l.id === opts.language)! : [...LANGUAGES].sort((a, b) => scores[b.id] - scores[a.id])[0];
  const b = p.brand;
  // Typographies : validées par le client > celles du logo retenu > celles du langage.
  let typo: ArtDirection["typography"] = { heading: def.fonts.heading, body: def.fonts.body, ratio: def.ratio, headingCase: "none", source: "language" };
  if (b?.fonts?.heading && isLocked(b, "fonts")) typo = { ...typo, heading: b.fonts.heading, body: b.fonts.body ?? typo.body, source: "brand-locked" };
  else if (b?.logo?.status === "validated") {
    const rf = routeFonts(b.logo.route);
    if (rf) typo = { ...typo, heading: rf.heading, body: rf.body, source: "logo" };
  }
  const positioning = b?.positioning && !/\[(À|A) (définir|compléter)/i.test(b.positioning) ? b.positioning : b?.tagline ?? p.product.summary ?? "";
  return {
    language: def.id,
    label: def.label,
    positioning,
    personality: b?.personality ?? [],
    audience: (b as { audience?: string } | null)?.audience ?? "",
    mood: def.mood,
    palette: paletteFor(def, p, intent),
    typography: typo,
    density: def.density,
    rhythm: def.rhythm,
    photoStyle: def.photoStyle,
    graphicLanguage: def.graphicLanguage,
    shapes: def.shapes,
    motion: def.motion,
    ctaStyle: def.ctaStyle,
    header: def.header,
    footer: def.footer,
    hero: def.hero,
    preset: def.preset,
    pageWidth: def.pageWidth,
    scores,
  };
}
