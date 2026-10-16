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
import { budgetPctText } from "../ai/budget-pct";
import { parseSocialAsk } from "./intent";
import { createPlanV2, type PlanRequest } from "./planner";
import { adaptForPlatform, nativeFormatFor, PLATFORMS, type Platform, type PostFormat } from "./platforms";
import { afterEdit, approvePosts } from "./approval";
import { checkPost } from "./quality";
import { moveRefusal, setPlanPaused } from "./scheduler";
import { rememberRefused } from "./memory";
import { EDITABLE, movedAt, moveToWeekday, planSocialEdit } from "./local-edit";
import { enqueue } from "../jobs";
import { attachFreeVisuals } from "./plan-visuals";
import { L } from "../i18n-server";
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
export function planFromAsk(p: Project, text: string, o: { at?: number; lang?: "fr" | "en"; platforms?: Platform[]; maxDays?: number; maxPerDay?: number; planId?: string } = {}) {
  const ask = parseSocialAsk(text);
  // Nombre par jour limité par le forfait (annoncé, jamais caché).
  if (o.maxPerDay && ask.perDay > o.maxPerDay) {
    ask.notes.push(`${ask.perDay} publications par jour demandées : limité à ${o.maxPerDay} par votre forfait`);
    ask.perDay = o.maxPerDay;
  }
  // Durée limitée par le forfait (annoncé, jamais caché).
  if (o.maxDays && ask.days > o.maxDays) {
    ask.notes.push(`${ask.days} jours demandés : limité à ${o.maxDays} jours par votre forfait`);
    ask.days = o.maxDays;
  }
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
  const r = createPlanV2(p, req, { planId: o.planId });
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
  if (patch.scheduledAt !== undefined) {
    const why = moveRefusal(p.id, postId, patch.scheduledAt);
    if (why) throw new Error(why);
  }
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
  const r = one<{ project_id: string; status: string; caption: string; plan_id: string | null }>("SELECT project_id, status, caption, plan_id FROM posts WHERE id = ?", postId);
  if (!r || r.project_id !== p.id) throw new Error("publication introuvable");
  if (["publishing", "published", "uncertain"].includes(r.status)) throw new Error("publication envoyée ou en cours : historique conservé");
  // Refusée par le client : son accroche ne revient plus (mémoire éditoriale).
  rememberRefused(p.id, r.caption);
  removeUsages("post", postId);
  // Calendrier du pilote automatique : la case reste réservée (annulée), pour que le remplissage ne la recrée pas.
  if (r.plan_id?.startsWith("auto-")) run("UPDATE posts SET status = 'cancelled', updated_at = ? WHERE id = ?", now(), postId);
  else run("DELETE FROM posts WHERE id = ?", postId);
}

export const approve = (p: Project, ids: string[], userId: string) => approvePosts(ids.filter((x) => one("SELECT 1 FROM posts WHERE id = ? AND project_id = ?", x, p.id)), userId, (pid) => checkPost(p, pid));

export type EditOutcome = {
  applied: boolean;
  by: "local" | "ai" | "none";
  summary: string;
  ids: string[];
  /** Accord du client attendu : « delete » (suppression, toujours confirmée) ou « ai » (coût IA à accepter). */
  needsConfirm?: boolean;
  confirmKind?: "delete" | "change" | "ai";
  /** Coût PROBABLE de la retouche IA (micro-euros, usage interne : le client voit un % de son budget IA). */
  estimateMicro?: number;
  needsAi?: boolean;
  /** Demande non comprise : le résumé contient des exemples de phrases comprises. */
  unclear?: boolean;
  refused?: string[];
  costMicro: number;
};

/**
 * Retouche en conversation sur le calendrier. Locale et gratuite quand c'est possible ; IA seulement pour réécrire,
 * limitée aux publications visées, avec estimation et confirmation (`confirm`) puis plafond.
 */
