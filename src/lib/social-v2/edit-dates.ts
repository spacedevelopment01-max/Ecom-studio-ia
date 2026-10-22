/**
 * Dates écrites en clair dans une retouche du calendrier (« à partir du 19 octobre 2026 », « du 19 au 25 octobre »,
 * « jusqu'au 3/11 », « from October 19 », « between Oct 19 and Nov 2 »…), en français et en anglais, avec ou sans
 * année. Déterministe et gratuit. Sans année : la prochaine occurrence (aujourd'hui compris) dans le fuseau du client.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { fold as fold0 } from "../seo-v2/lang";

/** Minuscules sans accents, apostrophes typographiques ramenées à « ' ». */
export const fold = (s: string) => fold0(s).replace(/[\u2019\u2018`]/g, "'");

const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1, january: 1,
  fevrier: 2, fevr: 2, fev: 2, february: 2, feb: 2,
  mars: 3, march: 3, mar: 3,
  avril: 4, avr: 4, april: 4, apr: 4,
  mai: 5, may: 5,
  juin: 6, june: 6, jun: 6,
  juillet: 7, juil: 7, july: 7, jul: 7,
  aout: 8, august: 8, aug: 8,
  septembre: 9, sept: 9, sep: 9, september: 9,
  octobre: 10, oct: 10, october: 10,
  novembre: 11, nov: 11, november: 11,
  decembre: 12, dec: 12, december: 12,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const ORD = "(?:er|re|e|eme|st|nd|rd|th)?";

/** Période visée : bornes en millisecondes (début inclus, fin exclue) et libellé court (jj/mm). */
export type EditPeriod = { from: number | null; to: number | null };

type Ymd = { y: number | null; m: number; d: number };

const valid = (x: Ymd) => x.m >= 1 && x.m <= 12 && x.d >= 1 && x.d <= 31;
const pad = (n: number) => String(n).padStart(2, "0");

/** Année d'une date écrite sans année : la prochaine occurrence à partir d'aujourd'hui (fuseau du client). */
function withYear(x: Ymd, todayYmd: string): string {
  if (x.y) return `${x.y < 100 ? 2000 + x.y : x.y}-${pad(x.m)}-${pad(x.d)}`;
  const y = Number(todayYmd.slice(0, 4));
  const cand = `${y}-${pad(x.m)}-${pad(x.d)}`;
  return cand < todayYmd ? `${y + 1}-${pad(x.m)}-${pad(x.d)}` : cand;
}

/** Dates repérées dans le texte (dans l'ordre), au format AAAA-MM-JJ. */
export function findDates(text: string, todayYmd: string): string[] {
  const t = fold(text).replace(/(\d)\s*,\s*(\d{4})/g, "$1 $2");
  const found: { at: number; v: Ymd }[] = [];
  // Passages déjà lus (une date ne compte qu'une fois, la lecture la plus complète d'abord).
  const spans: [number, number][] = [];
  const take = (re: RegExp, f: (m: RegExpExecArray) => Ymd | Ymd[] | null) => {
    for (const m of t.matchAll(re)) {
      const [a, b] = [m.index!, m.index! + m[0].length];
      if (spans.some(([x, y]) => a < y && b > x)) continue;
      spans.push([a, b]);
      const v = f(m as RegExpExecArray);
      const list = Array.isArray(v) ? v : v ? [v] : [];
      list.forEach((x, k) => valid(x) && found.push({ at: m.index! + k, v: x }));
    }
  };
  // « du 19 au 25 octobre (2026) », « 19-25 oct », « from 19 to 25 October » : le mois vaut pour les deux jours.
  take(new RegExp(`\\b(\\d{1,2})${ORD}\\s*(?:au|a|to|-|et|and|until)\\s*(\\d{1,2})${ORD}\\s+(${MONTH_RE})\\.?(?:\\s+(\\d{4}))?\\b`, "g"), (m) => [
    { y: m[4] ? Number(m[4]) : null, m: MONTHS[m[3]], d: Number(m[1]) },
    { y: m[4] ? Number(m[4]) : null, m: MONTHS[m[3]], d: Number(m[2]) },
  ]);
  // « October 19 to 25 (2026) ».
  take(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})${ORD}\\s*(?:to|-|and|until|au)\\s*(\\d{1,2})${ORD}(?:\\s+(\\d{4}))?\\b`, "g"), (m) => [
    { y: m[4] ? Number(m[4]) : null, m: MONTHS[m[1]], d: Number(m[2]) },
    { y: m[4] ? Number(m[4]) : null, m: MONTHS[m[1]], d: Number(m[3]) },
  ]);
  // AAAA-MM-JJ.
  take(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (m) => ({ y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }));
  // « 19 octobre 2026 », « 1er novembre », « 19 oct. ».
  take(new RegExp(`\\b(\\d{1,2})${ORD}\\s+(?:of\\s+)?(${MONTH_RE})\\b\\.?(?:\\s+(\\d{4}))?`, "g"), (m) => ({ y: m[3] ? Number(m[3]) : null, m: MONTHS[m[2]], d: Number(m[1]) }));
  // « October 19, 2026 », « Oct 19th ».
  take(new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})${ORD}\\b(?:\\s+(\\d{4}))?`, "g"), (m) => ({ y: m[3] ? Number(m[3]) : null, m: MONTHS[m[1]], d: Number(m[2]) }));
  // « 19/10 », « 19/10/2026 », « 19.10.26 » (jour puis mois ; « 10/19 » se lit mois puis jour).
  take(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/g, (m) => {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = m[3] ? Number(m[3]) : null;
    return a <= 12 && b > 12 ? { y, m: a, d: b } : { y, m: b, d: a };
  });
  found.sort((a, b) => a.at - b.at);
  const out: string[] = [];
  for (const f of found) {
    let ymd = withYear(f.v, todayYmd);
    // Deuxième date d'une période sans année qui tombe avant la première : l'année suivante (« du 28/12 au 3/01 »).
    const prev = out[out.length - 1];
    if (prev && !f.v.y && ymd < prev) ymd = `${Number(ymd.slice(0, 4)) + 1}${ymd.slice(4)}`;
    out.push(ymd);
  }
  return out;
}

const startOf = (ymd: string, tz: string) => fromZonedTime(`${ymd}T00:00:00`, tz).getTime();
const nextDay = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/**
 * Période écrite dans la demande, ou null si aucune date n'est citée. « à partir du X » : X compris ; « après le X » :
 * le lendemain ; « jusqu'au X » : X compris ; « avant le X » : X exclu ; deux dates : du premier au dernier jour
 * compris ; une seule date sans autre mot : ce jour-là.
 */
export function parsePeriod(text: string, at: number, tz: string): EditPeriod | null {
  const t = fold(text);
  const today = formatInTimeZone(at, tz, "yyyy-MM-dd");
  const dates = findDates(text, today);
  if (!dates.length) return null;
  if (dates.length >= 2) {
    const [a, b] = [dates[0], dates[dates.length - 1]].sort();
    return { from: startOf(a, tz), to: startOf(nextDay(b), tz) };
  }
  const d = dates[0];
  if (/\b(a partir d|des le|depuis|from|starting|beginning|onwards?|as of)/.test(t)) return { from: startOf(d, tz), to: null };
  if (/\b(apres le|apres|after)\b/.test(t)) return { from: startOf(nextDay(d), tz), to: null };
  if (/\b(jusqu'?\s*au|jusqu'?\s*a|until|till|through|up to)\b/.test(t)) return { from: null, to: startOf(nextDay(d), tz) };
  if (/\b(avant le|avant|before)\b/.test(t)) return { from: null, to: startOf(d, tz) };
  return { from: startOf(d, tz), to: startOf(nextDay(d), tz) };
}
