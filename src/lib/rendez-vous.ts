/**
 * Rubrique « Rendez-vous » du studio (mission #190, point 7) : un seul endroit pour le professionnel, quel que soit le
 * thème qui prend les réservations — ATELIER NUANCE (salon : prestations, durées, intervenants), PARENTHÈSE (cabinet :
 * séances, ateliers à places, cabinet ou visio), TABLE SAISON (restaurant : services, couverts).
 *
 * Source unique : les règles (prestations, durées, horaires, fermetures, intervenants, capacité) restent celles de la
 * section de réglages du thème (`an-salon`, `pa-cabinet`, `ts-restaurant`), lue de la même façon par le site et par le
 * serveur ; la rubrique les affiche et ouvre leur éditeur. Les réservations sont celles du service réel du studio
 * (tables par projet, transaction exclusive contre les doubles réservations). Le professionnel peut les voir, en
 * ajouter (prise par téléphone), les déplacer et les annuler.
 *
 * Après export du site (Shopify, WordPress, PrestaShop), les boutons du thème appellent le même service à l'adresse
 * publique du studio (`/api/public/<salon|cabinet|restaurant>/<projet>`, CORS ouvert, jetons dans le fragment) : la
 * rubrique voit donc aussi les réservations prises sur le site exporté. Condition : le studio a une adresse publique
 * HTTPS (APP_URL) ; sans elle, le service réel ne peut pas être activé et la rubrique le dit.
 */
import { appUrl } from "./settings";
import { isPublicAppUrl } from "./public-url";
import { currentTheme, saveThemeVersion } from "./projects";
import { applyOps } from "./theme/ops";
import type { ThemeOp } from "./theme/ops";
import type { SectionInstance, ThemeSpec } from "./theme/spec";
import * as salon from "./salon/booking";
import * as cabinet from "./cabinet/booking";
import * as restaurant from "./restaurant/booking";
import { L } from "./i18n-server";
import { HttpError } from "./auth";

export type RdvKind = "salon" | "cabinet" | "restaurant";
const SECTION_TYPE: Record<RdvKind, string> = { salon: "an-salon", cabinet: "pa-cabinet", restaurant: "ts-restaurant" };

/** Section de réglages de la prise de rendez-vous du thème installé : son gabarit, son identifiant, son type. */
export function rdvSection(spec: Pick<ThemeSpec, "templates" | "groups">): { kind: RdvKind; template: string; id: string; section: SectionInstance } | null {
  const containers: [string, { sections: Record<string, SectionInstance> } | undefined][] = [["group:header", spec.groups?.header], ...Object.entries(spec.templates ?? {})];
  for (const [template, c] of containers) for (const [id, s] of Object.entries(c?.sections ?? {})) {
    if (s.disabled) continue;
    const kind = (Object.keys(SECTION_TYPE) as RdvKind[]).find((k) => SECTION_TYPE[k] === s.type);
    if (kind) return { kind, template, id, section: s };
  }
  return null;
}

