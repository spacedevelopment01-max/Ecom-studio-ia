/**
 * Prestations, horaires et intervenants (#239, phase 2) : une saisie dans le studio → la source lue par le moteur de
 * réservation, une version du site, les textes affichés remis d'accord ; rendez-vous confirmé intact ; suppression
 * refusée tant qu'il reste des rendez-vous ; formats validés ; cabinet et restaurant ; droits. Aucun réseau.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { withAccessScope } from "@/lib/access-scope";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { createAppointment, liveSalon, type CreateInput } from "@/lib/salon/booking";
import { liveCabinet } from "@/lib/cabinet/booking";
import { readPrestations, savePrestations } from "@/lib/contenus/prestations";
import { salonBlocks } from "@/lib/theme/atelier-nuance";
import { rdvSection } from "@/lib/rendez-vous";
import { bookingBlockers } from "@/lib/sites/publish";
import * as route from "@/app/api/projects/[id]/prestations/route";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { AN_HOURS, AN_SERVICES, AN_STAFF } from "./atelier-nuance-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

const AT = Date.UTC(2026, 9, 23, 10, 0);
const TUE = "2026-11-10";
const live = (spec: ThemeSpec) => {
  const id = spec.groups.header.order.find((x) => spec.groups.header.sections[x].type === "an-salon")!;
  const sec = spec.groups.header.sections[id];
  const blocks = salonBlocks(AN_SERVICES.map((s) => ({ id: s.id, name: s.name, category: s.category, short: s.short, duration: s.duration, price: s.price, from: s.from })), AN_STAFF.map((m) => ({ id: m.id, name: m.name, initial: m.initial, title: m.title, skills: m.skills, days: m.days })));
  sec.blocks = Object.fromEntries(blocks.map((b, i) => [`b${i}`, b]));
  sec.block_order = blocks.map((_, i) => `b${i}`);
  Object.assign(sec.settings, { booking_mode: "live", service_url: "https://studio.example.invalid/api/public/salon/x", hours_tue: AN_HOURS.tue, hours_wed: AN_HOURS.wed, hours_thu: AN_HOURS.thu, hours_fri: AN_HOURS.fri, hours_sat: AN_HOURS.sat });
  return spec;
};
const base: CreateInput = { service: "coupe-brushing", staff: "camille", date: TUE, time: "14:00", firstName: "Julie", lastName: "Fictive", email: "julie@example.test", phone: "06 00 00 00 00", terms: true };
const input = (pid: string) => { const r = readPrestations(pid)!; return { services: r.services.map(({ upcoming: _u, ...s }) => ({ ...s, duration: s.duration ?? 30 })), staff: r.staff, hours: r.hours, closures: r.closures }; };
const shownTexts = (spec: ThemeSpec, sid: string) => {
  const out: string[] = [];
  for (const t of [spec.groups.header, spec.groups.footer, ...Object.values(spec.templates)]) for (const s of Object.values(t?.sections ?? {})) {
    if (s.type === "an-salon") continue;
    for (const v of [s.settings ?? {}, ...Object.values(s.blocks ?? {}).map((b) => b.settings ?? {})]) if ((v as Record<string, unknown>).service_id === sid) out.push(`${(v as Record<string, unknown>).price ?? ""}|${(v as Record<string, unknown>).duration ?? ""}`);
  }
  return out;
};

let uid = "", salon = "", cabinet = "", restaurant = "";
beforeAll(async () => {
  const u = await createUser(`presta-${Date.now()}@example.invalid`, "isolated-test-only", "Prestations");
  uid = u.id;
  salon = seedHoldout(u.id, 2, "Salon fictif");
  saveThemeVersion(salon, live(serviceSpec("atelier-nuance" as never)), "test", "user");
  cabinet = seedHoldout(u.id, 2, "Cabinet fictif");
  saveThemeVersion(cabinet, serviceSpec("parenthese" as never), "test", "user");
  restaurant = seedHoldout(u.id, 2, "Restaurant fictif");
  saveThemeVersion(restaurant, serviceSpec("table-saison" as never), "test", "user");
});

describe("Salon : une saisie, une source", () => {
  it("prix et durée changés une fois : moteur, textes affichés et version du site d'accord ; rendez-vous confirmé intact", () => {
    const booked = createAppointment(salon, base, AT).appointment;
    expect(booked.price).toBe(45);
    const before = currentTheme(salon)!.version.number;
    const inp = input(salon);
    const cb = inp.services.find((s) => s.id === "coupe-brushing")!;
    cb.price = 52; cb.duration = 60;
    const r = savePrestations(salon, inp);
    expect(r.number).toBe(before + 1);
    expect(r.warnings.join(" ")).toMatch(/gardent leur durée enregistrée \(45 min\)/);
    const cfg = liveSalon(salon).config;
    expect(cfg.services.find((s) => s.id === "coupe-brushing")).toMatchObject({ price: 52, duration: 60 });
    // Textes « affichés sans script » remplis : remis d'accord ; ceux laissés vides restent vides.
    for (const t of shownTexts(currentTheme(salon)!.spec as ThemeSpec, "coupe-brushing")) {
      const [price, duration] = t.split("|");
      if (price) expect(price).toBe("52 €");
      if (duration) expect(duration).toBe("1 h");
    }
    // Le rendez-vous déjà pris garde son prix et sa durée.
    const still = one<{ price: number; start_min: number; end_min: number }>("SELECT price, start_min, end_min FROM salon_appointments WHERE id = ?", booked.id)!;
    expect(still.price).toBe(45);
    expect(still.end_min - still.start_min).toBe(45);
  });

  it("suppression refusée tant qu'il reste des rendez-vous à venir ; prestation sans rendez-vous supprimée ; nouvelle prestation", () => {
    const inp = input(salon);
    expect(() => savePrestations(salon, { ...inp, services: inp.services.filter((s) => s.id !== "coupe-brushing") })).toThrow(/rendez-vous à venir/);
    const victim = inp.services.find((s) => s.id !== "coupe-brushing" && !(readPrestations(salon)!.services.find((x) => x.id === s.id)!.upcoming))!;
    const r = savePrestations(salon, { ...inp, services: [...inp.services.filter((s) => s.id !== victim.id), { name: "Coupe enfant", category: "coupe", short: "", duration: 30, price: 25, priceFrom: false }] });
    const ids = r.prestations!.services.map((s) => s.id);
    expect(ids).not.toContain(victim.id);
    expect(ids).toContain("coupe-enfant");
    expect(liveSalon(salon).config.services.find((s) => s.id === "coupe-enfant")).toMatchObject({ price: 25, duration: 30 });
  });

  it("horaires, fermetures et intervenants validés et enregistrés dans la source", () => {
    const inp = input(salon);
    expect(() => savePrestations(salon, { ...inp, hours: { ...inp.hours, mon: "18:00-09:00" } })).toThrow(/heure de fin/);
    expect(() => savePrestations(salon, { ...inp, hours: { ...inp.hours, mon: "le matin" } })).toThrow(/horaires/);
    expect(() => savePrestations(salon, { ...inp, closures: "Noël" })).toThrow(/fermetures/);
    savePrestations(salon, { ...inp, address: "8 place Fictive, 69002 Lyon", hours: { ...inp.hours, mon: "10:00 - 13:00 ,14:00-18:00" }, closures: "2026-12-24..2026-12-26", staff: [...inp.staff, { name: "Léa", title: "Coloriste", skills: ["couleur"], days: [1, 2] }] });
    const r = readPrestations(salon)!;
    expect(r.hours.mon).toBe("10:00-13:00, 14:00-18:00");
    expect(r.address).toBe("8 place Fictive, 69002 Lyon");
    // La confirmation sans script affiche l'adresse, plus « [À renseigner] ».
    const booking = Object.values(currentTheme(salon)!.spec.templates).flatMap((t) => Object.values(t.sections)).filter((x) => x.type === "an-booking");
    expect(booking.length).toBeGreaterThan(0);
    for (const b of booking) expect(b.settings?.address_todo).toBe("8 place Fictive, 69002 Lyon");
    expect(r.staff.find((m) => m.name === "Léa")).toMatchObject({ id: "lea", skills: ["couleur"], days: [1, 2] });
    expect(liveSalon(salon).config.staff.map((s) => s.id)).toContain("lea");
  });
});

describe("Cabinet et restaurant", () => {
  it("cabinet : séance modifiée dans la source lue par le moteur", () => {
    const r = readPrestations(cabinet)!;
    expect(r.kind).toBe("cabinet");
    const inp = { services: [{ name: "Séance individuelle", short: "", duration: 50, price: 60, priceFrom: false, modes: "cabinet,visio" as const }], hours: { ...r.hours, tue: "09:00-12:00" }, closures: "" };
    savePrestations(cabinet, inp);
    const sec = rdvSection(currentTheme(cabinet)!.spec as ThemeSpec)!;
    const seances = Object.values(sec.section.blocks ?? {}).filter((b) => b.type === "seance");
    expect(seances.map((b) => b.settings)).toEqual([expect.objectContaining({ name: "Séance individuelle", duration: 50, price: 60, modes: "cabinet,visio" })]);
    expect(sec.section.settings?.hours_tue).toBe("09:00-12:00");
    expect(typeof liveCabinet).toBe("function");
  });

  it("restaurant : créneaux et capacité proposés par défaut signalés, puis confirmés ; incohérences refusées", () => {
    const r = readPrestations(restaurant)!;
    expect(r.kind).toBe("restaurant");
    expect(r.restaurant!.defaults).toBe(true);
    expect(() => savePrestations(restaurant, { restaurant: { ...r.restaurant!, minParty: 9, maxParty: 4 } })).toThrow(/minimum/);
    expect(() => savePrestations(restaurant, { restaurant: { ...r.restaurant!, lunchSlots: "midi" } })).toThrow(/créneaux/);
    savePrestations(restaurant, { restaurant: { openDays: [2, 3, 4, 5, 6], lunchSlots: "12:00, 12:45", dinnerSlots: "19:30, 20:15, 21:00", capacity: 30, minParty: 1, maxParty: 10 } });
    const after = readPrestations(restaurant)!.restaurant!;
    expect(after).toMatchObject({ openDays: [2, 3, 4, 5, 6], lunchSlots: "12:00, 12:45", capacity: 30, defaults: false });
  });
});

describe("Adresse de l'établissement", () => {
  it("vide : refus de publication explicite (où la saisir) ; renseignée dans l'éditeur : plus de refus d'adresse", () => {
    const r = readPrestations(cabinet)!;
    savePrestations(cabinet, { address: "" });
    expect(bookingBlockers(cabinet, currentTheme(cabinet)!.spec as ThemeSpec).join(" ")).toMatch(/adresse de votre établissement n'est pas renseignée.*onglet Rendez-vous/);
    savePrestations(cabinet, { address: "3 quai Fictif, 69005 Lyon", closures: r.closures });
    expect(bookingBlockers(cabinet, currentTheme(cabinet)!.spec as ThemeSpec).join(" ")).not.toMatch(/adresse/);
  });
});

describe("Droits", () => {
  it("compte étranger : ni lecture ni modification ; le propriétaire, si", async () => {
    const ctx = { params: Promise.resolve({ id: salon }) };
    const login = (u?: string) => { jar.token = u ? id() : ""; if (u) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
    const other = await createUser(`etranger-${Date.now()}@example.invalid`, "isolated-test-only", "Étranger");
    const req = (method: string, body?: unknown) => new Request(`http://localhost/api/projects/${salon}/prestations`, { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: body ? JSON.stringify(body) : undefined });
    login(other.id);
    expect([403, 404]).toContain((await withAccessScope({ kind: "http" }, () => route.GET(req("GET"), ctx))).status);
    expect([403, 404]).toContain((await withAccessScope({ kind: "http" }, () => route.PUT(req("PUT", { closures: "" }), ctx))).status);
    login(uid);
    const ok = await withAccessScope({ kind: "http" }, () => route.GET(req("GET"), ctx));
    expect(ok.status).toBe(200);
    expect((await ok.json()).kind).toBe("salon");
    const bad = await withAccessScope({ kind: "http" }, () => route.PUT(req("PUT", { closures: "Noël" }), ctx));
    expect(bad.status).toBe(400);
  });
});
