import {serviceStrategyProject} from '../marketing-strategy';
import { recordedContentStrategy, strategyContent } from "../strategy-consumption";
import { planOfProject } from "../plan-gates";
import { PLANS } from "../plans";
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
import { createHash } from "node:crypto";
import { lintClaims } from "../ai/tasks";
import { EUR } from "../billing";
import { budgetPctOf, budgetPctText } from "../ai/budget-pct";
import { enqueue } from "../jobs";
import { L } from "../i18n-server";
import { parseSocialAsk } from "./intent";
import { createPlanV2, publishingDates, DEFAULT_SLOTS, atZoned, type PlanRequest } from "./planner";
import { adaptForPlatform, nativeFormatFor, PLATFORMS, type Platform, type PostFormat } from "./platforms";
import { afterEdit, approvePosts } from "./approval";
import { EditorialSchema, type Editorial } from "./creative-contract";
import { checkPost } from "./quality";
import { estimateProduction } from "./production";
import { moveRefusal, schedulePosts, setPlanPaused } from "./scheduler";
import { rememberRefused } from "./memory";
import { EDITABLE, movedAt, moveToWeekday, planSocialEdit, type SocialEditPlan } from "./local-edit";
import { visualParams } from "./visual-mode";
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
  const active=planOfProject(p.id);
  if(active)o={...o,maxDays:Math.min(o.maxDays??Infinity,PLANS[active].calendarDays),maxPerDay:Math.min(o.maxPerDay??Infinity,PLANS[active].postsPerDay)};
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
  // The request usually starts tomorrow. A span of seven dates can then end beyond the existing
  // rolling horizon, especially around midnight in the project's timezone. Prepare only complete
  // days inside that same limit and explain the reduction; the planner/worker guards stay unchanged.
  if(active){
    const cutoff=now()+PLANS[active].calendarDays*86400000+3600000;
    const times=DEFAULT_SLOTS.slice(0,req.perDay);
    const available=publishingDates(req).filter(day=>times.every(time=>atZoned(day,time,tz)<=cutoff)).length;
    if(!available)throw new Error("La date de début dépasse l’horizon de programmation de votre forfait. Choisissez une date plus proche.");
    if(available<ask.days){ask.notes.push(`${ask.days} jours demandés depuis la date de début : ${available} jours complets préparés dans l’horizon de ${PLANS[active].calendarDays} jours à l’avance de votre forfait`);ask.days=available;req.days=available;}
  }
  const r = createPlanV2(p, req, { planId: o.planId });
  const notes = [...ask.notes];
  if (ask.schedule) notes.push("programmation demandée : elle se fera après votre approbation des contenus (rien ne part sans accord)");
  return { ...r, ask, request: req, notes };
}

/** `format` : format voulu (ramené au format natif du réseau) ; utilisé par les retouches en une phrase. */
export type ManualPatch = { title?: string; caption?: string; editorial?:Editorial; hashtags?: string; link?: string | null; media?: string[]; scheduledAt?: number; network?: Platform; format?: PostFormat; connectionId?: string | null };

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
  if (patch.caption !== undefined) sets.push(["caption", patch.caption]);
  if(patch.editorial!==undefined || patch.title!==undefined){
    const b=json<Record<string,unknown>>(one<{brief:string}>("SELECT brief FROM posts WHERE id=?",postId)?.brief??"{}",{});
    if(patch.editorial!==undefined)b.editorial=EditorialSchema.parse(patch.editorial);
    if(patch.title!==undefined)b.headline=patch.title;
    sets.push(["brief",JSON.stringify(b)]);
  }
  if (patch.hashtags !== undefined) sets.push(["hashtags", patch.hashtags.slice(0, 500)]);
  if (patch.link !== undefined) sets.push(["link", patch.link]);
  if (patch.media) sets.push(["media", JSON.stringify(patch.media)]);
  if (patch.scheduledAt !== undefined) sets.push(["scheduled_at", patch.scheduledAt]);
  if (patch.network || patch.format) {
    // Changement de réseau ou de format : format natif du réseau (le plus proche du format voulu ou de l'actuel).
    const cur = one<{ format: string }>("SELECT format FROM posts WHERE id = ?", postId)!.format as PostFormat;
    const net = patch.network ?? (r.network as Platform);
    if (patch.network) sets.push(["network", patch.network]);
    sets.push(["format", nativeFormatFor(net, patch.format ?? cur)]);
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
  if (contentChanged) strategyContent(p.id, "post", postId, { stamp: serviceStrategyProject(p.id)?recordedContentStrategy(p.id,"post",postId):null, protected: true });
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
  strategyContent(p.id,"post",nid,{stamp:recordedContentStrategy(p.id,"post",postId),protected:true});
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
  /** Accord du client attendu avant d'agir : aperçu (« change »), suppression (« delete », toujours confirmée) ou coût IA (« ai »). */
  needsConfirm?: boolean;
  confirmKind?: "delete" | "change" | "ai";
  /** Coût PROBABLE d'une retouche IA (micro-euros, usage interne du serveur : le client voit `pct`). */
  estimateMicro?: number;
  /** Coût probable en % du budget IA du mois (null sans budget connu). */
  pct?: number | null;
  needsAi?: boolean;
  /** Demande non comprise : le résumé contient des exemples de phrases comprises. */
  unclear?: boolean;
  refused?: string[];
  /** Tâche de fond lancée (nouvelles images IA). */
  jobId?: string;
  costMicro: number;
};

