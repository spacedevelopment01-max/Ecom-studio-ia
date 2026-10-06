/**
 * Ce que chaque forfait ouvre (côté serveur) : export et publication, jours de calendrier,
 * publication automatique, campagnes actives. Messages simples qui disent quel forfait débloque quoi.
 * L'administrateur suit son forfait comme un client : il teste le studio en gratuit comme en payant
 * (forfait attribué à la main dans Administration › Clients).
 */
import { HttpError, type User } from "./auth";
import { one } from "./db";
import { getSubscription, planOf } from "./billing";
import { PLANS, type PlanId } from "./plans";
import { L } from "./i18n-server";

const planFor = (user: User): PlanId | null => planOf(getSubscription(user.id));
const name = (p: PlanId) => L(PLANS[p].name.fr, PLANS[p].name.en);

/** Export du thème, envoi vers Shopify, publication : réservés aux forfaits (la découverte gratuite reste un aperçu). */
export function requirePlan(user: User) {
  const plan = planFor(user);
  if (!plan) throw new HttpError(402, L("La découverte gratuite est un aperçu. Choisissez un forfait dans « Mon compte » pour exporter et publier votre boutique.", "The free discovery is a preview. Choose a plan in \"My account\" to export and publish your store."));
  return plan;
}

/**
 * Création d'images, de vidéos et de vidéos UGC : incluse dans les forfaits uniquement (la découverte gratuite
 * montre l'analyse, la marque, les logos et l'aperçu de la boutique). Réponse 402 au message clair.
 */
export function requireCreationPlan(user: User, what: "images" | "videos" | "ugc") {
  const plan = planFor(user);
  if (plan) return plan;
  const label = { images: L("La création d'images", "Image creation"), videos: L("La création de vidéos", "Video creation"), ugc: L("La vidéo UGC", "UGC video") }[what];
  throw new HttpError(
    402,
    L(`${label} est incluse dans les forfaits. La découverte gratuite montre l'analyse, la marque, les logos et l'aperçu de la boutique : choisissez un forfait dans « Mon compte » pour créer vos visuels et vidéos.`, `${label} is included in the plans. The free discovery shows the analysis, brand, logos and store preview: choose a plan in "My account" to create your visuals and videos.`),
    "plan_required",
  );
}

/** Forfait d'un compte (par identifiant), pour les tâches en arrière-plan : l'administrateur n'est jamais bloqué. */
export function planOfUserId(userId: string): PlanId | null {
  const u = one<User>("SELECT id, email, name, role, timezone, created_at FROM users WHERE id = ?", userId);
  return u ? planFor(u) : null;
}

/** Jours de publications préparés d'un coup (7 avec Créer, 30 avec Vendre et Dominer). */
export function assertCalendarDays(user: User, days: number) {
  const plan = requirePlan(user);
  const max = PLANS[plan].calendarDays;
  if (days > max) throw new HttpError(402, L(`Votre forfait ${name(plan)} prépare jusqu'à ${max} jours de publications d'un coup. Le forfait Vendre en prépare 30.`, `Your ${name(plan)} plan prepares up to ${max} days of posts at once. The Sell plan prepares 30.`));
}

/** Publication automatique : à partir du forfait Vendre. */
export function assertAutopublish(user: User) {
  const plan = requirePlan(user);
  if (!PLANS[plan].autopublish) throw new HttpError(402, L("La publication automatique est incluse à partir du forfait Vendre. Avec Créer, vous validez et publiez chaque publication.", "Automatic publishing is included from the Sell plan. With Create, you approve and publish each post."));
}

/** Campagnes publicitaires actives (brouillons et prêtes, hors archives). */
export function assertCampaignSlot(user: User, projectId: string) {
  const plan = requirePlan(user);
  const max = PLANS[plan].campaigns;
  const n = one<{ n: number }>("SELECT COUNT(*) n FROM campaigns WHERE project_id = ? AND status != 'archived'", projectId)!.n;
  if (n >= max) throw new HttpError(402, L(`Votre forfait ${name(plan)} comprend ${max} campagne(s) active(s). Archivez-en une, ou passez au forfait supérieur.`, `Your ${name(plan)} plan includes ${max} active campaign(s). Archive one, or move up a plan.`));
}
