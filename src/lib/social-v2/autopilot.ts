/**
 * « Ma communication automatique » (Autopilot V2) — réglages du projet, consentement au pilote automatique et
 * exécution récurrente par le worker. Ce n'est PAS un nouveau moteur : tout passe par le Social V2 existant
 * (createPlanV2, produceBatch, approvePosts, schedulePosts, publishOne) et ses protections.
 *
 * Deux modes :
 * - validation manuelle (par défaut) : le studio prépare et produit au fil de l'eau, le client valide ;
 * - pilote automatique : seulement avec un consentement explicite, horodaté et conservé (texte accepté, compte,
 *   date) ; il approuve et programme lui-même les publications SANS défaut bloquant, des catégories choisies, sur
 *   les réseaux dont la publication automatique est réellement disponible et non suspendus.
 *
 * Production progressive : visuels gratuits par défaut, quelques jours à l'avance seulement (jamais 90 jours de
 * médias payants d'un coup). Payant seulement si le client a fixé un plafond par semaine, que l'IA est active et
 * que l'estimation tient dans ce plafond — via la tâche de production existante (réservation et contrôle du budget).
 * Budget épuisé : ce qui est prêt reste, les médias déjà présents sont réutilisés, la production payante s'arrête
 * proprement et le client est prévenu (recharge de 10 €). Chaque action est tracée (`social_autopilot_log`).
 */
import { all, id, json, now, one, run } from "../db";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { loadProject, notify, type Project } from "../projects";
import { assertAutopublish, planOfProject } from "../plan-gates";
import { PLANS } from "../plans";
import { enqueue } from "../jobs";
import { formatInTimeZone } from "date-fns-tz";
import { createPlanV2, type FormatKind } from "./planner";
import { estimateProduction, produceBatch } from "./production";
import { approvePosts } from "./approval";
import { checkPost } from "./quality";
import { resumePosts, schedulePosts } from "./scheduler";
import { networkStatus } from "./networks";
import { brainIssues } from "./brain-check";
import { PLATFORMS, type Platform } from "./platforms";
import type { Goal, RoleKind } from "./editorial";
import type { SocialDeps } from "./deps";
import { visualParams, type VisualMode } from "./visual-mode";

export type AutopilotConfig = {
  /** Communication automatique activée (préparation au fil de l'eau). */
  active: boolean;
  goal: Goal;
  platforms: Platform[];
  perDay: number;
  weekdays: number[];
  /** Heures proposées — des suggestions courantes, jamais présentées comme « optimales » sans données réelles. */
  slots: string[];
  timezone: string;
  tone: string;
  language: "fr" | "en";
  commercial: 0 | 1 | 2;
  focus: string[];
  formats: Partial<Record<FormatKind, number>>;
  approval: "manual" | "auto";
  /** Catégories que le pilote peut approuver seul. */
  autoKinds: RoleKind[];
  /** Mots qui empêchent l'approbation automatique (la publication attend le client). */
  exclude: string[];
  /** Réseaux suspendus : rien n'y part. */
  suspended: Platform[];
  /** Jours préparés à l'avance (au plus le calendrier du forfait). */
  horizonDays: number;
  /** Jours à l'avance pour lesquels les visuels sont produits (production progressive). */
  produceDays: number;
  /** Plafond de dépense IA par semaine pour les visuels (0 : visuels gratuits seulement). */
  paidCapEurWeek: number;
  /** Façon de faire les visuels : gratuit (photo + mise en page du studio), image par l'IA, publication entière par l'IA. */
  visual: VisualMode;
};

export const SUGGESTED_SLOTS = ["09:00", "12:30", "18:00", "11:00", "20:00"];
const ALL_KINDS: RoleKind[] = ["main", "info", "demo", "more", "engage", "convert"];
const HOUR = 3_600_000;
export const AUTOPILOT_EVERY = 6 * HOUR;

export const CONSENT_TEXT = {
  fr: "J'autorise le studio à approuver et programmer lui-même mes publications, sur les réseaux, catégories et limites que j'ai choisis. Une publication avec un défaut bloquant ou une information à compléter attend toujours ma validation. Je peux tout arrêter à tout moment.",
  en: "I allow the studio to approve and schedule my posts itself, on the networks, categories and limits I chose. A post with a blocking issue or missing information always waits for my approval. I can stop everything at any time.",
};

