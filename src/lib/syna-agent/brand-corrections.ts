/**
 * Ce qui se mesure est corrigé par le code AVANT le directeur de création (audit du 22 novembre 2026, 2.8) : un fond
 * « blanc » qui n'est pas blanc pur, un fond sombre pas assez foncé, un contraste sous 4,5:1, un dégradé trop sombre, une
 * manière d'ouvrir le site déjà prise, un chiffre absent de la fiche. Ces défauts partaient au directeur puis à une
 * reprise payée de la planche entière ; le Studio les corrige seul, gratuitement, comme il corrige déjà les polices et
 * les fonds clairs (`variete-marques.ts`). Le directeur ne juge plus que le talent.
 */
import { contrast, luminance, mix } from "../color";
import { L } from "../i18n-server";
import { clientFacts, unprovenClaims, type Route } from "./brand-routes";
import { groundPresentation, oklch } from "./identities";
import type { Journey } from "./journey";

/** Les manières d'ouvrir le haut du site que la consigne de la planche propose (`brand-prompts.ts`, board.site). */
export const MANIERES_D_OUVRIR = {
  produits: ["photo plein écran avec accès direct", "titre centré sous le produit", "titre sur fond de couleur avec la photo dans un cadre", "affiche typographique", "deux cadrages", "accroche tout en haut", "image immersive", "recherche et collections", "détail de l'offre"],
  services: ["photo plein écran avec accès direct", "réservation", "choix avant contact", "titre sur fond de couleur avec la photo dans un cadre", "prestations en raccourci", "devis par besoin", "affiche typographique", "image immersive", "détail de l'offre"],
} as const;

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

/** Pousse une couleur vers le noir ou le blanc, à petits pas, jusqu'à ce que `ok` soit vrai (douze pas au plus). */
function pousse(hex: string, vers: "#000000" | "#FFFFFF", ok: (h: string) => boolean): string {
  let h = hex;
  for (let i = 0; i < 12 && !ok(h); i++) h = mix(h, vers, 0.18);
  return h;
}

/** Corrige une couleur posée sous un texte pour que le meilleur texte possible s'y lise à 4,5:1. */
function lisible(bg: string, textes: string[]): string {
  const meilleur = (b: string) => Math.max(...textes.map((t) => contrast(t, b)));
  if (meilleur(bg) >= 4.5) return bg;
  return pousse(bg, luminance(bg) > 0.18 ? "#FFFFFF" : "#000000", (b) => meilleur(b) >= 4.5);
}

/**
 * Les couleurs d'une route corrigées par le code. Rend la route et la liste des changements (pour les notes du Studio).
 * Le client garde ses couleurs (« couleurs » gardées) : rien n'est touché.
 */
export function corrigeLesCouleurs(x: Route, j?: Journey): { route: Route; changes: string[] } {
  if (j?.keep.includes("couleurs")) return { route: x, changes: [] };
  const p = { ...x.palette }, changes: string[] = [];
  let gradient = x.gradient ? { ...x.gradient } : undefined;
  const note = (role: string, avant: string, apres: string) => { if (avant !== apres) changes.push(`${x.key} : ${role} ${avant} → ${apres}`); };
  const avant = { ...p };
  if (x.ground === "blanc" && (luminance(p.light) < 0.9 || oklch(p.light).c > 0.012)) p.light = "#FFFFFF";
  if (x.ground === "uni") p.light = pousse(p.light, "#FFFFFF", (h) => luminance(h) >= 0.6);
  if (x.ground === "sombre") {
    p.dark = pousse(p.dark, "#000000", (h) => luminance(h) <= 0.05);
    p.light = pousse(p.light, "#FFFFFF", (h) => luminance(h) >= 0.65 && contrast(h, p.dark) >= 4.5);
  }
  if (x.ground === "blanc" || x.ground === "uni") p.dark = pousse(p.dark, "#000000", (h) => luminance(h) <= 0.12 && contrast(h, p.light) >= 4.5);
  if (x.ground === "degrade" && gradient) {
    const moyenne = () => (oklch(gradient!.from).l + oklch(gradient!.to).l) / 2;
    for (let i = 0; i < 12 && moyenne() < 0.55; i++) gradient = { from: mix(gradient.from, "#FFFFFF", 0.12), to: mix(gradient.to, "#FFFFFF", 0.12) };
    const v = groundPresentation(p, x.ground, gradient), mini = (fg: string) => Math.min(...v.backgrounds.map((b) => contrast(fg, b)));
    if (mini(v.text) < 4.5) {
      if (v.text === p.dark) p.dark = pousse(p.dark, "#000000", (h) => mini(h) >= 4.5);
      else p.light = pousse(p.light, "#FFFFFF", (h) => mini(h) >= 4.5);
    }
  }
  // La surface des cartes et le bouton : leur couleur est ajustée (même teinte, plus claire ou plus foncée) jusqu'à ce
  // qu'un texte s'y lise.
  const textes = () => [p.dark, p.light, "#141414", "#FFFFFF"];
  p.secondary = lisible(p.secondary, textes());
  p.primary = lisible(p.primary, textes());
  for (const k of Object.keys(p) as (keyof typeof p)[]) note(k, avant[k], p[k]);
  if (gradient && x.gradient && (gradient.from !== x.gradient.from || gradient.to !== x.gradient.to)) changes.push(`${x.key} : dégradé éclairci ${x.gradient.from} → ${x.gradient.to} devient ${gradient.from} → ${gradient.to}`);
  return { route: { ...x, palette: p, ...(gradient ? { gradient } : {}) }, changes };
}

