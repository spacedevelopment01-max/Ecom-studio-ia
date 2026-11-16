import { underConstruction } from "@/lib/syna-agent/construction";
import { requireUser } from "@/lib/auth";
import { all } from "@/lib/db";
import { formeDuProjet } from "@/lib/ciel/constellations";
import { etatDe } from "@/lib/ciel/vue";
import { derniereEtape } from "@/lib/ciel/ciel-commun";
import { dashboardOf } from "@/lib/syna-agent/dashboard";
import { handle, ok } from "@/lib/http";
import { aiUsage } from "@/lib/ai/access";
import { pendingSubscriptions, subscriptionOfProject, subscriptionsOf } from "@/lib/project-billing";

export const runtime = "nodejs";

/**
 * « Mes projets » : chaque projet avec son abonnement (forfait, statut, échéance, budget IA en %), les abonnements
 * payés en attente de création de projet, et les projets masqués (ancienne découverte) qu'un abonnement peut reprendre.
 */
export const GET = handle(async () => {
  const user = await requireUser();
  const rows = all<any>(
    `SELECT p.id, p.name, p.status, p.platform, p.sector, p.brand_json, p.business_type, p.hidden, p.ciel_ouvert, p.updated_at, p.created_at,
       (SELECT id FROM assets a WHERE a.project_id = p.id AND a.role IN ('scene','packshot','lifestyle','banner','cutout','original') AND a.deleted_at IS NULL AND a.status != 'rejected' ORDER BY CASE a.role WHEN 'scene' THEN 0 WHEN 'packshot' THEN 1 WHEN 'lifestyle' THEN 2 WHEN 'banner' THEN 3 WHEN 'cutout' THEN 4 ELSE 5 END, a.created_at DESC LIMIT 1) AS cover
     FROM projects p WHERE p.user_id = ? AND p.archived = 0 ORDER BY p.updated_at DESC`,
    user.id,
  );
  const card = (r: any) => {
    const b = r.brand_json ? JSON.parse(r.brand_json) : {};
    const sub = subscriptionOfProject(r.id);
    return {
      id: r.id,
      name: r.name,
      // Un projet que le client construit avec SINA n'est pas « à démarrer » : il est en création.
      status: r.status === "draft" && underConstruction(r.id) ? "building" : r.status,
      sector: r.sector,
      platform: r.platform,
      business: r.business_type === "services" ? "services" : "products",
      updatedAt: r.updated_at,
      cover: r.cover ? `/api/files/${r.cover}?thumb=1` : null,
      palette: b.palette ?? null,
      brand: b.name ?? null,
      logo: b.logo?.chosen ? `/api/projects/${r.id}/brand/logo` : null,
      subscription: sub ? { id: sub.user_id, plan: sub.plan ?? "creer", status: sub.status, billing: sub.billing, priceCents: sub.price_cents, periodEnd: sub.current_period_end, cancelAtPeriodEnd: !!sub.cancel_at_period_end } : null,
      ai: sub ? aiUsage(user.id, r.id) : null,
      // Sa constellation dans le ciel de l'accueil : sa forme et l'état de ses neuf étoiles.
      ciel: { forme: formeDuProjet(r.id), etats: (dashboardOf(r.id)?.steps ?? []).map((x) => etatDe(x.status)), ouvert: !!r.ciel_ouvert, endormi: r.status === "paused", dernier: derniereEtape(r.id) },
    };
  };
  return ok({
    projects: rows.filter((r) => !r.hidden).map(card),
    hidden: rows.filter((r) => r.hidden).map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at })),
    pending: pendingSubscriptions(user.id).map((s) => ({ id: s.user_id, plan: s.plan ?? "creer", billing: s.billing, priceCents: s.price_cents, status: s.status, createdAt: s.created_at })),
    subscriptions: subscriptionsOf(user.id).length,
  });
});

// Aucune création ici : le projet se crée en parlant à SINA (outil « project.create », src/lib/syna-agent/tools/project.ts).