export function defaultConfig(p: Project): AutopilotConfig {
  const plan = planOfProject(p.id);
  const accounts = all<{ provider: string }>("SELECT DISTINCT provider FROM connections WHERE user_id = ? AND provider IN ('instagram','facebook','tiktok','youtube','pinterest')", p.userId).map((r) => r.provider as Platform);
  return {
    active: false,
    goal: "balanced",
    platforms: accounts.length ? accounts : p.business === "services" ? ["facebook", "instagram"] : ["instagram", "facebook"],
    perDay: 1,
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    slots: SUGGESTED_SLOTS.slice(0, 1),
    timezone: p.settings.timezone || "Europe/Paris",
    tone: "",
    language: p.settings.language === "en" ? "en" : "fr",
    commercial: 1,
    focus: [],
    formats: {},
    approval: "manual",
    autoKinds: ALL_KINDS,
    exclude: [],
    suspended: [],
    horizonDays: Math.min(14, plan ? PLANS[plan].calendarDays : 7),
    produceDays: 3,
    paidCapEurWeek: 0,
    visual: "free",
  };
}

type Row = { project_id: string; config: string; autopilot: number; consent_at: number | null; consent_by: string | null; consent_text: string | null; paused: number; last_run_at: number | null; next_run_at: number | null; last_result: string | null };

export function getSettings(p: Project) {
  const r = one<Row>("SELECT * FROM social_settings WHERE project_id = ?", p.id);
  const config = { ...defaultConfig(p), ...json<Partial<AutopilotConfig>>(r?.config ?? "{}", {}) };
  return {
    config,
    autopilot: !!r?.autopilot && !!r?.consent_at,
    consent: r?.consent_at ? { at: r.consent_at, by: r.consent_by, text: r.consent_text } : null,
    paused: !!r?.paused,
    lastRunAt: r?.last_run_at ?? null,
    nextRunAt: r?.next_run_at ?? null,
    lastResult: r?.last_result ?? null,
    saved: !!r,
  };
}

export function logAutopilot(projectId: string, action: string, detail: unknown = "") {
  run("INSERT INTO social_autopilot_log (id, project_id, at, action, detail) VALUES (?,?,?,?,?)", id(), projectId, now(), action, typeof detail === "string" ? detail : JSON.stringify(detail));
}

export const autopilotLog = (projectId: string, limit = 50) => all<{ at: number; action: string; detail: string }>("SELECT at, action, detail FROM social_autopilot_log WHERE project_id = ? ORDER BY at DESC, rowid DESC LIMIT ?", projectId, limit);

const clampSlots = (xs: string[]) => [...new Set(xs.filter((x) => /^\d{2}:\d{2}$/.test(x)))].slice(0, 5);

/**
 * Enregistre les réglages (le calendrier existant n'est jamais effacé : un changement d'objectif s'applique aux
 * nouvelles cases). Limites du forfait vérifiées ici : publications par jour, jours à l'avance.
 */
