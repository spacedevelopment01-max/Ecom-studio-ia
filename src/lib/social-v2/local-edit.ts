/**
 * Retouches du calendrier en conversation (« Modifier le calendrier en une phrase »), en français et en anglais,
 * avec ou sans accents, synonymes et fautes courantes. Moteur LOCAL, gratuit, déterministe :
 *  1. il repère les publications visées (filtres combinables : période « à partir du 19 octobre », « du 5 au 7 mars »,
 *     « jusqu'au », « cette semaine », « la semaine prochaine », « le mois prochain », « novembre », « demain » ;
 *     réseau ; format ; statut ; jour de la semaine ; heure ; « les N prochaines ») ;
 *  2. il comprend l'action : supprimer, déplacer (jour de la semaine, date, heure, décalage d'un jour ou d'une semaine),
 *     changer le réseau ou en ajouter un, changer le format (publications encore sans visuel), réduire le nombre par
 *     jour ou par semaine, exclure ou garder certains jours, dupliquer, valider, pause, reprise, annuler la dernière
 *     modification ;
 *     IA (coût montré en % du budget IA du mois, accord du client) : réécrire les textes, remplacer les images par de
 *     nouvelles images CRÉÉES PAR L'IA (images finales 100 % IA : jamais une photo de banque, un gabarit ni une image
 *     retirée sans rien à la place — l'image actuelle reste jusqu'à ce que la nouvelle soit validée) ;
 *  3. il montre un APERÇU avant d'agir (« 12 vidéo(s) passeront au vendredi 18:00. Confirmer ? ») — obligatoire, et
 *     toujours confirmé, pour une suppression. Jamais une publication envoyée ou en cours d'envoi n'est touchée.
 * Une demande non comprise reçoit un message clair avec des exemples (jamais de silence).
 * Seules les publications visibles de la stratégie en cours sont visées : une version préparée (non activée) ou
 * archivée n'est jamais modifiée par une phrase.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { all } from "../db";
import { strategyVisibilitySql } from "../marketing-strategy/visibility";
import { L } from "../i18n-server";
import { PLATFORMS, type Platform } from "./platforms";
import { fold as fold0, parsePeriod, type EditPeriod } from "./edit-dates";

export type EditAction =
  | "cancel" | "move_weekday" | "move_date" | "shift" | "set_time" | "reduce_per_day" | "per_week" | "network" | "add_network" | "format" | "duplicate" | "approve" | "pause" | "resume" | "undo";
export type TargetFormat = "image" | "carousel" | "video" | "text";

export type SocialEditPlan =
  | {
      kind: "local";
      action: EditAction;
      ids: string[];
      summary: string;
      /** Aperçu montré au client avant d'agir (absent : action immédiate, ex. pause). */
      confirm?: string;
      /** Suppression : confirmation obligatoire. */
      destructive?: boolean;
      weekday?: number;
      perDay?: number;
      perWeek?: number;
      time?: string;
      ymd?: string;
      days?: number;
      network?: Platform;
      format?: TargetFormat;
    }
  | { kind: "ai"; action: "rewrite"; ids: string[]; instruction: string; textOnly: boolean; summary: string }
  /** Nouvelles images créées par l'IA : devis en % du budget IA, accord du client, puis tâche de fond. */
  | { kind: "ai"; action: "replace_media"; ids: string[]; summary: string }
  | { kind: "unclear"; ids: string[]; summary: string };

type Row = { id: string; network: string; format: string; scheduled_at: number; timezone: string; status: string; plan_id: string | null; media: string };

/** Au plus 30 images remplacées par phrase (taille d'un lot de production : le devis couvre exactement le lot). */
export const MAX_REPLACE = 30;

/** Minuscules sans accents, fautes courantes ramenées à la forme attendue. */
const fold = (s: string) =>
  fold0(s)
    .replace(/\bsup+r?im/g, "supprim")
    .replace(/\bef+ac/g, "effac")
    .replace(/\bdepla[cs]+/g, "deplac")
    .replace(/\bdecal+/g, "decal")
    .replace(/\bvids?\b/g, "videos")
    .replace(/\bpubli(s|cation|cations)?\b/g, (m) => (m.endsWith("s") ? "publications" : "publication"))
    .replace(/\bweek-?end?s?\b/g, "weekend")
    .replace(/\s+/g, " ")
    .trim();

