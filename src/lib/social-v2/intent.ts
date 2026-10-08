/**
 * Compréhension d'une demande sociale en clair (« Prépare mes publications pour les 30 prochains jours, avec 3
 * publications par jour, des images, des vidéos et des textes, puis programme-les sur mes comptes connectés »).
 * Déterministe et gratuit : durée, fréquence, formats, réseaux, programmation demandée. La programmation n'a lieu
 * qu'après approbation des contenus — la demande ne vaut pas approbation de contenus qui n'existent pas encore.
 */
import { fold } from "../seo-v2/lang";
import { PLATFORMS, type Platform } from "./platforms";
import type { FormatKind } from "./planner";

export type SocialAsk = { days: number; perDay: number; platforms: Platform[] | null; formatMix: Partial<Record<FormatKind, number>> | null; schedule: boolean; startOffsetDays: number; notes: string[] };

const NUM: Record<string, number> = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, dix: 10, quinze: 15, vingt: 20, trente: 30, one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, ten: 10, fifteen: 15, thirty: 30 };
const n = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUM[s] ?? NaN);

export function parseSocialAsk(text: string): SocialAsk {
  const t = fold(text);
  const notes: string[] = [];
  let days = 30;
  const d = t.match(/(\d+|\w+)\s+(prochains\s+)?(jours|days)/);
  const w = t.match(/(\d+|\w+)\s+(prochaines\s+)?(semaines|weeks)/);
  const m = t.match(/(\d+|\w+)\s+(prochains\s+)?(mois|months)/);
  if (d && Number.isFinite(n(d[1]))) days = n(d[1]);
  else if (w && Number.isFinite(n(w[1]))) days = n(w[1]) * 7;
  else if (m && Number.isFinite(n(m[1]))) days = n(m[1]) * 30;
  else if (/(cette|la) semaine|this week|next week|semaine prochaine/.test(t)) days = 7;
  else if (/(ce|le) mois|this month|next month|mois prochain/.test(t)) days = 30;
  else notes.push("durée non précisée : 30 jours");
  let perDay = 1;
  const p = t.match(/(\d+|\w+)\s+(publications?|posts?)\s+(par|per|a|by)\s+(jour|day)/);
  if (p && Number.isFinite(n(p[1]))) perDay = n(p[1]);
  else if (/une? publication par jour|one post a day|daily/.test(t)) perDay = 1;
  else notes.push("fréquence non précisée : 1 publication par jour");
  if (perDay > 5) {
    notes.push(`${perDay} publications par jour demandées : limité à 5`);
    perDay = 5;
  }
  days = Math.max(1, Math.min(366, days));
  const platforms = PLATFORMS.filter((pl) => t.includes(pl));
  const mix: Partial<Record<FormatKind, number>> = {};
  if (/images?|photos?|visuels?|pictures?/.test(t)) mix.image = 1;
  if (/videos?|reels?|shorts?/.test(t)) mix.video = 1;
  if (/carrousels?|carousels?/.test(t)) mix.carousel = 1;
  if (/textes?|texts?/.test(t) && Object.keys(mix).length) mix.text = 1;
  const schedule = /programm|planifie[- ]les|schedule|publie[- ]les|publish them/.test(t);
  const startOffsetDays = /aujourd'?hui|today/.test(t) ? 0 : 1;
  return { days, perDay, platforms: platforms.length ? platforms : null, formatMix: Object.keys(mix).length ? mix : null, schedule, startOffsetDays, notes };
}