export function saveSettings(p: Project, patch: Partial<AutopilotConfig>) {
  const cur = getSettings(p);
  const plan = planOfProject(p.id);
  const next: AutopilotConfig = { ...cur.config, ...patch };
  if (patch.active && !plan) throw new HttpError(402, L("La communication automatique demande un forfait actif pour ce projet (Découverte : démonstration seulement).", "Automatic communication needs an active plan for this project (Discovery: demo only)."), "plan_required");
  const maxPerDay = plan ? PLANS[plan].postsPerDay : 1;
  if (next.perDay > maxPerDay) throw new HttpError(402, L(`Votre forfait prévoit au plus ${maxPerDay} publication(s) par jour.`, `Your plan allows at most ${maxPerDay} post(s) per day.`), "plan_upgrade");
  next.perDay = Math.max(1, Math.round(next.perDay));
  next.horizonDays = Math.max(1, Math.min(Math.round(next.horizonDays), plan ? PLANS[plan].calendarDays : 7));
  next.produceDays = Math.max(1, Math.min(Math.round(next.produceDays), 7));
  next.platforms = next.platforms.filter((x) => (PLATFORMS as readonly string[]).includes(x));
  next.suspended = next.suspended.filter((x) => (PLATFORMS as readonly string[]).includes(x));
  next.weekdays = [...new Set(next.weekdays.filter((d) => d >= 0 && d <= 6))];
  if (!next.weekdays.length) next.weekdays = [0, 1, 2, 3, 4, 5, 6];
  next.slots = clampSlots(next.slots);
  if (!next.slots.length) next.slots = SUGGESTED_SLOTS.slice(0, next.perDay);
  next.paidCapEurWeek = Math.max(0, Math.min(Number(next.paidCapEurWeek) || 0, 50));
  if (!["free", "ai_image", "ai_post"].includes(next.visual)) next.visual = "free";
  run(
    "INSERT INTO social_settings (project_id, config, updated_at) VALUES (?,?,?) ON CONFLICT(project_id) DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at",
    p.id,
    JSON.stringify(next),
    now(),
  );
  // Suspension d'un réseau : ce qui y était programmé passe en pause ; levée : retour « approuvée » (reprogrammée
  // ensuite avec tous les contrôles, jamais d'envoi direct).
  const added = next.suspended.filter((x) => !cur.config.suspended.includes(x));
  const removed = cur.config.suspended.filter((x) => !next.suspended.includes(x));
  for (const n of added) run("UPDATE posts SET status = 'paused', updated_at = ? WHERE project_id = ? AND network = ? AND status = 'scheduled'", now(), p.id, n);
  for (const n of removed) run("UPDATE posts SET status = 'approved', updated_at = ? WHERE project_id = ? AND network = ? AND status = 'paused'", now(), p.id, n);
  if (patch.active === true && !cur.config.active) run("UPDATE social_settings SET next_run_at = ? WHERE project_id = ?", now(), p.id);
  logAutopilot(p.id, "settings", { changed: Object.keys(patch), suspended: added, unsuspended: removed });
  return getSettings(p);
}

/** Pilote automatique : consentement explicite et traçable (texte accepté, compte, date), forfait qui l'inclut. */
export function enableAutopilot(p: Project, userId: string, accepted: string) {
  assertAutopublish(null, p.id);
  const lang = getSettings(p).config.language;
  if (accepted.trim() !== CONSENT_TEXT[lang].trim() && accepted.trim() !== CONSENT_TEXT.fr && accepted.trim() !== CONSENT_TEXT.en) throw new HttpError(400, L("Le texte d'accord ne correspond pas : relisez-le et acceptez-le tel quel.", "The consent text doesn't match: read it and accept it as is."));
  if (!getSettings(p).saved) saveSettings(p, {});
  run("UPDATE social_settings SET autopilot = 1, consent_at = ?, consent_by = ?, consent_text = ?, next_run_at = ?, updated_at = ? WHERE project_id = ?", now(), userId, accepted.trim(), now(), now(), p.id);
  run("UPDATE social_settings SET config = json_set(config, '$.approval', 'auto', '$.active', json('true')) WHERE project_id = ?", p.id);
  logAutopilot(p.id, "consent", { by: userId, text: accepted.trim() });
  return getSettings(p);
}

/**
 * Désactivation immédiate : plus aucune approbation automatique ; les publications approuvées par le pilote (et non
 * par le client) qui n'étaient pas encore parties reviennent « à valider ».
 */
export function disableAutopilot(p: Project, userId: string) {
  run("UPDATE social_settings SET autopilot = 0, updated_at = ? WHERE project_id = ?", now(), p.id);
  run("UPDATE social_settings SET config = json_set(config, '$.approval', 'manual') WHERE project_id = ?", p.id);
  const back = run("UPDATE posts SET status = 'review', approved_hash = NULL, approved_at = NULL, approved_by = NULL, updated_at = ? WHERE project_id = ? AND approved_by = 'autopilot' AND status IN ('approved','scheduled','paused')", now(), p.id).changes;
  logAutopilot(p.id, "autopilot_off", { by: userId, backToReview: back });
  return { ...getSettings(p), backToReview: back };
}

