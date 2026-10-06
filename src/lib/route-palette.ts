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

export function effectivePalette(brand: Pick<Brand, "palette" | "logo"> | null | undefined): Palette | null {
  if (!brand) return null;
  const pal = brand.palette;
  const route = brand.logo?.route;
  if (!route) return pal;
  const r = rolesOf(pal, route);
  if (!r) return pal;
  // Couleur d'accent du site = celle de la piste ; couleur principale = son fond s'il est soutenu, sinon son accent.
  const accent = pal[r.accent];
  const primary = r.ground === "light" || r.ground === "secondary" ? (r.accent === "accent" ? pal.primary : pal[r.accent]) : pal[r.ground];
  return { ...pal, primary, accent };
}
