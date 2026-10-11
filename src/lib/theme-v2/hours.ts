/**
 * Lecture des horaires d'ouverture saisis par le client (« Du lundi au vendredi, 9 h – 18 h », « Mar–Sam 9h-12h /
 * 14h-19h », « Mon–Fri 9am–6pm ») pour régler le calendrier de réservation. Prudent : un seul groupe de jours et
 * une seule plage (avec pause facultative), ou « tous les jours » (sauf les jours cités) ; tout le reste renvoie null — aucun horaire n'est jamais deviné.
 */
export type OpeningHours = { days: number[]; open: string; close: string; breakStart: string; breakEnd: string };

/** Jours de la semaine (0 = dimanche, comme Date.getDay). */
const DAYS: [RegExp, number][] = [
  [/^(lundi|lun|monday|mon)$/, 1],
  [/^(mardi|mar|tuesday|tue|tues)$/, 2],
  [/^(mercredi|mer|wednesday|wed)$/, 3],
  [/^(jeudi|jeu|thursday|thu|thur|thurs)$/, 4],
  [/^(vendredi|ven|friday|fri)$/, 5],
  [/^(samedi|sam|saturday|sat)$/, 6],
  [/^(dimanche|dim|sunday|sun)$/, 0],
];
const dayOf = (w: string): number | null => {
  const k = w.toLowerCase().replace(/\.$/, "");
  for (const [re, n] of DAYS) if (re.test(k)) return n;
  return null;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function parseOpeningHours(text: string | null | undefined): OpeningHours | null {
  if (!text) return null;
  const s = text.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  // Plusieurs groupes de jours (« lundi-vendredi 9h-18h ; samedi 9h-12h ») : horaires différents, non pris en charge.
  if (/[;\n]/.test(s)) return null;

  // Jours : mots reconnus dans l'ordre du texte.
  const tokens = s.match(/[a-zàâçéèêëîïôûùüÿœ]+\.?/g) ?? [];
  const found: { n: number; i: number }[] = [];
  tokens.forEach((w, i) => { const n = dayOf(w); if (n != null) found.push({ n, i }); });
  // « Tous les jours », « 7j/7 », « every day » : la semaine entière, moins les jours fermés (« sauf le lundi »).
  const every = /(tous les jours|7\s*j(?:ours)?\s*(?:\/|sur)\s*7|\b7\/7\b|every ?day|daily|7 days a week)/.exec(s);
  if (!found.length && !every) return null;
  let days: number[];
  const isRange = found.length === 2 && /(\bau\b|\bà\b|\bto\b|\bthrough\b|-)/.test(s.slice(s.indexOf(tokens[found[0].i]), s.lastIndexOf(tokens[found[1].i])));
  if (every) {
    const except = /(sauf|except|closed on|ferm[ée]e? le)/.exec(s);
    const off = except ? found.filter((f) => s.indexOf(tokens[f.i], except.index) >= except.index).map((f) => f.n) : found.length ? null : [];
    // Jours cités sans « sauf » à côté de « tous les jours » : lecture ambiguë, rien n'est deviné.
    if (off == null) return null;
    days = [1, 2, 3, 4, 5, 6, 0].filter((d) => !off.includes(d));
  } else if (isRange) {
    days = [];
    for (let d = found[0].n, k = 0; k < 7; k++, d = (d + 1) % 7) { days.push(d); if (d === found[1].n) break; }
  } else days = [...new Set(found.map((f) => f.n))];

  // Heures : « 9 h », « 9h30 », « 09:00 », « 9am », « 6.30pm ».
  const times: number[] = [];
  const re = /(\d{1,2})(?:\s*(?:h|:|\.)\s*(\d{2})?|\s*(am|pm))(?:\s*(am|pm))?/g;
  for (let m: RegExpExecArray | null; (m = re.exec(s)); ) {
    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    const ap = m[3] ?? m[4];
    if (ap === "pm" && h < 12) h += 12;
    if (ap === "am" && h === 12) h = 0;
    if (h > 24 || min > 59) return null;
    times.push(h * 60 + min);
  }
  // « 9-18 h » : la première heure n'a pas d'unité.
  if (times.length === 1) {
    const bare = /(\d{1,2})\s*-\s*\d{1,2}\s*(?:h|:)/.exec(s);
    if (bare) times.unshift(Number(bare[1]) * 60);
  }
  const hm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const sorted = times.every((v, i) => i === 0 || v > times[i - 1]);
  if (!sorted) return null;
  if (times.length === 2) return { days, open: hm(times[0]), close: hm(times[1]), breakStart: "", breakEnd: "" };
  if (times.length === 4) return { days, open: hm(times[0]), close: hm(times[3]), breakStart: hm(times[1]), breakEnd: hm(times[2]) };
  return null;
}