/** Tout mettre en pause (rien ne part, rien n'est préparé) / reprendre (chaque publication revérifiée). */
export function pauseAll(p: Project, paused: boolean) {
  if (!getSettings(p).saved) saveSettings(p, {});
  run("UPDATE social_settings SET paused = ?, updated_at = ? WHERE project_id = ?", paused ? 1 : 0, now(), p.id);
  let r = { resumed: [] as string[], kept: [] as { id: string; reason: string }[] };
  if (paused) run("UPDATE posts SET status = 'paused', updated_at = ? WHERE project_id = ? AND status = 'scheduled'", now(), p.id);
  else {
    const suspended = getSettings(p).config.suspended;
    r = resumePosts(all<{ id: string; project_id: string; scheduled_at: number; network: string }>("SELECT id, project_id, scheduled_at, network FROM posts WHERE project_id = ? AND status = 'paused' ORDER BY scheduled_at", p.id).filter((x) => !suspended.includes(x.network as Platform)));
  }
  logAutopilot(p.id, paused ? "pause_all" : "resume_all", paused ? "" : { resumed: r.resumed.length, kept: r.kept.length });
  return r;
}

const autoPlanId = (projectId: string) => `auto-${projectId}`;
const briefOf = (s: string) => json<{ roleKind?: RoleKind }>(s, {});

/** Dépense IA engagée par le pilote sur 7 jours (estimations maximales des tâches lancées : jamais sous-estimée). */
function spentThisWeek(projectId: string, at: number): number {
  return all<{ detail: string }>("SELECT detail FROM social_autopilot_log WHERE project_id = ? AND action = 'paid_job' AND at > ?", projectId, at - 7 * 24 * HOUR).reduce((s, r) => s + (json<{ estimateMicro?: number }>(r.detail, {}).estimateMicro ?? 0), 0);
}

export type AutopilotRun = { skipped?: string; created: number; produced: number; paidJob: string | null; approved: number; scheduled: number; waiting: number; refused: { id: string; reason: string }[]; notes: string[] };

