import { withCommunicationStrategy, strategyContent, strategyStamp } from "../strategy-consumption";
import { serviceStrategyProject, reviewServiceCommunication } from '../marketing-strategy';
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
import { EditorialSchema, type Editorial } from "./creative-contract";
import { platformSpec } from "./platforms";

export type OneKind = "image" | "carousel" | "video";
/** Image : gratuit, image par l'IA (mise en page du studio) ou tout par l'IA. Vidéo : montage gratuit ou plans filmés par l'IA. */
export type OneMode = "free" | "ai_image" | "ai_post" | "ai_video";

export type OneRequest = {
  angleId?:import("../marketing-strategy").AngleId;
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
  caption?: string;
  editorial?: Editorial;
};

/** Mode payant ? (gratuit : aucune dépense, jamais d'IA). */
export const paidMode = (m: OneMode) => m !== "free";

/** Coût avant création (micro-euros) : une production par réseau choisi. `cost` : coût probable (devis) ou plafond. */
export function quoteOne(kind: OneKind, mode: OneMode, networks: number, cost: SocialDeps["estimate"], pages=1): number {
  if (!paidMode(mode)) return 0;
  // Image : toujours une publication entière par l'IA (l'ancien « ai_image » est traité de la même façon).
  const unit = kind === "video" ? cost("video") : cost("ai_post");
  return unit * Math.max(1, networks) * (kind==="carousel"?Math.max(2,pages):1);
}

/** Paramètres de production correspondant au mode choisi. */
export function produceParams(kind: OneKind, mode: OneMode): { allowPaid: boolean; aiBackground?: boolean; aiImages?: number } {
  if (!paidMode(mode)) return { allowPaid: false };
  if (kind === "video") return { allowPaid: true };
  return { allowPaid: true, aiImages: 60 };
}

/** Crée la publication (une par réseau choisi, même idée adaptée à chacun) ; renvoie ses identifiants. */
export function createOnePost(p: Project, r: OneRequest): { planId: string; ids: string[]; warnings: string[] } {
  return withCommunicationStrategy(p.id,()=>createOneInScope(p,r),{angleId:r.angleId});
}
function createOneInScope(p:Project,r:OneRequest):ReturnType<typeof createOnePost>{
  if(r.kind==="carousel" && r.platforms.some(x=>!platformSpec(x.platform).formats.includes("carousel")))throw new Error("Choisissez un réseau compatible avec les carrousels.");
  if(r.editorial)EditorialSchema.parse(r.editorial);
  const res = createPlanV2(p, {
    startDate: r.date,
    endDate: r.date,
    perDay: 1,
    slots: [r.time],
    timezone: r.timezone,
    platforms: r.platforms,
    distribution: "all",
    formatMix: r.kind === "video" ? { video: 100 } : r.kind==="carousel"?{carousel:100}:{ image: 100 },
    priority: r.pillar ? [r.pillar] : undefined,
    lang: r.lang,
  });
  const ids = postsOfPlan(res.planId);
  const head = r.headline?.trim();
  if (head && ids.length) run(`UPDATE posts SET title = ?, brief = json_set(COALESCE(brief, '{}'), '$.headline', ?) WHERE plan_id = ?`, head.slice(0, 120), head.slice(0, 120), res.planId);
  if (r.subject && ids.length) run(`UPDATE posts SET brief = json_set(COALESCE(brief, '{}'), '$.subject', json(?)) WHERE plan_id = ?`, JSON.stringify(r.subject), res.planId);
  const ask = r.request?.trim();
  if (ask && ids.length) run(`UPDATE posts SET brief = json_set(COALESCE(brief, '{}'), '$.request', ?) WHERE plan_id = ?`, ask, res.planId);
  if (r.caption!=null) run("UPDATE posts SET caption=? WHERE plan_id=?",r.caption,res.planId);
  if (r.editorial) run("UPDATE posts SET brief=json_set(COALESCE(brief,'{}'),'$.editorial',json(?)) WHERE plan_id=?",JSON.stringify(r.editorial),res.planId);
  if(r.pillar)run("UPDATE posts SET pillar=? WHERE plan_id=?",r.pillar,res.planId);
  if (head || r.caption != null) for (const postId of ids) {
    // The explicit creation request attaches this exact client copy to its chosen communication angle.
    // Keep it protected without erasing its provenance. Publishing still requires native approval.
    const services=serviceStrategyProject(p.id);
    strategyContent(p.id, "post", postId, { stamp: services?strategyStamp(p.id):null, protected: true });
    if(services)reviewServiceCommunication(p.id,'post',postId,r.angleId);
  }
  return { planId: res.planId, ids, warnings: res.warnings };
}