/** Statuts jamais touchés : envoyée, en cours d'envoi, à vérifier. */
const SENT = new Set(["publishing", "published", "uncertain"]);
const connectionFor = (p: Project, network: Platform) => projectAccounts(p).find((a) => a.provider === network && a.status === "active")?.id ?? null;
/** Le coût a-t-il augmenté depuis l'accord du client (en % du budget, tolérance d'arrondi) ? */
const costChanged = (pct: number | null, approvedPct: number | null | undefined) => approvedPct != null && (pct ?? 0) > approvedPct + 0.05;

/**
 * Retouche en conversation sur le calendrier (« Modifier le calendrier en une phrase »). Locale et gratuite quand
 * c'est possible, toujours après un APERÇU confirmé par le client (une suppression : toujours) ; IA seulement pour
 * réécrire les textes ou créer de nouvelles images, limitée aux publications visées, avec un devis en % du budget IA,
 * l'accord du client (`confirm`, `approvedPct`) puis un plafond. « Annule ma dernière modification » remet l'état
 * d'avant la dernière retouche locale.
 */
export async function applySocialEdit(p: Project, text: string, deps: SocialDeps, o: { confirm?: boolean; maxCostEur?: number; planId?: string | null; at?: number; /** % du budget IA vu et accepté par le client. */ approvedPct?: number | null } = {}): Promise<EditOutcome> {
  const plan = planSocialEdit(text, p.id, o.at ?? now(), o.planId);
  const base = { ids: plan.ids, costMicro: 0 };
  if (plan.kind === "unclear") return { ...base, applied: false, by: "none", unclear: true, summary: plan.summary };
  if (plan.kind === "local") return applyLocalEdit(p, plan, o);
  if (plan.action === "replace_media") return replaceImagesWithAi(p, plan, deps, o);
  // Réécriture IA : seulement les publications visées, estimée, confirmée, plafonnée.
  if (!deps.aiActive) return { ...base, applied: false, by: "none", needsAi: true, summary: L("Cette retouche demande l'IA, non disponible pour ce compte : modifiez les textes directement.", "This edit needs AI, which isn't available for this account: edit the texts directly.") };
  // Devis au coût probable (un essai par publication), dit en % du budget IA du mois ; plafond : reprises comprises.
  const estimate = plan.ids.length * (deps.probable ? deps.probable("rewrite") : deps.estimate("rewrite"));
  const pct = budgetPctOf(p.userId, estimate, p.id);
  const cap = Math.round((o.maxCostEur ?? Math.max(1, (plan.ids.length * deps.estimate("rewrite")) / EUR)) * EUR);
  const quote = { ...base, applied: false, by: "none" as const, needsConfirm: true, confirmKind: "ai" as const, estimateMicro: estimate, pct };
  if (!o.confirm) return { ...quote, summary: L(`${plan.summary} — ${budgetPctText(p.userId, estimate, p.id)} : confirmez pour lancer`, `${plan.summary} — ${budgetPctText(p.userId, estimate, p.id)}: confirm to start`) };
  if (costChanged(pct, o.approvedPct)) return { ...quote, summary: L(`Le coût a changé depuis votre accord (${budgetPctText(p.userId, estimate, p.id)}) : vérifiez-le puis confirmez de nouveau.`, `The cost changed since you agreed (${budgetPctText(p.userId, estimate, p.id)}): check it and confirm again.`) };
  let spent = 0;
  const refused: string[] = [];
  let done = 0;
  for (const pid of plan.ids) {
    if (spent + deps.estimate("rewrite") > cap) {
      refused.push(`${pid} : plafond atteint`);
      break;
    }
    const r = one<{ id: string; network: string; format: string; title: string; caption: string; pillar: string | null; objective: string | null; scheduled_at: number; brief: string; link: string | null; status: string }>("SELECT * FROM posts WHERE id = ?", pid);
    if (!r || SENT.has(r.status)) continue;
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
    strategyContent(p.id, "post", pid);
    afterEdit(pid);
    done++;
  }
  return { ...base, applied: done > 0, by: "ai", summary: L(`${done} publication(s) réécrite(s)${refused.length ? `, ${refused.length} refusée(s)` : ""}`, `${done} post(s) rewritten${refused.length ? `, ${refused.length} refused` : ""}`), refused, costMicro: spent };
}

