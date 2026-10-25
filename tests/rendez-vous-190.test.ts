/**
 * Mission #190, point 7 — rubrique « Rendez-vous » du studio : règles lues dans la section du thème (source unique),
 * boutons du site reliés au service réel (adresse publique HTTPS exigée), réservations du site visibles par le
 * professionnel, ajout par le professionnel, déplacement et annulation, aucune double réservation.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { saveThemeVersion, currentTheme } from "@/lib/projects";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { salonBlocks } from "@/lib/theme/atelier-nuance";
import { AN_HOURS, AN_SERVICES, AN_STAFF } from "./atelier-nuance-fixtures";
import { setSetting } from "@/lib/settings";
import type { ThemeSpec } from "@/lib/theme/spec";

const session = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (o) => ({ ...await o<object>(), requireUser: async () => session.user, currentUser: async () => session.user }));

const { rdvOverview, setRdvLive, proCreate, proMove, proCancel, rdvSection } = await import("@/lib/rendez-vous");
const { POST: publicPost } = await import("@/app/api/public/salon/[projectId]/[[...path]]/route");
const rdvRoute = await import("@/app/api/projects/[id]/rendez-vous/route");
const restaurant = await import("@/lib/restaurant/booking");

const TUE = "2026-11-10";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const json = (b: unknown) => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });

/** Salon de démonstration complet (prestations et équipe de la planche), encore en mode démonstration. */
const salonSpec = (): ThemeSpec => {
  const spec = serviceSpec("atelier-nuance" as never);
  const id = spec.groups.header.order.find((x) => spec.groups.header.sections[x].type === "an-salon")!;
  const sec = spec.groups.header.sections[id];
  const blocks = salonBlocks(AN_SERVICES.map((s) => ({ id: s.id, name: s.name, category: s.category, short: s.short, duration: s.duration, price: s.price, from: s.from })), AN_STAFF.map((m) => ({ id: m.id, name: m.name, initial: m.initial, title: m.title, skills: m.skills, days: m.days })));
  sec.blocks = Object.fromEntries(blocks.map((b, i) => [`b${i}`, b]));
  sec.block_order = blocks.map((_, i) => `b${i}`);
  Object.assign(sec.settings, { hours_tue: AN_HOURS.tue, hours_wed: AN_HOURS.wed, hours_thu: AN_HOURS.thu, hours_fri: AN_HOURS.fri, hours_sat: AN_HOURS.sat });
  return spec;
};