/** Un passage du pilote pour un projet (worker, toutes les 6 h ; aussi « Lancer maintenant »). */
export async function runAutopilot(p: Project, deps: SocialDeps, at = now()): Promise<AutopilotRun> {
  const out: AutopilotRun = { created: 0, produced: 0, paidJob: null, approved: 0, scheduled: 0, waiting: 0, refused: [], notes: [] };
  const s = getSettings(p);
  const c = s.config;
  if (s.paused) return { ...out, skipped: "tout est en pause" };
  if (!c.active) return { ...out, skipped: "communication automatique non activée" };
  const plan = planOfProject(p.id);
  if (!plan) return { ...out, skipped: "projet sans forfait actif (Découverte : démonstration seulement)" };
  const platforms = c.platforms.filter((x) => !c.suspended.includes(x));
  if (!platforms.length) return { ...out, skipped: "aucun réseau actif" };

  // 0. Project Brain : un produit retiré n'est plus promu, un prix modifié remet la publication en relecture.
  for (const r of all<{ id: string; brief: string }>("SELECT id, brief FROM posts WHERE project_id = ? AND engine = 'v2' AND status IN ('planned','draft','review','approved','scheduled','paused') AND scheduled_at > ?", p.id, at)) {
    const b = brainIssues(p, r.brief);
    if (!b.removed.length && !b.priceChanged.length) continue;
    const msg = b.removed.length ? `Produit retiré du catalogue (${b.removed.join(", ")}) : à revoir` : `Prix modifié (${b.priceChanged.join(", ")}) : à relire`;
    if (run("UPDATE posts SET status = 'review', approved_hash = NULL, error = ?, updated_at = ? WHERE id = ? AND (error IS NULL OR error != ?)", msg, now(), r.id, msg).changes) out.notes.push(msg);
  }

  // 1. Remplissage glissant : les prochains jours, dans le calendrier du forfait, sans jamais recréer une case.
  const tomorrow = formatInTimeZone(at + 24 * HOUR, c.timezone, "yyyy-MM-dd");
  const perDay = Math.min(c.perDay, PLANS[plan].postsPerDay);
  const days = Math.min(c.horizonDays, PLANS[plan].calendarDays - 1);
  const accounts = all<{ id: string; provider: string }>("SELECT id, provider FROM connections WHERE user_id = ? AND status = 'active'", p.userId);
  if (days > 0) {
    const r = createPlanV2(
      p,
      {
        startDate: tomorrow,
        days,
        perDay,
        weekdays: c.weekdays,
        slots: c.slots.length >= perDay ? c.slots : [...c.slots, ...SUGGESTED_SLOTS.filter((x) => !c.slots.includes(x))].slice(0, perDay),
        timezone: c.timezone,
        platforms: platforms.map((pl) => ({ platform: pl, connectionId: accounts.find((a) => a.provider === pl)?.id ?? null })),
        distribution: "all",
        formatMix: Object.keys(c.formats).length ? c.formats : undefined,
        structure: "weekly",
        goal: c.goal,
        commercial: c.commercial,
        focus: c.focus,
        lang: c.language,
      },
      { planId: autoPlanId(p.id) },
    );
    out.created = r.created;
    out.notes.push(...r.warnings);
  }

  // 2. Production progressive : seulement les prochains jours, visuels gratuits d'abord.
  const soon = all<{ id: string }>("SELECT id FROM posts WHERE plan_id = ? AND media = '[]' AND status IN ('planned','draft','review') AND scheduled_at > ? AND scheduled_at < ? ORDER BY scheduled_at LIMIT 15", autoPlanId(p.id), at, at + c.produceDays * 24 * HOUR).map((r) => r.id);
  if (soon.length) {
    const left = Math.round(c.paidCapEurWeek * 1_000_000) - spentThisWeek(p.id, at);
    // Visuels par l'IA : seulement si le client les a choisis ET a fixé un plafond par semaine.
    const paidWanted = c.visual !== "free" && c.paidCapEurWeek > 0;
    const vp = visualParams(c.visual);
    if (paidWanted && !deps.aiActive) {
      // Budget IA épuisé ou IA indisponible : on continue gratuitement et on prévient une fois par semaine.
      if (!one("SELECT 1 FROM social_autopilot_log WHERE project_id = ? AND action = 'budget_low' AND at > ?", p.id, at - 7 * 24 * HOUR)) {
        notify(p.userId, p.id, L("Budget IA épuisé pour vos publications", "AI budget used up for your posts"), L("Les publications prêtes restent programmées et les visuels continuent gratuitement (bibliothèque, mise en page du studio). Pour des visuels par l'IA, ajoutez une recharge de 10 € dans « Mon compte ».", "Ready posts stay scheduled and visuals continue for free (library, studio layout). For AI visuals, add a €10 top-up in \"My account\"."), "warning");
        logAutopilot(p.id, "budget_low", "visuels gratuits seulement ; recharge de 10 € proposée");
      }
      out.notes.push("budget IA indisponible : visuels gratuits seulement");
    }
    const est = paidWanted && deps.aiActive ? estimateProduction(p, soon, deps, { allowPaid: true, aiBackground: "aiBackground" in vp ? vp.aiBackground : undefined, aiImages: "aiImages" in vp ? vp.aiImages : undefined }) : null;
    if (est && est.paid > 0 && est.estimateMicro <= left) {
      // Payant, dans le plafond consenti : par la tâche de production existante (réservation atomique du budget).
      const job = enqueue({ userId: p.userId, projectId: p.id, type: "social.v2.produce", label: L("Pilote : visuels des prochains jours", "Autopilot: upcoming visuals"), payload: { projectId: p.id, ids: soon, allowPaid: true, maxCostEur: left / 1_000_000, approvedEstimateMicro: est.estimateMicro, aiBackground: "aiBackground" in vp ? !!vp.aiBackground : false, aiImages: "aiImages" in vp ? vp.aiImages : null }, idempotencyKey: `autopilot:${p.id}:${soon.join(",").slice(0, 200)}` });
      out.paidJob = job.id;
      logAutopilot(p.id, "paid_job", { jobId: job.id, posts: soon.length, estimateMicro: est.estimateMicro });
    } else {
      if (est && est.paid > 0) out.notes.push(`plafond de la semaine atteint (${c.paidCapEurWeek} €) : visuels gratuits`);
      const r = await produceBatch(p, soon, deps, { allowPaid: false, maxCostEur: 0, batchSize: 15 });
      out.produced = r.produced;
      logAutopilot(p.id, "produce", { produced: r.produced, failed: r.failed, spentMicro: 0 });
    }
  }

  // 3. Validation : le client (mode manuel) ou le pilote, dans les limites qu'il a acceptées.
  const ready = all<{ id: string; network: string; caption: string; title: string; brief: string }>("SELECT id, network, caption, title, brief FROM posts WHERE plan_id = ? AND status IN ('planned','draft','review') AND media != '[]' AND scheduled_at > ? AND scheduled_at < ? ORDER BY scheduled_at", autoPlanId(p.id), at, at + 7 * 24 * HOUR);
  if (!(s.autopilot && c.approval === "auto")) {
    out.waiting = ready.length;
    if (ready.length && !one("SELECT 1 FROM social_autopilot_log WHERE project_id = ? AND action = 'to_review' AND at > ?", p.id, at - 24 * HOUR)) {
      notify(p.userId, p.id, L("Publications à valider", "Posts to approve"), L(`${ready.length} publication(s) des 7 prochains jours sont prêtes : relisez-les et validez-les (rien ne part sans votre accord).`, `${ready.length} post(s) for the next 7 days are ready: review and approve them (nothing is posted without your approval).`));
      logAutopilot(p.id, "to_review", { posts: ready.length });
    }
  } else {
    const gate = (pid: string) => checkPost(p, pid);
    const statusOf = new Map(platforms.map((pl) => [pl, networkStatus(p, pl).state]));
    const words = c.exclude.map((w) => w.trim().toLowerCase()).filter(Boolean);
    const eligible: string[] = [];
    for (const r of ready) {
      const kind = briefOf(r.brief).roleKind;
      const why =
        c.suspended.includes(r.network as Platform) ? "réseau suspendu"
        : statusOf.get(r.network as Platform) !== "auto_available" ? "publication automatique non disponible sur ce réseau"
        : kind && !c.autoKinds.includes(kind) ? "catégorie à valider par vous"
        : words.some((w) => `${r.title}\n${r.caption}`.toLowerCase().includes(w)) ? "mot exclu : à valider par vous"
        : gate(r.id).blocking[0] ?? null;
      if (why) out.refused.push({ id: r.id, reason: why });
      else eligible.push(r.id);
    }
    const ap = approvePosts(eligible, "autopilot", gate);
    out.approved = ap.approved.length;
    out.refused.push(...ap.refused);
    const sc = schedulePosts(ap.approved, gate);
    out.scheduled = sc.scheduled.length;
    out.refused.push(...sc.refused);
    out.waiting = out.refused.length;
    logAutopilot(p.id, "auto_approve", { approved: out.approved, scheduled: out.scheduled, waiting: out.waiting, reasons: out.refused.slice(0, 10) });
  }
  return out;
}