type LocalPlan = Extract<SocialEditPlan, { kind: "local" }>;

/** Retouche locale et gratuite, après l'aperçu confirmé ; mémorisée pour « annule ma dernière modification ». */
function applyLocalEdit(p: Project, plan: LocalPlan, o: { confirm?: boolean; planId?: string | null }): EditOutcome {
  const base = { ids: plan.ids, costMicro: 0 };
  // Aperçu avant d'agir (« 12 vidéo(s) passeront au vendredi 18:00. Confirmer ? ») ; suppression : toujours confirmée.
  if (plan.confirm && !o.confirm) return { ...base, applied: false, by: "none", needsConfirm: true, confirmKind: plan.destructive ? "delete" : "change", summary: plan.confirm };
  if (plan.action === "pause" || plan.action === "resume") {
    const planIds = o.planId ? [o.planId] : all<{ id: string }>("SELECT id FROM content_plans WHERE project_id = ? AND engine = 'v2'", p.id).map((r) => r.id);
    for (const pid of planIds) setPlanPaused(pid, plan.action === "pause");
    return { ...base, applied: true, by: "local", summary: plan.summary };
  }
  if (plan.action === "undo") return undoLastEdit(p);
  // Publications envoyées ou en cours d'envoi : jamais touchées (revérifié au moment d'agir).
  const ids = plan.ids.filter((pid) => EDITABLE.has(one<{ status: string }>("SELECT status FROM posts WHERE id = ? AND project_id = ?", pid, p.id)?.status ?? ""));
  snapshotForUndo(p.id, ids, plan.summary);
  const created: string[] = [];
  const refused: string[] = [];
  let done = 0;
  let reapproval = 0;
  const move = (pid: string, to: (r: { scheduled_at: number; timezone: string }) => number) => {
    const r = one<{ scheduled_at: number; timezone: string }>("SELECT scheduled_at, timezone FROM posts WHERE id = ?", pid)!;
    const at = to(r);
    // Même contrôle que le glisser-déposer : date future, calendrier et nombre par jour du forfait.
    const why = moveRefusal(p.id, pid, at);
    if (why) return void refused.push(`${pid} : ${why}`);
    run("UPDATE posts SET scheduled_at = ?, updated_at = ? WHERE id = ? AND status NOT IN ('publishing','published','uncertain')", at, now(), pid);
    done++;
  };
  const edit = (pid: string, patch: ManualPatch) => {
    try {
      if (editPostV2(p, pid, patch).reapproval) reapproval++;
      done++;
    } catch (e) {
      refused.push(`${pid} : ${(e as Error).message}`);
    }
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
      for (const pid of ids) edit(pid, { network: plan.network!, connectionId: connectionFor(p, plan.network!) });
      break;
    case "format":
      // Publications encore sans visuel seulement (filtrées par l'analyse, revérifié ici) : rien n'est retiré.
      for (const pid of ids) {
        if (one<{ media: string }>("SELECT media FROM posts WHERE id = ?", pid)?.media !== "[]") {
          refused.push(`${pid} : ${L("visuel déjà posé, format gardé", "visual already set, format kept")}`);
          continue;
        }
        edit(pid, { format: (plan.format === "text" ? "text" : plan.format) as PostFormat });
      }
      break;
    case "add_network":
    case "duplicate":
      for (const pid of ids) {
        const nid = duplicatePostV2(p, pid);
        created.push(nid);
        if (plan.action === "add_network") editPostV2(p, nid, { network: plan.network!, connectionId: connectionFor(p, plan.network!) });
        done++;
      }
      break;
    case "approve": {
      // Mêmes contrôles que le bouton « Valider » : un défaut bloquant n'est jamais contourné.
      const r = approve(p, ids, p.userId);
      done = r.approved.length;
      for (const x of r.refused) refused.push(`${x.id} : ${x.reason}`);
      break;
    }
  }
  finishUndo(p.id, ids, created);
  const again = reapproval ? L(` — ${reapproval} publication(s) à valider de nouveau`, ` — ${reapproval} post(s) to approve again`) : "";
  if (refused.length) return { ...base, applied: done > 0, by: "local", summary: L(`${plan.summary} — ${done} fait(es), ${refused.length} non modifiée(s)${again}`, `${plan.summary} — ${done} done, ${refused.length} not changed${again}`), refused };
  return { ...base, applied: true, by: "local", summary: `${plan.summary}${again}` };
}