const DAY_WORDS = "dimanche|lundi|mardi|mercredi|jeudi|vendredi|samedi|sunday|monday|tuesday|wednesday|thursday|friday|saturday";
const DAYS: [RegExp, number][] = [[/dimanche|sunday/, 0], [/lundi|monday/, 1], [/mardi|tuesday/, 2], [/mercredi|wednesday/, 3], [/jeudi|thursday/, 4], [/vendredi|friday/, 5], [/samedi|saturday/, 6]];
const dayOf = (w: string) => DAYS.find(([re]) => re.test(w))![1];
const DAY_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const NUM: Record<string, number> = { une: 1, un: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, quinze: 15, vingt: 20, a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, seven: 7, eight: 8, nine: 9, ten: 10 };
const num = (s: string | undefined) => (s == null ? NaN : /^\d+$/.test(s) ? Number(s) : NUM[s] ?? NaN);
const NUM_RE = "\\d+|une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|quinze|vingt|one|two|three|four|five|seven|eight|nine|ten";
const MONTHS: Record<string, number> = { janvier: 1, january: 1, fevrier: 2, february: 2, mars: 3, march: 3, avril: 4, april: 4, mai: 5, may: 5, juin: 6, june: 6, juillet: 7, july: 7, aout: 8, august: 8, septembre: 9, september: 9, octobre: 10, october: 10, novembre: 11, november: 11, decembre: 12, december: 12 };
const MONTH_RE = Object.keys(MONTHS).join("|");

/** Statuts qu'une retouche peut toucher : jamais « en publication », « publiée » ni « à vérifier ». */
export const EDITABLE = new Set(["planned", "draft", "review", "approved", "scheduled", "paused", "failed"]);
const VIDEO = new Set(["video", "reel", "short"]);
const kindOf = (format: string): TargetFormat => (VIDEO.has(format) ? "video" : format === "carousel" ? "carousel" : format === "text" ? "text" : "image");
const ymdIn = (t: number, tz: string) => formatInTimeZone(t, tz, "yyyy-MM-dd");
const dowIn = (t: number, tz: string) => Number(formatInTimeZone(t, tz, "i")) % 7;

const DELETE_RE = /\b(supprim\w*|effac\w*|retir\w*|enlev\w*|annul\w*|vid(e|er|ez)|delete|remove|cancel|clear|erase|wipe|drop|get rid)\b/;
const MOVE_RE = /\b(mets?|mettre|mettez|place[rz]?|deplac\w*|decal\w*|bouge[rz]?|avance[rz]?|recule[rz]?|report\w*|repousse[rz]?|passe[rz]?|programme[rz]?|move|put|shift|reschedule|postpone|delay|push|bring|set)\b/;
const MEDIA_WORDS = "images?|photos?|visuels?|medias?|pictures?|visuals?";
const REPLACE_RE = new RegExp(`\\b(remplace[rz]?|change[rz]?|renouvelle[rz]?|refai[st]|refaire|autres?|nouvelles?|replace|swap|new|other|redo)\\b.*\\b(${MEDIA_WORDS}|videos?)\\b|\\b(${MEDIA_WORDS}|videos?)\\b.*\\b(remplace[rz]?|replace|swap)\\b`);
const PER_DAY_RE = new RegExp(`(${NUM_RE})\\s+(publications?|posts?)\\s+(par|per|a|by|chaque|each|every)\\s+(jour|day)`);
const PER_WEEK_RE = new RegExp(`(${NUM_RE})\\s+(publications?|posts?)\\s+(par|per|a|by|chaque|each|every)\\s+(semaine|week)`);
const FORMAT_WORDS: [RegExp, TargetFormat][] = [[/\b(textes?|texts?|text only)\b/, "text"], [/\b(carrousels?|carousels?)\b/, "carousel"], [/\b(videos?|reels?|shorts?)\b/, "video"], [/\b(images?|photos?|visuels?|pictures?)\b/, "image"]];
const STATUS_WORDS: [RegExp, string[]][] = [
  [/\b(idees?|ideas?)\b/, ["planned"]],
  [/\b(a completer|to complete|incompletes?)\b/, ["planned", "draft", "review"]],
  [/\b(a valider|en attente|to review|awaiting)\b/, ["review", "planned", "draft"]],
  [/\b(approuvees?|validees?|approved)\b/, ["approved"]],
  [/\b(programmees?|scheduled)\b/, ["scheduled"]],
  [/\b(brouillons?|drafts?)\b/, ["draft"]],
  [/\b(en echec|echouees?|failed)\b/, ["failed"]],
];

/** Heure écrite (« 18h », « 18 h 30 », « 18:30 », « 6pm ») au format HH:mm, et sa position dans le texte. */
export function findTime(t: string): { time: string; at: number; end: number } | null {
  const m = t.match(/\b(\d{1,2})\s*(?:h|heures?)\s*(\d{2})?\b|\b(\d{1,2}):(\d{2})\b|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\bmidi\b|\bnoon\b/);
  if (!m) return null;
  let h: number;
  let mi: number;
  if (/midi|noon/.test(m[0])) [h, mi] = [12, 0];
  else if (m[1] != null) [h, mi] = [Number(m[1]), Number(m[2] ?? 0)];
  else if (m[3] != null) [h, mi] = [Number(m[3]), Number(m[4])];
  else {
    h = Number(m[5]) % 12 + (m[7] === "pm" ? 12 : 0);
    mi = Number(m[6] ?? 0);
  }
  if (h > 23 || mi > 59) return null;
  return { time: `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`, at: m.index!, end: m.index! + m[0].length };
}

