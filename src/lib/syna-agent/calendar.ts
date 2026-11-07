/**
 * SINA (#492) — étape 11 du parcours : calendrier de publication MANUEL (décision du propriétaire du 7 novembre 2026,
 * docs/syna/PARCOURS-CREATION.md). Le client voit, jour par jour, quelle publication (image ou vidéo + texte à copier)
 * poster sur quel réseau, et la publie LUI-MÊME ; il coche « publié ». Aucune publication automatique : elle viendra
 * quand les réseaux (Meta, TikTok…) auront donné leur accord (`AUTO_PUBLISH_AVAILABLE`, case par case `mode`).
 *
 * Gratuit, déterministe, sans IA : le calendrier est construit à partir des publications déjà créées (étape 9 : lignes
 * `posts` du moteur V2 avec leurs médias) et des publicités déjà rendues (étape 10 : documents à calques). Rien n'est
 * inventé : s'il manque des publications pour remplir le calendrier, le nombre manquant est annoncé, jamais comblé.
 *
 * Réemplois : dates et heures (`publishingDates`, `atZoned`, `DEFAULT_SLOTS` du planificateur), fiches des réseaux
 * (`PLATFORM_SPECS`, limites `perDayWarn`, `frequencyWarnings`), contrôle d'un déplacement (`moveRefusal`), forfait
 * (`PLANS` : jours de calendrier et publications par jour), visibilité par angle (`strategyVisibilitySql`), médias
 * (`assetUrl`), notifications du Studio (`notify`). Les dates sont recopiées dans `posts.scheduled_at` pour que l'onglet
 * Publications montre le même calendrier ; le statut « scheduled » (envoi automatique) n'est JAMAIS posé ici.
 *
 * Conventions attendues des étapes 9 et 10 : les déclinaisons d'une même publication (un format par réseau)
 * partagent `posts.group_id` ; le « groupe » de l'étape 9 (1 à 3) peut être noté `brief.serie` pour varier les sujets.
 * Les formats d'une même publicité partagent `meta.conceptId` dans leur document.
 */
import { formatInTimeZone } from "date-fns-tz";
import { HttpError } from "../auth";
import { all, json, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { notify, type Project } from "../projects";
import { assetUrl, getAsset } from "../library";
import { planOfProject } from "../plan-gates";
import { PLANS } from "../plans";
import { strategyVisibilitySql } from "../marketing-strategy/visibility";
import { latestDoc } from "../ad-doc/store";
import { atZoned, DEFAULT_SLOTS, publishingDates } from "../social-v2/planner";
import { frequencyWarnings, PLATFORM_SPECS, PLATFORMS, platformSpec, type Platform } from "../social-v2/platforms";
import { moveRefusal } from "../social-v2/scheduler";

/** Durées proposées au client (parcours, étape 11). */
export const CALENDAR_DAYS = [7, 15, 30] as const;
/**
 * Publication automatique : structure prête (champ `mode` de chaque case, réglage `settings.autopublish` du projet et
 * programmation native `schedulePosts`), mais JAMAIS active tant que les plateformes n'ont pas validé le Studio.
 */
export const AUTO_PUBLISH_AVAILABLE = false;

/** États d'une publication que le calendrier peut dater ou cocher (jamais « scheduled » : c'est l'envoi automatique). */
const EDITABLE = ["draft", "planned", "review", "approved"];
const DAY = 86_400_000;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export type EntryKind = "publication" | "publicite";
export type EntryMode = "manuel" | "automatique";
export type CalendarEntry = {
  /** « pub:<id de la publication> » ou « ad:<publicité> » : stable d'un calendrier à l'autre. */
  id: string;
  kind: EntryKind;
  /** Publication : id de la ligne `posts` ; publicité : clé de la publicité (concept). */
  ref: string;
  /** Même publication déclinée sur plusieurs réseaux (même idée, même jour). */
  unit: string;
  ymd: string;
  time: string;
  at: number;
  network: string;
  format: string;
  status: "a_publier" | "publie";
  doneAt: number | null;
  /** Toujours « manuel » aujourd'hui. */
  mode: EntryMode;
  /** Publicité : documents (un par format). */
  docs?: string[];
  /** Publication : état d'origine de la ligne `posts`, rendu si le client décoche ou si la case disparaît. */
  prev?: { status: string; scheduledAt: number | null };
  movedByClient?: boolean;
};
export type CalendarSettings = { startDate: string; days: number; perDay: number; times: string[]; networks: Platform[]; emojis: boolean; includeAds: boolean; timezone: string };
export type Calendar = { version: 1; settings: CalendarSettings; entries: CalendarEntry[]; warnings: string[]; missing: number; leftover: number; reminded: string[]; createdAt: number; updatedAt: number };
export type CalendarRequest = { startDate?: string; days: number; perDay: number; times?: string[]; networks?: Platform[]; emojis?: boolean; includeAds?: boolean };

/* ---------- Lecture et écriture ---------- */

export function readCalendar(projectId: string): Calendar | null {
  const r = one<{ plan_json: string }>("SELECT plan_json FROM syna_calendars WHERE project_id=?", projectId);
  return r ? json<Calendar | null>(r.plan_json, null) : null;
}

function writeCalendar(projectId: string, cal: Calendar) {
  run("INSERT INTO syna_calendars(project_id,plan_json,created_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(project_id) DO UPDATE SET plan_json=excluded.plan_json,updated_at=excluded.updated_at", projectId, JSON.stringify(cal), cal.createdAt, cal.updatedAt);
}

const tzOf = (p: Project) => p.settings.timezone || "Europe/Paris";
const ymdPlus = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY).toISOString().slice(0, 10);
};
const todayOf = (tz: string, at = now()) => formatInTimeZone(at, tz, "yyyy-MM-dd");
const validYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

