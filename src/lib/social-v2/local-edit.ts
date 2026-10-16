/**
 * Retouches du calendrier en conversation (« Modifier le calendrier en une phrase »), en français et en anglais.
 * Le moteur identifie PRÉCISÉMENT les publications visées (tout, une période « à partir du 19 octobre », « du 19 au
 * 25 octobre », demain, un jour de la semaine, les N prochaines, les vidéos, un réseau…) puis :
 *  - opérations locales et gratuites : supprimer (toujours après confirmation), déplacer les vidéos un jour donné,
 *    changer le nombre de publications par jour (en moins : après confirmation), remplacer les images par d'autres
 *    photos de la banque du projet, pause, reprise ;
 *  - opérations IA (réécriture d'un texte, « plus premium ») : limitées aux publications visées, coût montré en % du
 *    budget IA, lancées seulement après l'accord du client.
 * Une demande non comprise reçoit un message clair avec des exemples (jamais de silence). Jamais une publication déjà
 * envoyée ou en cours d'envoi n'est touchée.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { all } from "../db";
import { L } from "../i18n-server";
import { PLATFORMS } from "./platforms";
import { fold, parsePeriod, type EditPeriod } from "./edit-dates";

export type SocialEditPlan =
  | { kind: "local"; action: "cancel" | "move_weekday" | "reduce_per_day" | "replace_media" | "pause" | "resume"; ids: string[]; weekday?: number; perDay?: number; summary: string; /** Suppression : confirmation du client exigée avant d'agir. */ confirm?: string }
  | { kind: "ai"; action: "rewrite"; ids: string[]; instruction: string; textOnly: boolean; summary: string }
  | { kind: "unclear"; ids: string[]; summary: string };

type Row = { id: string; network: string; format: string; scheduled_at: number; timezone: string; status: string; plan_id: string | null };

const DAY_WORDS = "dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|sunday|monday|tuesday|wednesday|thursday|friday|saturday";
const DAYS: [RegExp, number][] = [[/dimanche|sunday/, 0], [/lundi|monday/, 1], [/mardi|tuesday/, 2], [/mercredi|wednesday/, 3], [/jeudi|thursday/, 4], [/vendredi|friday/, 5], [/samedi|saturday/, 6]];
const DAY_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NUM: Record<string, number> = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10 };
const num = (s: string | undefined) => (s == null ? NaN : /^\d+$/.test(s) ? Number(s) : NUM[s] ?? NaN);
const NUM_RE = "\\d+|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|one|two|three|four|five|seven|eight|nine|ten";
/** Statuts qu'une retouche peut toucher : jamais « en publication », « publiée » ni « à vérifier ». */
const EDITABLE = new Set(["planned", "draft", "review", "approved", "scheduled", "paused", "failed"]);
const VIDEO = new Set(["video", "reel", "short"]);
const ymdIn = (t: number, tz: string) => formatInTimeZone(t, tz, "yyyy-MM-dd");
const dowIn = (t: number, tz: string) => Number(formatInTimeZone(t, tz, "i")) % 7;

const DELETE_RE = /\b(supprim\w*|effac\w*|retir\w*|enlev\w*|annul\w*|vid(e|er|ez)|delete|remove|cancel|clear|erase|wipe|drop)\b/;
const MOVE_RE = /\b(mets?|mettre|mettez|place[rz]?|deplace[rz]?|decale[rz]?|bouge[rz]?|passe[rz]? les videos|move|put|shift|reschedule)\b/;
const REPLACE_RE = /\b(remplace[rz]?|change[rz]?|renouvelle[rz]?|autres?|nouvelles?|replace|swap|new|other)\b.*\b(images?|photos?|visuels?|medias?|pictures?|visuals?)\b|\b(images?|photos?|visuels?|pictures?|visuals?)\b.*\b(remplace[rz]?|replace|swap)\b/;
const PER_DAY_RE = new RegExp(`(${NUM_RE})\\s+(publications?|posts?)\\s+(par|per|a|by|chaque|each|every)\\s+(jour|day)`);

