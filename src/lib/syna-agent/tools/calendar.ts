/**
 * SINA (#492) — étape 11 : outils du calendrier de publication MANUEL (gratuits, sans IA, aucune publication réelle).
 * Le client publie lui-même ; SINA prépare le calendrier, le lit, coche ce qu'il a publié et déplace une date.
 * Moteur : src/lib/syna-agent/calendar.ts. Outils exportés ici, enregistrés dans le registre par ailleurs.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import { PLATFORMS } from "../../social-v2/platforms";
import type { AgentTool, Change } from "../types";
import { project, short } from "./common";
import { CALENDAR_DAYS, calendarView, markDone, moveEntry, planCalendar, readCalendar, type Calendar, type CalendarRequest } from "../calendar";

const YMD = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const PlanArgs = z.object({
  startDate: YMD.optional(),
  // Valeurs par défaut quand le client ne précise pas : 7 jours, 1 publication par jour.
  days: z.union([z.literal(7), z.literal(15), z.literal(30)]).default(7),
  perDay: z.number().int().min(1).max(5).default(1),
  times: z.array(HHMM).max(5).optional(),
  networks: z.array(z.enum(PLATFORMS)).max(PLATFORMS.length).optional(),
  emojis: z.boolean().optional(),
  includeAds: z.boolean().optional(),
}).strict();

const openEntries = (c: Calendar | null) => (c?.entries ?? []).filter((e) => e.status === "a_publier").length;
const doneEntries = (c: Calendar | null) => (c?.entries ?? []).filter((e) => e.status === "publie").length;

const planTool: AgentTool<CalendarRequest> = {
  name: "calendar.plan", module: "calendrier", kind: "write", needsProject: true,
  description: `Prépare (ou refait) le calendrier de publication MANUEL, gratuitement, à partir des publications et publicités déjà créées : le client publie lui-même, jour par jour. Arguments : days (${CALENDAR_DAYS.join(", ")} ; 7 par défaut), perDay (publications par jour ; 1 par défaut), startDate (AAAA-MM-JJ, demain par défaut), times (heures HH:MM vues avec le client, sinon heures conseillées du Studio), networks (réseaux du client), emojis (false = textes sans emojis), includeAds (publicités à lancer ; non par défaut : décision du propriétaire du 7 novembre, seulement si le client le demande). Les cases déjà cochées « publié » sont gardées. Rien n'est inventé : s'il manque des publications, le nombre manquant est annoncé. Aucune publication automatique.`,
  args: PlanArgs,
  sensitive: (_a, ctx) => !!ctx.projectId && openEntries(readCalendar(ctx.projectId)) > 0,
  preview: (ctx) => { const c = ctx.projectId ? readCalendar(ctx.projectId) : null; return L(`Refaire le calendrier : ${openEntries(c)} case(s) non publiée(s) seront replacées ; ${doneEntries(c)} case(s) déjà publiée(s) restent telles quelles.`, `Rebuild the calendar: ${openEntries(c)} unposted entr(ies) will be re-placed; ${doneEntries(c)} posted entr(ies) stay as they are.`); },
  run: (ctx, a) => {
    const p = project(ctx), before = readCalendar(p.id);
    const saved = planCalendar(p, a);
    const read = readCalendar(p.id);
    const ok = !!read && read.updatedAt === saved.updatedAt;
    const open = read?.entries.filter((e) => e.kind === "publication" && e.status === "a_publier") ?? [];
    const pubs = new Set(open.map((e) => e.unit)).size, sends = open.length;
    const ads = read?.entries.filter((e) => e.kind === "publicite" && e.status === "a_publier").length ?? 0;
    const v = read ? calendarView(p, read) : null;
    const summary = L(
      `Calendrier de ${saved.settings.days} jours à partir du ${saved.settings.startDate} : ${pubs} publication(s) à faire${sends !== pubs ? `, soit ${sends} envois sur ${saved.settings.networks.length} réseau(x)` : ""}${ads ? `, ${ads} publicité(s) à lancer` : ""}${saved.missing ? ` ; il manque ${saved.missing} publication(s) pour remplir tous les créneaux` : ""}. Tu publies toi-même (pas de publication automatique pour l'instant).`,
      `${saved.settings.days}-day calendar from ${saved.settings.startDate}: ${pubs} post(s) to do${sends !== pubs ? `, i.e. ${sends} sends on ${saved.settings.networks.length} network(s)` : ""}${ads ? `, ${ads} ad(s) to launch` : ""}${saved.missing ? `; ${saved.missing} post(s) missing to fill every slot` : ""}. You post yourself (no automatic posting for now).`,
    );
    const changes: Change[] = [{ module: "calendrier", object: L("calendrier de publication", "posting calendar"), summary: before ? L("calendrier refait", "calendar rebuilt") : L("calendrier créé", "calendar created"), before: before ? { entries: before.entries.length, settings: before.settings } : null, after: read ? { entries: read.entries.length, settings: read.settings } : null, verified: ok }];
    return { ok, summary, data: { settings: saved.settings, warnings: saved.warnings, missing: saved.missing, leftover: saved.leftover, totals: v?.totals, icsHref: v?.icsHref, printHref: v?.printHref }, changes };
  },
};

const readTool: AgentTool<{ from?: string; to?: string; today?: boolean }> = {
  name: "calendar.read", module: "calendrier", kind: "read", needsProject: true,
  description: "Lit le calendrier de publication jour par jour : pour chaque case, son identifiant (entryId), l'heure, le réseau, l'action (publier ou lancer une publicité), le fichier à envoyer (nommé par date et réseau), le texte à copier, les hashtags et l'état (à publier, en retard, publié). today = seulement aujourd'hui ; from / to = période (AAAA-MM-JJ). Donne aussi le lien du fichier d'agenda (.ics) et de la liste imprimable.",
  args: z.object({ from: YMD.optional(), to: YMD.optional(), today: z.boolean().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), cal = readCalendar(p.id);
    if (!cal) return { ok: true, summary: L("Aucun calendrier pour l'instant.", "No calendar yet."), data: null };
    let v = calendarView(p, cal, { from: a.from, to: a.to });
    if (a.today) v = { ...v, days: v.days.filter((d) => d.today) };
    const todo = v.days.flatMap((d) => d.items).filter((i) => i.status === "a_publier" || i.status === "en_retard").length;
    return {
      ok: true,
      summary: a.today ? L(`Aujourd'hui : ${todo} chose(s) à publier.`, `Today: ${todo} thing(s) to post.`) : L(`${v.totals.done} publiée(s), ${v.totals.todo} à publier, ${v.totals.late} en retard.`, `${v.totals.done} posted, ${v.totals.todo} to post, ${v.totals.late} late.`),
      data: { ...v, days: v.days.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i, copyText: short(i.copyText, 600) })) })) },
    };
  },
};

const doneTool: AgentTool<{ entryIds: string[]; done: boolean }> = {
  name: "calendar.mark_done", module: "calendrier", kind: "write", needsProject: true,
  description: "Le client dit qu'il a publié (done true) ou pas encore (done false) : coche ou décoche les cases (entryId lus avec calendar.read). Une publication cochée passe « publiée » dans l'onglet Publications et ne sera jamais renvoyée par le Studio. Le client peut aussi cocher lui-même dans la carte du calendrier, sans passer par toi.",
  args: z.object({ entryIds: z.array(z.string().min(1).max(120)).min(1).max(50), done: z.boolean().default(true) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), r = markDone(p, a.entryIds, a.done), read = readCalendar(p.id);
    const want = a.done ? "publie" : "a_publier";
    const changes: Change[] = r.changed.map((eid) => ({ module: "calendrier", object: eid, summary: a.done ? L("cochée « publié »", "ticked as posted") : L("décochée", "unticked"), after: want, verified: read?.entries.find((e) => e.id === eid)?.status === want }));
    return { ok: !r.refused.length, summary: L(`${r.changed.length} case(s) mise(s) à jour${r.refused.length ? ` ; refusé : ${r.refused.map((x) => `${x.id} (${x.reason})`).join(", ")}` : ""}.`, `${r.changed.length} entr(ies) updated${r.refused.length ? `; refused: ${r.refused.map((x) => `${x.id} (${x.reason})`).join(", ")}` : ""}.`), data: { changed: r.changed, refused: r.refused }, changes };
  },
};

const moveTool: AgentTool<{ entryId: string; date: string; time?: string; wholeGroup: boolean; allowSameDay: boolean }> = {
  name: "calendar.move", module: "calendrier", kind: "write", needsProject: true,
  description: "Change la date (AAAA-MM-JJ) et, si besoin, l'heure (HH:MM) d'une case du calendrier. wholeGroup (vrai par défaut) déplace aussi la même publication sur ses autres réseaux. Refusé si la case est déjà publiée, si la date est passée ou hors du forfait, ou s'il y a déjà une publication sur le même réseau ce jour-là (allowSameDay true seulement si le client le veut vraiment).",
  args: z.object({ entryId: z.string().min(1).max(120), date: YMD, time: HHMM.optional(), wholeGroup: z.boolean().default(true), allowSameDay: z.boolean().default(false) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), before = readCalendar(p.id)?.entries.find((e) => e.id === a.entryId);
    const r = moveEntry(p, a.entryId, a.date, { time: a.time, wholeUnit: a.wholeGroup, allowSameDay: a.allowSameDay });
    const read = readCalendar(p.id);
    const changes: Change[] = r.moved.map((eid) => { const e = read?.entries.find((x) => x.id === eid); return { module: "calendrier", object: eid, summary: `${before?.ymd ?? "?"} ${before?.time ?? ""} → ${e?.ymd} ${e?.time}`, before: before ? { ymd: before.ymd, time: before.time } : null, after: e ? { ymd: e.ymd, time: e.time } : null, verified: e?.ymd === a.date }; });
    return { ok: changes.every((c) => c.verified), summary: L(`Déplacé au ${a.date}${a.time ? ` à ${a.time}` : ""} (${r.moved.length} case(s)).`, `Moved to ${a.date}${a.time ? ` at ${a.time}` : ""} (${r.moved.length} entr(ies)).`), data: { moved: r.moved }, changes };
  },
};

/** Outils de l'étape 11, à ajouter au registre (`TOOL_LIST`). */
export const calendarTools: AgentTool[] = [planTool, readTool, doneTool, moveTool];
