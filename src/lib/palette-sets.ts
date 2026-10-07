/**
 * Changer toute la palette d'un coup (onglet Marque) : palettes prêtes, palette complète construite autour d'une
 * seule couleur, ou cinq codes collés. Tout est calculé ici, sans IA (0 €). Fonctions pures, utilisables dans l'écran.
 */
import type { Brand } from "./project-types";
import { ensureContrast, hsl, hslToHex } from "./color";

type Palette = Brand["palette"];
const ROLES = ["primary", "secondary", "accent", "light", "dark"] as const;

/** Palettes harmonieuses prêtes à l'emploi (principale, secondaire, accent, clair, sombre). */
export const PALETTE_SETS: { name: { fr: string; en: string }; palette: Palette }[] = [
  { name: { fr: "Bleu ardoise", en: "Slate blue" }, palette: { primary: "#2F4A63", secondary: "#D6E0EA", accent: "#E0A23B", light: "#F5F7FA", dark: "#141C26" } },
  { name: { fr: "Bleu nuit et corail", en: "Midnight & coral" }, palette: { primary: "#1C2B4A", secondary: "#DCE3F0", accent: "#E8674F", light: "#F6F7FB", dark: "#0E1424" } },
  { name: { fr: "Marine et sable", en: "Navy & sand" }, palette: { primary: "#22385C", secondary: "#E8DCC6", accent: "#C99A5B", light: "#FAF7F1", dark: "#121B2B" } },
  { name: { fr: "Pétrole et ocre", en: "Teal & ochre" }, palette: { primary: "#1F5560", secondary: "#D3E4E4", accent: "#D49A2F", light: "#F4F8F7", dark: "#0F2328" } },
  { name: { fr: "Vert sauge", en: "Sage green" }, palette: { primary: "#4E6B53", secondary: "#DDE6D8", accent: "#C8875A", light: "#F6F8F3", dark: "#1A231C" } },
  { name: { fr: "Vert forêt et laiton", en: "Forest & brass" }, palette: { primary: "#22433A", secondary: "#DCE5DE", accent: "#B8913F", light: "#F5F7F3", dark: "#0F1C18" } },
  { name: { fr: "Terracotta", en: "Terracotta" }, palette: { primary: "#A4502F", secondary: "#F0DDCF", accent: "#2F5D62", light: "#FBF6F1", dark: "#2A1710" } },
  { name: { fr: "Brique et crème", en: "Brick & cream" }, palette: { primary: "#8E2F25", secondary: "#F1E3D3", accent: "#D9A441", light: "#FBF7F0", dark: "#24110D" } },
  { name: { fr: "Bordeaux et or", en: "Burgundy & gold" }, palette: { primary: "#5E1A2E", secondary: "#EBDDE0", accent: "#C9A24A", light: "#FAF6F4", dark: "#1E0A10" } },
  { name: { fr: "Noir et or", en: "Black & gold" }, palette: { primary: "#1E1E1E", secondary: "#E6E1D6", accent: "#C7A046", light: "#F7F5F0", dark: "#0B0B0B" } },
  { name: { fr: "Béton et jaune chantier", en: "Concrete & site yellow" }, palette: { primary: "#3A3F44", secondary: "#DADDE0", accent: "#F2B705", light: "#F5F6F7", dark: "#16181A" } },
  { name: { fr: "Gris perle et bleu", en: "Pearl grey & blue" }, palette: { primary: "#5A6672", secondary: "#E3E7EB", accent: "#2E7DD1", light: "#F7F8FA", dark: "#1B2026" } },
  { name: { fr: "Lavande", en: "Lavender" }, palette: { primary: "#5D4E8C", secondary: "#E5E0F2", accent: "#E39B6B", light: "#F8F6FC", dark: "#1D1830" } },
  { name: { fr: "Rose poudré", en: "Dusty rose" }, palette: { primary: "#9C5B6B", secondary: "#F2DFE3", accent: "#4F6B6B", light: "#FCF7F8", dark: "#2B171C" } },
  { name: { fr: "Olive et moutarde", en: "Olive & mustard" }, palette: { primary: "#5B5E2E", secondary: "#E7E5CF", accent: "#D19A22", light: "#F9F8F1", dark: "#1D1E0E" } },
  { name: { fr: "Chocolat et caramel", en: "Chocolate & caramel" }, palette: { primary: "#4A2C21", secondary: "#EADBCD", accent: "#D08A3C", light: "#FAF5F0", dark: "#1C100B" } },
];

/**
 * Palette complète autour d'une seule couleur principale : une secondaire douce de la même teinte, un accent
 * complémentaire bien visible, un fond clair et un sombre lisibles avec elle.
 */
export function paletteFromColor(hex: string): Palette {
  const [h, s, l] = hsl(hex);
  const primary = hex.toUpperCase();
  const sat = Math.max(s, 0.2);
  // Couleur peu saturée (gris, noir) : accent doré ; sinon teinte complémentaire décalée (plus harmonieuse que l'opposée stricte).
  const accent = s < 0.12 ? "#C9A046" : hslToHex(h + 150, Math.min(0.75, Math.max(0.5, sat)), l < 0.35 ? 0.55 : 0.5);
  const light = hslToHex(h, Math.min(0.3, sat), 0.97);
  return {
    primary,
    secondary: hslToHex(h, Math.min(0.35, sat), 0.86),
    accent: ensureContrast(accent, light, 2.2).toUpperCase(),
    light,
    dark: hslToHex(h, Math.min(0.3, sat), 0.09),
  };
}

/** Cinq codes couleur collés (« #8A4B1C, #EADFCB, … » ou un par ligne), dans l'ordre des cases ; sinon null. */
export function parsePalette(text: string): Palette | null {
  const codes = (text.match(/#?\b[0-9a-f]{6}\b/gi) ?? []).map((c) => `#${c.replace("#", "").toUpperCase()}`);
  if (codes.length < 5) return null;
  return Object.fromEntries(ROLES.map((r, i) => [r, codes[i]])) as Palette;
}
