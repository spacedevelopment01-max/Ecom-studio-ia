import { describe, expect, it } from "vitest";
import { planningAround, shiftDay, upcomingTuesday, upcomingWeekday } from "./upcoming-dates";

const day = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);

describe("dates d'essai toujours à venir", () => {
  it("le mardi rendu est un mardi, dans 7 à 13 jours, quel que soit le jour de départ", () => {
    // Deux semaines entières de départs, dont le 10 novembre 2026 (l'ancienne date en dur) et un passage d'année.
    for (const start of ["2026-11-10", "2026-12-25", "2027-02-23"]) {
      for (let i = 0; i < 14; i++) {
        const today = shiftDay(start, i);
        for (const hour of ["00:00:00", "23:59:59"]) {
          const tue = upcomingTuesday(Date.parse(`${today}T${hour}Z`));
          expect(day(tue)).toBe(2);
          expect(daysBetween(today, tue)).toBeGreaterThanOrEqual(7);
          expect(daysBetween(today, tue)).toBeLessThanOrEqual(13);
        }
      }
    }
  });

  it("le mardi d'aujourd'hui est toujours après aujourd'hui", () => {
    expect(upcomingTuesday() > new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("tout jour de la semaine, fins de mois et d'année comprises", () => {
    for (let weekday = 0; weekday < 7; weekday++) expect(day(upcomingWeekday(weekday, Date.parse("2026-12-28T10:00:00Z")))).toBe(weekday);
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDay("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("la période de planning contient la date", () => {
    const [from, to] = planningAround("2026-12-29");
    expect([from, to]).toEqual(["2026-12-14", "2027-01-13"]);
  });
});