/** Une manière d'ouvrir le site déjà prise par une autre route de la série (ou absente) : la suivante libre de la liste. */
export function corrigeLOuverture(x: Route, autres: Route[], kind: "produits" | "services"): { route: Route; changes: string[] } {
  const l = x.board.site.layout, prises = new Set(autres.map((o) => norm(o.board.site.layout?.opening ?? "")).filter(Boolean));
  const mienne = norm(l?.opening ?? "");
  if (mienne && !prises.has(mienne)) return { route: x, changes: [] };
  // Une planche d'avant décrit son haut de site sans « opening » (place du titre, menu, suite) : laissée telle quelle.
  if (!mienne && l?.title && l.menu && l.next) return { route: x, changes: [] };
  const libre = MANIERES_D_OUVRIR[kind].find((m) => !prises.has(norm(m)));
  if (!libre) return { route: x, changes: [] };
  return { route: { ...x, board: { ...x.board, site: { ...x.board.site, layout: { ...(l ?? {}), opening: libre } } } }, changes: [`${x.key} : manière d'ouvrir le site « ${l?.opening ?? "aucune"} » → « ${libre} »`] };
}

/** Un chiffre ou un mot de garantie absent de la fiche du client : annoncé dans « ce qui reste à prouver » (ce que la règle permet). */
export function annonceLesChiffres(x: Route, j: Journey): { route: Route; changes: string[] } {
  const claims = unprovenClaims(x, clientFacts(j));
  if (!claims.length) return { route: x, changes: [] };
  const ligne = L(
    `${claims.map((c) => `« ${c} »`).join(", ")} : ${claims.length > 1 ? "ils ne viennent pas" : "il ne vient pas"} de ta fiche ; à confirmer avant de ${claims.length > 1 ? "les" : "l'"}utiliser.`,
    `${claims.map((c) => `"${c}"`).join(", ")}: not from your brief; to confirm before using.`,
  );
  return { route: { ...x, board: { ...x.board, toProve: x.board.toProve.length >= 8 ? [...x.board.toProve.slice(0, 7), ligne.slice(0, 200)] : [...x.board.toProve, ligne.slice(0, 200)] } }, changes: [`${x.key} : ${claims.join(", ")} annoncé(s) à prouver`] };
}

/** Les trois corrections, dans l'ordre, pour une route neuve d'une série. */
export function corrigeCeQuiSeMesure(x: Route, autres: Route[], j: Journey, kind: "produits" | "services"): { route: Route; changes: string[] } {
  const a = corrigeLesCouleurs(x, j), b = corrigeLOuverture(a.route, autres, kind), c = annonceLesChiffres(b.route, j);
  return { route: c.route, changes: [...a.changes, ...b.changes, ...c.changes] };
}
