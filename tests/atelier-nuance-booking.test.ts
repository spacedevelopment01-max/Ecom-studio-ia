/**
 * ATELIER NUANCE (issue #177) : calcul des rendez-vous (theme-base/assets/atelier-nuance-core.js, partagé par le site et
 * le serveur) et service réel du studio (src/lib/salon/booking.ts + API publique) : collisions sur toute la durée,
 * compétences, « Sans préférence » attribué à un vrai professionnel, course entre deux clients, déplacement atomique,
 * annulation, accès limité par jeton, recherche neutre, lien expiré, isolation par salon.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { saveThemeVersion } from "@/lib/projects";
import { BookingError, availability, busyFor, cancelAppointment, clientAccess, core, createAppointment, liveSalon, lookup, me, monthAvailability, moveAppointment, updateMe, CLIENT_LINK_MS, type CreateInput } from "@/lib/salon/booking";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { salonBlocks } from "@/lib/theme/atelier-nuance";
import { AN_HOURS, AN_SERVICES, AN_STAFF } from "./atelier-nuance-fixtures";
import { GET, OPTIONS, POST } from "@/app/api/public/salon/[projectId]/[[...path]]/route";
import type { ThemeSpec } from "@/lib/theme/spec";

// 23 octobre 2026, 12 h à Paris.
const AT = Date.UTC(2026, 9, 23, 10, 0);
const TUE = "2026-11-10";
const raw = {
  timezone: "Europe/Paris", hours: { 0: "", 1: "", 2: AN_HOURS.tue, 3: AN_HOURS.wed, 4: AN_HOURS.thu, 5: AN_HOURS.fri, 6: AN_HOURS.sat }, closures: "2026-12-24..2026-12-26", step: 30, horizonDays: 90, leadMinutes: 120, cancelHours: 0,
  services: AN_SERVICES.map((s) => ({ id: s.id, name: s.name, category: s.category, duration: s.duration, price: s.price, priceFrom: s.from })),
  staff: AN_STAFF.map((m) => ({ id: m.id, name: m.name, skills: m.skills, days: m.days })),
};
const cfg = core.normalize(raw);
const free = (date: string, service: string, staff = "any", busy = {}) => core.slotsFor(cfg, { date, service, staff, busy }, AT).filter((s) => s.available).map((s) => s.time);

describe("Calcul des créneaux (même règle pour le site et le serveur)", () => {
  it("dates passées, fermetures, jours fermés, horizon, dans le fuseau du salon", () => {
    expect(core.dateStatus(cfg, "2026-10-22", AT)).toBe("past");
    expect(core.dateStatus(cfg, "2026-10-26", AT)).toBe("closed"); // lundi
    expect(core.dateStatus(cfg, "2026-10-25", AT)).toBe("closed"); // dimanche
    expect(core.dateStatus(cfg, "2026-12-24", AT)).toBe("closed");
    expect(core.dateStatus(cfg, "2027-02-01", AT)).toBe("beyond");
    expect(core.dateStatus(cfg, TUE, AT)).toBe("open");
    expect(core.nowIn("Europe/Paris", Date.UTC(2026, 9, 23, 22, 30)).date).toBe("2026-10-24");
  });

  it("toute la durée de la prestation doit tenir dans les horaires et ne chevaucher aucun rendez-vous", () => {
    // Fermeture à 19 h : un balayage de 2 h 30 ne commence pas après 16 h 30.
    const bal = free(TUE, "balayage-coiffage", "alex");
    expect(bal.at(-1)).toBe("16:30");
    // Rendez-vous d'Alex de 11 h à 12 h : 10 h 00 (+ 1 h 45 de coloration) le chevaucherait, 9 h 00 aussi.
    const busy = { alex: [[660, 720]] as [number, number][] };
    const col = free(TUE, "coloration-coiffage", "alex", busy);
    expect(col).not.toContain("09:30");
    expect(col).not.toContain("10:00");
    expect(col).toContain("12:00");
    expect(col).not.toContain("11:30");
  });

  it("compétences : seuls les professionnels configurés ; « Sans préférence » combine leurs disponibilités", () => {
    expect(core.staffFor(cfg, "coupe-brushing").map((p) => p.id)).toEqual(["camille"]);
    expect(core.staffFor(cfg, "brushing").map((p) => p.id)).toEqual(["camille", "alex", "sarah"]);
    expect(free(TUE, "coupe-brushing", "sarah")).toEqual([]);
    expect(core.validate(cfg, { service: "coupe-brushing", staff: "sarah", date: TUE, time: "10:00" }, {}, AT)).toContain("staff");
    const busy = { camille: [[540, 1140]] as [number, number][] };
    expect(free(TUE, "brushing", "any", busy)).toContain("09:00");
    // Attribution réelle : le professionnel libre le moins occupé.
    expect(core.assign(cfg, ["alex", "sarah"], { alex: [[540, 600]], sarah: [] })).toBe("sarah");
  });

  it("agenda de démonstration : la planche 02 (Camille, mardi 10 novembre) et des jours complets", () => {
    expect(free(TUE, "coupe-brushing", "camille", core.demoAgenda(cfg, TUE))).toEqual(["09:00", "10:30", "14:00", "15:30"]);
    expect(core.dayStatus(cfg, { date: "2026-11-18", service: "coupe-brushing", staff: "any", busy: core.demoAgenda(cfg, "2026-11-18") }, AT)).toBe("full");
  });

  it("coordonnées requises, conditions acceptées, formats, fichier d'agenda à l'heure du salon", () => {
    expect(core.validate(cfg, { service: "brushing", date: TUE, time: "10:00", contact: { firstName: "", lastName: "M", email: "x", phone: "12", terms: false } }, {}, AT)).toEqual(["firstName", "email", "phone", "terms"]);
    expect(core.formatDuration(45)).toBe("45 min");
    expect(core.formatDuration(105)).toBe("1 h 45");
    expect(core.formatDuration(60)).toBe("1 h");
    expect(core.formatDuration(150)).toBe("2 h 30");
    expect(core.formatPrice(120, true)).toBe("À partir de 120 €");
    expect(core.formatPrice(45, false, "en")).toBe("€45");
    expect(core.formatPrice(null, false)).toBe("");
    const ics = core.ics({ number: "AN-0001", date: TUE, time: "14:00", duration: 45 }, { timezone: "Europe/Paris", summary: "Coupe & brushing", now: AT });
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261110T140000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261110T144500");
  });

  it("aucune durée inventée : une prestation sans durée réglée n'est jamais réservable", () => {
    const c = core.normalize({ ...raw, services: [{ id: "x", name: "Sans durée", category: "coupe", price: 20 }] });
    expect(c.services[0].duration).toBeNull();
    expect(core.slotsFor(c, { date: TUE, service: "x" }, AT)).toEqual([]);
    expect(core.validate(c, { service: "x", date: TUE, time: "10:00" }, {}, AT)).toContain("service");
  });

  it("délai d'annulation réglé par le salon", () => {
    const c = core.normalize({ ...raw, cancelHours: 24 });
    expect(core.changeAllowed(c, { date: "2026-10-24", time: "11:00" }, AT)).toBe(false);
    expect(core.changeAllowed(c, { date: TUE, time: "11:00" }, AT)).toBe(true);
    expect(core.changeAllowed(cfg, { date: "2026-10-23", time: "11:00" }, AT)).toBe(false);
  });
});

describe("Service réel de rendez-vous (studio)", () => {
  let pid = "", other = "", demoPid = "";
  const base: CreateInput = { service: "coupe-brushing", staff: "camille", date: TUE, time: "14:00", firstName: "Julie", lastName: "Martin", email: "julie@example.com", phone: "06 12 34 56 78", terms: true };
  const live = (spec: ThemeSpec, extra: Record<string, unknown> = {}) => {
    const id = spec.groups.header.order.find((x) => spec.groups.header.sections[x].type === "an-salon")!;
    const sec = spec.groups.header.sections[id];
    const blocks = salonBlocks(AN_SERVICES.map((s) => ({ id: s.id, name: s.name, category: s.category, short: s.short, duration: s.duration, price: s.price, from: s.from })), AN_STAFF.map((m) => ({ id: m.id, name: m.name, initial: m.initial, title: m.title, skills: m.skills, days: m.days })));
    sec.blocks = Object.fromEntries(blocks.map((b, i) => [`b${i}`, b]));
    sec.block_order = blocks.map((_, i) => `b${i}`);
    Object.assign(sec.settings, { booking_mode: "live", service_url: "https://studio.example.invalid/api/public/salon/x", hours_tue: AN_HOURS.tue, hours_wed: AN_HOURS.wed, hours_thu: AN_HOURS.thu, hours_fri: AN_HOURS.fri, hours_sat: AN_HOURS.sat, ...extra });
    return spec;
  };
  beforeAll(async () => {
    const u = await createUser(`salon-${Date.now()}@example.invalid`, "isolated-test-only", "Salon");
    pid = seedHoldout(u.id, 2, "Salon A");
    other = seedHoldout(u.id, 2, "Salon B");
    demoPid = seedHoldout(u.id, 2, "Salon démo");
    saveThemeVersion(pid, live(serviceSpec("atelier-nuance" as never)), "test", "user");
    saveThemeVersion(other, live(serviceSpec("atelier-nuance" as never)), "test", "user");
    saveThemeVersion(demoPid, serviceSpec("atelier-nuance" as never), "test", "user");
  });

  it("refuse tout tant que le salon n'a pas activé le service réel (la démonstration ne passe jamais par le serveur)", () => {
    expect(() => liveSalon(demoPid)).toThrow(BookingError);
    expect(() => createAppointment(demoPid, base, AT)).toThrow(/not_live/);
    expect(liveSalon(pid).config.services.map((s) => s.id)).toEqual(AN_SERVICES.map((s) => s.id));
  });

  it("enregistre avec une référence non devinable, une seule fois en cas de double clic, sans chevauchement possible", () => {
    const r = createAppointment(pid, { ...base, idem: "idem-00000001" }, AT);
    expect(r.appointment.number).toMatch(/^AN-2026-[A-HJ-NP-Z2-9]{5}$/);
    expect(r.appointment).toMatchObject({ staff: "camille", start_min: 840, end_min: 885, price: 45 });
    expect(r.clientToken).toBeTruthy();
    const again = createAppointment(pid, { ...base, idem: "idem-00000001" }, AT);
    expect(again).toMatchObject({ duplicate: true, clientToken: null });
    // Autre client, même professionnel, créneau qui chevauche (14 h 30 pendant 14 h 00 – 14 h 45) : refusé, avec de vrais créneaux.
    try {
      createAppointment(pid, { ...base, email: "b@example.com", time: "14:30", idem: "idem-00000002" }, AT);
      throw new Error("aurait dû être refusé");
    } catch (e) {
      expect((e as BookingError).code).toBe("unavailable");
      const alt = (e as BookingError).details.alternatives as string[];
      expect(alt).toContain("15:00");
      expect(alt).not.toContain("14:00");
      expect(alt).not.toContain("14:30");
    }
    expect(busyFor(pid, TUE).camille).toEqual([[840, 885]]);
    expect(busyFor(other, TUE)).toEqual({});
  });

  it("course entre deux clients : le second obtient l'écran « créneau pris », jamais une double réservation", () => {
    const one = createAppointment(pid, { ...base, email: "c1@example.com", time: "16:00", idem: "idem-race-0001" }, AT);
    expect(one.appointment.number).toBeTruthy();
    expect(() => createAppointment(pid, { ...base, email: "c2@example.com", time: "16:00", idem: "idem-race-0002" }, AT)).toThrow(/unavailable/);
    expect(busyFor(pid, TUE).camille.filter(([s]) => s === 960)).toHaveLength(1);
  });

  it("« Sans préférence » attribue un professionnel réellement libre et compétent", () => {
    const busyBefore = busyFor(pid, "2026-11-11");
    expect(busyBefore).toEqual({});
    const a = createAppointment(pid, { ...base, service: "brushing", staff: "any", date: "2026-11-11", time: "10:00", email: "any1@example.com", idem: "idem-any-00001" }, AT);
    const b = createAppointment(pid, { ...base, service: "brushing", staff: "any", date: "2026-11-11", time: "10:00", email: "any2@example.com", idem: "idem-any-00002" }, AT);
    expect(a.appointment.staff).not.toBe(b.appointment.staff);
    expect(["camille", "alex", "sarah"]).toContain(b.appointment.staff);
    expect(availability(pid, { date: "2026-11-11", service: "coupe-brushing", staff: "any" }, AT).slots.find((s) => s.time === "10:00")!.available).toBe(a.appointment.staff !== "camille" && b.appointment.staff !== "camille");
  });

  it("jeton de rendez-vous : ce rendez-vous seulement ; jeton client : tout l'espace et les préférences ; lien expiré", () => {
    const first = createAppointment(pid, { ...base, email: "eve@example.com", time: "09:00", date: "2026-11-12", idem: "idem-eve-00001" }, AT);
    // Quelqu'un réserve avec l'adresse d'Ève : il n'accède qu'à SON rendez-vous, jamais à ceux d'Ève.
    const intruder = createAppointment(pid, { ...base, email: "eve@example.com", firstName: "Intrus", time: "10:00", date: "2026-11-12", idem: "idem-eve-00002" }, AT);
    const view = me(pid, intruder.clientToken!, AT);
    expect(view.scope).toBe("appt");
    expect([...view.upcoming, ...view.past].map((a) => a.number)).toEqual([intruder.appointment.number]);
    expect(view.client.email).toBe("e**@example.com");
    expect(() => updateMe(pid, intruder.clientToken!, { phone: "00" }, AT)).toThrow(/scope/);
    // Lien reçu par e-mail (accès client) : tous ses rendez-vous, informations modifiables et relues.
    const access = clientAccess(pid, first.appointment.client_id, AT);
    const full = me(pid, access, AT);
    expect(full.scope).toBe("client");
    expect(full.upcoming.map((a) => a.number).sort()).toEqual([first.appointment.number, intruder.appointment.number].sort());
    expect(full.client.firstName).toBe("Julie"); // la seconde réservation n'a pas modifié la fiche existante
    updateMe(pid, access, { phone: "07 00 00 00 00", prefs: { staff: "camille", reminders: true } }, AT);
    expect(me(pid, access, AT).client).toMatchObject({ phone: "07 00 00 00 00", prefs: { staff: "camille", reminders: true } });
    expect(() => me(other, access, AT)).toThrow(/not_found/);
    expect(() => me(pid, access, AT + CLIENT_LINK_MS + 1000)).toThrow(/expired/);
  });

  it("déplacement atomique (l'ancien créneau n'est libéré qu'avec le nouveau) et annulation définitive", () => {
    const r = createAppointment(pid, { ...base, email: "move@example.com", date: "2026-11-13", time: "09:00", idem: "idem-move-0001" }, AT);
    const blocker = createAppointment(pid, { ...base, email: "block@example.com", date: "2026-11-13", time: "11:00", idem: "idem-move-0002" }, AT);
    // Vers un créneau qui chevauche celui d'un autre client : refusé, l'ancien reste réservé.
    expect(() => moveAppointment(pid, r.clientToken!, r.appointment.number, { date: "2026-11-13", time: "10:30" }, AT)).toThrow(/unavailable/);
    expect(busyFor(pid, "2026-11-13").camille).toEqual(expect.arrayContaining([[540, 585], [660, 705]]));
    // Juste avant lui-même (chevauchement avec son propre créneau autorisé).
    const moved = moveAppointment(pid, r.clientToken!, r.appointment.number, { date: "2026-11-13", time: "09:30" }, AT);
    expect(moved).toMatchObject({ date: "2026-11-13", time: "09:30", duration: 45 });
    expect(busyFor(pid, "2026-11-13").camille).toEqual(expect.arrayContaining([[570, 615]]));
    expect(busyFor(pid, "2026-11-13").camille).not.toEqual(expect.arrayContaining([[540, 585]]));
    // Un autre client ne peut ni déplacer ni annuler ce rendez-vous.
    expect(() => cancelAppointment(pid, blocker.clientToken!, r.appointment.number, AT)).toThrow(/not_found/);
    expect(cancelAppointment(pid, r.clientToken!, r.appointment.number, AT).status).toBe("canceled");
    expect(busyFor(pid, "2026-11-13").camille).toEqual([[660, 705]]);
    expect(() => moveAppointment(pid, r.clientToken!, r.appointment.number, { date: "2026-11-13", time: "14:00" }, AT)).toThrow(/canceled/);
  });

  it("calendrier du mois : passé, fermé, ouvert ; et recherche toujours neutre", async () => {
    const m = monthAvailability(pid, { month: "2026-11", service: "coupe-brushing", staff: "camille" }, AT);
    expect(m.days["2026-11-09"]).toBe("closed");
    expect(m.days["2026-11-10"]).toBe("open");
    expect(monthAvailability(pid, { month: "2026-10", service: "coupe-brushing" }, AT).days["2026-10-01"]).toBe("past");
    expect(await lookup(pid, "AN-2026-ZZZZZ", "julie@example.com", AT)).toEqual({ ok: true });
    expect(await lookup(pid, "AN-2026-ZZZZZ", "personne@example.com", AT)).toEqual({ ok: true });
  });

  it("API publique : CORS, démonstration refusée, création, conflit, espace par jeton, données d'un autre salon jamais lues", async () => {
    const ctx = (path: string[], id = pid) => ({ params: Promise.resolve({ projectId: id, path }) });
    expect((await OPTIONS()).headers.get("Access-Control-Allow-Origin")).toBe("*");
    const post = (path: string[], body: unknown, id = pid, token = "") => POST(new Request(`http://x/api/public/salon/${id}/${path.join("/")}`, { method: "POST", headers: token ? { "X-Client-Token": token } : {}, body: JSON.stringify(body) }), ctx(path, id));
    expect((await post(["appointments"], base, demoPid)).status).toBe(403);
    const created = await post(["appointments"], { ...base, email: "api@example.com", date: "2026-11-14", time: "10:00", idem: "idem-api-0001" });
    expect(created.status).toBe(201);
    const body = await created.json() as { appointment: { number: string; time: string }; clientToken: string; email: string };
    expect(body.email).toBe("not_configured"); // aucun e-mail prétendu envoyé
    const clash = await post(["appointments"], { ...base, email: "api2@example.com", date: "2026-11-14", time: "10:30", idem: "idem-api-0002" });
    expect(clash.status).toBe(409);
    expect(((await clash.json()) as { alternatives: string[] }).alternatives).not.toContain("10:30");
    const anon = await GET(new Request(`http://x/api/public/salon/${pid}/me`), ctx(["me"]));
    expect(anon.status).toBe(401);
    const mine = await GET(new Request(`http://x/api/public/salon/${pid}/me`, { headers: { "X-Client-Token": body.clientToken } }), ctx(["me"]));
    expect(((await mine.json()) as { upcoming: { number: string }[] }).upcoming.map((a) => a.number)).toEqual([body.appointment.number]);
    const elsewhere = await GET(new Request(`http://x/api/public/salon/${other}/me`, { headers: { "X-Client-Token": body.clientToken } }), ctx(["me"], other));
    expect(elsewhere.status).toBe(401);
    expect(await (await post(["lookup"], { reference: body.appointment.number, email: "api@example.com" })).json()).toEqual({ ok: true });
    const av = await GET(new Request(`http://x/api/public/salon/${pid}/availability?date=2026-11-14&service=coupe-brushing&staff=camille`), ctx(["availability"]));
    expect(((await av.json()) as { slots: { time: string; available: boolean }[] }).slots.find((s) => s.time === "10:00")!.available).toBe(false);
  });
});