/** Exemples de phrases comprises, montrés quand une demande ne l'est pas. */
export const EDIT_EXAMPLES = () =>
  L(
    "« Efface tout à partir du 19 octobre », « Supprime les publications du 19 au 25 octobre », « Vide novembre », « Pas le week-end », « Mets les vidéos le vendredi à 18h », « Décale tout d'une semaine », « Passe les publications Facebook sur Instagram », « Transforme les textes en images », « Deux publications par jour au lieu de trois », « Remplace les images des 3 prochaines publications », « Valide les publications de cette semaine », « Annule ma dernière modification »",
    "\"Delete everything from October 19\", \"Delete posts from October 19 to 25\", \"Clear November\", \"No weekends\", \"Move videos to Friday at 6pm\", \"Push everything back a week\", \"Move Facebook posts to Instagram\", \"Turn text posts into images\", \"Two posts a day instead of three\", \"Replace the images of the next 3 posts\", \"Approve this week's posts\", \"Undo my last change\"",
  );
const unclear = (ids: string[], why: string): SocialEditPlan => ({ kind: "unclear", ids, summary: L(`${why} Exemples de phrases comprises : ${EDIT_EXAMPLES()}.`, `${why} Examples of sentences understood: ${EDIT_EXAMPLES()}.`) });

/** Période en clair (« du 19/10 au 15/11 ») à partir des publications visées. */
function span(rows: Row[]): string {
  if (!rows.length) return "";
  const tz = rows[0].timezone || "Europe/Paris";
  const s = [...rows].sort((a, b) => a.scheduled_at - b.scheduled_at);
  const a = formatInTimeZone(s[0].scheduled_at, tz, "dd/MM");
  const b = formatInTimeZone(s[s.length - 1].scheduled_at, tz, "dd/MM");
  return a === b ? L(` du ${a}`, ` on ${a}`) : L(` du ${a} au ${b}`, ` from ${a} to ${b}`);
}
const noun = (rows: Row[]) => (rows.length && rows.every((r) => VIDEO.has(r.format)) ? L(`${rows.length} vidéo(s)`, `${rows.length} video(s)`) : L(`${rows.length} publication(s)`, `${rows.length} post(s)`));
const FORMAT_LABEL: Record<TargetFormat, [string, string]> = { image: ["image", "image"], carousel: ["carrousel", "carousel"], video: ["vidéo", "video"], text: ["texte seul", "text only"] };

const startOfDay = (ymd: string, tz: string) => fromZonedTime(`${ymd}T00:00:00`, tz).getTime();
const addDaysYmd = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