/** Worker : passages arrivés à échéance (prise en charge atomique, un projet en erreur n'arrête pas les autres). */
export async function runDueAutopilots(depsFor: (p: Project) => SocialDeps, at = now()): Promise<number> {
  const due = all<{ project_id: string }>("SELECT project_id FROM social_settings WHERE paused = 0 AND json_extract(config, '$.active') = 1 AND (next_run_at IS NULL OR next_run_at <= ?) LIMIT 10", at);
  for (const d of due) {
    const claimed = run("UPDATE social_settings SET next_run_at = ? WHERE project_id = ? AND (next_run_at IS NULL OR next_run_at <= ?)", at + AUTOPILOT_EVERY, d.project_id, at);
    if (!claimed.changes) continue;
    let result: string;
    try {
      const p = loadProject(d.project_id);
      const r = await runAutopilot(p, depsFor(p), at);
      result = r.skipped ?? `${r.created} préparée(s), ${r.produced} visuel(s), ${r.approved} approuvée(s) par le pilote, ${r.scheduled} programmée(s), ${r.waiting} en attente de validation`;
    } catch (e) {
      result = `erreur : ${(e as Error).message.slice(0, 200)}`;
    }
    run("UPDATE social_settings SET last_run_at = ?, last_result = ? WHERE project_id = ?", at, result, d.project_id);
    logAutopilot(d.project_id, "run", result);
  }
  return due.length;
}