export async function applySocialEdit(p: Project, text: string, deps: SocialDeps, o: { confirm?: boolean; maxCostEur?: number; planId?: string | null; at?: number } = {}): Promise<EditOutcome> {
  const plan = planSocialEdit(text, p.id, o.at ?? now(), o.planId);
  const base = { ids: plan.ids, costMicro: 0 };
  if (plan.kind === "unclear") return { ...base, applied: false, by: "none", unclear: true, summary: plan.summary };
  if (plan.kind === "local") {
    // Aperçu avant d'agir (« 12 vidéo(s) passeront au vendredi 18:00. Confirmer ? ») ; suppression : toujours confirmée.
    if (plan.confirm && !o.confirm) return { ...base, applied: false, by: "none", needsConfirm: true, confirmKind: plan.destructive ? "delete" : "change", summary: plan.confirm };
    const planIds = o.planId ? [o.planId] : all<{ id: string }>("SELECT id FROM content_plans WHERE project_id = ? AND engine = 'v2'", p.id).map((r) => r.id);
    if (plan.action === "pause" || plan.action === "resume") {
      for (const pid of planIds) setPlanPaused(pid, plan.action === "pause");
      return { ...base, applied: true, by: "local", summary: plan.summary };
    }
    if (plan.action === "undo") return undoLastEdit(p);
    // Publications envoyées ou en cours d'envoi : jamais touchées (revérifié au moment d'agir).
    const ids = plan.ids.filter((pid) => EDITABLE.has(one<{ status: string }>("SELECT status FROM posts WHERE id = ?", pid)?.status ?? ""));
    const created: string[] = [];
    snapshotForUndo(p.id, ids, plan.summary);
    const refused: string[] = [];
    let done = 0;
    const move = (pid: string, to: (r: { scheduled_at: number; timezone: string }) => number) => {
      const r = one<{ scheduled_at: number; timezone: string }>("SELECT scheduled_at, timezone FROM posts WHERE id = ?", pid)!;
      const at = to(r);
      // Même contrôle que le glisser-déposer : date future, calendrier et nombre par jour du forfait.
      const why = moveRefusal(p.id, pid, at);
      if (why) return void refused.push(`${pid} : ${why}`);
      run("UPDATE posts SET scheduled_at = ?, updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", at, now(), pid);
      done++;
    };
    switch (plan.action) {
      case "cancel":
      case "reduce_per_day":
      case "per_week":
        for (const pid of ids) {
          const changed = run("UPDATE posts SET status = 'cancelled', updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", now(), pid).changes;
          if (changed && plan.action === "cancel") rememberRefused(p.id, one<{ caption: string }>("SELECT caption FROM posts WHERE id = ?", pid)?.caption ?? "");
          done += changed;
        }
        break;
      case "move_weekday":
        for (const pid of ids) move(pid, (r) => moveToWeekday(r.scheduled_at, r.timezone, plan.weekday!, plan.time));
        break;
      case "move_date":
      case "shift":
      case "set_time":
        for (const pid of ids) move(pid, (r) => movedAt(r.scheduled_at, r.timezone, { days: plan.days, ymd: plan.ymd, time: plan.time }));
        break;
      case "network":
        for (const pid of ids) {
          try {
            editPostV2(p, pid, { network: plan.network!, connectionId: projectAccounts(p).find((a) => a.provider === plan.network && a.status === "active")?.id ?? null });
            done++;
          } catch (e) {
            refused.push(`${pid} : ${(e as Error).message}`);
          }
        }
        break;
      case "add_network":
      case "duplicate":
        for (const pid of ids) {
          const nid = duplicatePostV2(p, pid);
          created.push(nid);
          if (plan.action === "add_network") editPostV2(p, nid, { network: plan.network!, connectionId: projectAccounts(p).find((a) => a.provider === plan.network && a.status === "active")?.id ?? null });
          done++;
        }
        break;
      case "approve": {
        const r = approve(p, ids, p.userId);
        done = r.approved.length;
        for (const x of r.refused) refused.push(`${x.id} : ${x.reason}`);
        break;
      }
      case "format": {
        // Nouveau format : le visuel qui ne convient plus est retiré (il reste dans la bibliothèque), puis remplacé
        // GRATUITEMENT (photo de la banque ; vidéo montée sans IA en tâche de fond). Rien d'inventé.
        const toVideo = plan.format === "video";
        for (const pid of ids) {
          const r = one<{ network: string; format: string }>("SELECT network, format FROM posts WHERE id = ?", pid)!;
          const nf = nativeFormatFor(r.network as Platform, (plan.format === "image" ? "image" : plan.format) as PostFormat);
          const wasVideo = ["video", "reel", "short"].includes(r.format);
          const clear = toVideo !== wasVideo || plan.format === "text";
          run(`UPDATE posts SET format = ?${clear ? ", media = '[]'" : ""}, updated_at = ? WHERE id = ?`, nf, now(), pid);
          if (clear) removeUsages("post", pid);
          afterEdit(pid);
          done++;
        }
        if (plan.format === "image" || plan.format === "carousel") attachFreeVisuals(p, ids);
        if (toVideo) enqueueFreeVideos(p, ids);
        break;
      }
      case "replace_media": {
        // Nouvelle image demandée par le client : une AUTRE image de la banque du projet (gratuit). Jamais une image
        // retirée sans rien à la place : sans autre photo disponible, l'image actuelle reste et c'est dit.
        const r = attachFreeVisuals(p, ids, { replace: true });
        if (!r.images) return { ...base, applied: false, by: "local", summary: L("Aucune autre photo disponible dans votre banque d'images : les images actuelles restent. Ajoutez des photos à votre banque d'images, ou créez de nouveaux visuels par l'IA.", "No other photo available in your image bank: the current images stay. Add photos to your image bank, or create new visuals with AI.") };
        if (r.images < ids.length) return { ...base, applied: true, by: "local", summary: L(`nouvelles images pour ${r.images} publication(s) sur ${ids.length} : pas assez d'autres photos dans votre banque pour les autres (images actuelles gardées)`, `new images for ${r.images} of ${ids.length} post(s): not enough other photos in your bank for the rest (current images kept)`) };
        done = r.images;
        break;
      }
      case "replace_video": {
        // Nouvelle vidéo montée sans IA : l'ancienne n'est retirée qu'une fois la nouvelle prête (tâche de fond).
        enqueueFreeVideos(p, ids, true);
        return { ...base, applied: true, by: "local", summary: L(`${ids.length} nouvelle(s) vidéo(s) en cours de montage, sans IA (l'ancienne reste en place jusque-là)`, `${ids.length} new video(s) being edited, without AI (the old one stays until then)`) };
      }
    }
    if (created.length) recordCreatedForUndo(p.id, created);
    if (refused.length) return { ...base, applied: done > 0, by: "local", summary: L(`${plan.summary} — ${done} fait(es), ${refused.length} non modifiée(s)`, `${plan.summary} — ${done} done, ${refused.length} not changed`), refused };
    return { ...base, applied: true, by: "local", summary: plan.summary };
  }
  // Réécriture IA : seulement les publications visées, estimée, confirmée, plafonnée.
  if (!deps.aiActive) return { ...base, applied: false, by: "none", needsAi: true, summary: L("Cette retouche demande l'IA, non disponible pour ce compte : modifiez les textes directement.", "This edit needs AI, which isn't available for this account: edit the texts directly.") };
  // Devis au coût probable (un essai par publication), dit en % du budget IA du mois ; plafond : reprises comprises.
  const estimate = plan.ids.length * (deps.probable ? deps.probable("rewrite") : deps.estimate("rewrite"));
  const cap = Math.round((o.maxCostEur ?? Math.max(1, (plan.ids.length * deps.estimate("rewrite")) / EUR)) * EUR);
  if (!o.confirm) return { ...base, applied: false, by: "none", needsConfirm: true, confirmKind: "ai", estimateMicro: estimate, summary: L(`${plan.summary} — ${budgetPctText(p.userId, estimate, p.id)} : confirmez pour lancer`, `${plan.summary} — ${budgetPctText(p.userId, estimate, p.id)}: confirm to start`) };
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
  return { ...base, applied: done > 0, by: "ai", summary: L(`${done} publication(s) réécrite(s)${refused.length ? `, ${refused.length} refusée(s)` : ""}`, `${done} post(s) rewritten${refused.length ? `, ${refused.length} refused` : ""}`), refused, costMicro: spent };
}

