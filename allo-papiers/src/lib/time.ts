/** Utilitaires de date au fuseau Europe/Paris (aucune dépendance). */
export const TZ = "Europe/Paris";

/** Date civile 'AAAA-MM-JJ' à Paris pour un instant donné. */
export function parisDate(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // fr-CA formate en AAAA-MM-JJ
}

/** Mois civil 'AAAA-MM' à Paris : période de quota. */
export function parisMonth(d: Date = new Date()): string {
  return parisDate(d).slice(0, 7);
}

/** Nombre de jours entre deux dates civiles 'AAAA-MM-JJ' (b - a). */
export function daysBetween(a: string, b: string): number {
  const ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((tb - ta) / 86_400_000);
}

export function isIsoDate(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function formatFrDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}

export function formatFrDateTime(d: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, dateStyle: "long", timeStyle: "short" }).format(new Date(d));
}

/** Premier jour du mois suivant, à Paris (pour afficher la date de renouvellement du quota). */
export function nextMonthStart(d: Date = new Date()): string {
  const [y, m] = parisMonth(d).split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}
