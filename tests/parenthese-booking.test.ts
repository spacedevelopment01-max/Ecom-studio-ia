/**
 * PARENTHÈSE : calcul des rendez-vous (theme-base/assets/parenthese-core.js, partagé par le site et le serveur) et service
 * réel du studio (src/lib/cabinet/booking.ts + API publique) : créneaux sur toute la durée, cabinet ou visio, ateliers à
 * places comptées (jamais négatives, place rendue à l'annulation), course entre deux personnes, modification atomique,
 * jetons limités dans le temps, recherche neutre, isolation par cabinet, fichier d'agenda à l'heure de Paris.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { saveThemeVersion } from "@/lib/projects";
import { ACCESS_LINK_MS, BookingError, accessToken, appointmentFor, availability, busyFor, cancelAppointment, core, createAppointment, liveCabinet, lookup, monthAvailability, moveAppointment, saveNote, saveRequest, takenFor, workshops, type CreateInput } from "@/lib/cabinet/booking";
import { cabinetBlocks } from "@/lib/theme/parenthese";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { PA_ATELIERS, PA_HOURS, PA_SEANCES } from "./parenthese-fixtures";
import { GET, OPTIONS, POST } from "@/app/api/public/cabinet/[projectId]/[[...path]]/route";
import type { ThemeSpec } from "@/lib/theme/spec";

// 24 octobre 2026, 12 h à Paris.
const AT = Date.UTC(2026, 9, 24, 10, 0);
const TUE = "2026-11-10";
const raw = {
  timezone: "Europe/Paris", hours: { 0: PA_HOURS.sun, 1: PA_HOURS.mon, 2: PA_HOURS.tue, 3: PA_HOURS.wed, 4: PA_HOURS.thu, 5: PA_HOURS.fri, 6: PA_HOURS.sat }, closures: "2026-12-24..2026-12-26", step: 60, horizonDays: 90, leadMinutes: 720, cancelHours: 24,
  seances: PA_SEANCES.map((s) => ({ id: s.id, name: s.name, short: s.short, duration: s.duration, price: s.price, modes: s.modes })),
  ateliers: PA_ATELIERS.map((a) => ({ id: a.id, title: a.title, tags: a.tags, theme: a.theme, date: a.date, time: a.time, duration: a.duration, price: a.price, capacity: a.capacity, booked: a.booked, place: "" })),
};
const cfg = core.normalize(raw);
const free = (date: string, service = "premiere", busy: [number, number][] = [], modality = "cabinet") => core.slotsFor(cfg, { date, service, modality, busy }, AT).filter((s) => s.available).map((s) => s.time);

describe("Calcul des créneaux (même règle pour le site et le serveur)", () => {
  it("dates passées, fermetures, dimanche fermé, horizon, dans le fuseau du cabinet", () => {
    expect(core.dateStatus(cfg, "2026-10-23", AT)).toBe("past");
    expect(core.dateStatus(cfg, "2026-10-25", AT)).toBe("closed"); // dimanche
    expect(core.dateStatus(cfg, "2026-12-24", AT)).toBe("closed");
    expect(core.dateStatus(cfg, "2027-02-01", AT)).toBe("beyond");
    expect(core.dateStatus(cfg, TUE, AT)).toBe("open");
    expect(core.nowIn("Europe/Paris", Date.UTC(2026, 9, 24, 22, 30)).date).toBe("2026-10-25");
  });

  it("toute la durée doit tenir dans les horaires, sans chevaucher un rendez-vous ni un atelier", () => {
    expect(free(TUE)).toEqual(["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"]);
    expect(free(TUE, "premiere", [[600, 660]])).not.toContain("10:00");
    // Samedi 14 novembre : matinée seulement, et l'atelier de 10 h 00 à 11 h 15 occupe la praticienne.
    expect(free("2026-11-14")).toEqual(["09:00"]);
    // Délai minimal (12 h) : demain matin 9 h est trop tôt depuis aujourd'hui midi ? Non (21 h d'écart) ; aujourd'hui, plus rien.
    expect(free("2026-10-24")).toEqual([]);
  });

  it("modalité : cabinet ou visio selon la séance ; une modalité non proposée n'a aucun créneau", () => {
    const c = core.normalize({ ...raw, seances: [{ id: "x", name: "Visio seulement", duration: 60, price: 60, modes: "visio" }] });
    expect(core.slotsFor(c, { date: TUE, service: "x", modality: "cabinet" }, AT)).toEqual([]);
    expect(core.slotsFor(c, { date: TUE, service: "x", modality: "visio" }, AT).length).toBeGreaterThan(0);
    expect(core.validate(c, { service: "x", modality: "cabinet", date: TUE, time: "09:00" }, {}, AT)).toContain("modality");
  });

  it("agenda de démonstration : la planche 04 (mardi 10 novembre : 9 h, 11 h, 14 h, 16 h) et des jours complets", () => {
    expect(free(TUE, "premiere", core.demoAgenda(cfg, TUE) as [number, number][])).toEqual(["09:00", "11:00", "14:00", "16:00"]);
    expect(core.dayStatus(cfg, { date: "2026-11-13", service: "premiere", busy: core.demoAgenda(cfg, "2026-11-13") }, AT)).toBe("full");
  });

  it("ateliers : places restantes jamais négatives, complet, passé, réglage incomplet", () => {
    const a = core.atelierById(cfg, "moment-ralentir")!;
    expect(core.remaining(a, 3)).toBe(9);
    expect(core.remaining(a, 40)).toBe(0);
    expect(core.atelierStatus(cfg, a, 12, AT)).toBe("full");
    expect(core.atelierStatus(cfg, a, 11, AT)).toBe("open");
    expect(core.atelierStatus(cfg, a, 0, Date.UTC(2026, 10, 29))).toBe("past");
    expect(core.atelierStatus(cfg, { ...a, capacity: null }, 0, AT)).toBe("invalid");
    expect(core.validate(cfg, { kind: "atelier", atelier: "moment-ralentir" }, { taken: 12 }, AT)).toEqual(["full"]);
  });

  it("coordonnées : prénom, nom, e-mail et conditions requis ; téléphone facultatif mais vérifié s'il est donné", () => {
    expect(core.validate(cfg, { service: "premiere", modality: "cabinet", date: TUE, time: "09:00", contact: { firstName: "", lastName: "", email: "x", phone: "", terms: false } }, {}, AT)).toEqual(["firstName", "lastName", "email", "terms"]);
    expect(core.validate(cfg, { service: "premiere", modality: "cabinet", date: TUE, time: "09:00", contact: { firstName: "A", lastName: "B", email: "a@b.fr", phone: "abc", terms: true } }, {}, AT)).toEqual(["phone"]);
  });

  it("formats français et anglais, aucun prix inventé, fichier d'agenda à l'heure de Paris", () => {
    expect(core.formatDuration(60, "fr", "minutes")).toBe("60 minutes");
    expect(core.formatDuration(75, "fr", "both")).toBe("1h15 (75 min)");
    expect(core.formatPrice(60, "fr")).toBe("60 €");
    expect(core.formatPrice(20, "en")).toBe("€20");
    expect(core.formatPrice(null, "fr")).toBe("");
    expect(core.formatTime("14:00", "fr")).toBe("14h00");
    expect(core.formatDate(TUE, "fr")).toBe("Mardi 10 novembre 2026");
    const ics = core.ics({ number: "P-0001", date: TUE, time: "14:00", duration: 60 }, { timezone: "Europe/Paris", summary: "Première séance", now: AT });
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261110T140000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261110T150000");
    expect(core.maskEmail("julie@example.com")).toBe("j****@example.com");
  });

  it("délai d'annulation réglé par le cabinet", () => {
    expect(core.changeAllowed(cfg, { date: "2026-10-25", time: "11:00" }, AT)).toBe(false);
    expect(core.changeAllowed(cfg, { date: TUE, time: "11:00" }, AT)).toBe(true);
  });

  it("démonstration : les dates d'ateliers passées avancent de semaines entières (même jour de la semaine)", () => {
    const later = core.demoShift(core.normalize(raw), Date.UTC(2026, 11, 1, 10));
    expect(later.ateliers.map((a) => a.date)).toEqual(["2026-12-05", "2026-12-12", "2026-12-19"]);
    expect(later.ateliers.every((a) => core.weekday(a.date) === 6)).toBe(true);
  });
});

describe("Service réel de rendez-vous (studio)", () => {
  let pid = "", other = "", demoPid = "";
  const base: CreateInput = { kind: "seance", service: "premiere", modality: "cabinet", date: TUE, time: "14:00", firstName: "Julie", lastName: "Martin", email: "julie@example.com", phone: "", terms: true };
  const live = (spec: ThemeSpec, extra: Record<string, unknown> = {}) => {
    const id = spec.groups.header.order.find((x) => spec.groups.header.sections[x].type === "pa-cabinet")!;
    const sec = spec.groups.header.sections[id];
    const blocks = cabinetBlocks(PA_SEANCES.map((s) => ({ id: s.id, name: s.name, short: s.short, duration: s.duration, price: s.price, modes: s.modes })), PA_ATELIERS.map((a) => ({ id: a.id, title: a.title, short: "", tags: a.tags, theme: a.theme, date: a.date, time: a.time, duration: a.duration, price: a.price, capacity: a.capacity, booked: a.booked, place: "" })));
    sec.blocks = Object.fromEntries(blocks.map((b, i) => [`b${i}`, b]));
    sec.block_order = blocks.map((_, i) => `b${i}`);
    Object.assign(sec.settings, { booking_mode: "live", service_url: "https://studio.example.invalid/api/public/cabinet/x", address: "[Adresse du cabinet]", hours_mon: PA_HOURS.mon, hours_tue: PA_HOURS.tue, hours_wed: PA_HOURS.wed, hours_thu: PA_HOURS.thu, hours_fri: PA_HOURS.fri, hours_sat: PA_HOURS.sat, ...extra });
    return spec;
  };
  beforeAll(async () => {
    const u = await createUser(`cabinet-${Date.now()}@example.invalid`, "isolated-test-only", "Cabinet");
    pid = seedHoldout(u.id, 2, "Cabinet A");
    other = seedHoldout(u.id, 2, "Cabinet B");
    demoPid = seedHoldout(u.id, 2, "Cabinet démo");
    saveThemeVersion(pid, live(serviceSpec("parenthese" as never)), "test", "user");
    saveThemeVersion(other, live(serviceSpec("parenthese" as never)), "test", "user");
    saveThemeVersion(demoPid, serviceSpec("parenthese" as never), "test", "user");
  });

  it("refuse tout tant que le cabinet n'a pas activé le service réel (la démonstration ne passe jamais par le serveur)", () => {
    expect(() => liveCabinet(demoPid)).toThrow(BookingError);
    expect(() => createAppointment(demoPid, base, AT)).toThrow(/not_live/);
    expect(liveCabinet(pid).config.seances.map((s) => s.id)).toEqual(["premiere", "suivi"]);
    // Service réel : seules les vraies réservations comptent, jamais les places « déjà prises » de la démonstration.
    expect(liveCabinet(pid).config.ateliers.every((a) => a.booked === 0)).toBe(true);
  });

  it("réserve une séance avec une référence non devinable, une seule fois en cas de double clic, sans chevauchement", () => {
    const r = createAppointment(pid, { ...base, idem: "idem-00000001" }, AT);
    expect(r.appointment.number).toMatch(/^P-2026-[A-HJ-NP-Z2-9]{5}$/);
    expect(r.appointment).toMatchObject({ kind: "seance", modality: "cabinet", start_min: 840, end_min: 900, price: 60 });
    expect(r.token).toBeTruthy();
    expect(createAppointment(pid, { ...base, idem: "idem-00000001" }, AT)).toMatchObject({ duplicate: true, token: null });
    try {
      createAppointment(pid, { ...base, service: "suivi", modality: "visio", email: "b@example.com", idem: "idem-00000002" }, AT);
      throw new Error("aurait dû être refusé");
    } catch (e) {
      expect((e as BookingError).code).toBe("unavailable");
      const alt = (e as BookingError).details.alternatives as string[];
      expect(alt).toContain("15:00");
      expect(alt).not.toContain("14:00");
    }
    expect(busyFor(pid, TUE)).toEqual([[840, 900]]);
    expect(busyFor(other, TUE)).toEqual([]);
  });

  it("course entre deux personnes : la seconde obtient « créneau pris », jamais une double réservation", () => {
    createAppointment(pid, { ...base, email: "c1@example.com", time: "16:00", idem: "idem-race-0001" }, AT);
    expect(() => createAppointment(pid, { ...base, email: "c2@example.com", time: "16:00", modality: "visio", idem: "idem-race-0002" }, AT)).toThrow(/unavailable/);
    expect(busyFor(pid, TUE).filter(([s]) => s === 960)).toHaveLength(1);
  });

  it("visio : aucune adresse donnée ; cabinet : adresse du cabinet", () => {
    const v = createAppointment(pid, { ...base, modality: "visio", date: "2026-11-12", time: "09:00", email: "visio@example.com", idem: "idem-visio-001" }, AT);
    expect(appointmentFor(pid, v.token!, AT).appointment).toMatchObject({ modality: "visio", place: "", email: "v****@example.com" });
    const c = createAppointment(pid, { ...base, date: "2026-11-12", time: "10:00", email: "cab@example.com", idem: "idem-cab-0001" }, AT);
    expect(appointmentFor(pid, c.token!, AT).appointment.place).toBe("[Adresse du cabinet]");
  });

  it("atelier : places comptées dans une transaction, jamais négatives, une seule inscription par adresse, place rendue à l'annulation", () => {
    const one = (email: string) => createAppointment(pid, { ...base, kind: "atelier", service: "moment-ralentir", email, idem: `idem-ws-${email.slice(0, 6)}` }, AT);
    const first = one("w01@example.com");
    expect(first.appointment).toMatchObject({ kind: "atelier", date: "2026-11-28", start_min: 600, end_min: 675, price: 20 });
    expect(() => createAppointment(pid, { ...base, kind: "atelier", service: "moment-ralentir", email: "w01@example.com", idem: "idem-ws-again1" }, AT)).toThrow(/duplicate/);
    for (let i = 2; i <= 12; i++) one(`w${String(i).padStart(2, "0")}@example.com`);
    expect(takenFor(pid, "moment-ralentir")).toBe(12);
    expect(workshops(pid, AT).ateliers.find((a) => a.id === "moment-ralentir")).toMatchObject({ remaining: 0, status: "full" });
    expect(() => one("w13@example.com")).toThrow(/full/);
    expect(takenFor(pid, "moment-ralentir")).toBe(12);
    // Un atelier ne se déplace pas ; son annulation rend la place.
    expect(() => moveAppointment(pid, first.token!, { date: TUE, time: "09:00" }, AT)).toThrow(/not_movable/);
    expect(cancelAppointment(pid, first.token!, AT).status).toBe("canceled");
    expect(workshops(pid, AT).ateliers.find((a) => a.id === "moment-ralentir")).toMatchObject({ remaining: 1, status: "open" });
    // L'atelier occupe aussi l'agenda des séances du samedi.
    expect(availability(pid, { date: "2026-11-28", service: "premiere" }, AT).slots.filter((s) => s.available).map((s) => s.time)).toEqual(["09:00"]);
  });

  it("modification atomique (l'ancien créneau n'est libéré qu'avec le nouveau), puis annulation définitive", () => {
    const r = createAppointment(pid, { ...base, email: "move@example.com", date: "2026-11-13", time: "09:00", idem: "idem-move-0001" }, AT);
    const blocker = createAppointment(pid, { ...base, email: "block@example.com", date: "2026-11-13", time: "11:00", idem: "idem-move-0002" }, AT);
    expect(() => moveAppointment(pid, r.token!, { date: "2026-11-13", time: "11:00" }, AT)).toThrow(/unavailable/);
    expect(busyFor(pid, "2026-11-13")).toEqual(expect.arrayContaining([[540, 600], [660, 720]]));
    // Le calendrier de modification ne compte pas le rendez-vous lui-même.
    expect(availability(pid, { date: "2026-11-13", service: "premiere", exceptId: r.appointment.id }, AT).slots.find((s) => s.time === "09:00")!.available).toBe(true);
    const moved = moveAppointment(pid, r.token!, { date: "2026-11-13", time: "14:00" }, AT);
    expect(moved).toMatchObject({ date: "2026-11-13", time: "14:00", duration: 60 });
    expect(busyFor(pid, "2026-11-13")).not.toEqual(expect.arrayContaining([[540, 600]]));
    // Une autre personne ne peut ni modifier ni annuler ce rendez-vous : son jeton n'ouvre que le sien.
    expect(appointmentFor(pid, blocker.token!, AT).appointment.number).toBe(blocker.appointment.number);
    expect(cancelAppointment(pid, r.token!, AT).status).toBe("canceled");
    expect(busyFor(pid, "2026-11-13")).toEqual([[660, 720]]);
    expect(() => moveAppointment(pid, r.token!, { date: "2026-11-16", time: "09:00" }, AT)).toThrow(/canceled/);
  });

  it("délai d'annulation : plus de modification ni d'annulation en ligne à moins de 24 h", () => {
    const r = createAppointment(pid, { ...base, email: "late@example.com", date: "2026-11-16", time: "09:00", idem: "idem-late-0001" }, AT);
    const dayBefore = Date.UTC(2026, 10, 15, 10, 0);
    expect(appointmentFor(pid, r.token!, dayBefore).changeAllowed).toBe(false);
    expect(() => cancelAppointment(pid, r.token!, dayBefore)).toThrow(/too_late/);
  });

  it("note personnelle, jetons à durée limitée, isolés par cabinet ; recherche toujours neutre", async () => {
    const r = createAppointment(pid, { ...base, email: "note@example.com", date: "2026-11-17", time: "09:00", idem: "idem-note-0001" }, AT);
    expect(saveNote(pid, r.token!, "  Penser à mon carnet  ", AT)).toEqual({ personalNote: "Penser à mon carnet" });
    expect(appointmentFor(pid, r.token!, AT).appointment.personalNote).toBe("Penser à mon carnet");
    expect(() => appointmentFor(other, r.token!, AT)).toThrow(/not_found/);
    const link = accessToken(pid, r.appointment.id, AT);
    expect(appointmentFor(pid, link, AT).appointment.number).toBe(r.appointment.number);
    expect(() => appointmentFor(pid, link, AT + ACCESS_LINK_MS + 1000)).toThrow(/expired/);
    expect(() => appointmentFor(pid, "inconnu", AT)).toThrow(/not_found/);
    // Bonne, mauvaise ou inexistante : la même réponse, sans rien révéler.
    expect(await lookup(pid, r.appointment.number, "note@example.com", AT)).toEqual({ ok: true });
    expect(await lookup(pid, r.appointment.number, "autre@example.com", AT)).toEqual({ ok: true });
    expect(await lookup(pid, "P-2026-ZZZZZ", "x@example.com", AT)).toEqual({ ok: true });
  });

  it("messages (contact, entreprise, inscription) : enregistrés, jamais annoncés « transmis » sans envoi réel", async () => {
    expect(await saveRequest(pid, "entreprise", { email: "rh@example.com", structure: "Exemple", message: "Bonjour" }, AT)).toMatchObject({ forwarded: "not_configured" });
    await expect(saveRequest(pid, "autre", { email: "rh@example.com" }, AT)).rejects.toThrow(/invalid/);
    await expect(saveRequest(pid, "contact", { email: "pas-une-adresse" }, AT)).rejects.toThrow(/invalid/);
  });

  it("calendrier du mois : jours complets, fermés et passés", () => {
    const m = monthAvailability(pid, { month: "2026-11", service: "premiere" }, AT);
    expect(m.days["2026-11-01"]).toBe("closed");
    expect(m.days[TUE]).toBe("open");
    expect(() => monthAvailability(pid, { month: "novembre", service: "premiere" }, AT)).toThrow(/invalid/);
  });

  it("API publique : CORS, réservation, accès par jeton (en-tête), modification, refus d'un cabinet en démonstration", async () => {
    const ctx = (path: string[], projectId = pid) => ({ params: Promise.resolve({ projectId, path }) });
    expect((await OPTIONS()).status).toBe(204);
    const post = (path: string[], body: unknown, headers: Record<string, string> = {}, projectId = pid) => POST(new Request(`https://studio.example.invalid/api/public/cabinet/${projectId}/${path.join("/")}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", ...headers } }), ctx(path, projectId));
    const get = (path: string, headers: Record<string, string> = {}, projectId = pid) => GET(new Request(`https://studio.example.invalid/api/public/cabinet/${projectId}/${path}`, { headers }), ctx(path.split("?")[0].split("/"), projectId));
    const res = await post(["appointments"], { kind: "seance", service: "suivi", modality: "visio", date: "2026-11-18", time: "15:00", firstName: "Léa", lastName: "Durand", email: "lea@example.com", terms: true, idem: "idem-api-00001" });
    expect(res.status).toBe(201);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    const out = await res.json();
    expect(out.appointment).toMatchObject({ modality: "visio", time: "15:00", place: "" });
    expect(out.email).toBe("not_configured");
    const seen = await (await get("appointment", { "x-access-token": out.token })).json();
    expect(seen.appointment.number).toBe(out.appointment.number);
    const mine = await (await get(`availability?date=2026-11-18&service=suivi&modality=visio&mine=1`, { "x-access-token": out.token })).json();
    expect(mine.slots.find((s: { time: string }) => s.time === "15:00").available).toBe(true);
    const moved = await (await post(["appointment", "move"], { date: "2026-11-18", time: "16:00" }, { "x-access-token": out.token })).json();
    expect(moved.appointment.time).toBe("16:00");
    expect((await get("appointment", { "x-access-token": "faux" })).status).toBe(401);
    expect((await post(["appointments"], { ...base, idem: "idem-api-00002" }, {}, demoPid)).status).toBe(403);
    expect((await (await get("workshops")).json()).ateliers).toHaveLength(3);
  });
});