/** Période relative (« cette semaine », « la semaine prochaine », « ce mois-ci », « le mois prochain », « novembre »). */
function relativePeriod(t: string, at: number, tz: string): EditPeriod | null {
  const today = ymdIn(at, tz);
  const dow = dowIn(at, tz);
  const monday = addDaysYmd(today, -((dow + 6) % 7));
  if (/semaine prochaine|next week/.test(t)) return { from: startOfDay(addDaysYmd(monday, 7), tz), to: startOfDay(addDaysYmd(monday, 14), tz) };
  if (/cette semaine|this week/.test(t)) return { from: null, to: startOfDay(addDaysYmd(monday, 7), tz) };
  const [y, m] = today.split("-").map(Number);
  const month = (yy: number, mm: number) => {
    const first = `${yy}-${String(mm).padStart(2, "0")}-01`;
    const next = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, "0")}-01`;
    return { from: startOfDay(first, tz), to: startOfDay(next, tz) };
  };
  if (/mois prochain|next month/.test(t)) return m === 12 ? month(y + 1, 1) : month(y, m + 1);
  if (/ce mois|this month/.test(t)) return month(y, m);
  // Mois cité seul (« vide novembre », « en décembre ») : le prochain mois de ce nom, mois en cours compris.
  const mm = t.match(new RegExp(`\\b(${MONTH_RE})\\b(?:\\s+(\\d{4}))?`));
  if (mm && !new RegExp(`\\d{1,2}(?:er|st|nd|rd|th)?\\s+(?:of\\s+)?${mm[1]}|${mm[1]}\\.?\\s+\\d{1,2}\\b(?!\\d)`).test(t)) {
    const mo = MONTHS[mm[1]];
    const yy = mm[2] ? Number(mm[2]) : mo < m ? y + 1 : y;
    return month(yy, mo);
  }
  return null;
}

export type TargetOptions = {
  /** Suppression : « le dimanche » désigne aussi les publications visées (pour un déplacement, c'est la destination). */
  dayFilterLoose?: boolean;
  period?: EditPeriod | null;
  /** Format de destination (ne filtre pas les publications visées). */
  skipFormat?: TargetFormat | null;
};

/** Publications visées par la demande (dans le projet, à venir, pas encore envoyées). */
export function resolveTargets(text: string, rows: Row[], at: number, o: TargetOptions = {}): Row[] {
  const t = fold(text);
  let out = rows.filter((r) => EDITABLE.has(r.status) && r.scheduled_at >= at - 60_000);
  const tz = out[0]?.timezone ?? rows[0]?.timezone ?? "Europe/Paris";
  const period = o.period === undefined ? parsePeriod(text, at, tz) ?? relativePeriod(t, at, tz) : o.period;
  if (period) out = out.filter((r) => (period.from == null || r.scheduled_at >= period.from) && (period.to == null || r.scheduled_at < period.to));
  else if (/apres-demain|day after tomorrow/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at + 2 * 86_400_000, tz));
  else if (/demain|tomorrow/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at + 86_400_000, tz));
  else if (/aujourd'?hui|today/.test(t)) out = out.filter((r) => ymdIn(r.scheduled_at, r.timezone) === ymdIn(at, tz));
  const lead = ["du", "des", "of", "on", "every", ...(o.dayFilterLoose ? ["le", "les", "tous les", "chaque"] : [])].join("|");
  const dayFilter = t.match(new RegExp(`\\b(${lead})\\s+(${DAY_WORDS})s?\\b`)) ?? (o.dayFilterLoose ? t.match(new RegExp(`\\b()(${DAY_WORDS})s\\b`)) : null);
  if (dayFilter) out = out.filter((r) => dowIn(r.scheduled_at, r.timezone) === dayOf(dayFilter[2]));
  if (/\b(du|le|ce|les|on|this|of the) weekend\b|\bweekends?\b/.test(t) && o.dayFilterLoose) out = out.filter((r) => [0, 6].includes(dowIn(r.scheduled_at, r.timezone)));
  // Heure : « les publications de 18h30 » (filtre) ; « à 18h » est une destination.
  const hourFilter = t.match(/\b(de|of|at the|from the)\s+(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b/);
  if (hourFilter && /\b(de|of)\b/.test(hourFilter[1])) {
    const hm = `${hourFilter[2].padStart(2, "0")}:${hourFilter[3] ?? "00"}`;
    out = out.filter((r) => formatInTimeZone(r.scheduled_at, r.timezone, "HH:mm") === hm);
  }
  const fmt = FORMAT_WORDS.find(([re]) => re.test(t))?.[1];
  if (fmt && fmt !== o.skipFormat && !REPLACE_RE.test(t)) out = out.filter((r) => kindOf(r.format) === fmt);
  const st = STATUS_WORDS.find(([re]) => re.test(t));
  if (st) out = out.filter((r) => st[1].includes(r.status));
  const nets = PLATFORMS.filter((p) => t.includes(p));
  if (nets.length) out = out.filter((r) => r.network === nets[0]);
  const next = t.match(new RegExp(`\\b(${NUM_RE})\\s+(prochaines|prochains|premieres|premiers|next|first)\\b`)) ?? t.match(new RegExp(`\\b(?:next|first|prochaines?)\\s+(${NUM_RE})\\b`));
  const k = num(next?.[1]);
  if (Number.isFinite(k)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, k);
  else if (/(la|this|the) (publication|post) de demain|la prochaine|the next (publication|post)|prochaine publication/.test(t)) out = out.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(0, 1);
  return out;
}

/** Retire de la phrase un passage (destination) pour qu'il ne serve pas de filtre. */
const without = (t: string, part: string | undefined) => (part ? t.replace(part, " ") : t);

export function planSocialEdit(text: string, projectId: string, at = Date.now(), planId?: string | null): SocialEditPlan {
  // Publications visibles seulement (stratégie en cours ; jamais une version préparée non activée ni archivée).
  const rows = all<Row>(`SELECT id, network, format, scheduled_at, timezone, status, plan_id, media FROM posts WHERE project_id = ? AND engine = 'v2' AND scheduled_at IS NOT NULL AND ${strategyVisibilitySql(projectId, "post", "posts.id")}${planId ? " AND plan_id = ?" : ""} ORDER BY scheduled_at`, ...(planId ? [projectId, planId] : [projectId]));
  const t = fold(text);
  const tz = rows[0]?.timezone ?? "Europe/Paris";
  const upcoming = rows.filter((x) => EDITABLE.has(x.status) && x.scheduled_at >= at - 60_000);
  const ask = (action: EditAction, list: Row[], what: [string, string], extra: Partial<Extract<SocialEditPlan, { kind: "local" }>> = {}, destructive = false): SocialEditPlan => {
    if (!list.length) return unclear([], L("Aucune publication à venir (et pas encore envoyée) ne correspond à cette demande.", "No upcoming post (not yet sent) matches this request."));
    const head = `${noun(list)}${span(list)}`;
    return {
      kind: "local",
      action,
      ids: list.map((r) => r.id),
      summary: L(`${head} : ${what[0]}`, `${head}: ${what[1]}`),
      confirm: destructive
        ? L(`${head} seront supprimées${what[0] ? ` (${what[0]})` : ""}. Les publications déjà publiées ou en cours de publication ne sont pas touchées. Confirmer ?`, `${head} will be deleted${what[1] ? ` (${what[1]})` : ""}. Posts already published or being published are not touched. Confirm?`)
        : L(`${head} : ${what[0]}. Confirmer ?`, `${head}: ${what[1]}. Confirm?`),
      destructive,
      ...extra,
    };
  };

  // Annuler la dernière modification (avant « annule », qui veut aussi dire supprimer).
  if (/(annule|defai[st]|defaire|retabli\w*|remet\w* (comme|l'?ancien)|revien\w* en arriere|undo|revert|roll ?back).*(derniere|dernier|modif|changement|retouche|last|change|edit)|\bundo\b|ctrl ?z/.test(t)) return { kind: "local", action: "undo", ids: [], summary: L("dernière modification annulée", "last change undone") };
  const isDelete = DELETE_RE.test(t);
  if (!isDelete && /\b(mets?|met|mettre) (en )?pause|\bpause\b|suspend|stop(pe)? (le calendrier|tout|les publications)/.test(t)) return { kind: "local", action: "pause", ids: [], summary: L("calendrier mis en pause : aucune publication ne partira", "calendar paused: no post will go out") };
  if (!isDelete && /reprend|reprise|\bresume\b|relance le calendrier|unpause|restart/.test(t)) return { kind: "local", action: "resume", ids: [], summary: L("calendrier repris", "calendar resumed") };

  // Garder ou exclure des jours : « pas le week-end », « seulement lundi, mercredi et vendredi », « plus le dimanche ».
  const only = t.match(/\b(seulement|uniquement|que|only|just)\b/);
  const named = [...t.matchAll(new RegExp(`\\b(${DAY_WORDS})s?\\b`, "g"))].map((m) => dayOf(m[1]));
  if (only && named.length && !MOVE_RE.test(t.replace(/\bpasse\b/, ""))) {
    const keep = new Set(named);
    const list = resolveTargets(text.replace(new RegExp(`\\b(${DAY_WORDS})s?\\b`, "gi"), " "), upcoming, at).filter((r) => !keep.has(dowIn(r.scheduled_at, r.timezone)));
    const days = [...keep].map((d) => L(DAY_FR[d], DAY_EN[d])).join(", ");
    return ask("cancel", list, [`publications hors ${days}`, `posts outside ${days}`], {}, true);
  }
  if (/\b(pas|plus|sans|aucune?|jamais|no|not|never|without|except)\b.{0,20}\b(le |les |on |the )?(weekend|samedi|dimanche|saturday|sunday)s?\b/.test(t) && !MOVE_RE.test(t)) {
    const off = /weekend/.test(t) ? [0, 6] : named;
    const list = resolveTargets(text.replace(new RegExp(`\\b(${DAY_WORDS})s?\\b|week-?ends?`, "gi"), " "), upcoming, at).filter((r) => off.includes(dowIn(r.scheduled_at, r.timezone)));
    return ask("cancel", list, [/weekend/.test(t) ? "publications du week-end" : `publications du ${off.map((d) => DAY_FR[d]).join(", ")}`, /weekend/.test(t) ? "weekend posts" : `${off.map((d) => DAY_EN[d]).join(", ")} posts`], {}, true);
  }

  // Nombre de publications par semaine : « 3 publications par semaine ».
  const perWeek = t.match(PER_WEEK_RE);
  if (perWeek && !REPLACE_RE.test(t)) {
    const k = num(perWeek[1]);
    if (!Number.isFinite(k) || k < 1 || k > 35) return unclear([], L("Le nombre de publications par semaine va de 1 à 35.", "Posts per week range from 1 to 35."));
    const scope = resolveTargets(text.replace(PER_WEEK_RE, " "), upcoming, at);
    const byWeek = new Map<string, Row[]>();
    for (const r of scope) {
      const ymd = ymdIn(r.scheduled_at, r.timezone);
      const key = addDaysYmd(ymd, -((dowIn(r.scheduled_at, r.timezone) + 6) % 7));
      byWeek.set(key, [...(byWeek.get(key) ?? []), r]);
    }
    const max = Math.max(0, ...[...byWeek.values()].map((l) => l.length));
    if (!max) return unclear([], L("Aucune publication à venir dans le calendrier.", "No upcoming post in the calendar."));
    if (k >= max) return unclear([], L(`Le calendrier a déjà ${max} publication(s) par semaine au plus. Pour en ajouter, utilisez « Planifier plusieurs publications ».`, `The calendar already has at most ${max} post(s) a week. To add some, use "Plan several posts".`));
    // Répartition régulière : on garde k publications espacées dans chaque semaine.
    const drop = [...byWeek.values()].flatMap((list) => {
      const s = list.sort((a, b) => a.scheduled_at - b.scheduled_at);
      const keep = new Set(Array.from({ length: k }, (_, i) => Math.floor((i * s.length) / k)));
      return s.filter((_, i) => !keep.has(i));
    });
    return ask("per_week", drop, [`retirées pour passer à ${k} par semaine`, `removed to go down to ${k} a week`], { perWeek: k }, true);
  }

  // Nombre de publications par jour : « deux publications par jour au lieu de trois », « 2 posts a day ».
  const perDay = !REPLACE_RE.test(t) ? t.match(PER_DAY_RE) : null;
  if (perDay && !(isDelete && !/au lieu|instead|plus que|only|seulement|reduis|reduce|passe/.test(t))) {
    const k = num(perDay[1]);
    if (!Number.isFinite(k) || k < 1 || k > 5) return unclear([], L("Le nombre de publications par jour va de 1 à 5.", "Posts per day range from 1 to 5."));
    const scope = resolveTargets(text.replace(PER_DAY_RE, " "), upcoming, at);
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
    const drop = [...byDay.values()].flatMap((list) => list.sort((a, b) => a.scheduled_at - b.scheduled_at).slice(k));
    return ask("reduce_per_day", drop, [`retirées pour passer à ${k} par jour`, `removed to go down to ${k} a day`], { perDay: k }, true);
  }

  // Remplacer les images ou les vidéos (« remplace les images des 3 prochaines publications ») — pas « change les
  // textes en images », qui est un changement de format.
  const fmtConv = /\b(en|to|into|as)\s+(textes?|texts?|carrousels?|carousels?|videos?|reels?|images?|photos?|visuels?)\b/.test(t) && FORMAT_WORDS.filter(([re]) => re.test(t)).length >= 2;
  if (REPLACE_RE.test(t) && !isDelete && !fmtConv) {
    const targets = resolveTargets(text, rows, at);
    // Vidéos : refaites une à une depuis la publication (moteur vidéo, coût montré avant) — jamais un montage de
    // remplacement lancé en lot par une phrase.
    if (/\bvideos?\b/.test(t) && !new RegExp(`\\b(${MEDIA_WORDS})\\b`).test(t))
      return unclear([], L("Pour refaire une vidéo, ouvrez sa publication (« Refaire le visuel ») ou utilisez « Publication vidéo » : le coût est montré avant, en % de votre budget IA.", "To remake a video, open its post (\"Remake the visual\") or use \"Video post\": the cost is shown first, as a % of your AI budget."));
    const imgs = targets.filter((r) => !VIDEO.has(r.format) && r.format !== "text");
    if (!imgs.length) return unclear([], L("Aucune publication en image à venir ne correspond.", "No upcoming image post matches."));
    if (imgs.length > MAX_REPLACE) return unclear([], L(`${imgs.length} publications en image correspondent : précisez lesquelles (${MAX_REPLACE} au plus, ex. « les 10 prochaines »).`, `${imgs.length} image posts match: say which ones (${MAX_REPLACE} at most, e.g. "the next 10").`));
    // Images finales 100 % IA : la nouvelle image est créée par l'IA (devis, accord) ; l'actuelle reste jusque-là.
    return { kind: "ai", action: "replace_media", ids: imgs.map((r) => r.id), summary: L(`${noun(imgs)}${span(imgs)} : nouvelle image créée par l'IA (l'image actuelle reste jusqu'à ce que la nouvelle soit validée)`, `${noun(imgs)}${span(imgs)}: new image created by AI (the current image stays until the new one is approved)`) };
  }

  if (isDelete) {
    const targets = resolveTargets(text, rows, at, { dayFilterLoose: true });
    if (!targets.length) return unclear([], L("Aucune publication à venir (et pas encore envoyée) ne correspond à cette demande.", "No upcoming post (not yet sent) matches this request."));
    return ask("cancel", targets, ["", ""], {}, true);
  }

  // Valider, approuver.
  if (/\b(valide[rz]?|approuve[rz]?|approve|validate|accepte[rz]?)\b/.test(t)) return ask("approve", resolveTargets(text, rows, at).filter((r) => ["planned", "draft", "review", "failed"].includes(r.status)), ["approuvées (celles qui ont un défaut bloquant restent à corriger)", "approved (those with a blocking issue stay to fix)"]);
  // Dupliquer.
  if (/\b(duplique[rz]?|dupliquer|copie[rz]?|duplicate|copy|clone)\b/.test(t)) {
    const list = resolveTargets(text, rows, at);
    if (list.length > 30) return unclear([], L(`${list.length} publications correspondent : précisez lesquelles dupliquer (30 au plus).`, `${list.length} posts match: say which ones to duplicate (30 at most).`));
    return ask("duplicate", list, ["dupliquées (même date, à modifier ensuite)", "duplicated (same date, to edit afterwards)"]);
  }

  // Réseau : « passe les publications Facebook sur Instagram », « ajoute LinkedIn ».
  const netDest = t.match(new RegExp(`\\b(sur|vers|en|pour|to|on|onto)\\s+(${PLATFORMS.join("|")})\\b`));
  const addNet = t.match(new RegExp(`\\b(ajoute[rz]?|aussi sur|egalement sur|add|also on)\\b.*?\\b(${PLATFORMS.join("|")})\\b`));
  if (addNet) {
    const net = addNet[2] as Platform;
    const list = resolveTargets(without(t, addNet[0].slice(addNet[0].lastIndexOf(net))), rows, at).filter((r) => r.network !== net);
    if (list.length > 60) return unclear([], L(`${list.length} publications correspondent : précisez une période (60 au plus).`, `${list.length} posts match: give a period (60 at most).`));
    return ask("add_network", list, [`copiées aussi sur ${net} (texte adapté)`, `also copied to ${net} (copy adapted)`], { network: net });
  }
  if (netDest && (MOVE_RE.test(t) || /\b(change|bascule|transfere|switch)/.test(t)) && PLATFORMS.filter((p) => t.includes(p)).length >= 1) {
    const net = netDest[2] as Platform;
    const list = resolveTargets(without(t, netDest[0]), rows, at).filter((r) => r.network !== net);
    return ask("network", list, [`passeront sur ${net}`, `will move to ${net}`], { network: net });
  }

  // Format : « transforme les textes en images », « les carrousels en vidéos », « plus de vidéos ».
  const fmtDest = t.match(/\b(en|to|into|as)\s+(textes?|texts?|carrousels?|carousels?|videos?|reels?|images?|photos?|visuels?)\b/);
  const more = t.match(/\b(plus de|davantage de|more)\s+(textes?|texts?|carrousels?|carousels?|videos?|reels?|images?|photos?|visuels?)\b/);
  if ((fmtDest && /\b(transforme\w*|change\w*|converti\w*|passe[rz]?|turn|convert|make|change)\b/.test(t)) || more) {
    const word = (fmtDest ?? more)![2];
    const to = FORMAT_WORDS.find(([re]) => re.test(word))![1];
    const all0 = resolveTargets(without(t, (fmtDest ?? more)![0]), rows, at, { skipFormat: to }).filter((r) => kindOf(r.format) !== to);
    // Seules les publications encore SANS visuel changent de format : un visuel déjà posé n'est jamais retiré sans
    // rien à la place (il se refait dans la publication, par l'IA, coût montré avant).
    let list = all0.filter((r) => r.media === "[]");
    const kept = all0.length - list.length;
    // « plus de vidéos » : une publication sur trois des autres formats change (aperçu montré avant).
    if (more && !fmtDest) list = list.filter((_, i) => i % 3 === 0);
    if (!list.length && kept) return unclear([], L(`Les ${kept} publication(s) visées ont déjà un visuel : leur format ne change pas (un visuel n'est jamais retiré sans rien à la place). Ouvrez une publication pour refaire son visuel.`, `The ${kept} targeted post(s) already have a visual: their format doesn't change (a visual is never removed with nothing in its place). Open a post to remake its visual.`));
    const keptNote: [string, string] = kept ? [` ; ${kept} autre(s) gardent leur format (visuel déjà posé)`, `; ${kept} other(s) keep their format (visual already set)`] : ["", ""];
    return ask("format", list, [`passeront en ${FORMAT_LABEL[to][0]}, visuel à créer ensuite par l'IA (coût montré avant)${keptNote[0]}`, `will become ${FORMAT_LABEL[to][1]}, visual to create afterwards with AI (cost shown first)${keptNote[1]}`], { format: to });
  }

  // Déplacements.
  const time = findTime(t);
  const isMove = MOVE_RE.test(t) || !!time;
  if (isMove) {
    // Décalage : « décale tout d'une semaine », « avance les vidéos de 2 jours », « push back a week ».
    const by =
      t.match(new RegExp(`\\b(?:de|d'|of|by)\\s*(${NUM_RE})?\\s*(jours?|semaines?|days?|weeks?)\\b`)) ??
      t.match(new RegExp(`\\b(${NUM_RE})?\\s*(jours?|semaines?|days?|weeks?)\\s+(plus tard|plus tot|later|earlier|back|forward)`)) ??
      t.match(new RegExp(`\\b(?:back|forward|later|earlier)\\s+(?:by\\s+)?(${NUM_RE}|an?)?\\s*(days?|weeks?)\\b`));
    if (by && /\b(decal|avance|recul|report|repousse|shift|push|postpone|delay|bring|move|deplac|later|earlier|back|forward|plus tard|plus tot)/.test(t)) {
      const n = by[1] ? num(by[1]) : 1;
      const unit = /semaine|week/.test(by[2]) ? 7 : 1;
      const earlier = /\b(avance\w*|plus tot|earlier|forward|bring)\b/.test(t);
      const days = (earlier ? -1 : 1) * (Number.isFinite(n) ? n : 1) * unit;
      const list = resolveTargets(without(t, by[0]), rows, at);
      const lbl = Math.abs(days) % 7 === 0 ? L(`${Math.abs(days) / 7} semaine(s)`, `${Math.abs(days) / 7} week(s)`) : L(`${Math.abs(days)} jour(s)`, `${Math.abs(days)} day(s)`);
      return ask("shift", list, [`${days > 0 ? "décalées" : "avancées"} de ${lbl}`, `${days > 0 ? "pushed back" : "brought forward"} by ${lbl}`], { days });
    }
    // Vers une date : « déplace la publication de demain au 25 octobre », « du 20 au 25 octobre » (source puis destination).
    const destDate = t.match(new RegExp(`\\b(?:au|a|pour le|vers le|to|on|until)\\s+((?:le\\s+)?(?:\\d{1,2}(?:er)?\\s+(?:${MONTH_RE})(?:\\s+\\d{4})?|\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{2,4})?|(?:${MONTH_RE})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?))`));
    if (destDate && !new RegExp(`\\b(${DAY_WORDS})\\b`).test(destDate[1])) {
      const p = parsePeriod(destDate[1], at, tz);
      if (p?.from != null) {
        const ymd = ymdIn(p.from, tz);
        const list = resolveTargets(without(t, destDate[0]), rows, at);
        if (list.length > 10) return unclear([], L(`${list.length} publications correspondent : pour les mettre toutes le même jour, précisez lesquelles (10 au plus), ou utilisez « décale de … jours ».`, `${list.length} posts match: to put them all on the same day, say which ones (10 at most), or use "push back by … days".`));
        const d = formatInTimeZone(p.from, tz, "dd/MM");
        return ask("move_date", list, [`passeront au ${d}${time ? ` à ${time.time}` : ""}`, `will move to ${d}${time ? ` at ${time.time}` : ""}`], { ymd, time: time?.time });
      }
    }
    // Vers un jour de la semaine (« mets les vidéos le vendredi à 18h ») : le dernier jour cité est la destination.
    const toDay = DAYS.map(([re, d]) => ({ d, i: t.search(re) })).filter((x) => x.i >= 0).sort((a, b) => b.i - a.i)[0];
    if (toDay && !new RegExp(`\\b(du|des|of)\\s+(${DAY_WORDS})`).test(t.slice(Math.max(0, toDay.i - 5), toDay.i + 10))) {
      const list = resolveTargets(t.replace(new RegExp(`\\b(le|les|au|on|to)?\\s*(${DAY_WORDS})s?\\b(?!.*\\b(${DAY_WORDS})\\b)`), " "), rows, at);
      return ask("move_weekday", list, [`passeront au ${DAY_FR[toDay.d]}${time ? ` ${time.time}` : ""} de leur semaine`, `will move to ${DAY_EN[toDay.d]}${time ? ` ${time.time}` : ""} of their week`], { weekday: toDay.d, time: time?.time });
    }
    if (time) {
      const list = resolveTargets(t.slice(0, time.at) + " " + t.slice(time.end), rows, at);
      return ask("set_time", list, [`passeront à ${time.time} (même jour)`, `will move to ${time.time} (same day)`], { time: time.time });
    }
  }

  const targets = resolveTargets(text, rows, at);
  const ids = targets.map((r) => r.id);
  if (/premium|\bton\b|tone|reecri|rewrite|texte|\btext\b|plus (court|vendeur|chaleureux|simple|pro|drole)|more (premium|friendly|professional|fun)|shorter|ameliore|improve|theme|sujet|parle|topic|about/.test(t)) {
    const scope = ids.length ? ids : upcoming.slice(0, 30).map((r) => r.id);
    if (!scope.length) return unclear([], L("Aucune publication à venir dans le calendrier.", "No upcoming post in the calendar."));
    return { kind: "ai", action: "rewrite", ids: scope, instruction: text.trim().slice(0, 400), textOnly: true, summary: L(`réécriture par l'IA de ${scope.length} publication(s)`, `AI rewrite of ${scope.length} post(s)`) };
  }
  return unclear(ids, L("Demande non comprise : dites quelles publications (tout, à partir du 19 octobre, du dimanche, les 3 prochaines…) et quoi faire (supprimer, déplacer, changer l'heure, le réseau ou le format, remplacer les images…).", "Request not understood: say which posts (all, from October 19, on Sunday, the next 3…) and what to do (delete, move, change the time, network or format, replace the images…)."));
}

/** Même heure (ou heure donnée), autre jour de la semaine (dans la même semaine du calendrier, fuseau du client). */
export function moveToWeekday(at: number, tz: string, weekday: number, time?: string): number {
  const ymd = ymdIn(at, tz);
  const hm = time ?? formatInTimeZone(at, tz, "HH:mm");
  const [y, m, d] = ymd.split("-").map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const mondayBased = (x: number) => (x + 6) % 7;
  const target = new Date(Date.UTC(y, m - 1, d + (mondayBased(weekday) - mondayBased(cur))));
  return fromZonedTime(`${target.toISOString().slice(0, 10)}T${hm}:00`, tz).getTime();
}

/** Nouvel instant d'une publication : décalage de N jours, autre date ou autre heure (même heure par défaut). */
export function movedAt(at: number, tz: string, o: { days?: number; ymd?: string; time?: string }): number {
  const ymd = o.ymd ?? addDaysYmd(ymdIn(at, tz), o.days ?? 0);
  const hm = o.time ?? formatInTimeZone(at, tz, "HH:mm");
  return fromZonedTime(`${ymd}T${hm}:00`, tz).getTime();
}
