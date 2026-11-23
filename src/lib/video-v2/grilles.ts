/**
 * Les deux grilles des vidéos courtes (rapport 09 du 22 novembre 2026, point 9), d'après les règles officielles de
 * TikTok (produit en action dans les 2 premières secondes, message dans les 3 premières, chaque point sous 4 secondes,
 * l'offre sur la dernière image) et de Meta (les 35 % du bas libres de texte).
 *
 *  - Publication de 9 à 15 s, 5 temps : accroche de l'angle (le plan animé), premier bénéfice, gros plan matière,
 *    le produit dans son décor (ou une preuve vraie), l'offre en clair.
 *  - Publicité de 21 à 30 s : les mêmes temps, plus une partie « preuve » (un vrai chiffre, un vrai avis fourni par le
 *    client — jamais inventé) et deux plans animés au lieu d'un.
 * L'angle choisi par le client remplit la grille (accroche, bénéfices, offre : `videoStrategy`).
 */
import type { ScriptPart, VideoIntent, VideoPlatform } from "./types";

export type GridKind = "post" | "ad";
export const GRID_RANGE: Record<GridKind, [number, number]> = { post: [9, 15], ad: [21, 30] };
/** Part de chaque temps (l'accroche est bornée à 2 s, les autres à 4 s pour une publication). */
const WEIGHT: Record<ScriptPart, number> = { hook: 2, development: 3, demonstration: 4, proof: 4, conclusion: 3, cta: 3 };
const SHORT: VideoPlatform[] = ["tiktok", "reels", "shorts", "meta_feed"];

/** Grille que vise cette vidéo (formats courts des réseaux) ; null : vidéo longue, site ou fiche produit. */
export function gridKind(intent: Pick<VideoIntent, "kind" | "platform" | "durationS" | "purpose">): GridKind | null {
  if (!SHORT.includes(intent.platform) || intent.kind === "ugc") return null;
  const ad = intent.purpose === "ad" || (intent.purpose !== "organic" && (intent.kind === "video_ad" || intent.kind === "launch"));
  return ad ? "ad" : intent.kind === "social_content" || intent.purpose === "organic" || intent.durationS <= 15 ? "post" : null;
}
/**
 * Grille qui s'applique : celle visée, quand la durée est dans sa plage (la durée par défaut y est ramenée par
 * `videoIntent`) ; une durée demandée par le client hors de la plage garde le découpage habituel.
 */
export function gridFor(intent: Pick<VideoIntent, "kind" | "platform" | "durationS" | "purpose">): GridKind | null {
  const g = gridKind(intent);
  return g && intent.durationS >= GRID_RANGE[g][0] && intent.durationS <= GRID_RANGE[g][1] ? g : null;
}

/** Durée tenue dans la grille (une durée demandée hors de la grille y est ramenée). */
export const gridDuration = (g: GridKind, asked: number) => Math.max(GRID_RANGE[g][0], Math.min(GRID_RANGE[g][1], Math.round(asked)));

/** Temps de la grille : la preuve n'existe que si une preuve vraie est disponible. */
export function gridParts(g: GridKind, o: { proof: boolean; cta: boolean }): ScriptPart[] {
  const parts: ScriptPart[] = ["hook", "development", "demonstration", "conclusion"];
  if (g === "ad" && o.proof) parts.splice(3, 0, "proof");
  if (o.cta) parts.push("cta");
  return parts;
}

/** Durée de chaque temps : l'accroche 2 s au plus, chaque temps d'une publication sous 4 s ; total exact. */
export function gridDurations(g: GridKind, parts: ScriptPart[], total: number): number[] {
  const sum = parts.reduce((t, p) => t + WEIGHT[p], 0);
  const cap = (p: ScriptPart) => (p === "hook" ? 2 : g === "post" ? 4 : 8);
  let out = parts.map((p) => Math.min(cap(p), (WEIGHT[p] / sum) * total));
  // Ce qui reste après les bornes revient aux temps qui ont encore de la place.
  for (let k = 0; k < 4; k++) {
    const left = total - out.reduce((a, b) => a + b, 0);
    const room = parts.map((p, i) => (out[i] < cap(p) ? i : -1)).filter((i) => i >= 0);
    if (Math.abs(left) < 0.01 || !room.length) break;
    out = out.map((d, i) => (room.includes(i) ? Math.min(cap(parts[i]), d + left / room.length) : d));
  }
  out = out.map((d) => Math.round(d * 10) / 10);
  out[out.length - 1] = Math.round((total - out.slice(0, -1).reduce((a, b) => a + b, 0)) * 10) / 10;
  return out;
}

/** Plans animés du mélange : un pour une publication, deux pour une publicité. */
export const gridAnimatedShots = (g: GridKind | null) => (g === "ad" ? 2 : 1);