/* ---------- Ce qui peut entrer au calendrier ---------- */

type PostRow = { id: string; network: string; format: string; status: string; scheduled_at: number | null; media: string; brief: string; pillar: string | null; group_id: string | null; created_at: number };
export type SourceUnit = { unit: string; topic: string | null; posts: PostRow[]; assets: string[] };
export type AdUnit = { unit: string; docs: string[]; network: string; formats: string[]; assets: string[] };

/**
 * Publications prêtes (médias présents, moteur V2, visibles pour l'angle choisi, jamais programmées pour un envoi
 * automatique), regroupées par publication. Écartées, avec la raison : image du site (aucune image reprise du thème),
 * média supprimé, image déjà utilisée par une autre publication (aucune image répétée).
 */
export function publicationSources(p: Project): { units: SourceUnit[]; skipped: string[] } {
  const rows = all<PostRow>(`SELECT p.id,p.network,p.format,p.status,p.scheduled_at,p.media,p.brief,p.pillar,p.group_id,p.created_at FROM posts p WHERE p.project_id=? AND p.engine='v2' AND p.status IN (${EDITABLE.map(() => "?").join(",")}) AND ${strategyVisibilitySql(p.id, "post", "p.id")} ORDER BY p.created_at, p.id`, p.id, ...EDITABLE);
  const byUnit = new Map<string, SourceUnit>();
  const skipped: string[] = [];
  for (const r of rows) {
    const media = json<string[]>(r.media, []);
    if (!media.length || !(PLATFORMS as readonly string[]).includes(r.network)) continue;
    const brief = json<Record<string, unknown>>(r.brief, {});
    const key = r.group_id || (typeof brief.unit === "string" ? brief.unit : "") || r.id;
    const u = byUnit.get(key) ?? { unit: key, topic: String(brief.serie ?? brief.roleKind ?? r.pillar ?? "") || null, posts: [], assets: [] };
    u.posts.push(r);
    for (const m of media) if (!u.assets.includes(m)) u.assets.push(m);
    byUnit.set(key, u);
  }
  const used = new Set<string>();
  const units: SourceUnit[] = [];
  for (const u of byUnit.values()) {
    const gone = u.assets.filter((a) => { const x = getAsset(a); return !x || x.project_id !== p.id || !!x.deleted_at; });
    if (gone.length) { skipped.push(L("média supprimé", "deleted media")); continue; }
    if (one(`SELECT 1 FROM asset_usages WHERE target_type='theme_section' AND asset_id IN (${u.assets.map(() => "?").join(",")})`, ...u.assets)) { skipped.push(L("image reprise du site", "image reused from the site")); continue; }
    if (u.assets.some((a) => used.has(a))) { skipped.push(L("image déjà utilisée par une autre publication", "image already used by another post")); continue; }
    u.assets.forEach((a) => used.add(a));
    units.push(u);
  }
  return { units, skipped };
}

/** Publicités rendues (une par concept, tous ses formats) : à lancer par le client dans son gestionnaire de publicités. */
export function adSources(p: Project): AdUnit[] {
  const keys = all<{ doc_key: string }>(`SELECT doc_key FROM ad_documents WHERE project_id=? AND ${strategyVisibilitySql(p.id, "ad", "ad_documents.id")} GROUP BY doc_key ORDER BY MIN(created_at), doc_key`, p.id).map((r) => r.doc_key);
  const units = new Map<string, AdUnit>();
  for (const k of keys) {
    const d = latestDoc(p.id, k);
    if (!d?.version.renderedAssetId) continue;
    const a = getAsset(d.version.renderedAssetId);
    if (!a || a.project_id !== p.id || a.deleted_at) continue;
    const key = d.doc.meta?.conceptId || k;
    const u = units.get(key) ?? { unit: key, docs: [], network: d.doc.format?.platform || "publicite", formats: [], assets: [] };
    u.docs.push(k);
    if (d.doc.format?.aspect && !u.formats.includes(d.doc.format.aspect)) u.formats.push(d.doc.format.aspect);
    u.assets.push(a.id);
    units.set(key, u);
  }
  return [...units.values()];
}

