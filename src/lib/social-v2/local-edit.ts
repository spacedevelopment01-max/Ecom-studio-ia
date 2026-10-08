/**
 * Retouches du calendrier en conversation. Le moteur identifie PRÉCISÉMENT les publications visées (demain, un jour
 * de la semaine, les N prochaines, les vidéos, un réseau…) puis :
 *  - opérations locales et gratuites : supprimer (annuler), déplacer les vidéos un jour donné, réduire le nombre de
 *    publications par jour, remplacer les images (bibliothèque ou rendu local), pause, reprise ;
 *  - opérations IA (réécriture d'un texte, « plus premium ») : limitées aux publications visées, estimées, soumises
 *    au budget et à une confirmation.
 * Jamais une publication déjà envoyée n'est touchée.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { all } from "../db";
import { fold } from "../seo-v2/lang";
import { PLATFORMS } from "./platforms";

export type SocialEditPlan =
  | { kind: "local"; action: "cancel" | "move_weekday" | "reduce_per_day" | "replace_media" | "pause" | "resume"; ids: string[]; weekday?: number; perDay?: number; summary: string }
  | { kind: "ai"; action: "rewrite"; ids: string[]; instruction: string; textOnly: boolean; summary: string }
  | { kind: "unclear"; ids: string[]; summary: string };

type Row = { id: string; network: string; format: string; scheduled_at: number; timezone: string; status: string; plan_id: string | null };

const DAYS: [RegExp, number][] = [[/dimanche|sunday/, 0], [/lundi|monday/, 1], [/mardi|tuesday/, 2], [/mercredi|wednesday/, 3], [/jeudi|thursday/, 4], [/vendredi|friday/, 5], [/samedi|saturday/, 6]];
const NUM: Record<string, number> = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, dix: 10, one: 1, two: 2, three: 3, four: 4, five: 5 };
const num = (s: string | undefined) => (s == null ? NaN : /^\d+$/.test(s) ? Number(s) : NUM[s] ?? NaN);
const EDITABLE = new Set(["planned", "draft", "review", "approved", "scheduled", "paused", "failed"]);
const ymdIn = (t: number, tz: string) => formatInTimeZone(t, tz, "yyyy-MM-dd");
const dowIn = (t: number, tz: string) => Number(formatInTimeZone(t, tz, "i")) % 7;

/** Publications visées par la demande (dans le projet, à venir, pas encore envoyées). */
export function resolveTargets(text: string, rows: Row[], at: number): Row[] {
  const t = fold(text);
  let out = rows.filter((r) => EDITABLE.has(r.status) && r.scheduled_at >= at - 60_000);
  const tz = out[0]?.timezone ?? "Europe/Paris";
  if (/demain|tomorrow/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at + 86_400_000, tz));
  else if (/aujourd'?hui|today/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at, tz));
  else if (/cette semaine|this week/.test(t)) out = out.filter((r) => r.scheduled_at < at + 7 * 86_400_000);
  // « les publications du dimanche » : filtre sur le jour (« mets les vidéos le vendredi » désigne la destination).
  const dayFilter = t.match(/\b(du|des|of|on)\s+(dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|sunday|monday|tuesday|wednesday|thursday|friday|saturday)s?\b/);
  if (dayFilter) {
    const dw = DAYS.find(([re]) => re.test(dayFilter[2]))![1];
    out = out.filter((r) => dowIn(r.scheduled_at, r.timezone) === dw);
  }
  if (/videos?|reels?|shorts?/.test(t)) out = out.filter((r) => ["video", "reel", "short"].includes(r.format));
  else if (/images?|photos?|visuels?/.test(t) && !/remplace|replace|change/.test(t)) out = out.filter((r) => !["video", "reel", "short"].includes(r.format));
  const net = PLATFORMS.find((p) => t.includes(p));
  if (net) out = out.filter((r) => r.network === net);
  const next = t.match(/(\d+|\w+)\s+(prochaines|next)/);
  const k = num(next?.[1]);
  if (Number.isFinite(k)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, k);
  else if (/(la|this|the) (publication|post) de demain|la prochaine|the next post/.test(t)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, 1);
  return out;
}

export function planSocialEdit(text: string, projectId: string, at = Date.now(), planId?: string | null): SocialEditPlan {
  const rows = all<Row>(`SELECT id, network, format, scheduled_at, timezone, status, plan_id FROM posts WHERE project_id = ? AND engine = 'v2' AND scheduled_at IS NOT NULL${planId ? " AND plan_id = ?" : ""} ORDER BY scheduled_at`, ...(planId ? [projectId, planId] : [projectId]));
  const t = fold(text);
  const targets = resolveTargets(text, rows, at);
  const ids = targets.map((r) => r.id);
  if (/\b(mets?|met) (en )?pause|pause\b|suspend/.test(t)) return { kind: "local", action: "pause", ids: [], summary: "calendrier mis en pause : aucune publication ne partira" };
  if (/reprend|reprise|resume|relance le calendrier/.test(t)) return { kind: "local", action: "resume", ids: [], summary: "calendrier repris" };
  const perDay = t.match(/(\d+|\w+)\s+publications?\s+par\s+jour\s+au lieu de|(\d+|\w+)\s+posts?\s+(a|per)\s+day\s+instead/);
  if (perDay) {
    const k = num(perDay[1] ?? perDay[2]);
    if (Number.isFinite(k) && k >= 1 && k <= 5) {
      const byDay = new Map<string, Row[]>();
      for (const r of rows.filter((x) => EDITABLE.has(x.status) && x.scheduled_at >= at)) {
        const d = ymdIn(r.scheduled_at, r.timezone);
        byDay.set(d, [...(byDay.get(d) ?? []), r]);
      }
      const drop = [...byDay.values()].flatMap((list) => list.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(k)).map((r) => r.id);
      return { kind: "local", action: "reduce_per_day", ids: drop, perDay: k, summary: `${drop.length} publication(s) retirée(s) pour passer à ${k} par jour` };
    }
  }
  if (/^(supprime|supprimer|retire|enleve|annule|delete|remove|cancel)/.test(t)) return ids.length ? { kind: "local", action: "cancel", ids, summary: `${ids.length} publication(s) annulée(s)` } : { kind: "unclear", ids, summary: "aucune publication à venir ne correspond" };
  const toDay = DAYS.find(([re]) => re.test(t));
  if (/^(mets|met|place|deplace|move|put)/.test(t) && toDay && /videos?|reels?/.test(t)) return { kind: "local", action: "move_weekday", ids, weekday: toDay[1], summary: `${ids.length} vidéo(s) déplacée(s) au ${["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][toDay[1]]} de leur semaine` };
  if (/(remplace|change|replace)\s+(les\s+|the\s+)?(images?|photos?|visuels?|medias?)/.test(t)) return ids.length ? { kind: "local", action: "replace_media", ids, summary: `nouvelles images pour ${ids.length} publication(s)` } : { kind: "unclear", ids, summary: "aucune publication à venir ne correspond" };
  if (/premium|ton|tone|reecri|rewrite|texte|text|plus (court|vendeur|chaleureux|simple)|ameliore|improve/.test(t)) {
    const scope = ids.length ? ids : rows.filter((r) => EDITABLE.has(r.status) && r.scheduled_at >= at).slice(0, 30).map((r) => r.id);
    return { kind: "ai", action: "rewrite", ids: scope, instruction: text.trim().slice(0, 400), textOnly: true, summary: `réécriture IA de ${scope.length} publication(s)` };
  }
  return { kind: "unclear", ids, summary: "demande non comprise : précisez les publications (demain, vendredi, les 3 prochaines…) et la modification" };
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
