/**
 * Permissions des forfaits — système central, appliqué côté serveur (routes, worker, publication programmée).
 *
 * Les droits viennent TOUJOURS du forfait actif et confirmé de l'abonnement rattaché au projet (project-billing.ts),
 * jamais d'une valeur envoyée par le navigateur : modifier une requête ne donne aucun droit. Un compte avec plusieurs
 * projets a les droits de chaque projet séparément. L'administrateur suit son forfait comme un client.
 * Messages simples qui disent quel forfait débloque quoi.
 */
import { assertAdvertising } from "./job-entitlements";
import { HttpError, type User } from "./auth";
import { one } from "./db";
import { PLANS, type Plan, type PlanId } from "./plans";
import { projectPlan } from "./project-billing";
import { themeAllowed, planForTheme, themeRank, themeStatus } from "./theme/theme-access";
import { retiredThemeReason } from "./theme/theme-fit";
import { L } from "./i18n-server";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const name = (p: PlanId) => L(PLANS[p].name.fr, PLANS[p].name.en);
/** Premier forfait qui a la caractéristique demandée. */
const firstWith = (ok: (p: Plan) => boolean): PlanId | null => (["creer", "vendre", "dominer"] as PlanId[]).find((id) => ok(PLANS[id])) ?? null;
const needPlan = (p: PlanId | null) => (p ? L(`Disponible avec le forfait ${name(p)}.`, `Available with the ${name(p)} plan.`) : "");

/** Forfait en vigueur pour le projet (null : aucun abonnement payé — découverte, ou abonnement résilié). */
export function planOfProject(projectId: string): PlanId | null {
  return projectPlan(projectId);
}

/** Droits complets du forfait du projet, ou null sans abonnement actif. */
export function projectRights(projectId: string): Plan | null {
  const p = projectPlan(projectId);
  return p ? PLANS[p] : null;
}

/**
 * Fonctions payantes (génération IA, export, envoi vers Shopify, publication) : abonnement actif du projet requis.
 * Projet résilié : en lecture seule tant qu'il n'est pas réactivé.
 */
export function requirePlan(_user: User | null, projectId: string): PlanId {
  const plan = projectPlan(projectId);
  if (!plan) {
    throw new HttpError(
      402,
      L("Ce projet n'a pas de forfait actif. Chaque projet a son propre abonnement : choisissez ou réactivez le forfait de ce projet dans « Mon compte » pour créer, exporter et publier.", "This project has no active plan. Each project has its own subscription: choose or reactivate this project's plan in \"My account\" to create, export and publish."),
      "plan_required",
    );
  }
  return plan;
}

/** Création d'images, de vidéos IA et de vidéos UGC selon le forfait du projet. */
export function requireCreationPlan(user: User | null, projectId: string, what: "images" | "videos" | "ugc"): PlanId {
  const plan = requirePlan(user, projectId);
  const P = PLANS[plan];
  if (what === "videos" && P.videos === "none") throw new HttpError(402, L(`Les vidéos IA ne sont pas incluses dans le forfait ${name(plan)}. ${needPlan(firstWith((p) => p.videos !== "none"))}`, `AI videos aren't included in the ${name(plan)} plan. ${needPlan(firstWith((p) => p.videos !== "none"))}`), "plan_upgrade");
  if (what === "ugc" && !P.ugc) throw new HttpError(402, L(`Les vidéos UGC par l'IA ne sont pas incluses dans le forfait ${name(plan)}. ${needPlan(firstWith((p) => p.ugc))}`, `AI UGC videos aren't included in the ${name(plan)} plan. ${needPlan(firstWith((p) => p.ugc))}`), "plan_upgrade");
  return plan;
}

/** Création, reconstruction et modification avancée de sections par l'IA ; pages personnalisées. */
export function assertAiSections(projectId: string): PlanId {
  const plan = requirePlan(null, projectId);
  if (!PLANS[plan].aiSections) throw new HttpError(402, L(`La création de sections par l'IA n'est pas incluse dans le forfait ${name(plan)} : vous pouvez modifier les sections existantes et en ajouter depuis la bibliothèque. ${needPlan(firstWith((p) => p.aiSections))}`, `AI section creation isn't included in the ${name(plan)} plan: you can edit existing sections and add new ones from the library. ${needPlan(firstWith((p) => p.aiSections))}`), "plan_upgrade");
  return plan;
}

/**
 * Modèles de pages : nouvelle page depuis un modèle, duplication, changement de modèle, mise en page propre à un
 * produit (Développer et Dominer). Les pages déjà créées restent modifiables à la main avec tout forfait payant, et
 * restent en place après une baisse de forfait. Une recharge IA n'ouvre jamais cette fonction.
 */
