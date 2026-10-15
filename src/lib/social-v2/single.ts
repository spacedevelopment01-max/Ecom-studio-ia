/**
 * Une publication à la fois (Publications › Créer une publication image / vidéo) : même moteur que le calendrier
 * (textes à partir des informations vérifiées, adaptation à chaque réseau, contrôles), pour un seul créneau.
 * Le visuel se fait ensuite avec la production habituelle (gratuite, ou payante après le prix accepté).
 */
import { run } from "../db";
import type { Project } from "../projects";
import { createPlanV2 } from "./planner";
import { postsOfPlan } from "./production";
import type { SocialDeps } from "./deps";
import type { Platform } from "./platforms";
import type { CreativeSubject } from "../creative-subject";

export type OneKind = "image" | "video";
/** Image : gratuit, image par l'IA (mise en page du studio) ou tout par l'IA. Vidéo : montage gratuit ou plans filmés par l'IA. */
export type OneMode = "free" | "ai_image" | "ai_post" | "ai_video";

export type OneRequest = {
  kind: OneKind;
  date: string;
  time: string;
  timezone: string;
  platforms: { platform: Platform; connectionId?: string | null }[];
  /** Thème (pilier de la stratégie) voulu. */
  pillar?: string;
  /** Titre écrit par le client (sinon proposé par le studio). */
  headline?: string;
  lang?: "fr" | "en";
  /** Produit (principal ou du catalogue) ou service choisi par le client pour ce visuel. */
  subject?: CreativeSubject | null;
  /** Demande du client écrite librement (« comme en conversation ») : l'idée du visuel. */
  request?: string | null;
};

/** Mode payant ? (gratuit : aucune dépense, jamais d'IA). */
export const paidMode = (m: OneMode) => m !== "free";

/** Coût estimé avant création (micro-euros) : une production par réseau choisi. */
export function quoteOne(kind: OneKind, mode: OneMode, networks: number, estimate: SocialDeps["estimate"]): number {
  if (!paidMode(mode)) return 0;
  const unit = kind === "video" ? estimate("video") : mode === "ai_post" ? estimate("ai_post") : estimate("image");
  return unit * Math.max(1, networks);
}

/** Paramètres de production correspondant au mode choisi. */
export function produceParams(kind: OneKind, mode: OneMode): { allowPaid: boolean; aiBackground?: boolean; aiImages?: number } {
  if (!paidMode(mode)) return { allowPaid: false };
  if (kind === "video") return { allowPaid: true };
  return mode === "ai_post" ? { allowPaid: true, aiImages: 60 } : { allowPaid: true, aiBackground: true };
}

/** Crée la publication (une par réseau choisi, même idée adaptée à chacun) ; renvoie ses identifiants. */
export function createOnePost(p: Project, r: OneRequest): { planId: string; ids: string[]; warnings: string[] } {
  const res = createPlanV2(p, {
    startDate: r.date,
    endDate: r.date,
    perDay: 1,
    slots: [r.time],
    timezone: r.timezone,
    platforms: r.platforms,
    distribution: "all",
    formatMix: r.kind === "video" ? { video: 100 } : { image: 100 },
    priority: r.pillar ? [r.pillar] : undefined,
    lang: r.lang,
  });
  const ids = postsOfPlan(res.planId);
  const head = r.headline?.trim();
  if (head && ids.length) run(`UPDATE posts SET title = ?, brief = json_set(COALESCE(brief, '{}'), '$.headline', ?) WHERE plan_id = ?`, head.slice(0, 120), head.slice(0, 120), res.planId);
  if (r.subject && ids.length) run(`UPDATE posts SET brief = json_set(COALESCE(brief, '{}'), '$.subject', json(?)) WHERE plan_id = ?`, JSON.stringify(r.subject), res.planId);
  const ask = r.request?.trim();
  if (ask && ids.length) run(`UPDATE posts SET brief = json_set(COALESCE(brief, '{}'), '$.request', ?) WHERE plan_id = ?`, ask.slice(0, 600), res.planId);
  return { planId: res.planId, ids, warnings: res.warnings };
}
