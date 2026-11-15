/**
 * Dates d'essai toujours à venir. Un rendez-vous de test écrit avec une date en dur finit par tomber dans le passé :
 * le moteur de réservation le refuse alors (date passée) et cinq tests cassaient depuis le 11 novembre 2026
 * (« 2026-11-10 »). Les tests de réservation prennent leurs dates ici.
 */
const iso = (d: Date) => d.toISOString().slice(0, 10);
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`);

/** `date` (AAAA-MM-JJ) décalée de `days` jours. */
export function shiftDay(date: string, days: number): string {
  const d = atNoon(date);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/**
 * Prochain jour de la semaine voulu (0 = dimanche, 1 = lundi, 2 = mardi…), dans 7 à 13 jours : toujours à venir quel
 * que soit le fuseau horaire, au-delà du délai minimal avant un rendez-vous et dans la période de réservation la plus
 * courte que les réglages permettent d'ouvrir (7 jours au moins, 90 par défaut).
 */
export function upcomingWeekday(weekday: number, from: number = Date.now()): string {
  let date = shiftDay(iso(new Date(from)), 7);
  while (atNoon(date).getUTCDay() !== weekday) date = shiftDay(date, 1);
  return date;
}

/** Prochain mardi à venir (jour ouvert du salon et du restaurant de démonstration). */
export const upcomingTuesday = (from?: number) => upcomingWeekday(2, from);

/** Période de planning qui contient `date` : 15 jours avant, 15 jours après. */
export const planningAround = (date: string): [string, string] => [shiftDay(date, -15), shiftDay(date, 15)];