export function assertPageModels(projectId: string): PlanId {
  const plan = requirePlan(null, projectId);
  if (!PLANS[plan].pageModels) throw new HttpError(402, L(`Les modèles de pages et l'ajout de pages ne sont pas inclus dans le forfait ${name(plan)} : vous pouvez modifier les pages existantes. ${needPlan(firstWith((p) => p.pageModels))}`, `Page templates and adding pages aren't included in the ${name(plan)} plan: you can edit existing pages. ${needPlan(firstWith((p) => p.pageModels))}`), "plan_upgrade");
  return plan;
}

/**
 * Sélection d'un thème de la bibliothèque : seuls les N premiers du forfait du projet. Le thème déjà utilisé par le
 * projet reste utilisable (changement de forfait à la baisse : rien n'est détruit).
 */
export function assertThemeAllowed(projectId: string, directionId: string, currentDirection?: string | null) {
  if (currentDirection && currentDirection === directionId) return;
  const plan = requirePlan(null, projectId);
  if (themeRank(directionId) == null) throw new HttpError(400, L("Thème inconnu.", "Unknown theme."));
  // Ancien catalogue (retiré le 19 octobre) : jamais pour une nouvelle sélection, même avec le forfait le plus large.
  if (themeStatus(directionId) === "retired") throw new HttpError(400, L(retiredThemeReason("fr"), retiredThemeReason("en")));
  if (!themeAllowed(plan, directionId)) {
    const need = planForTheme(directionId);
    throw new HttpError(402, L(`Ce thème n'est pas inclus dans le forfait ${name(plan)} (${PLANS[plan].themes} thèmes par famille). ${needPlan(need)}`, `This theme isn't included in the ${name(plan)} plan (${PLANS[plan].themes} themes per family). ${needPlan(need)}`), "plan_upgrade");
  }
}

/** Jours de calendrier de publications (7, 30 ou 90 selon le forfait). */
export function assertCalendarDays(_user: User | null, projectId: string, days: number) {
  const plan = requirePlan(null, projectId);
  const max = PLANS[plan].calendarDays;
  if (days > max) throw new HttpError(402, L(`Votre forfait ${name(plan)} programme jusqu'à ${max} jours de publications. ${needPlan(firstWith((p) => p.calendarDays >= days))}`, `Your ${name(plan)} plan schedules up to ${max} days of posts. ${needPlan(firstWith((p) => p.calendarDays >= days))}`));
}

/** Publication automatique à l'heure prévue. */
export function assertAutopublish(_user: User | null, projectId: string) {
  const plan = requirePlan(null, projectId);
  if (!PLANS[plan].autopublish) throw new HttpError(402, L("La publication automatique n'est pas incluse dans ce forfait.", "Automatic publishing isn't included in this plan."));
}

/** Campagnes publicitaires actives (brouillons et prêtes, hors archives). */
export function assertCampaignSlot(_user: User | null, projectId: string) {
  const plan = requirePlan(null, projectId);
  assertAdvertising(projectId);
  const max = PLANS[plan].campaigns;
  const n = one<{ n: number }>("SELECT COUNT(*) n FROM campaigns WHERE project_id = ? AND status != 'archived'", projectId)!.n;
  if (n >= max) throw new HttpError(402, L(`Votre forfait ${name(plan)} comprend ${max} campagne(s) active(s). Archivez-en une, ou passez au forfait supérieur.`, `Your ${name(plan)} plan includes ${max} active campaign(s). Archive one, or move up a plan.`));
}

/**
 * Jour civil d'un horodatage dans le fuseau du projet (celui de la publication, sinon Europe/Paris) : « 3 par jour »
 * se compte comme le client voit son calendrier, pas en heure UTC.
 */
const dayBounds = (at: number, tz: string) => {
  const ymd = formatInTimeZone(at, tz, "yyyy-MM-dd");
  const start = fromZonedTime(`${ymd}T00:00:00`, tz).getTime();
  const [y, m, d] = ymd.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return [start, fromZonedTime(`${next}T00:00:00`, tz).getTime()] as const;
};

/**
 * Contenus éditoriaux programmés ce jour-là pour le projet (hors brouillons et échecs). Une publication et ses
 * adaptations pour d'autres réseaux (même `group_id`) comptent pour UN contenu : la limite du forfait porte sur les
 * créations distinctes, l'envoi reste suivi réseau par réseau. Le contenu de `exceptId` n'est pas compté.
 */