/** Exemples de phrases comprises, montrés quand une demande ne l'est pas. */
export const EDIT_EXAMPLES = () =>
  L(
    "« Efface tout à partir du 19 octobre », « Supprime les publications du 19 au 25 octobre », « Supprime les publications du dimanche », « Mets les vidéos le vendredi », « Deux publications par jour au lieu de trois », « Remplace les images des 3 prochaines publications »",
    "\"Delete everything from October 19\", \"Delete posts from October 19 to 25\", \"Delete Sunday posts\", \"Put videos on Friday\", \"Two posts a day instead of three\", \"Replace the images of the next 3 posts\"",
  );
const unclear = (ids: string[], why: string): SocialEditPlan => ({ kind: "unclear", ids, summary: L(`${why} Exemples de phrases comprises : ${EDIT_EXAMPLES()}.`, `${why} Examples of sentences understood: ${EDIT_EXAMPLES()}.`) });

/** Période en clair (« du 19/10 au 15/11 ») à partir des publications visées. */
function span(rows: Row[]): string {
  if (!rows.length) return "";
  const tz = rows[0].timezone || "Europe/Paris";
  const s = [...rows].sort((a, b) => a.scheduled_at - b.scheduled_at);
  const a = formatInTimeZone(s[0].scheduled_at, tz, "dd/MM");
  const b = formatInTimeZone(s[s.length - 1].scheduled_at, tz, "dd/MM");
  return a === b ? L(` le ${a}`, ` on ${a}`) : L(` du ${a} au ${b}`, ` from ${a} to ${b}`);
}

/** Publications visées par la demande (dans le projet, à venir, pas encore envoyées). */
export function resolveTargets(text: string, rows: Row[], at: number, o: { dayFilterLoose?: boolean; period?: EditPeriod | null } = {}): Row[] {
  const t = fold(text);
  let out = rows.filter((r) => EDITABLE.has(r.status) && r.scheduled_at >= at - 60_000);
  const tz = out[0]?.timezone ?? rows[0]?.timezone ?? "Europe/Paris";
  const period = o.period === undefined ? parsePeriod(text, at, tz) : o.period;
  if (period) out = out.filter((r) => (period.from == null || r.scheduled_at >= period.from) && (period.to == null || r.scheduled_at < period.to));
  else if (/demain|tomorrow/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at + 86_400_000, tz));
  else if (/aujourd'?hui|today/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at, tz));
  else if (/cette semaine|this week/.test(t)) out = out.filter((r) => r.scheduled_at < at + 7 * 86_400_000);
  else if (/ce mois|this month/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone).slice(0, 7) === ymdIn(at, tz).slice(0, 7));
  // « les publications du dimanche » : filtre sur le jour. Pour une suppression, « le dimanche » et « les dimanches »
  // désignent aussi les publications visées ; pour un déplacement, « mets les vidéos le vendredi » désigne la destination.
  const lead = ["du", "des", "of", "on", "every", ...(o.dayFilterLoose ? ["le", "les", "tous les", "chaque"] : [])].join("|");
  const dayFilter = t.match(new RegExp(`\\b(${lead})\\s+(${DAY_WORDS})s?\\b`)) ?? (o.dayFilterLoose ? t.match(new RegExp(`\\b()(${DAY_WORDS})s\\b`)) : null);
  if (dayFilter) {
    const dw = DAYS.find(([re]) => re.test(dayFilter[2]))![1];
    out = out.filter((r) => dowIn(r.scheduled_at, r.timezone) === dw);
  }
  if (/videos?|reels?|shorts?/.test(t)) out = out.filter((r) => VIDEO.has(r.format));
  else if (/\b(images?|photos?|visuels?|pictures?)\b/.test(t) && !REPLACE_RE.test(t)) out = out.filter((r) => !VIDEO.has(r.format));
  const net = PLATFORMS.find((p) => t.includes(p));
  if (net) out = out.filter((r) => r.network === net);
  const next = t.match(new RegExp(`(${NUM_RE})\\s+(prochaines|prochains|next)`)) ?? t.match(new RegExp(`\\bnext\\s+(${NUM_RE})\\b`));
  const k = num(next?.[1]);
  if (Number.isFinite(k)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, k);
  else if (/(la|this|the) (publication|post) de demain|la prochaine|the next post/.test(t)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, 1);
  return out;
}