// ------------------------------------------------------------------ nouvelles images par l'IA

/**
 * « Remplace les images des 3 prochaines publications » : images finales 100 % IA, donc une NOUVELLE image créée par
 * l'IA (jamais une photo de banque ni un gabarit). Devis au coût probable en % du budget IA du mois, accord du client
 * (`confirm` + `approvedPct`), puis une seule tâche de fond (moteur de publication habituel, plafond reprises
 * comprises). L'image actuelle reste tant que la nouvelle n'est pas validée. Double clic ou reprise de la tâche :
 * même tâche, et une publication déjà refaite n'est jamais repayée (`replaceFrom`).
 */
function replaceImagesWithAi(p: Project, plan: Extract<SocialEditPlan, { action: "replace_media" }>, deps: SocialDeps, o: { confirm?: boolean; approvedPct?: number | null }): EditOutcome {
  const base = { ids: plan.ids, costMicro: 0 };
  if (!deps.aiActive) return { ...base, applied: false, by: "none", needsAi: true, summary: L("Remplacer une image demande l'IA (les images des publications sont toutes créées par l'IA), non disponible pour ce compte : les images actuelles restent.", "Replacing an image needs AI (post images are all created by AI), which isn't available for this account: the current images stay.") };
  const est = estimateProduction(p, plan.ids, deps, { ...visualParams("ai_post"), replace: true });
  const ids = est.lines.filter((l) => l.paid).map((l) => l.postId);
  if (!ids.length) return { ...base, ids: [], applied: false, by: "none", summary: L("Aucune de ces publications ne peut recevoir une nouvelle image maintenant (programmée ou envoyée : déprogrammez-la d'abord). Les images actuelles restent.", "None of these posts can get a new image now (scheduled or sent: unschedule it first). The current images stay.") };
  const pct = budgetPctOf(p.userId, est.estimateMicro, p.id);
  // Sans budget IA connu, le coût ne peut pas être montré en % : rien n'est proposé ni lancé.
  if (pct == null) return { ...base, applied: false, by: "none", needsAi: true, summary: L("Budget IA du mois inconnu pour ce compte : le coût ne peut pas être montré, rien n'est lancé. Les images actuelles restent.", "This account's monthly AI budget is unknown: the cost can't be shown, nothing is started. The current images stay.") };
  const cost = budgetPctText(p.userId, est.estimateMicro, p.id);
  const skipped = plan.ids.length - ids.length;
  const skippedNote = skipped ? L(` ; ${skipped} autre(s) gardent leur image (programmée(s) : déprogrammez-les d'abord)`, `; ${skipped} other(s) keep their image (scheduled: unschedule them first)`) : "";
  const quote = { ...base, ids, applied: false, by: "none" as const, needsConfirm: true, confirmKind: "ai" as const, estimateMicro: est.estimateMicro, pct };
  // Rien n'est lancé sans l'accord du client sur le coût montré (`approvedPct`), revérifié ici.
  if (!o.confirm || o.approvedPct == null) return { ...quote, summary: L(`${plan.summary} — coût probable ${cost} (une reprise éventuelle est décomptée et annoncée)${skippedNote}. Confirmer ?`, `${plan.summary} — likely cost ${cost} (any redo is counted and announced)${skippedNote}. Confirm?`) };
  if (costChanged(pct, o.approvedPct)) return { ...quote, summary: L(`Le coût a changé depuis votre accord (${cost}) : vérifiez-le puis confirmez de nouveau.`, `The cost changed since you agreed (${cost}): check it and confirm again.`) };
  const replaceFrom = Object.fromEntries(ids.map((pid) => [pid, one<{ media: string }>("SELECT media FROM posts WHERE id = ?", pid)?.media ?? "[]"]));
  const key = `social-edit-replace:${createHash("sha256").update(JSON.stringify(Object.entries(replaceFrom).sort())).digest("hex").slice(0, 40)}`;
  const job = enqueue({
    userId: p.userId,
    projectId: p.id,
    type: "social.v2.produce",
    label: L("Nouvelles images IA des publications", "New AI images for posts"),
    idempotencyKey: key,
    payload: { projectId: p.id, ids, ...visualParams("ai_post"), maxCostEur: est.capMicro / EUR, approvedEstimateMicro: est.estimateMicro, replace: true, replaceFrom, batchSize: ids.length },
  });
  // Même demande déjà terminée sans changer les images (échec, annulation) : jamais relancée toute seule, c'est dit.
  if (["done", "failed", "cancelled"].includes(job.status)) return { ...base, ids, applied: false, by: "none", jobId: job.id, summary: L("Cette même demande a déjà été traitée sans changer ces images (échec ou annulation) : rien n'est relancé tout seul. Ouvrez une publication pour refaire son visuel (coût montré avant).", "This same request was already handled without changing these images (failure or cancellation): nothing is restarted on its own. Open a post to remake its visual (cost shown first).") };
  return { ...base, ids, applied: true, by: "ai", jobId: job.id, pct, summary: L(`${ids.length} nouvelle(s) image(s) en cours de création par l'IA, une publication à la fois (suivi en haut de l'onglet). Les images actuelles restent jusqu'à ce que les nouvelles soient validées ; un visuel raté est signalé, jamais remplacé en silence.`, `${ids.length} new image(s) being created by AI, one post at a time (progress at the top of the tab). The current images stay until the new ones are approved; a failed visual is flagged, never silently replaced.`) };
}

