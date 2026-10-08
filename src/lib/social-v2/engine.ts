/**
 * Social Media & Automatisation Engine V2 (phase 9A) — façade.
 *
 * PROJECT BRAIN → INTENTION → STRATÉGIE → PLAN (niveau 1, gratuit) → PRODUCTION (niveau 2, par lots, estimée et
 * plafonnée) → BARRIÈRE SOCIALE → VALIDATION DU CLIENT (par version) → PROGRAMMATION (niveau 3) → PUBLICATION par
 * le worker (verrou, journal, état incertain) → STATUT → STATISTIQUES (réelles seulement).
 * Une seule table de publications (`posts`) pour l'ancien et le nouveau parcours : rien n'est dupliqué.
 */
import { addDays, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { all, id, json, now, one, run } from "../db";
import { addUsage, getAsset, removeUsages } from "../library";
import type { Project } from "../projects";
import { lintClaims } from "../ai/tasks";
import { EUR } from "../billing";
import { parseSocialAsk } from "./intent";
import { createPlanV2, type PlanRequest } from "./planner";
import { adaptForPlatform, nativeFormatFor, PLATFORMS, type Platform, type PostFormat } from "./platforms";
import { afterEdit, approvePosts } from "./approval";
import { checkPost } from "./quality";
import { produceBatch } from "./production";
import { setPlanPaused } from "./scheduler";
import { moveToWeekday, planSocialEdit } from "./local-edit";
import type { SocialDeps } from "./deps";

export const SOCIAL_V2_VERSION = "9a.1";

/** Comptes connectés au projet, par réseau (pour proposer les bons comptes). */
export function projectAccounts(p: Project): { id: string; provider: string; name: string; status: string }[] {
  return all<{ id: string; provider: string; name: string; status: string }>(
    "SELECT c.id, c.provider, c.name, c.status FROM connections c LEFT JOIN project_connections pc ON pc.connection_id = c.id AND pc.project_id = ? WHERE c.user_id = ? AND c.provider IN ('instagram','facebook','tiktok','youtube','pinterest') ORDER BY pc.project_id IS NULL, c.updated_at DESC",
    p.id,
    p.userId,
  );
}

/** Demande en clair → calendrier de niveau 1 (aucune dépense). La programmation viendra après approbation. */
export function planFromAsk(p: Project, text: string, o: { at?: number; lang?: "fr" | "en"; platforms?: Platform[] } = {}) {
  const ask = parseSocialAsk(text);
  const tz = p.settings.timezone || "Europe/Paris";
  const today = toZonedTime(o.at ?? now(), tz);
  const startDate = format(addDays(today, ask.startOffsetDays), "yyyy-MM-dd");
  const accounts = projectAccounts(p);
  const platforms = (ask.platforms ?? o.platforms ?? (accounts.length ? [...new Set(accounts.map((a) => a.provider as Platform))] : p.business === "services" ? ["facebook", "instagram"] : ["instagram", "facebook"])) as Platform[];
  const req: PlanRequest = {
    startDate,
    days: ask.days,
    perDay: ask.perDay,
    timezone: tz,
    platforms: platforms.map((pl) => ({ platform: pl, connectionId: accounts.find((a) => a.provider === pl && a.status === "active")?.id ?? null })),
    formatMix: ask.formatMix ?? undefined,
    lang: o.lang,
  };
  const r = createPlanV2(p, req);
  const notes = [...ask.notes];
  if (ask.schedule) notes.push("programmation demandée : elle se fera après votre approbation des contenus (rien ne part sans accord)");
  return { ...r, ask, request: req, notes };
}

export type ManualPatch = { title?: string; caption?: string; hashtags?: string; link?: string | null; media?: string[]; scheduledAt?: number; network?: Platform; connectionId?: string | null };

/** Modification manuelle (gratuite, aucune IA). Une version approuvée modifiée redevient « à valider ». */
export function editPostV2(p: Project, postId: string, patch: ManualPatch): { reapproval: boolean } {
  const r = one<{ id: string; status: string; project_id: string; network: string }>("SELECT id, status, project_id, network FROM posts WHERE id = ?", postId);
  if (!r || r.project_id !== p.id) throw new Error("publication introuvable");
  if (["publishing", "published", "uncertain"].includes(r.status)) throw new Error("publication déjà envoyée : elle ne peut plus être modifiée");
  if (patch.media) for (const m of patch.media) if (getAsset(m)?.project_id !== p.id) throw new Error("média étranger au projet");
  if (patch.network && !(PLATFORMS as readonly string[]).includes(patch.network)) throw new Error("réseau inconnu");
  if (patch.connectionId) {
    const c = one<{ user_id: string }>("SELECT user_id FROM connections WHERE id = ?", patch.connectionId);
    if (!c || c.user_id !== p.userId) throw new Error("compte inconnu");
  }
  const sets: [string, unknown][] = [];
  if (patch.title !== undefined) sets.push(["title", patch.title.slice(0, 200)]);
  if (patch.caption !== undefined) sets.push(["caption", patch.caption.slice(0, 5000)]);
  if (patch.hashtags !== undefined) sets.push(["hashtags", patch.hashtags.slice(0, 500)]);
  if (patch.link !== undefined) sets.push(["link", patch.link]);
  if (patch.media) sets.push(["media", JSON.stringify(patch.media)]);
  if (patch.scheduledAt !== undefined) sets.push(["scheduled_at", patch.scheduledAt]);
  if (patch.network) {
    // Changement de réseau : format natif du nouveau réseau (le plus proche de l'actuel).
    const cur = one<{ format: string }>("SELECT format FROM posts WHERE id = ?", postId)!.format as PostFormat;
    sets.push(["network", patch.network], ["format", nativeFormatFor(patch.network, cur)]);
  }
  if (patch.connectionId !== undefined) sets.push(["connection_id", patch.connectionId]);
  if (!sets.length) return { reapproval: false };
  run(`UPDATE posts SET ${sets.map(([c]) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...sets.map(([, v]) => v), now(), postId);
  if (patch.media) {
    removeUsages("post", postId);
    for (const m of patch.media) addUsage(m, "post", postId, "Publication");
  }
  // Seul le déplacement (date) ne change pas la version ; tout le reste est une modification du client protégée.
  const contentChanged = sets.some(([c]) => c !== "scheduled_at" && c !== "connection_id");
  return { reapproval: contentChanged ? afterEdit(postId) : false };
}

export function duplicatePostV2(p: Project, postId: string): string {
  const r = one<{ project_id: string }>("SELECT project_id FROM posts WHERE id = ?", postId);
  if (!r || r.project_id !== p.id) throw new Error("publication introuvable");
  const nid = id();
  run(
    `INSERT INTO posts (id, project_id, plan_id, campaign_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, link, angle, media, brief, publish_key, created_at, updated_at, engine, pillar, objective, content_hash, group_id, user_edited)
     SELECT ?, project_id, plan_id, campaign_id, connection_id, network, format, 'review', scheduled_at, timezone, title, caption, hashtags, link, angle, media, brief, ?, ?, ?, 'v2', pillar, objective, content_hash, NULL, 1 FROM posts WHERE id = ?`,
    nid, `dup:${nid}`, now(), now(), postId,
  );
  return nid;
}

/** Supprimer : seulement ce qui n'est jamais parti (l'historique des publications envoyées est conservé). */
export function deletePostV2(p: Project, postId: string) {
  const r = one<{ project_id: string; status: string }>("SELECT project_id, status FROM posts WHERE id = ?", postId);
  if (!r || r.project_id !== p.id) throw new Error("publication introuvable");
  if (["publishing", "published", "uncertain"].includes(r.status)) throw new Error("publication envoyée ou en cours : historique conservé");
  removeUsages("post", postId);
  run("DELETE FROM posts WHERE id = ?", postId);
}

export const approve = (p: Project, ids: string[], userId: string) => approvePosts(ids.filter((x) => one("SELECT 1 FROM posts WHERE id = ? AND project_id = ?", x, p.id)), userId, (pid) => checkPost(p, pid));

export type EditOutcome = { applied: boolean; by: "local" | "ai" | "none"; summary: string; ids: string[]; needsConfirm?: boolean; estimateMicro?: number; needsAi?: boolean; refused?: string[]; costMicro: number };

/**
 * Retouche en conversation sur le calendrier. Locale et gratuite quand c'est possible ; IA seulement pour réécrire,
 * limitée aux publications visées, avec estimation et confirmation (`confirm`) puis plafond.
 */
export async function applySocialEdit(p: Project, text: string, deps: SocialDeps, o: { confirm?: boolean; maxCostEur?: number; planId?: string | null; at?: number } = {}): Promise<EditOutcome> {
  const plan = planSocialEdit(text, p.id, o.at ?? now(), o.planId);
  const base = { ids: plan.ids, costMicro: 0 };
  if (plan.kind === "unclear") return { ...base, applied: false, by: "none", summary: plan.summary };
  if (plan.kind === "local") {
    const planIds = o.planId ? [o.planId] : all<{ id: string }>("SELECT id FROM content_plans WHERE project_id = ? AND engine = 'v2'", p.id).map((r) => r.id);
    switch (plan.action) {
      case "pause":
      case "resume":
        for (const pid of planIds) setPlanPaused(pid, plan.action === "pause");
        break;
      case "cancel":
      case "reduce_per_day":
        for (const pid of plan.ids) run("UPDATE posts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", now(), pid);
        break;
      case "move_weekday":
        for (const pid of plan.ids) {
          const r = one<{ scheduled_at: number; timezone: string }>("SELECT scheduled_at, timezone FROM posts WHERE id = ?", pid)!;
          run("UPDATE posts SET scheduled_at = ?, updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", moveToWeekday(r.scheduled_at, r.timezone, plan.weekday!), now(), pid);
        }
        break;
      case "replace_media": {
        // Nouvelle image demandée par le client : média retiré puis production GRATUITE (bibliothèque, rendu local).
        for (const pid of plan.ids) {
          removeUsages("post", pid);
          run("UPDATE posts SET media = '[]', updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", now(), pid);
        }
        await produceBatch(p, plan.ids, deps, { allowPaid: false, maxCostEur: 0 });
        break;
      }
    }
    return { ...base, applied: true, by: "local", summary: plan.summary };
  }
  // Réécriture IA : seulement les publications visées, estimée, confirmée, plafonnée.
  if (!deps.aiActive) return { ...base, applied: false, by: "none", needsAi: true, summary: "cette retouche demande l'IA, non disponible pour ce compte : modifiez les textes directement" };
  const estimate = plan.ids.length * deps.estimate("rewrite");
  const cap = Math.round((o.maxCostEur ?? 1) * EUR);
  if (!o.confirm) return { ...base, applied: false, by: "none", needsConfirm: true, estimateMicro: estimate, summary: `${plan.summary} — estimation ${(estimate / EUR).toFixed(2)} € : confirmez pour lancer` };
  let spent = 0;
  const refused: string[] = [];
  let done = 0;
  for (const pid of plan.ids) {
    if (spent + deps.estimate("rewrite") > cap) {
      refused.push(`${pid} : plafond atteint`);
      break;
    }
    const r = one<{ id: string; network: string; format: string; title: string; caption: string; pillar: string | null; objective: string | null; scheduled_at: number; brief: string; link: string | null; status: string }>("SELECT * FROM posts WHERE id = ?", pid);
    if (!r || ["publishing", "published", "uncertain"].includes(r.status)) continue;
    const out = await deps.rewrite(p, { ...r, headline: json<{ headline?: string }>(r.brief, {}).headline ?? r.title }, plan.instruction, `social2:rewrite:${pid}:${now()}`);
    spent += out.costMicro;
    // Une réécriture qui ajoute une affirmation non confirmée est refusée (le texte actuel reste).
    const before = lintClaims(`${r.title}\n${r.caption}`, p).length;
    if (lintClaims(`${out.title}\n${out.caption}`, p).length > before) {
      refused.push(`${pid} : affirmation non confirmée ajoutée, texte conservé`);
      continue;
    }
    const a = adaptForPlatform(r.network as Platform, { caption: out.caption, title: out.title, hashtags: out.hashtags, link: r.link, format: r.format as never, mediaCount: 1 });
    run("UPDATE posts SET title = ?, caption = ?, hashtags = ?, updated_at = ? WHERE id = ?", a.title, a.caption, a.hashtags.join(" "), now(), pid);
    afterEdit(pid);
    done++;
  }
  return { ...base, applied: done > 0, by: "ai", summary: `${done} publication(s) réécrite(s)${refused.length ? `, ${refused.length} refusée(s)` : ""}`, refused, costMicro: spent };
}