export function planSocialEdit(text: string, projectId: string, at = Date.now(), planId?: string | null): SocialEditPlan {
  const rows = all<Row>(`SELECT id, network, format, scheduled_at, timezone, status, plan_id FROM posts WHERE project_id = ? AND engine = 'v2' AND scheduled_at IS NOT NULL${planId ? " AND plan_id = ?" : ""} ORDER BY scheduled_at`, ...(planId ? [projectId, planId] : [projectId]));
  const t = fold(text);
  const isDelete = DELETE_RE.test(t);
  const isReplace = REPLACE_RE.test(t);
  if (!isDelete && /\b(mets?|met|mettre) (en )?pause|\bpause\b|suspend/.test(t)) return { kind: "local", action: "pause", ids: [], summary: L("calendrier mis en pause : aucune publication ne partira", "calendar paused: no post will go out") };
  if (!isDelete && /reprend|reprise|\bresume\b|relance le calendrier|unpause/.test(t)) return { kind: "local", action: "resume", ids: [], summary: L("calendrier repris", "calendar resumed") };
  const upcoming = rows.filter((x) => EDITABLE.has(x.status) && x.scheduled_at >= at);

  // Nombre de publications par jour : « deux publications par jour au lieu de trois », « 2 posts a day ».
  const perDay = !isReplace ? t.match(PER_DAY_RE) : null;
  if (perDay && !(isDelete && !/au lieu|instead|plus que|only|seulement|reduis|reduce|passe/.test(t))) {
    const k = num(perDay[1]);
    if (!Number.isFinite(k) || k < 1 || k > 5) return unclear([], L("Le nombre de publications par jour va de 1 à 5.", "Posts per day range from 1 to 5."));
    const scope = resolveTargets(text.replace(PER_DAY_RE, " "), upcoming, at, { period: undefined });
    const byDay = new Map<string, Row[]>();
    for (const r of scope) {
      const d = ymdIn(r.scheduled_at, r.timezone);
      byDay.set(d, [...(byDay.get(d) ?? []), r]);
    }
    const max = Math.max(0, ...[...byDay.values()].map((l) => l.length));
    if (!max) return unclear([], L("Aucune publication à venir dans le calendrier.", "No upcoming post in the calendar."));
    if (k >= max) {
      // Ajouter des publications demande des textes nouveaux : c'est le rôle de « Planifier plusieurs publications ».
      return unclear([], k === max ? L(`Le calendrier a déjà ${k} publication(s) par jour au plus : rien à changer.`, `The calendar already has at most ${k} post(s) a day: nothing to change.`) : L(`Pour passer à ${k} publications par jour, ajoutez-les avec « Planifier plusieurs publications » (même période) : cette phrase ne sait que réduire le nombre par jour.`, `To go up to ${k} posts a day, add them with "Plan several posts" (same period): this sentence can only reduce the number per day.`));
    }
    const dropRows = [...byDay.values()].flatMap((list) => list.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(k));
    const drop = dropRows.map((r) => r.id);
    return { kind: "local", action: "reduce_per_day", ids: drop, perDay: k, summary: L(`${drop.length} publication(s) retirée(s) pour passer à ${k} par jour`, `${drop.length} post(s) removed to go down to ${k} a day`), confirm: L(`${drop.length} publication(s)${span(dropRows)} seront supprimées pour passer à ${k} par jour. Confirmer ?`, `${drop.length} post(s)${span(dropRows)} will be deleted to go down to ${k} a day. Confirm?`) };
  }

  if (isDelete) {
    const targets = resolveTargets(text, rows, at, { dayFilterLoose: true });
    const ids = targets.map((r) => r.id);
    if (!ids.length) return unclear([], L("Aucune publication à venir (et pas encore envoyée) ne correspond à cette demande.", "No upcoming post (not yet sent) matches this request."));
    return { kind: "local", action: "cancel", ids, summary: L(`${ids.length} publication(s) supprimée(s)`, `${ids.length} post(s) deleted`), confirm: L(`${ids.length} publication(s)${span(targets)} seront supprimées. Les publications déjà publiées ou en cours de publication ne sont pas touchées. Confirmer ?`, `${ids.length} post(s)${span(targets)} will be deleted. Posts already published or being published are not touched. Confirm?`) };
  }

  const targets = resolveTargets(text, rows, at);
  const ids = targets.map((r) => r.id);
  // Déplacer les vidéos un jour de la semaine : « mets les vidéos le vendredi », « move videos to Friday ».
  const toDay = [...DAYS].map(([re, d]) => ({ d, i: t.search(re) })).filter((x) => x.i >= 0).sort((a, b) => b.i - a.i)[0];
  if (MOVE_RE.test(t) && toDay && /videos?|reels?|shorts?/.test(t)) {
    if (!ids.length) return unclear([], L("Aucune vidéo à venir à déplacer.", "No upcoming video to move."));
    return { kind: "local", action: "move_weekday", ids, weekday: toDay.d, summary: L(`${ids.length} vidéo(s) déplacée(s) au ${DAY_FR[toDay.d]} de leur semaine`, `${ids.length} video(s) moved to ${DAY_EN[toDay.d]} of their week`) };
  }
  if (isReplace) {
    const imgs = targets.filter((r) => !VIDEO.has(r.format) && r.format !== "text");
    if (!imgs.length) return unclear([], L("Aucune publication en image à venir ne correspond.", "No upcoming image post matches."));
    return { kind: "local", action: "replace_media", ids: imgs.map((r) => r.id), summary: L(`nouvelles images pour ${imgs.length} publication(s)`, `new images for ${imgs.length} post(s)`) };
  }
  if (/premium|\bton\b|tone|reecri|rewrite|texte|\btext\b|plus (court|vendeur|chaleureux|simple|pro)|more (premium|friendly|professional)|shorter|ameliore|improve/.test(t)) {
    const scope = ids.length ? ids : upcoming.slice(0, 30).map((r) => r.id);
    if (!scope.length) return unclear([], L("Aucune publication à venir dans le calendrier.", "No upcoming post in the calendar."));
    return { kind: "ai", action: "rewrite", ids: scope, instruction: text.trim().slice(0, 400), textOnly: true, summary: L(`réécriture par l'IA de ${scope.length} publication(s)`, `AI rewrite of ${scope.length} post(s)`) };
  }
  return unclear(ids, L("Demande non comprise : dites quelles publications (tout, à partir du 19 octobre, du dimanche, les 3 prochaines…) et quoi faire (supprimer, déplacer, remplacer les images…).", "Request not understood: say which posts (all, from October 19, on Sunday, the next 3…) and what to do (delete, move, replace the images…)."));
}

/** Même heure, autre jour de la semaine (dans la même semaine du calendrier, fuseau du client). */
export function moveToWeekday(at: number, tz: string, weekday: number): number {
  const ymd = ymdIn(at, tz);
  const hm = formatInTimeZone(at, tz, "HH:mm");
  const [y, m, d] = ymd.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayBased = (x: number) => (x + 6) % 7;
  const target = new Date(Date.UTC(y, m - 1, d + (mondayBased(weekday) - mondayBased(cur))));
  return fromZonedTime(`${target.toISOString().slice(0, 10)}T${hm}:00`, tz).getTime();
}