// ------------------------------------------------------------------ annuler la dernière modification

/** Colonnes remises comme avant par « annule ma dernière modification ». */
const UNDO_COLS = ["status", "scheduled_at", "network", "format", "media", "connection_id", "title", "caption", "hashtags", "content_hash", "approved_hash", "approved_at", "approved_by", "user_edited", "brief", "production"];

function snapshotForUndo(projectId: string, ids: string[], summary: string) {
  const rows = ids.length ? all<Record<string, unknown>>(`SELECT id, ${UNDO_COLS.join(", ")} FROM posts WHERE id IN (${ids.map(() => "?").join(",")})`, ...ids) : [];
  run("INSERT INTO social_edit_undo (project_id, at, summary, rows, created, after) VALUES (?,?,?,?, '[]', '{}') ON CONFLICT(project_id) DO UPDATE SET at = excluded.at, summary = excluded.summary, rows = excluded.rows, created = '[]', after = '{}'", projectId, now(), summary.slice(0, 300), JSON.stringify(rows));
}

/** État d'après la retouche (id → updated_at) : une publication modifiée ensuite n'est jamais écrasée par l'annulation. */
function finishUndo(projectId: string, ids: string[], created: string[]) {
  const list = [...ids, ...created];
  const after = list.length ? Object.fromEntries(all<{ id: string; updated_at: number }>(`SELECT id, updated_at FROM posts WHERE id IN (${list.map(() => "?").join(",")})`, ...list).map((r) => [r.id, r.updated_at])) : {};
  run("UPDATE social_edit_undo SET created = ?, after = ? WHERE project_id = ?", JSON.stringify(created), JSON.stringify(after), projectId);
}

/**
 * Remet les publications dans l'état d'avant la dernière retouche locale. Jamais une publication envoyée entre-temps,
 * ni une publication modifiée depuis (elle garde la modification la plus récente), ni une date passée. Une
 * publication qui était programmée revient approuvée puis repasse par la programmation habituelle (compte connecté,
 * calendrier et nombre par jour du forfait) ; si ce n'est plus possible, elle reste approuvée et c'est dit.
 */