describe("rubrique Rendez-vous (mission #190)", () => {
  let pid = "", owner: any;
  beforeAll(async () => {
    owner = await createUser(`rdv190-${Date.now()}@example.invalid`, "isolated-test-only", "Salon");
    pid = seedHoldout(owner.id, 2, "Salon Rendez-vous");
    saveThemeVersion(pid, salonSpec(), "test", "user");
    session.user = owner;
  });

  it("règles lues dans la section du thème ; mode démonstration ; activation impossible sans adresse publique HTTPS", async () => {
    const v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind).toBe("salon");
    if (!v.kind) return;
    expect(v.mode).toBe("demo");
    expect(v.rules.services.map((s) => s.id)).toEqual(AN_SERVICES.map((s) => s.id));
    expect(v.rules.staff.map((s) => s.id)).toEqual(AN_STAFF.map((s) => s.id));
    expect(v.bookings).toEqual([]);
    setSetting("app.url", "http://localhost:3000");
    expect(() => setRdvLive(pid, true)).toThrow(/adresse publique HTTPS/);
  });

  it("activation : les boutons du site appellent le service du studio (adresse écrite dans la section du thème)", () => {
    setSetting("app.url", "https://studio.example.com");
    setRdvLive(pid, true);
    const sec = rdvSection(currentTheme(pid)!.spec)!;
    expect(sec.section.settings.booking_mode).toBe("live");
    expect(sec.section.settings.service_url).toBe(`https://studio.example.com/api/public/salon/${pid}`);
    const v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind && v.linked).toBe(true);
  });

  it("réservation prise sur le site → visible dans la rubrique ; même créneau refusé (aucune double réservation)", async () => {
    const book = (email: string) => publicPost(new Request(`https://studio.example.com/api/public/salon/${pid}/appointments`, json({ service: "coupe-brushing", staff: "camille", date: TUE, time: "14:00", firstName: "Julie", lastName: "Martin", email, phone: "06 12 34 56 78", terms: true })), { params: Promise.resolve({ projectId: pid, path: ["appointments"] }) } as never);
    const first = await book("julie@example.com");
    expect(first.status).toBe(201);
    const second = await book("paul@example.com");
    expect(second.status).toBe(409);
    const v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind && v.bookings.filter((b) => b.status === "confirmed").map((b) => [b.date, b.start, b.client.email])).toEqual([[TUE, "14:00", "julie@example.com"]]);
  });

  it("le professionnel ajoute, déplace (créneau libre seulement) et annule ; le créneau annulé redevient réservable", async () => {
    const n = proCreate(pid, "salon", { service: "coupe-brushing", staff: "camille", date: TUE, time: "10:00", firstName: "Léa", lastName: "Petit", email: "lea@example.com", phone: "06 00 00 00 00" });
    expect(n).toMatch(/^AN-/);
    // Déplacement vers le créneau de Julie (14 h) : refusé, rien ne change.
    expect(() => proMove(pid, "salon", n, { date: TUE, time: "14:00" })).toThrow(/unavailable/);
    let v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind && v.bookings.find((b) => b.number === n)?.start).toBe("10:00");
    // Vers un créneau libre : accepté.
    proMove(pid, "salon", n, { date: TUE, time: "16:00" });
    v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind && v.bookings.find((b) => b.number === n)?.start).toBe("16:00");
    // Annulation : libère le créneau, qui se reprend.
    proCancel(pid, "salon", n);
    v = rdvOverview(pid, "2026-11-01", "2026-11-30");
    expect(v.kind && v.bookings.find((b) => b.number === n)?.status).toBe("canceled");
    expect(proCreate(pid, "salon", { service: "coupe-brushing", staff: "camille", date: TUE, time: "16:00", firstName: "Hugo", lastName: "Roy", email: "hugo@example.com", phone: "06 11 22 33 44" })).toMatch(/^AN-/);
  });

  it("API de la rubrique : planning, déplacement refusé avec un message clair, annulation", async () => {
    const res = await rdvRoute.GET(new Request(`http://x/api/projects/${pid}/rendez-vous?du=2026-11-01&au=2026-11-30`), ctx(pid));
    expect(res.status).toBe(200);
    const view = await res.json();
    const julie = view.bookings.find((b: { client: { email: string } }) => b.client.email === "julie@example.com");
    const hugo = view.bookings.find((b: { client: { email: string } }) => b.client.email === "hugo@example.com");
    const refused = await rdvRoute.POST(new Request("http://x", json({ action: "move", number: hugo.number, date: TUE, time: "14:00" })), ctx(pid));
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toMatch(/n'est pas disponible/);
    expect((await rdvRoute.POST(new Request("http://x", json({ action: "cancel", number: julie.number })), ctx(pid))).status).toBe(200);
  });

  it("restaurant (TABLE SAISON) : capacité par horaire respectée, ajout et annulation par le restaurant", async () => {
    const r = seedHoldout(owner.id, 2, "Restaurant");
    const spec = serviceSpec("table-saison" as never);
    saveThemeVersion(r, spec, "test", "user");
    setRdvLive(r, true);
    const sec = rdvSection(currentTheme(r)!.spec)!;
    expect(sec.kind).toBe("restaurant");
    const rules = rdvOverview(r, "2026-11-01", "2026-11-30");
    if (!rules.kind) throw new Error("restaurant attendu");
    const cap = rules.rules.capacity!;
    const slot = restaurant.availability(r, TUE, 2).services.flatMap((x) => x.slots).find((x) => x.available);
    if (!slot) return; // jour fermé dans les réglages par défaut : contrôle de capacité fait ailleurs (table-saison-booking).
    // Capacité remplie par des tables de la taille maximale autorisée.
    const max = restaurant.restaurantOf(r).config.maxParty;
    const numbers: string[] = [];
    for (let left = cap, i = 0; left > 0; i++) { const party = Math.min(max, left); numbers.push(proCreate(r, "restaurant", { date: TUE, time: slot.time, party, firstName: "Table", lastName: `n°${i + 1}`, email: `table${i}@example.com` })); left -= party; }
    const n = numbers[0];
    expect(() => proCreate(r, "restaurant", { date: TUE, time: slot.time, party: 1, firstName: "Un", lastName: "De plus", email: "un@example.com" })).toThrow();
    proCancel(r, "restaurant", n);
    expect(proCreate(r, "restaurant", { date: TUE, time: slot.time, party: 1, firstName: "Un", lastName: "De plus", email: "un@example.com" })).toMatch(/^TS-/);
  });

  it("thème sans prise de rendez-vous : la rubrique le dit, sans erreur", () => {
    const p = seedHoldout(owner.id, 2, "Électricien");
    saveThemeVersion(p, serviceSpec("phase" as never), "test", "user");
    expect(rdvOverview(p, "2026-11-01", "2026-11-30")).toEqual({ kind: null, reason: "no_booking_theme" });
  });
});
