/**
 * TABLE SAISON (issue #175) : calcul des réservations (theme-base/assets/table-saison-core.js, partagé par le site et le
 * serveur) et service réel du studio (src/lib/restaurant/booking.ts + API publique) : persistance par restaurant,
 * vérification atomique de la capacité, doublons, accès par jeton, modification, annulation, recherche neutre.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { saveThemeVersion } from "@/lib/projects";
import { BookingError, availability, bookedCovers, cancelReservation, core, createReservation, liveRestaurant, lookupByEmail, modifyReservation, publicView, reservationByToken, saveRequest } from "@/lib/restaurant/booking";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { GET, OPTIONS, POST } from "@/app/api/public/restaurant/[projectId]/[[...path]]/route";

// 23 octobre 2026, 12 h à Paris.
const AT = Date.UTC(2026, 9, 23, 10, 0);
const DATE = "2026-11-10";
const rules = core.normalize({ timezone: "Europe/Paris", openDays: [0, 1, 2, 3, 4, 5, 6], closures: ["2026-12-24..2026-12-26", "2027-01-01"], services: [{ id: "dejeuner", label: "Déjeuner", slots: ["12:00", "12:30", "13:00"] }, { id: "diner", label: "Dîner", slots: ["19:00", "19:30", "20:00", "20:30"] }], capacity: 24, minParty: 1, maxParty: 8, horizonDays: 90, leadMinutes: 60 });

describe("Calcul des disponibilités (même règle pour le site et le serveur)", () => {
  it("dates passées, fermetures, au-delà de l'horizon et jours ouverts, dans le fuseau du restaurant", () => {
    expect(core.dateStatus(rules, "2026-10-22", AT)).toBe("past");
    expect(core.dateStatus(rules, "2026-10-23", AT)).toBe("open");
    expect(core.dateStatus(rules, "2026-12-25", AT)).toBe("closed");
    expect(core.dateStatus(rules, "2027-01-01", AT)).toBe("closed");
    expect(core.dateStatus(rules, "2027-02-01", AT)).toBe("beyond");
    expect(core.dateStatus({ ...rules, openDays: [1, 2, 3, 4, 5, 6] }, "2026-11-08", AT)).toBe("closed"); // dimanche
    // 23 h 30 UTC le 23 = 0 h 30 à Paris le 24 : le 23 est déjà passé pour le restaurant.
    expect(core.nowIn("Europe/Paris", Date.UTC(2026, 9, 23, 22, 30)).date).toBe("2026-10-24");
    expect(core.dateStatus(rules, "2026-10-23", Date.UTC(2026, 9, 23, 22, 30))).toBe("past");
  });
  it("créneaux du jour même trop proches, capacité dépassée, demande complète validée", () => {
    const today = core.slotsFor(rules, "2026-10-23", 2, {}, AT);
    expect(today[0].slots.map((s) => s.reason)).toEqual(["past", "past", null]); // midi + 60 min de délai : 13 h reste possible
    expect(today[1].slots.every((s) => s.available)).toBe(true);
    const full = core.slotsFor(rules, DATE, 3, { "19:30": 22 }, AT)[1].slots.find((s) => s.time === "19:30")!;
    expect(full).toMatchObject({ available: false, reason: "full" });
    expect(core.validate(rules, { party: 2, date: DATE, time: "19:30", contact: { firstName: "", lastName: "D", email: "x", terms: false } }, {}, AT)).toEqual(["firstName", "email", "terms"]);
    expect(core.validate(rules, { party: 9, date: DATE, time: "19:30" }, {}, AT)).toEqual(["party"]);
    expect(core.validate(rules, { party: 2, date: DATE, time: "18:00" }, {}, AT)).toEqual(["time"]);
  });
  it("formats français, grille du mois (lundi en premier), adresse masquée et fichier d'agenda à l'heure du restaurant", () => {
    expect(core.formatDate(DATE)).toBe("Mardi 10 novembre 2026");
    expect(core.formatTime("19:30")).toBe("19h30");
    const grid = core.monthGrid(2026, 11);
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(core.maskEmail("jeanne@exemple.com")).toBe("j*****@exemple.com");
    const ics = core.ics({ number: "TS-0001", date: DATE, time: "19:30" }, { timezone: "Europe/Paris", summary: "Réservation", now: AT });
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261110T193000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261110T213000");
    expect(ics).toContain("UID:TS-0001@table-saison");
  });
});

describe("Service réel de réservation (studio)", () => {
  let pid = "", other = "", demoPid = "";
  const base = { party: 2, date: DATE, time: "19:30", firstName: "Camille", lastName: "Dupont", email: "camille@example.com", terms: true };
  const live = (spec: ReturnType<typeof serviceSpec>, extra: Record<string, unknown> = {}) => {
    const sec = Object.values(spec.groups.header.sections).find((s) => s.type === "ts-restaurant")!;
    Object.assign(sec.settings, { booking_mode: "live", service_url: "https://studio.example.invalid/api/public/restaurant/x", capacity: 4, ...extra });
    return spec;
  };
  beforeAll(async () => {
    const u = await createUser(`resto-${Date.now()}@example.invalid`, "isolated-test-only", "Restaurant");
    pid = seedHoldout(u.id, 2, "Resto A");
    other = seedHoldout(u.id, 2, "Resto B");
    demoPid = seedHoldout(u.id, 2, "Resto démo");
    saveThemeVersion(pid, live(serviceSpec("table-saison" as never)), "test", "user");
    saveThemeVersion(other, live(serviceSpec("table-saison" as never)), "test", "user");
    saveThemeVersion(demoPid, serviceSpec("table-saison" as never), "test", "user");
  });

  it("refuse tout tant que le restaurant n'a pas activé le service réel (la démonstration ne passe jamais par le serveur)", () => {
    expect(() => liveRestaurant(demoPid)).toThrow(BookingError);
    try { createReservation(demoPid, base, AT); } catch (e) { expect((e as BookingError).status).toBe(403); }
    expect(liveRestaurant(pid).config.capacity).toBe(4);
  });

  it("enregistre, rend un jeton une seule fois et ne montre jamais l'adresse complète", () => {
    const r = createReservation(pid, { ...base, idem: "idem-00000001" }, AT);
    expect(r.reservation.number).toBe("TS-0001");
    expect(r.token).toBeTruthy();
    expect(publicView(r.reservation)).toMatchObject({ number: "TS-0001", status: "confirmed", party: 2, date: DATE, time: "19:30", emailMasked: "c*****@example.com" });
    expect(JSON.stringify(publicView(r.reservation))).not.toContain("camille@example.com");
    // Double clic ou renvoi : la même réservation, sans nouveau jeton.
    const again = createReservation(pid, { ...base, idem: "idem-00000001" }, AT);
    expect(again).toMatchObject({ duplicate: true, token: null });
    expect(again.reservation.id).toBe(r.reservation.id);
    // Même adresse, même créneau, autre envoi : refusé.
    expect(() => createReservation(pid, { ...base, idem: "idem-00000002" }, AT)).toThrow(/duplicate/);
    expect(reservationByToken(pid, "TS-0001", r.token!).id).toBe(r.reservation.id);
    expect(() => reservationByToken(pid, "TS-0001", "mauvais-jeton")).toThrow(/not_found/);
    expect(() => reservationByToken(other, "TS-0001", r.token!)).toThrow(/not_found/);
  });

  it("vérifie la capacité au moment d'enregistrer et propose les horaires encore libres", () => {
    createReservation(pid, { ...base, email: "b@example.com", party: 2, idem: "idem-00000003" }, AT); // 19:30 : 4 / 4
    try {
      createReservation(pid, { ...base, email: "c@example.com", idem: "idem-00000004" }, AT);
      throw new Error("aurait dû être refusé");
    } catch (e) {
      expect((e as BookingError).code).toBe("unavailable");
      const alt = (e as BookingError).details.alternatives as { id: string; times: string[] }[];
      expect(alt.find((a) => a.id === "diner")!.times).toEqual(["19:00", "20:00", "20:30"]);
    }
    expect(bookedCovers(pid, DATE)["19:30"]).toBe(4);
    expect(availability(pid, DATE, 2, AT).services[1].slots.find((s) => s.time === "19:30")!.reason).toBe("full");
    // Un autre restaurant n'est pas touché par ces couverts.
    expect(bookedCovers(other, DATE)).toEqual({});
  });

  it("modifie en revérifiant la disponibilité (sans compter la réservation elle-même), puis annule définitivement", () => {
    const r = createReservation(pid, { ...base, email: "d@example.com", time: "20:00", idem: "idem-00000005" }, AT);
    expect(() => modifyReservation(pid, r.reservation.number, r.token!, { time: "19:30" }, AT)).toThrow(/unavailable/);
    const m = modifyReservation(pid, r.reservation.number, r.token!, { party: 4 }, AT);
    expect(m).toMatchObject({ party: 4, time: "20:00" });
    const moved = modifyReservation(pid, r.reservation.number, r.token!, { time: "20:30", note: "Anniversaire" }, AT);
    expect(moved).toMatchObject({ time: "20:30", note: "Anniversaire" });
    const c = cancelReservation(pid, r.reservation.number, r.token!, AT);
    expect(c.status).toBe("canceled");
    expect(bookedCovers(pid, DATE)["20:30"]).toBeUndefined();
    expect(() => modifyReservation(pid, r.reservation.number, r.token!, { party: 2 }, AT)).toThrow(/canceled/);
  });

  it("recherche par e-mail : réponse neutre, jamais de données ; demandes de groupe enregistrées", async () => {
    expect(await lookupByEmail(pid, "camille@example.com", AT)).toEqual({ ok: true });
    expect(await lookupByEmail(pid, "inconnu@example.com", AT)).toEqual({ ok: true });
    const req = await saveRequest(pid, "group", { email: "groupe@example.com", date: "2026-12-05", party: "14", body: "Repas d'équipe" }, AT);
    expect(req.id).toBeTruthy();
    expect(req.forwarded).toBe("not_configured");
    await expect(saveRequest(pid, "group", { email: "pas-une-adresse" }, AT)).rejects.toThrow(/invalid/);
  });

  it("API publique : CORS, démonstration refusée, création, lecture avec jeton seulement", async () => {
    const ctx = (path: string[], id = pid) => ({ params: Promise.resolve({ projectId: id, path }) });
    expect((await OPTIONS()).headers.get("Access-Control-Allow-Origin")).toBe("*");
    const refused = await POST(new Request("http://x/api/public/restaurant/d/reservations", { method: "POST", body: JSON.stringify(base) }), ctx(["reservations"], demoPid));
    expect(refused.status).toBe(403);
    const created = await POST(new Request("http://x/api/public/restaurant/p/reservations", { method: "POST", body: JSON.stringify({ ...base, email: "api@example.com", time: "19:00", date: "2026-11-12", idem: "idem-api-0001" }) }), ctx(["reservations"]));
    expect(created.status).toBe(201);
    const body = await created.json() as { reservation: { number: string }; token: string; email: string };
    expect(body.email).toBe("not_configured"); // aucun e-mail prétendu envoyé
    const anon = await GET(new Request(`http://x/api/public/restaurant/p/reservations/${body.reservation.number}`), ctx(["reservations", body.reservation.number]));
    expect(anon.status).toBe(404);
    const ok = await GET(new Request(`http://x/api/public/restaurant/p/reservations/${body.reservation.number}`, { headers: { "X-Reservation-Token": body.token } }), ctx(["reservations", body.reservation.number]));
    expect(ok.status).toBe(200);
    const lookup = await POST(new Request("http://x/api/public/restaurant/p/reservations/lookup", { method: "POST", body: JSON.stringify({ email: "api@example.com" }) }), ctx(["reservations", "lookup"]));
    expect(await lookup.json()).toEqual({ ok: true });
  });
});