export function scheduledPostsOn(projectId: string, at: number, exceptId?: string | null, tz?: string | null): number {
  const self = exceptId ? one<{ g: string; timezone: string | null }>("SELECT COALESCE(group_id, id) g, timezone FROM posts WHERE id = ?", exceptId) : undefined;
  const zone = tz || self?.timezone || "Europe/Paris";
  let a: number, b: number;
  try {
    [a, b] = dayBounds(at, zone);
  } catch {
    [a, b] = dayBounds(at, "Europe/Paris");
  }
  return one<{ n: number }>(
    "SELECT COUNT(DISTINCT COALESCE(group_id, id)) n FROM posts WHERE project_id = ? AND scheduled_at >= ? AND scheduled_at < ? AND status IN ('scheduled','publishing','published','paused','uncertain') AND COALESCE(group_id, id) != ?",
    projectId,
    a,
    b,
    self?.g ?? exceptId ?? "",
  )!.n;
}

/** Au plus 1, 3 ou 5 publications programmées par jour selon le forfait du projet. */
export function assertPostsPerDay(projectId: string, at: number, exceptId?: string | null) {
  const plan = requirePlan(null, projectId);
  const max = PLANS[plan].postsPerDay;
  if (scheduledPostsOn(projectId, at, exceptId) >= max) throw new HttpError(402, L(`Votre forfait ${name(plan)} programme au plus ${max} publication(s) par jour. Choisissez un autre jour. ${needPlan(firstWith((p) => p.postsPerDay > max))}`, `Your ${name(plan)} plan schedules at most ${max} post(s) per day. Pick another day. ${needPlan(firstWith((p) => p.postsPerDay > max))}`));
}

/**
 * Forfait d'un projet pour les tâches en arrière-plan. `projectId` absent : forfait de l'ancien abonnement du compte
 * (comptes sans projet) — jamais un droit plus large que celui d'un projet.
 */
export function planOfUserId(_userId: string, projectId?: string | null): PlanId | null {
  return projectId ? projectPlan(projectId) : null;
}

/** Date de programmation : dans le futur et dans la fenêtre de calendrier du forfait (7, 30 ou 90 jours). */
export function assertScheduleWindow(plan: PlanId, at: number) {
  const max = PLANS[plan].calendarDays;
  if (at < Date.now() - 60_000) throw new HttpError(400, L("Cette date est passée : choisissez une date à venir.", "This date is in the past: pick an upcoming date."));
  if (at > Date.now() + max * 86_400_000 + 3_600_000) throw new HttpError(402, L(`Votre forfait ${name(plan)} programme jusqu'à ${max} jours à l'avance. ${needPlan(firstWith((p) => p.calendarDays > max))}`, `Your ${name(plan)} plan schedules up to ${max} days ahead. ${needPlan(firstWith((p) => p.calendarDays > max))}`));
}

/** Nombre de publications par jour demandé (génération d'un calendrier) : au plus celui du forfait. */
export function assertPerDayRequest(projectId: string, perDay: number): PlanId {
  const plan = requirePlan(null, projectId);
  const max = PLANS[plan].postsPerDay;
  if (perDay > max) throw new HttpError(402, L(`Votre forfait ${name(plan)} prévoit au plus ${max} publication(s) par jour. ${needPlan(firstWith((p) => p.postsPerDay >= perDay))}`, `Your ${name(plan)} plan allows at most ${max} post(s) per day. ${needPlan(firstWith((p) => p.postsPerDay >= perDay))}`));
  return plan;
}

/** Actual dispatches today, counted by editorial group across networks, including uncertain sends. */
export function dispatchedPostsOn(projectId:string,at:number,exceptId:string,tz='Europe/Paris') {
 let bounds:readonly[number,number];try{bounds=dayBounds(at,tz);}catch{bounds=dayBounds(at,'Europe/Paris');}
 const group=one<{g:string}>('SELECT COALESCE(group_id,id) g FROM posts WHERE id=? AND project_id=?',exceptId,projectId)?.g??exceptId;
 return one<{n:number}>(`SELECT COUNT(DISTINCT COALESCE(p.group_id,p.id)) n FROM posts p WHERE p.project_id=? AND COALESCE(p.group_id,p.id)!=? AND ((p.status='publishing' AND p.locked_at>=? AND p.locked_at<?) OR EXISTS(SELECT 1 FROM post_attempts a WHERE a.post_id=p.id AND a.started_at>=? AND a.started_at<? AND a.outcome IN ('sending','published','uncertain')))`,projectId,group,bounds[0],bounds[1],bounds[0],bounds[1])!.n;
}