/** Ordre varié : jamais deux fois de suite le même sujet (groupe de l'étape 9, rôle ou pilier) quand c'est possible. */
export function varietyOrder<T extends { topic: string | null }>(list: T[]): T[] {
  const rest = [...list];
  const out: T[] = [];
  while (rest.length) {
    const last = out[out.length - 1]?.topic ?? null;
    let i = last == null ? 0 : rest.findIndex((u) => u.topic !== last);
    if (i < 0) i = 0;
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

/** Heures de publication : celles du client (HH:MM), complétées par les heures par défaut du Studio. */
export function slotTimes(perDay: number, wanted?: string[]): string[] {
  const out: string[] = [];
  for (const t of wanted ?? []) {
    if (!HHMM.test(t)) throw new HttpError(400, L(`Heure invalide « ${t} » : écris-la comme 11:30.`, `Invalid time "${t}": write it like 11:30.`));
    if (!out.includes(t)) out.push(t);
  }
  for (const t of DEFAULT_SLOTS) if (out.length < perDay && !out.includes(t)) out.push(t);
  return out.slice(0, perDay).sort();
}

/* ---------- Construction ---------- */

/**
 * Construit (ou refait) le calendrier : les cases déjà cochées « publié » restent telles quelles ; toutes les autres
 * sont replacées. Une case = une publication sur un réseau, à une date et une heure. Un même créneau porte une seule
 * publication, déclinée sur chaque réseau du client (format du réseau) ; au plus `perDay` publications par jour, et
 * par réseau au plus la limite connue de la plateforme. Les publicités sont réparties sur la période, une par jour au
 * plus, à la première heure du jour.
 */
export function buildCalendar(p: Project, req: CalendarRequest, previous: Calendar | null = readCalendar(p.id), at = now()): Calendar {
  const plan = planOfProject(p.id);
  if (!plan) throw new HttpError(402, L("Ce projet n'a pas de forfait actif.", "This project has no active plan."), "plan_required");
  const rights = PLANS[plan];
  if (!(CALENDAR_DAYS as readonly number[]).includes(req.days)) throw new HttpError(400, L("Durée possible : 7, 15 ou 30 jours.", "Possible length: 7, 15 or 30 days."));
  if (req.days > rights.calendarDays) throw new HttpError(402, L(`Ton forfait permet un calendrier de ${rights.calendarDays} jours au plus.`, `Your plan allows a calendar of up to ${rights.calendarDays} days.`), "plan_calendar_days");
  const warnings: string[] = [];
  let perDay = Math.max(1, Math.min(5, Math.round(req.perDay)));
  if (perDay > rights.postsPerDay) {
    perDay = rights.postsPerDay;
    warnings.push(L(`Limité à ${perDay} publication(s) par jour par ton forfait.`, `Limited to ${perDay} post(s) per day by your plan.`));
  }
  const tz = tzOf(p);
  const today = todayOf(tz, at);
  const startDate = req.startDate ?? ymdPlus(today, 1);
  if (!validYmd(startDate)) throw new HttpError(400, L("Date de début invalide (AAAA-MM-JJ).", "Invalid start date (YYYY-MM-DD)."));
  if (startDate < today) throw new HttpError(400, L("Cette date est passée : choisis une date à venir.", "This date is in the past: pick an upcoming date."));
  if (ymdPlus(startDate, req.days - 1) > ymdPlus(today, rights.calendarDays)) throw new HttpError(402, L(`Ton forfait prévoit jusqu'à ${rights.calendarDays} jours à l'avance : commence plus tôt ou raccourcis le calendrier.`, `Your plan plans up to ${rights.calendarDays} days ahead: start earlier or shorten the calendar.`), "plan_calendar_days");
  const times = slotTimes(perDay, req.times);
  const sources = publicationSources(p);
  const known = [...new Set(sources.units.flatMap((u) => u.posts.map((x) => x.network as Platform)))];
  const networks = (req.networks?.length ? PLATFORMS.filter((n) => req.networks!.includes(n)) : PLATFORMS.filter((n) => known.includes(n))) as Platform[];
  const settings: CalendarSettings = { startDate, days: req.days, perDay, times, networks, emojis: req.emojis ?? true, includeAds: req.includeAds ?? true, timezone: tz };

  // Cases déjà publiées par le client : gardées telles quelles, elles occupent leur créneau.
  const kept = (previous?.entries ?? []).filter((e) => e.status === "publie");
  const keptRefs = new Set(kept.map((e) => e.ref));
  const keptUnitsOn = new Map<string, Set<string>>();
  const keptTimesOn = new Map<string, Set<string>>();
  for (const e of kept.filter((x) => x.kind === "publication")) {
    keptUnitsOn.set(e.ymd, (keptUnitsOn.get(e.ymd) ?? new Set()).add(e.unit));
    keptTimesOn.set(e.ymd, (keptTimesOn.get(e.ymd) ?? new Set()).add(e.time));
  }
  const prevOf = new Map((previous?.entries ?? []).map((e) => [e.id, e.prev]));

  const units = varietyOrder(sources.units
    .map((u) => ({ ...u, posts: u.posts.filter((x) => networks.includes(x.network as Platform) && !keptRefs.has(x.id)) }))
    .filter((u) => u.posts.length));

  const dates = publishingDates({ startDate, days: req.days });
  const slots: { ymd: string; time: string; at: number }[] = [];
  for (const ymd of dates) {
    const free = times.filter((t) => !keptTimesOn.get(ymd)?.has(t)).slice(0, Math.max(0, perDay - (keptUnitsOn.get(ymd)?.size ?? 0)));
    for (const t of free) {
      const when = atZoned(ymd, t, tz);
      if (when > at) slots.push({ ymd, time: t, at: when });
    }
  }

  const cap = (n: string) => Math.min(perDay, PLATFORM_SPECS[n as Platform]?.perDayWarn ?? perDay);
  const onDay = new Map<string, Set<string>>();
  const entries: CalendarEntry[] = [...kept];
  const capped = new Set<string>();
  let k = 0;
  let missing = 0;
  for (const s of slots) {
    const u = units[k];
    if (!u) { missing++; continue; }
    k++;
    for (const post of u.posts) {
      const key = `${s.ymd}|${post.network}`;
      const set = onDay.get(key) ?? new Set<string>();
      if (!set.has(u.unit) && set.size >= cap(post.network)) { capped.add(platformSpec(post.network).label); continue; }
      onDay.set(key, set.add(u.unit));
      const id = `pub:${post.id}`;
      entries.push({ id, kind: "publication", ref: post.id, unit: u.unit, ymd: s.ymd, time: s.time, at: s.at, network: post.network, format: post.format, status: "a_publier", doneAt: null, mode: "manuel", prev: prevOf.get(id) ?? { status: post.status, scheduledAt: post.scheduled_at } });
    }
  }
  const leftover = Math.max(0, units.length - k);

  if (settings.includeAds) {
    const ads = adSources(p).filter((a) => !keptRefs.has(a.unit));
    const days = [...new Set(slots.map((s) => s.ymd))];
    ads.slice(0, days.length).forEach((a, i) => {
      const ymd = days[Math.floor((i * days.length) / Math.max(1, Math.min(ads.length, days.length)))];
      const t = times.find((x) => atZoned(ymd, x, tz) > at) ?? times[0];
      entries.push({ id: `ad:${a.unit}`, kind: "publicite", ref: a.unit, unit: `ad:${a.unit}`, ymd, time: t, at: atZoned(ymd, t, tz), network: a.network, format: a.formats.join(" · "), status: "a_publier", doneAt: null, mode: "manuel", docs: a.docs });
    });
    if (ads.length > days.length) warnings.push(L(`${ads.length - days.length} publicité(s) ne tiennent pas dans ce calendrier (une par jour au plus).`, `${ads.length - days.length} ad(s) do not fit in this calendar (one per day at most).`));
  }

  const perNetwork: Partial<Record<Platform, number>> = {};
  for (const n of networks) perNetwork[n] = perDay;
  warnings.push(...frequencyWarnings(perNetwork));
  for (const n of capped) warnings.push(L(`${n} : pas plus de publications par jour que la limite connue du réseau ; les autres restent pour plus tard.`, `${n}: no more posts per day than the network's known limit; the others are kept for later.`));
  const why = [...new Set(sources.skipped)];
  if (why.length) warnings.push(L(`Publications écartées : ${why.join(", ")}.`, `Posts left out: ${why.join(", ")}.`));
  if (!networks.length) warnings.push(L("Aucun réseau choisi ni aucune publication prête : rien à placer.", "No network chosen and no ready post: nothing to place."));
  if (missing) warnings.push(L(`Il manque ${missing} publication(s) pour remplir le calendrier : ces créneaux restent vides (rien n'est inventé).`, `${missing} post(s) missing to fill the calendar: those slots stay empty (nothing is invented).`));
  if (leftover) warnings.push(L(`${leftover} publication(s) prête(s) ne tiennent pas dans ce calendrier : elles sont gardées pour la suite.`, `${leftover} ready post(s) do not fit in this calendar: kept for later.`));
  entries.sort((a, b) => a.at - b.at || a.network.localeCompare(b.network));
  const t = now();
  return { version: 1, settings, entries, warnings, missing, leftover, reminded: previous?.reminded ?? [], createdAt: previous?.createdAt ?? t, updatedAt: t };
}

/**
 * Enregistre le calendrier et recopie les dates dans l'onglet Publications (`posts.scheduled_at`, statut inchangé).
 * Une publication qui n'est plus au calendrier retrouve sa date d'origine.
 */
export function saveCalendar(p: Project, cal: Calendar, previous: Calendar | null = readCalendar(p.id)): Calendar {
  return tx(() => {
    const placed = new Set(cal.entries.filter((e) => e.kind === "publication").map((e) => e.ref));
    for (const e of previous?.entries ?? []) {
      if (e.kind !== "publication" || e.status === "publie" || placed.has(e.ref)) continue;
      run(`UPDATE posts SET scheduled_at=?, updated_at=? WHERE id=? AND project_id=? AND status IN (${EDITABLE.map(() => "?").join(",")})`, e.prev?.scheduledAt ?? null, now(), e.ref, p.id, ...EDITABLE);
    }
    for (const e of cal.entries) {
      if (e.kind !== "publication" || e.status === "publie") continue;
      run(`UPDATE posts SET scheduled_at=?, updated_at=? WHERE id=? AND project_id=? AND status IN (${EDITABLE.map(() => "?").join(",")})`, e.at, now(), e.ref, p.id, ...EDITABLE);
    }
    writeCalendar(p.id, cal);
    return readCalendar(p.id)!;
  });
}

export function planCalendar(p: Project, req: CalendarRequest, at = now()): Calendar {
  const previous = readCalendar(p.id);
  return saveCalendar(p, buildCalendar(p, req, previous, at), previous);
}

/* ---------- Actions du client ---------- */

const mustCalendar = (p: Project) => {
  const c = readCalendar(p.id);
  if (!c) throw new HttpError(404, L("Aucun calendrier pour ce projet : prépare-le d'abord.", "No calendar for this project yet: plan it first."));
  return c;
};

/**
 * Le client coche « publié » (ou décoche). La publication passe « publiée » dans l'onglet Publications (le Studio ne
 * la renverra donc jamais, même quand la publication automatique existera) ; décocher rend son état d'origine.
 */
export function markDone(p: Project, entryIds: string[], done = true): { changed: string[]; refused: { id: string; reason: string }[]; calendar: Calendar } {
  return tx(() => {
    const cal = mustCalendar(p);
    const changed: string[] = [];
    const refused: { id: string; reason: string }[] = [];
    for (const eid of entryIds) {
      const e = cal.entries.find((x) => x.id === eid);
      if (!e) { refused.push({ id: eid, reason: L("case introuvable", "entry not found") }); continue; }
      if ((e.status === "publie") === done) continue;
      if (e.kind === "publication") {
        const r = one<{ status: string; remote_id: string | null }>("SELECT status, remote_id FROM posts WHERE id=? AND project_id=?", e.ref, p.id);
        if (!r) { refused.push({ id: eid, reason: L("publication supprimée", "post deleted") }); continue; }
        if (done) {
          if (!EDITABLE.includes(r.status) && r.status !== "published") { refused.push({ id: eid, reason: L(`publication dans l'état « ${r.status} » : à vérifier dans Publications`, `post in state "${r.status}": check it in Posts`) }); continue; }
          if (r.status !== "published") {
            e.prev = { status: r.status, scheduledAt: e.prev?.scheduledAt ?? null };
            run("UPDATE posts SET status='published', published_at=?, error=NULL, updated_at=? WHERE id=?", now(), now(), e.ref);
          }
        } else if (r.status === "published" && !r.remote_id) {
          run("UPDATE posts SET status=?, published_at=NULL, scheduled_at=?, updated_at=? WHERE id=?", e.prev?.status && EDITABLE.includes(e.prev.status) ? e.prev.status : "review", e.at, now(), e.ref);
        }
      }
      e.status = done ? "publie" : "a_publier";
      e.doneAt = done ? now() : null;
      changed.push(eid);
    }
    cal.updatedAt = now();
    writeCalendar(p.id, cal);
    return { changed, refused, calendar: readCalendar(p.id)! };
  });
}

/**
 * Change la date (et l'heure) d'une case ; par défaut toute la publication bouge (ses déclinaisons sur les autres
 * réseaux aussi). Refusé : case déjà publiée, date passée ou hors du forfait (contrôle natif `moveRefusal`), et une
 * deuxième publication le même jour sur le même réseau, sauf si le client le veut (`allowSameDay`).
 */
export function moveEntry(p: Project, entryId: string, ymd: string, o: { time?: string; wholeUnit?: boolean; allowSameDay?: boolean } = {}, at = now()): { moved: string[]; calendar: Calendar } {
  return tx(() => {
    const cal = mustCalendar(p);
    const e = cal.entries.find((x) => x.id === entryId);
    if (!e) throw new HttpError(404, L("Case introuvable dans le calendrier.", "Calendar entry not found."));
    if (e.status === "publie") throw new HttpError(409, L("Déjà publiée : elle ne se déplace plus.", "Already posted: it can no longer be moved."));
    if (!validYmd(ymd)) throw new HttpError(400, L("Date invalide (AAAA-MM-JJ).", "Invalid date (YYYY-MM-DD)."));
    const time = o.time ?? e.time;
    if (!HHMM.test(time)) throw new HttpError(400, L("Heure invalide : écris-la comme 11:30.", "Invalid time: write it like 11:30."));
    const tz = cal.settings.timezone;
    const when = atZoned(ymd, time, tz);
    if (when <= at) throw new HttpError(400, L("Cette date est passée : choisis une date à venir.", "This date is in the past: pick an upcoming date."));
    const plan = planOfProject(p.id);
    if (plan && ymd > ymdPlus(todayOf(tz, at), PLANS[plan].calendarDays)) throw new HttpError(402, L(`Ton forfait prévoit jusqu'à ${PLANS[plan].calendarDays} jours à l'avance.`, `Your plan plans up to ${PLANS[plan].calendarDays} days ahead.`), "plan_calendar_days");
    const group = (o.wholeUnit ?? true) ? cal.entries.filter((x) => x.unit === e.unit && x.status === "a_publier") : [e];
    for (const g of group) {
      const clash = cal.entries.find((x) => x.unit !== g.unit && x.ymd === ymd && x.network === g.network);
      if (clash && !o.allowSameDay) throw new HttpError(409, L(`Il y a déjà une publication ${networkLabel(g.network)} ce jour-là (${clash.time}). Choisis un autre jour, ou confirme que tu en veux deux le même jour.`, `There is already a ${networkLabel(g.network)} post that day (${clash.time}). Pick another day, or confirm you want two the same day.`), "same_day_network");
      if (g.kind === "publication") {
        const why = moveRefusal(p.id, g.ref, when);
        if (why) throw new HttpError(409, why);
      }
    }
    for (const g of group) {
      Object.assign(g, { ymd, time, at: when, movedByClient: true });
      if (g.kind === "publication") run(`UPDATE posts SET scheduled_at=?, updated_at=? WHERE id=? AND project_id=? AND status IN (${EDITABLE.map(() => "?").join(",")})`, when, now(), g.ref, p.id, ...EDITABLE);
    }
    cal.entries.sort((a, b) => a.at - b.at || a.network.localeCompare(b.network));
    cal.updatedAt = now();
    writeCalendar(p.id, cal);
    return { moved: group.map((g) => g.id), calendar: readCalendar(p.id)! };
  });
}

/* ---------- Vue « à faire » du client ---------- */

export const networkLabel = (n: string) => ((PLATFORMS as readonly string[]).includes(n) ? platformSpec(n).label : n === "publicite" ? L("Publicité", "Ad") : n.charAt(0).toUpperCase() + n.slice(1));

/** Retire les emojis d'un texte (choix du client), sans toucher aux lettres accentuées ni à la ponctuation. */
export function stripEmojis(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu, (m) => (/^[\u00A9\u00AE\u2122]$/u.test(m) ? m : ""))
    .replace(/[\uFE0F\u200D\u{1F1E6}-\u{1F1FF}]/gu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export const hashtagList = (s: string) => [...new Set(s.split(/[\s,;]+/).map((x) => x.replace(/^#+/, "").trim()).filter(Boolean))].map((x) => `#${x}`);

export type ItemFile = { assetId: string; fileName: string; kind: string; href: string; thumb: string };
export type ItemView = {
  entryId: string; kind: EntryKind; ymd: string; time: string; network: string; networkLabel: string; format: string;
  action: string; title: string; copyText: string; hashtags: string[]; files: ItemFile[];
  status: "a_publier" | "publie" | "en_retard" | "introuvable"; statusLabel: string; mode: EntryMode;
};
export type DayView = { ymd: string; label: string; today: boolean; items: ItemView[] };
export type CalendarView = {
  settings: CalendarSettings; days: DayView[]; warnings: string[]; missing: number; leftover: number;
  totals: { items: number; done: number; late: number; todo: number }; autoPublish: boolean; icsHref: string; printHref: string;
};

const STATUS_LABEL = () => ({ a_publier: L("À publier", "To post"), publie: L("Publié", "Posted"), en_retard: L("À publier (en retard)", "To post (late)"), introuvable: L("Introuvable", "Not found") });

const extOf = (a: { name: string; mime: string }) => {
  const fromName = (a.name.split(".").pop() ?? "").toLowerCase();
  if (/^[a-z0-9]{2,4}$/.test(fromName) && a.name.includes(".")) return fromName;
  return ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "video/mp4": "mp4", "image/gif": "gif" } as Record<string, string>)[a.mime] ?? "bin";
};

/** Nom de fichier lisible : date, réseau, heure (« 2026-11-10_instagram_11h30.jpg »). */
export const fileNameFor = (e: Pick<CalendarEntry, "ymd" | "network" | "time">, a: { name: string; mime: string }, i: number, n: number) =>
  `${e.ymd}_${e.network}_${e.time.replace(":", "h")}${n > 1 ? `_${i + 1}` : ""}.${extOf(a)}`;

function filesOf(e: CalendarEntry, assetIds: string[], projectId: string): ItemFile[] {
  const list = assetIds.map((aid) => getAsset(aid)).filter((a): a is NonNullable<typeof a> => !!a && a.project_id === projectId && !a.deleted_at);
  return list.map((a, i) => ({ assetId: a.id, fileName: fileNameFor(e, a, i, list.length), kind: a.kind, href: assetUrl(a, { download: true }), thumb: assetUrl(a, { thumb: true }) }));
}

function itemOf(p: Project, cal: Calendar, e: CalendarEntry, at: number): ItemView {
  const base = { entryId: e.id, kind: e.kind, ymd: e.ymd, time: e.time, network: e.network, networkLabel: networkLabel(e.network), format: e.format, mode: e.mode };
  const status = (found: boolean) => (!found ? "introuvable" : e.status === "publie" ? "publie" : e.at < at ? "en_retard" : "a_publier") as ItemView["status"];
  const text = (s: string) => (cal.settings.emojis ? s.trim() : stripEmojis(s));
  if (e.kind === "publication") {
    const r = one<{ title: string; caption: string; hashtags: string; media: string; format: string }>("SELECT title, caption, hashtags, media, format FROM posts WHERE id=? AND project_id=?", e.ref, p.id);
    const st = status(!!r);
    const caption = text(r?.caption ?? "");
    const tags = hashtagList(r?.hashtags ?? "");
    const missingTags = tags.filter((t) => !caption.toLowerCase().includes(t.toLowerCase()));
    return { ...base, format: r?.format ?? e.format, action: L(`Publier sur ${base.networkLabel}`, `Post on ${base.networkLabel}`), title: text(r?.title ?? ""), copyText: missingTags.length ? `${caption}\n\n${missingTags.join(" ")}` : caption, hashtags: tags, files: r ? filesOf(e, json<string[]>(r.media, []), p.id) : [], status: st, statusLabel: STATUS_LABEL()[st] };
  }
  const docs = (e.docs ?? []).map((k) => latestDoc(p.id, k)).filter((d): d is NonNullable<typeof d> => !!d);
  const st = status(docs.length > 0);
  const layers = docs[0]?.doc.layers.filter((x: any) => x.kind === "text" && x.visible !== false && ["title", "subtitle", "body", "cta"].includes(x.role)) ?? [];
  const title = String((layers.find((x: any) => x.role === "title") as any)?.text ?? "");
  return { ...base, action: L("Lancer la publicité dans ton gestionnaire de publicités", "Launch the ad in your ads manager"), title: text(title), copyText: text(layers.map((x: any) => String(x.text ?? "")).filter(Boolean).join("\n")), hashtags: [], files: filesOf(e, docs.map((d) => d.version.renderedAssetId!).filter(Boolean), p.id), status: st, statusLabel: STATUS_LABEL()[st] };
}

const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat(L("fr-FR", "en-GB"), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** Vue jour par jour : chaque jour de la période (même vide), et ce qu'il y a à faire. */
export function calendarView(p: Project, cal: Calendar, o: { from?: string; to?: string } = {}, at = now()): CalendarView {
  const today = todayOf(cal.settings.timezone, at);
  const range = publishingDates({ startDate: cal.settings.startDate, days: cal.settings.days });
  const ymds = [...new Set([...range, ...cal.entries.map((e) => e.ymd)])].sort().filter((y) => (!o.from || y >= o.from) && (!o.to || y <= o.to));
  const items = cal.entries.map((e) => itemOf(p, cal, e, at));
  const days = ymds.map((ymd) => ({ ymd, label: dayLabel(ymd), today: ymd === today, items: items.filter((i) => i.ymd === ymd).sort((a, b) => a.time.localeCompare(b.time) || a.network.localeCompare(b.network)) }));
  return {
    settings: cal.settings, days, warnings: cal.warnings, missing: cal.missing, leftover: cal.leftover,
    totals: { items: items.length, done: items.filter((i) => i.status === "publie").length, late: items.filter((i) => i.status === "en_retard").length, todo: items.filter((i) => i.status === "a_publier").length },
    autoPublish: AUTO_PUBLISH_AVAILABLE,
    icsHref: `/api/projects/${p.id}/calendrier?format=ics`,
    printHref: `/api/projects/${p.id}/calendrier?format=txt`,
  };
}

/* ---------- Fichier d'agenda (.ics) et liste imprimable ---------- */

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Pliage des lignes à 75 octets (RFC 5545), sans couper un caractère UTF-8. */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/**
 * Fichier d'agenda : un rendez-vous de 15 minutes par case, avec rappel à l'heure prévue (rien n'est envoyé : c'est
 * l'agenda du client qui rappelle). Les cases déjà publiées restent visibles, sans rappel.
 */
export function calendarIcs(p: Project, view: CalendarView, at = now()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//E-COM STUDIO IA//Calendrier de publication//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsEscape(L(`Publications — ${p.name}`, `Posts — ${p.name}`))}`];
  for (const d of view.days) for (const i of d.items) {
    if (i.status === "introuvable") continue;
    const start = atZoned(i.ymd, i.time, view.settings.timezone);
    const done = i.status === "publie";
    const summary = `${done ? L("✓ Publié — ", "✓ Posted — ") : ""}${i.action}${i.title ? ` : ${i.title}` : ""}`;
    const files = i.files.map((f) => f.fileName).join(", ");
    const desc = [files ? L(`Fichier(s) : ${files}`, `File(s): ${files}`) : "", i.copyText ? L(`Texte à copier :\n${i.copyText}`, `Text to copy:\n${i.copyText}`) : ""].filter(Boolean).join("\n\n");
    lines.push("BEGIN:VEVENT", `UID:${i.entryId.replace(/[^a-zA-Z0-9:_-]/g, "")}-${p.id}@ecom-studio-ia`, `DTSTAMP:${icsDate(at)}`, `DTSTART:${icsDate(start)}`, "DURATION:PT15M", `SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(desc)}`, `STATUS:${done ? "CONFIRMED" : "TENTATIVE"}`);
    if (!done) lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEscape(summary)}`, "TRIGGER:PT0M", "END:VALARM");
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Liste imprimable (texte simple) : jour, heure, réseau, fichier, texte à copier, case à cocher. */
export function calendarText(p: Project, view: CalendarView): string {
  const out = [L(`Calendrier de publication — ${p.name}`, `Posting calendar — ${p.name}`), L(`${view.settings.days} jours à partir du ${view.settings.startDate}. Tu publies toi-même ; coche chaque case une fois publiée.`, `${view.settings.days} days from ${view.settings.startDate}. You post yourself; tick each box once posted.`), ""];
  for (const d of view.days) {
    out.push(`== ${d.label} (${d.ymd}) ==`);
    if (!d.items.length) out.push(L("  Rien à publier.", "  Nothing to post."));
    for (const i of d.items) {
      out.push(`  [${i.status === "publie" ? "x" : " "}] ${i.time} · ${i.action}${i.title ? ` — ${i.title}` : ""}`);
      for (const f of i.files) out.push(L(`      Fichier : ${f.fileName}`, `      File: ${f.fileName}`));
      if (i.copyText) out.push(...i.copyText.split("\n").map((l) => `      ${l}`));
    }
    out.push("");
  }
  return out.join("\n");
}

/* ---------- Rappels dans le Studio ---------- */

/**
 * Rappel du jour (notification du Studio, une fois par jour et par projet) : ce qu'il y a à publier aujourd'hui.
 * Aucun e-mail. À brancher sur le cycle du worker quand le propriétaire le décidera (non branché aujourd'hui).
 */
export function remindDue(at = now()): number {
  let sent = 0;
  for (const r of all<{ project_id: string; plan_json: string; user_id: string }>("SELECT c.project_id, c.plan_json, p.user_id FROM syna_calendars c JOIN projects p ON p.id = c.project_id")) {
    const cal = json<Calendar | null>(r.plan_json, null);
    if (!cal) continue;
    const today = todayOf(cal.settings.timezone, at);
    if (cal.reminded.includes(today)) continue;
    const due = cal.entries.filter((e) => e.ymd === today && e.status === "a_publier");
    if (!due.length) continue;
    const body = due.map((e) => `${e.time} · ${networkLabel(e.network)}${e.kind === "publicite" ? L(" (publicité à lancer)", " (ad to launch)") : ""}`).join("\n");
    notify(r.user_id, r.project_id, L(`Aujourd'hui : ${due.length} publication(s) à faire`, `Today: ${due.length} post(s) to do`), body, "info");
    cal.reminded = [...cal.reminded, today].slice(-60);
    run("UPDATE syna_calendars SET plan_json=? WHERE project_id=?", JSON.stringify(cal), r.project_id);
    sent++;
  }
  return sent;
}