/** Réservation présentée de la même façon pour les trois services. */
export type RdvBooking = {
  number: string; status: "confirmed" | "canceled"; date: string; start: string; end: string | null;
  service: string; staff: string | null; party: number | null; modality: string | null;
  client: { name: string; email: string; phone: string | null }; note: string | null; createdAt: number; updatedAt: number;
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export function listBookings(projectId: string, kind: RdvKind, from: string, to: string): RdvBooking[] {
  if (kind === "salon") {
    const staff = new Map(salon.salonOf(projectId).config.staff.map((s) => [s.id, s.name]));
    return salon.listAppointments(projectId, from, to).map((a) => ({ number: a.number, status: a.status, date: a.date, start: hhmm(a.start_min), end: hhmm(a.end_min), service: a.service_name, staff: staff.get(a.staff) ?? a.staff, party: null, modality: null, client: { name: `${a.first_name} ${a.last_name}`.trim(), email: a.email, phone: a.phone || null }, note: a.note, createdAt: a.created_at, updatedAt: a.updated_at }));
  }
  if (kind === "cabinet") return cabinet.listAppointments(projectId, from, to).map((a) => ({ number: a.number, status: a.status, date: a.date, start: hhmm(a.start_min), end: hhmm(a.end_min), service: a.service_name, staff: null, party: null, modality: a.modality || null, client: { name: `${a.first_name} ${a.last_name}`.trim(), email: a.email, phone: a.phone || null }, note: a.note, createdAt: a.created_at, updatedAt: a.updated_at }));
  return restaurant.listReservations(projectId, from, to).map((r) => ({ number: r.number, status: r.status, date: r.date, start: r.time, end: null, service: "", staff: null, party: r.party, modality: null, client: { name: `${r.first_name} ${r.last_name}`.trim(), email: r.email, phone: r.phone }, note: r.note, createdAt: r.created_at, updatedAt: r.updated_at }));
}

/** Règles en vigueur (lues dans la section du thème, comme le site) : ce que la rubrique affiche. */
export function rdvRules(projectId: string, kind: RdvKind) {
  if (kind === "salon") {
    const c = salon.salonOf(projectId).config;
    return { timezone: c.timezone, hours: c.hours, closures: c.closures, step: c.step, horizonDays: c.horizonDays, leadMinutes: c.leadMinutes, cancelHours: c.cancelHours, services: c.services.map((s) => ({ id: s.id, name: s.name, duration: s.duration, price: s.price })), staff: c.staff.map((s) => ({ id: s.id, name: s.name, days: s.days, skills: s.skills })), capacity: null as number | null, workshops: [] as { id: string; title: string; date: string; time: string; capacity: number | null }[] };
  }
  if (kind === "cabinet") {
    const c = cabinet.cabinetOf(projectId).config;
    return { timezone: c.timezone, hours: c.hours, closures: c.closures, step: c.step, horizonDays: c.horizonDays, leadMinutes: c.leadMinutes, cancelHours: c.cancelHours, services: c.seances.map((s) => ({ id: s.id, name: s.name, duration: s.duration, price: s.price })), staff: [] as { id: string; name: string; days: number[] | null; skills: string[] }[], capacity: null as number | null, workshops: c.ateliers.map((a) => ({ id: a.id, title: a.title, date: a.date, time: a.time, capacity: a.capacity })) };
  }
  const c = restaurant.restaurantOf(projectId).config;
  return { timezone: c.timezone, hours: Object.fromEntries(c.openDays.map((d) => [d, []])), closures: c.closures, step: null, horizonDays: c.horizonDays, leadMinutes: c.leadMinutes, cancelHours: null, services: c.services.map((s) => ({ id: s.id, name: s.label, duration: null, price: null, slots: s.slots })), staff: [] as { id: string; name: string; days: number[] | null; skills: string[] }[], capacity: c.capacity, workshops: [] as { id: string; title: string; date: string; time: string; capacity: number | null }[] };
}

/** Adresse du service réel que les boutons du thème appellent (studio public HTTPS), ou null si le studio n'en a pas. */
export const serviceUrlFor = (projectId: string, kind: RdvKind) => (isPublicAppUrl() ? `${appUrl()}/api/public/${kind}/${projectId}` : null);

export function rdvOverview(projectId: string, from: string, to: string) {
  const cur = currentTheme(projectId);
  const sec = cur ? rdvSection(cur.spec) : null;
  if (!cur || !sec) return { kind: null, reason: "no_booking_theme" as const };
  const s = sec.section.settings ?? {};
  const mode = s.booking_mode === "live" ? ("live" as const) : ("demo" as const);
  const expected = serviceUrlFor(projectId, sec.kind);
  return {
    kind: sec.kind,
    section: { template: sec.template, id: sec.id, type: sec.section.type },
    mode,
    serviceUrl: String(s.service_url ?? ""),
    expectedServiceUrl: expected,
    linked: mode === "live" && !!expected && String(s.service_url ?? "") === expected,
    publicStudio: isPublicAppUrl(),
    notifyEmail: String(s.notify_email ?? ""),
    rules: rdvRules(projectId, sec.kind),
    bookings: listBookings(projectId, sec.kind, from, to),
  };
}

/**
 * Relie les boutons du thème au service réel du studio (ou les remet en démonstration). Une seule écriture, dans la
 * section de réglages du thème (source unique), enregistrée comme une version restaurable.
 */
export function setRdvLive(projectId: string, live: boolean): { versionId: string } {
  const cur = currentTheme(projectId);
  const sec = cur ? rdvSection(cur.spec) : null;
  if (!cur || !sec) throw new HttpError(404, L("Ce thème ne prend pas de rendez-vous.", "This theme doesn't take bookings."));
  const url = serviceUrlFor(projectId, sec.kind);
  if (live && !url) throw new HttpError(409, L("Le studio n'a pas d'adresse publique HTTPS (APP_URL) : le site exporté ne pourrait pas joindre le service de réservation. Réglez-la dans l'administration.", "The studio has no public HTTPS address (APP_URL): the exported site couldn't reach the booking service. Set it in the admin area."), "no_public_url");
  const ops: ThemeOp[] = [
    { op: "set_setting", template: sec.template, section: sec.id, key: "booking_mode", value: live ? "live" : "demo" },
    ...(live ? [{ op: "set_setting", template: sec.template, section: sec.id, key: "service_url", value: url } as ThemeOp] : []),
  ];
  const r = applyOps(cur.spec, ops, { targeted: new Set([`${sec.template}:${sec.id}`]) });
  if (!r.applied.length && r.rejected.length) throw new HttpError(400, r.rejected.map((x) => x.reason).join(" ; "));
  const v = saveThemeVersion(projectId, r.spec, live ? L("Rendez-vous : service réel activé", "Bookings: live service enabled") : L("Rendez-vous : retour en démonstration", "Bookings: back to demonstration"), "user");
  return { versionId: v.id };
}

/** Déplacement par le professionnel (même contrôle de créneau, sans le délai imposé aux clients). */
export function proMove(projectId: string, kind: RdvKind, number: string, change: { date: string; time: string; staff?: string; party?: number }) {
  if (kind === "salon") return salon.proMoveAppointment(projectId, number, change);
  if (kind === "cabinet") return cabinet.proMoveAppointment(projectId, number, change);
  return restaurant.proModifyReservation(projectId, number, change);
}

export function proCancel(projectId: string, kind: RdvKind, number: string) {
  if (kind === "salon") return salon.proCancelAppointment(projectId, number);
  if (kind === "cabinet") return cabinet.proCancelAppointment(projectId, number);
  return restaurant.proCancelReservation(projectId, number);
}

/** Réservation saisie par le professionnel (client au téléphone) : mêmes règles et même protection que le site. */
export type ProCreate = { service?: string; staff?: string; modality?: string; date: string; time: string; party?: number; firstName: string; lastName: string; email: string; phone?: string; note?: string };
export function proCreate(projectId: string, kind: RdvKind, b: ProCreate) {
  if (kind === "salon") return salon.createAppointment(projectId, { service: b.service ?? "", staff: b.staff, date: b.date, time: b.time, firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone ?? "", note: b.note, terms: true }).appointment.number;
  if (kind === "cabinet") return cabinet.createAppointment(projectId, { kind: "seance", service: b.service ?? "", modality: b.modality ?? "cabinet", date: b.date, time: b.time, firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone ?? "", note: b.note, terms: true } as never).appointment.number;
  return restaurant.createReservation(projectId, { party: b.party ?? 2, date: b.date, time: b.time, firstName: b.firstName, lastName: b.lastName, email: b.email, phone: b.phone, note: b.note, terms: true }).reservation.number;
}