// ------------------------------------------------------------------ annuler la dernière modification

/** Mémoire de la dernière retouche en une phrase (une par projet) : lignes avant modification, publications créées. */
function undoTable() {
  run("CREATE TABLE IF NOT EXISTS social_edit_undo (project_id TEXT PRIMARY KEY, at INTEGER NOT NULL, summary TEXT NOT NULL, rows TEXT NOT NULL, created TEXT NOT NULL DEFAULT '[]')");
}
const UNDO_COLS = ["status", "scheduled_at", "network", "format", "media", "connection_id", "title", "caption", "hashtags", "content_hash", "approved_hash", "approved_at", "approved_by", "user_edited", "brief", "production"];

function snapshotForUndo(projectId: string, ids: string[], summary: string) {
  undoTable();
  const rows = ids.length ? all<Record<string, unknown>>(`SELECT id, ${UNDO_COLS.join(", ")} FROM posts WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids) : [];
  run("INSERT INTO social_edit_undo (project_id, at, summary, rows, created) VALUES (?,?,?,?, '[]') ON CONFLICT(project_id) DO UPDATE SET at = excluded.at, summary = excluded.summary, rows = excluded.rows, created = '[]'", projectId, now(), summary.slice(0, 300), JSON.stringify(rows));
}
function recordCreatedForUndo(projectId: string, created: string[]) {
  run("UPDATE social_edit_undo SET created = ? WHERE project_id = ?", JSON.stringify(created), projectId);
}

/** Remet les publications dans l'état d'avant la dernière retouche (jamais une publication envoyée entre-temps). */
function undoLastEdit(p: Project): EditOutcome {
  undoTable();
  const u = one<{ rows: string; created: string; summary: string }>("SELECT rows, created, summary FROM social_edit_undo WHERE project_id = ?", p.id);
  if (!u) return { ids: [], costMicro: 0, applied: false, by: "none", summary: L("Aucune modification récente à annuler.", "No recent change to undo.") };
  const rows = json<Record<string, unknown>[]>(u.rows, []);
  let restored = 0;
  for (const r of rows) {
    const cur = one<{ status: string }>("SELECT status FROM posts WHERE id = ? AND project_id = ?", r.id, p.id);
    if (!cur || ["publishing", "published", "uncertain"].includes(cur.status)) continue;
    run(`UPDATE posts SET ${UNDO_COLS.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...UNDO_COLS.map((c) => r[c] as never), now(), r.id);
    removeUsages("post", r.id as string);
    for (const m of json<string[]>(String(r.media ?? "[]"), [])) addUsage(m, "post", r.id as string, "Publication");
    restored++;
  }
  let removed = 0;
  for (const nid of json<string[]>(u.created, [])) removed += run("DELETE FROM posts WHERE id = ? AND project_id = ? AND status NOT IN ('publishing','published','uncertain')", nid, p.id).changes;
  run("DELETE FROM social_edit_undo WHERE project_id = ?", p.id);
  return { ids: rows.map((r) => r.id as string), costMicro: 0, applied: true, by: "local", summary: L(`Dernière modification annulée (« ${u.summary} ») : ${restored} publication(s) remise(s) comme avant${removed ? `, ${removed} copie(s) retirée(s)` : ""}.`, `Last change undone ("${u.summary}"): ${restored} post(s) restored${removed ? `, ${removed} copy(ies) removed` : ""}.`) };
}

/** Vidéos montées sans IA (tâche de fond, aucune dépense) pour des publications vidéo. */
function enqueueFreeVideos(p: Project, ids: string[], replace = false) {
  const list = ids.filter((pid) => ["video", "reel", "short"].includes(one<{ format: string }>("SELECT format FROM posts WHERE id = ?", pid)?.format ?? ""));
  if (!list.length) return null;
  return enqueue({ userId: p.userId, projectId: p.id, type: "social.v2.produce", label: L("Vidéos des publications (montage sans IA)", "Post videos (edited without AI)"), payload: { projectId: p.id, ids: list, allowPaid: false, maxCostEur: 0, batchSize: list.length, markWaiting: true, replace } });
}
