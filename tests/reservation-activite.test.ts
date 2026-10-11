/**
 * Réservation exigée par l'activité : une salle de jeu (escape game), une location de salle ou un restaurant reçoit
 * d'office le vrai calendrier de réservation dans les 30 thèmes, réglé sur ses horaires ; jamais d'horaires inventés.
 */
import { describe, expect, it } from "vitest";
import { bookingNeed } from "@/lib/theme/booking-need";
import { parseOpeningHours } from "@/lib/theme-v2/hours";
import { DIRECTIONS } from "@/lib/theme/directions";
import { validateSpec } from "@/lib/theme/ops";
import { serviceProfile, serviceSpec } from "./fixtures";

const escape = {
  ...serviceProfile,
  services: [
    { name: "Salle Le Manoir", description: "Une heure pour sortir du manoir hanté, de 2 à 6 joueurs.", price: "25 € / joueur", duration: "60 min" },
    { name: "Salle L'Atelier", description: "Énigmes et mécanismes dans l'atelier d'un horloger.", price: "", duration: "60 min" },
  ],
  hours: "Tous les jours, 10 h – 23 h",
  bookingUrl: "",
  contactMode: "call" as const,
};
const ACTIVITY = "Contretemps — escape game : salles d'énigmes en équipe";
type Spec = ReturnType<typeof serviceSpec>;
const secs = (spec: Spec, tpl: string) => {
  const t = spec.templates[tpl];
  return t.order.map((k) => t.sections[k]);
};

describe("besoin de réservation selon l'activité", () => {
  it("salle de jeu, location de salle, restaurant, rendez-vous ; rien avec un service en ligne ou un devis", () => {
    expect(bookingNeed(escape, ACTIVITY)).toMatchObject({ kind: "room", people: true });
    expect(bookingNeed({ ...escape, services: [] }, "Location de salle pour séminaires")?.kind).toBe("room");
    expect(bookingNeed({ ...escape, services: [] }, "Restaurant bistronomique")).toMatchObject({ kind: "table", people: true });
    expect(bookingNeed({ ...serviceProfile, bookingUrl: "" }, "Cabinet de kinésithérapie")).toMatchObject({ kind: "appointment", people: false });
    expect(bookingNeed(serviceProfile, "Cabinet de kinésithérapie")).toBeNull();
    expect(bookingNeed({ ...escape, bookingUrl: "https://reservation.exemple/escape" }, ACTIVITY)).toBeNull();
    expect(bookingNeed({ ...serviceProfile, services: [], bookingUrl: "", contactMode: "quote" }, "Plombier chauffagiste")).toBeNull();
  });

  it("horaires « tous les jours » et « 7j/7 sauf le lundi » lus ; plusieurs plages : rien n'est deviné", () => {
    expect(parseOpeningHours("Tous les jours, 10 h – 23 h")).toMatchObject({ days: [1, 2, 3, 4, 5, 6, 0], open: "10:00", close: "23:00" });
    expect(parseOpeningHours("7j/7 de 14h à 22h sauf le lundi")).toMatchObject({ days: [2, 3, 4, 5, 6, 0], open: "14:00", close: "22:00" });
    expect(parseOpeningHours("Every day 10am–11pm")?.close).toBe("23:00");
    expect(parseOpeningHours("Tous les jours ; samedi 10h-1h")).toBeNull();
  });
});

describe("escape game : vrai calendrier de réservation dans les 30 thèmes", () => {
  it("accueil et page Rendez-vous : calendrier de salles affiché, réglé sur les horaires, nombre de joueurs demandé", () => {
    for (const d of DIRECTIONS) {
      const spec = serviceSpec(d.id, "fr", escape, { rich: true, activity: ACTIVITY });
      expect(validateSpec(spec), d.id).toEqual([]);
      for (const tpl of ["index", "page.contact"]) {
        const cal = secs(spec, tpl).filter((s) => s.type === "booking-calendar");
        expect(cal.length, `${d.id} ${tpl}`).toBe(1);
        expect(cal[0].disabled, `${d.id} ${tpl} visible`).toBeFalsy();
        expect(cal[0].settings).toMatchObject({ kind: "room", ask_people: true, day_mon: true, day_sun: true, open_time: "10:00", close_time: "23:00" });
        const items = Object.values(cal[0].blocks ?? {}).map((b) => b.settings);
        expect(items.map((b) => b.title), d.id).toEqual(["Salle Le Manoir", "Salle L'Atelier"]);
        expect(items[0].price).toBe("25 € / joueur");
        expect(items[1].price).toBe("");
      }
    }
  });

  it("horaires absents : calendrier posé masqué, la demande de réservation avec date reste visible sur l'accueil", () => {
    for (const d of DIRECTIONS) {
      const home = secs(serviceSpec(d.id, "fr", { ...escape, hours: "" }, { rich: true, activity: ACTIVITY }), "index");
      const cal = home.filter((s) => s.type === "booking-calendar");
      expect(cal.length, d.id).toBe(1);
      expect(cal[0].disabled, d.id).toBe(true);
      const req = home.find((s) => s.type === "booking" && !s.disabled);
      expect(req?.settings.ask_date, d.id).toBe(true);
    }
  });

  it("réservation par un service en ligne : aucun calendrier affiché avec des horaires par défaut", () => {
    for (const d of DIRECTIONS) {
      const home = secs(serviceSpec(d.id, "fr", serviceProfile, { rich: true }), "index");
      expect(home.filter((s) => s.type === "booking-calendar" && !s.disabled), d.id).toEqual([]);
    }
  });
});