function undoLastEdit(p: Project): EditOutcome {
  const u = one<{ rows: string; created: string; after: string; summary: string }>("SELECT rows, created, after, summary FROM social_edit_undo WHERE project_id = ?", p.id);
  if (!u) return { ids: [], costMicro: 0, applied: false, by: "none", summary: L("Aucune modification récente à annuler.", "No recent change to undo.") };
  const rows = json<Record<string, unknown>[]>(u.rows, []);
  const after = json<Record<string, number>>(u.after, {});
  const kept: string[] = [];
  const toSchedule: string[] = [];
  let restored = 0;
  for (const r of rows) {
    const pid = r.id as string;
    const cur = one<{ status: string; updated_at: number }>("SELECT status, updated_at FROM posts WHERE id = ? AND project_id = ?", pid, p.id);
    if (!cur) continue;
    if (SENT.has(cur.status)) {
      kept.push(`${pid} : ${L("envoyée entre-temps", "sent in the meantime")}`);
      continue;
    }
    if (after[pid] != null && cur.updated_at !== after[pid]) {
      kept.push(`${pid} : ${L("modifiée depuis, modification gardée", "changed since, change kept")}`);
      continue;
    }
    if (typeof r.scheduled_at === "number" && r.scheduled_at < now() - 60_000) {
      kept.push(`${pid} : ${L("date d'origine passée", "original date has passed")}`);
      continue;
    }
    const media = json<string[]>(String(r.media ?? "[]"), []);
    if (media.some((m) => { const a = getAsset(m); return !a || a.project_id !== p.id || !!a.deleted_at || a.status === "rejected"; })) {
      kept.push(`${pid} : ${L("visuel d'origine supprimé", "original visual deleted")}`);
      continue;
    }
    const live = ["scheduled", "paused"].includes(String(r.status));
    const values = UNDO_COLS.map((c) => (c === "status" && live ? (r.approved_hash ? "approved" : "review") : r[c]) as never);
    run(`UPDATE posts SET ${UNDO_COLS.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...values, now(), pid);
    removeUsages("post", pid);
    for (const m of media) addUsage(m, "post", pid, "Publication");
    if (live && r.approved_hash) toSchedule.push(pid);
    restored++;
  }
  // Programmées avant : repassent par la programmation habituelle (calendrier en pause : restent en pause).
  for (const pid of toSchedule) {
    const paused = one<{ paused: number }>("SELECT c.paused FROM posts x JOIN content_plans c ON c.id = x.plan_id WHERE x.id = ?", pid)?.paused;
    if (paused) {
      run("UPDATE posts SET status = 'paused', updated_at = ? WHERE id = ? AND status = 'approved'", now(), pid);
      continue;
    }
    const s = schedulePosts([pid], (x) => checkPost(p, x));
    for (const x of s.refused) kept.push(`${x.id} : ${L("reste approuvée, non reprogrammée", "stays approved, not rescheduled")} (${x.reason})`);
  }
  let removed = 0;
  for (const nid of json<string[]>(u.created, [])) {
    const cur = one<{ updated_at: number }>("SELECT updated_at FROM posts WHERE id = ? AND project_id = ? AND status NOT IN ('publishing','published','uncertain')", nid, p.id);
    if (!cur) continue;
    if (after[nid] != null && cur.updated_at !== after[nid]) {
      kept.push(`${nid} : ${L("copie modifiée depuis, gardée", "copy changed since, kept")}`);
      continue;
    }
    removeUsages("post", nid);
    removed += run("DELETE FROM posts WHERE id = ? AND project_id = ?", nid, p.id).changes;
  }
  run("DELETE FROM social_edit_undo WHERE project_id = ?", p.id);
  const keptNote = kept.length ? L(` ; ${kept.length} laissée(s) telle(s) quelle(s)`, `; ${kept.length} left as they are`) : "";
  return { ids: rows.map((r) => r.id as string), costMicro: 0, applied: restored + removed > 0, by: "local", refused: kept.length ? kept : undefined, summary: L(`Dernière modification annulée (« ${u.summary} ») : ${restored} publication(s) remise(s) comme avant${removed ? `, ${removed} copie(s) retirée(s)` : ""}${keptNote}.`, `Last change undone ("${u.summary}"): ${restored} post(s) restored${removed ? `, ${removed} copy(ies) removed` : ""}${keptNote}.`) };
}
