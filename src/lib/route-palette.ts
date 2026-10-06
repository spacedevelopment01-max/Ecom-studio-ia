/**
 * Palette effective de la marque : celle de la piste de logo retenue. Choisir une piste (monogramme bleu nuit,
 * logotype rouge…) donne le ton à tout le reste — site, visuels, vignettes — au lieu de garder l'accent de départ.
 * Fonction pure, utilisable côté serveur comme dans l'écran.
 */
import type { Brand } from "./project-types";

type Palette = Brand["palette"];
type Role = keyof Palette;
const ROLES: Role[] = ["primary", "secondary", "accent", "light", "dark"];

/** Rôles de la palette d'où viennent les couleurs de la piste (enregistrés, ou retrouvés d'après les codes couleur). */
function rolesOf(pal: Palette, route: NonNullable<Brand["logo"]["route"]>): { accent: Role; ground: Role } | null {
  if (route.roles) return { accent: route.roles.accent, ground: route.roles.ground };
  const find = (hex: string) => ROLES.find((r) => pal[r]?.toLowerCase() === hex?.toLowerCase());
  const accent = find(route.colors.accent);
  const ground = find(route.colors.ground);
  return accent && ground ? { accent, ground } : null;
}

/**
 * Pour chaque couleur de la palette affichée, le rôle de la palette enregistrée d'où elle vient avec la piste retenue
 * (sans piste : chaque couleur vient d'elle-même). Sert à afficher la palette de la piste et à modifier la bonne couleur.
 */
export function paletteSources(brand: Pick<Brand, "palette" | "logo"> | null | undefined): Record<Role, Role> {
  const same = Object.fromEntries(ROLES.map((k) => [k, k])) as Record<Role, Role>;
  const route = brand?.logo?.route;
  const r = brand && route ? rolesOf(brand.palette, route) : null;
  if (!r) return same;
  // Couleur d'accent du site = celle de la piste ; couleur principale = son fond s'il est soutenu, sinon son accent.
  const primary: Role = r.ground === "light" || r.ground === "secondary" ? (r.accent === "accent" ? "primary" : r.accent) : r.ground;
  return { ...same, primary, accent: r.accent };
}

export function effectivePalette(brand: Pick<Brand, "palette" | "logo"> | null | undefined): Palette | null {
  if (!brand) return null;
  const src = paletteSources(brand);
  return Object.fromEntries(ROLES.map((k) => [k, brand.palette[src[k]]])) as Palette;
}

/** Empreinte d'une palette (couleurs principale et d'accent, celles qui donnent le ton d'une carte). */
export const paletteKey = (pal: { primary: string; accent: string }) => `${pal.primary}/${pal.accent}`.toUpperCase();
