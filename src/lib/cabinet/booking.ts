/**
 * Service réel de rendez-vous d'un cabinet (thème PARENTHÈSE, sophrologie).
 *
 *  - Persistance durable et isolée par projet : chaque rendez-vous, jeton et message appartient à UN projet du studio ;
 *    aucune requête ne lit ni ne modifie les données d'un autre projet.
 *  - Règles lues dans le thème enregistré du projet (section « pa-cabinet ») : séances (durée, tarif, modalités),
 *    ateliers (date, heure, durée, tarif, capacité), horaires, fermetures, délais. Jamais celles du navigateur.
 *  - Séance : vérification atomique sur TOUTE la durée (une seule praticienne : rendez-vous et ateliers occupent
 *    l'agenda), lecture et écriture dans la même transaction SQLite immédiate : deux personnes ne peuvent pas obtenir le
 *    même créneau.
 *  - Atelier : places comptées dans la transaction (capacité jamais dépassée, jamais négative) ; une annulation rend la
 *    place.
 *  - Modification : le nouvel horaire est vérifié et écrit dans une transaction ; l'ancien n'est libéré qu'à ce moment.
 *  - Accès : jeton secret, à durée limitée, rendu à la réservation ou envoyé par e-mail (référence ET e-mail, réponse
 *    toujours neutre) ; jamais par la référence seule.
 *  - Ouvert seulement si le cabinet a activé le service (mode « live ») : la démonstration ne passe jamais par ici.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { all, now, one, run, tx } from "../db";
import { currentTheme } from "../projects";
import type { SectionInstance, ThemeSpec } from "../theme/spec";
import { mailConfigured, sendMail } from "../mail";

type Interval = [number, number];
export type Seance = { id: string; name: string; short: string; duration: number | null; price: number | null; modes: string[] };
export type Atelier = { id: string; title: string; short: string; tags: string[]; theme: string; date: string; time: string; duration: number | null; price: number | null; capacity: number | null; booked: number; place: string };
export type CabinetConfig = { timezone: string; hours: Record<number, Interval[]>; closures: string[]; step: number; horizonDays: number; leadMinutes: number; cancelHours: number; seances: Seance[]; ateliers: Atelier[] };
type Slot = { time: string; available: boolean; reason: string | null };
type Core = {
  normalize(raw: unknown): CabinetConfig;
  parseClosures(text: string): string[];
  nowIn(timezone: string, at?: number): { date: string; minute: number };
  dateStatus(cfg: CabinetConfig, date: string, at?: number): string;
  dayStatus(cfg: CabinetConfig, opts: Record<string, unknown>, at?: number): string;
  seanceById(cfg: CabinetConfig, id: string): Seance | null;
  atelierById(cfg: CabinetConfig, id: string): Atelier | null;
  slotsFor(cfg: CabinetConfig, opts: { date: string; service: string; modality?: string; busy?: Interval[] }, at?: number): Slot[];
  remaining(a: Atelier | null, taken: number): number | null;
  atelierStatus(cfg: CabinetConfig, a: Atelier | null, taken: number, at?: number): string;
  validate(cfg: CabinetConfig, req: unknown, ctx: { busy?: Interval[]; taken?: number }, at?: number): string[];
  changeAllowed(cfg: CabinetConfig, appt: { date: string; time: string }, at?: number): boolean;
  monthGrid(year: number, month: number): (string | null)[];
  weekday(date: string): number;
  toMin(t: string): number;
  toTime(m: number): string;
  formatDate(date: string, lang?: string, style?: string): string;
  formatTime(time: string, lang?: string): string;
  formatDuration(min: number, lang?: string, style?: string): string;
  formatPrice(price: number | null, lang?: string): string;
  maskEmail(email: string): string;
  ics(appt: Record<string, unknown>, opts: Record<string, unknown>): string;
  isDate(s: string): boolean;
  isTime(s: string): boolean;
  demoShift(cfg: CabinetConfig, at?: number): CabinetConfig;
  demoAgenda(cfg: CabinetConfig, date: string): Interval[];
};
/** Même calcul que le site (theme-base/assets/parenthese-core.js), évalué une fois avec son propre objet `module`. */
function loadCore(): Core {
  const src = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "parenthese-core.js"), "utf8");
  const mod = { exports: {} as Core };
  new Function("module", "self", src)(mod, {});
  return mod.exports;
}
export const core: Core = loadCore();

export type Cabinet = { config: CabinetConfig; mode: "demo" | "live"; name: string; address: string; notifyEmail: string | null; siteUrl: string | null; managePath: string; cancelTerms: string };
export type Appointment = {
  id: string; project_id: string; number: string; status: "confirmed" | "canceled"; kind: "seance" | "atelier";
  service: string; service_name: string; modality: string; date: string; start_min: number; end_min: number; price: number | null;
  first_name: string; last_name: string; email: string; phone: string; note: string | null; personal_note: string | null; newsletter: number;
  idem: string | null; created_at: number; updated_at: number; canceled_at: number | null;
};
type Token = { hash: string; project_id: string; appt_id: string; expires_at: number; revoked_at: number | null };

export class BookingError extends Error {
  constructor(public code: string, public status = 400, public details: Record<string, unknown> = {}) { super(code); }
}

/** Accès rendu à la réservation (gestion du rendez-vous) et lien envoyé par e-mail depuis « Retrouver ». */
export const APPT_TOKEN_MS = 120 * 24 * 3600_000;
export const ACCESS_LINK_MS = 7 * 24 * 3600_000;

let ready = false;
/** Tables créées à la première utilisation (aucune modification du schéma commun du studio). */
function ensureTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS cabinet_appointments (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, number TEXT NOT NULL, status TEXT NOT NULL, kind TEXT NOT NULL,
    service TEXT NOT NULL, service_name TEXT NOT NULL, modality TEXT NOT NULL, date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL, price REAL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, note TEXT, personal_note TEXT, newsletter INTEGER NOT NULL DEFAULT 0,
    idem TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, canceled_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS cabinet_appointments_number ON cabinet_appointments(project_id, number)");
  run("CREATE UNIQUE INDEX IF NOT EXISTS cabinet_appointments_idem ON cabinet_appointments(project_id, idem) WHERE idem IS NOT NULL");
  run("CREATE INDEX IF NOT EXISTS cabinet_appointments_day ON cabinet_appointments(project_id, date, status)");
  run(`CREATE TABLE IF NOT EXISTS cabinet_tokens (
    hash TEXT PRIMARY KEY, project_id TEXT NOT NULL, appt_id TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER, created_at INTEGER NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS cabinet_requests (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, email TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  ready = true;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Réglages du cabinet (section « pa-cabinet » de l'en-tête), ou null. */
export function cabinetSection(spec: Pick<ThemeSpec, "templates" | "groups">): SectionInstance | null {
  for (const t of [spec.groups?.header, ...Object.values(spec.templates ?? {})]) for (const s of Object.values(t?.sections ?? {})) if (s.type === "pa-cabinet" && !s.disabled) return s;
  return null;
}

/** Règles d'un cabinet lues dans sa section de réglages (même lecture que le site). */
export function configFromSection(sec: SectionInstance): CabinetConfig {
  const s = sec.settings ?? {};
  const blocks = (sec.block_order ?? Object.keys(sec.blocks ?? {})).map((id) => sec.blocks?.[id]).filter((b): b is NonNullable<typeof b> => !!b);
  return core.normalize({
    timezone: str(s.timezone) || "Europe/Paris",
    hours: { 0: s.hours_sun, 1: s.hours_mon, 2: s.hours_tue, 3: s.hours_wed, 4: s.hours_thu, 5: s.hours_fri, 6: s.hours_sat },
    closures: core.parseClosures(String(s.closures ?? "")),
    step: s.slot_step, horizonDays: s.horizon_days, leadMinutes: s.lead_minutes, cancelHours: s.cancel_hours,
    seances: blocks.filter((b) => b.type === "seance").map((b) => { const v = b.settings ?? {}; return { id: v.seance_id, name: v.name, short: v.short, duration: num(v.duration), price: num(v.price), modes: v.modes }; }),
    ateliers: blocks.filter((b) => b.type === "atelier").map((b) => {
      const v = b.settings ?? {};
      // Le nombre de places « déjà prises » de la démonstration n'existe pas pour le service réel : seules les réservations comptent.
      return { id: v.atelier_id, title: v.title, short: v.short, tags: v.tags, theme: v.theme, date: v.date, time: v.time, duration: num(v.duration), price: num(v.price), capacity: num(v.capacity), booked: 0, place: v.place };
    }),
  });
}

export function cabinetOf(projectId: string): Cabinet {
  const theme = currentTheme(projectId);
  const sec = theme ? cabinetSection(theme.spec) : null;
  if (!theme || !sec) throw new BookingError("not_found", 404);
  const s = sec.settings ?? {};
  return {
    config: configFromSection(sec), mode: s.booking_mode === "live" ? "live" : "demo", name: theme.spec.store?.shopName || "", address: str(s.address),
    notifyEmail: EMAIL_RE.test(str(s.notify_email)) ? str(s.notify_email) : null,
    siteUrl: /^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(str(s.site_url)) ? str(s.site_url).replace(/\/+$/, "") : null,
    managePath: /^\/[\w\-/]*$/.test(str(s.page_manage)) ? str(s.page_manage) : "/pages/mon-rendez-vous",
    cancelTerms: str(s.cancel_terms),
  };
}

/** Cabinet dont le service réel est activé ; sinon refus. */
export function liveCabinet(projectId: string): Cabinet {
  if (!/^[\w-]{1,64}$/.test(projectId)) throw new BookingError("not_found", 404);
  const r = cabinetOf(projectId);
  if (r.mode !== "live") throw new BookingError("not_live", 403);
  return r;
}

/** Séances confirmées d'une date (agenda occupé), en excluant éventuellement un rendez-vous (modification). */
export function busyFor(projectId: string, date: string, exceptId = ""): Interval[] {
  ensureTables();
  return all<{ start_min: number; end_min: number }>("SELECT start_min, end_min FROM cabinet_appointments WHERE project_id = ? AND date = ? AND kind = 'seance' AND status = 'confirmed' AND id != ?", projectId, date, exceptId).map((a) => [a.start_min, a.end_min]);
}

/** Places prises d'un atelier (réservations confirmées). */
export function takenFor(projectId: string, atelierId: string): number {
  ensureTables();
  return one<{ n: number }>("SELECT COUNT(*) AS n FROM cabinet_appointments WHERE project_id = ? AND kind = 'atelier' AND service = ? AND status = 'confirmed'", projectId, atelierId)?.n ?? 0;
}

/** Créneaux d'une date (jamais l'identité des autres personnes). */
export function availability(projectId: string, q: { date: string; service: string; modality?: string; exceptId?: string }, at = now()) {
  const r = liveCabinet(projectId);
  const slots = core.slotsFor(r.config, { date: q.date, service: q.service, modality: q.modality, busy: busyFor(projectId, q.date, q.exceptId) }, at);
  return { status: core.dateStatus(r.config, q.date, at), slots: slots.map((s) => ({ time: s.time, available: s.available })) };
}

/** Statut de chaque date d'un mois pour le calendrier. */
export function monthAvailability(projectId: string, q: { month: string; service: string; modality?: string; exceptId?: string }, at = now()) {
  const r = liveCabinet(projectId);
  const m = /^(\d{4})-(\d{2})$/.exec(q.month);
  if (!m) throw new BookingError("invalid", 400, { fields: ["month"] });
  const days: Record<string, string> = {};
  for (const d of core.monthGrid(Number(m[1]), Number(m[2]))) if (d) days[d] = core.dayStatus(r.config, { date: d, service: q.service, modality: q.modality, busy: busyFor(projectId, d, q.exceptId) }, at);
  return { days };
}

/** Ateliers avec leurs places restantes (comptées sur les réservations réelles). */
export function workshops(projectId: string, at = now()) {
  const r = liveCabinet(projectId);
  return { ateliers: r.config.ateliers.map((a) => { const taken = takenFor(projectId, a.id); return { id: a.id, date: a.date, time: a.time, capacity: a.capacity, remaining: core.remaining(a, taken), status: core.atelierStatus(r.config, a, taken, at) }; }) };
}

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(24).toString("base64url");
/** Référence non devinable : P-AAAA-XXXXX (alphabet sans caractères ambigus). */
function newReference(projectId: string, year: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 20; i++) {
    const ref = `P-${year}-${Array.from(crypto.randomBytes(5), (b) => alphabet[b % alphabet.length]).join("")}`;
    if (!one("SELECT 1 FROM cabinet_appointments WHERE project_id = ? AND number = ?", projectId, ref)) return ref;
  }
  throw new BookingError("server", 500);
}

function issueToken(projectId: string, apptId: string, ttl: number, at: number) {
  const token = newToken();
  run("INSERT INTO cabinet_tokens (hash, project_id, appt_id, expires_at, revoked_at, created_at) VALUES (?,?,?,?,?,?)", hash(token), projectId, apptId, at + ttl, null, at);
  return token;
}

/** Jeton valide d'un cabinet (comparaison par empreinte) ; expiré : « expired » ; inconnu ou d'un autre cabinet : « not_found ». */
export function tokenOf(projectId: string, token: string, at = now()): Token {
  ensureTables();
  if (!token || token.length > 200) throw new BookingError("not_found", 401);
  const row = one<Token>("SELECT * FROM cabinet_tokens WHERE hash = ?", hash(token));
  if (!row || row.project_id !== projectId || row.revoked_at) throw new BookingError("not_found", 401);
  if (row.expires_at < at) throw new BookingError("expired", 401);
  return row;
}

/** Ce que la personne voit de son rendez-vous (jamais l'identifiant interne ni d'autres personnes). */
export function publicView(a: Appointment, r?: Cabinet) {
  return {
    number: a.number, status: a.status, kind: a.kind, service: a.service, serviceName: a.service_name, modality: a.modality, date: a.date, time: core.toTime(a.start_min), duration: a.end_min - a.start_min, price: a.price,
    // Lieu : adresse du cabinet seulement pour une séance au cabinet ou un atelier, jamais pour une visioconférence.
    place: a.modality === "visio" ? "" : r ? (a.kind === "atelier" ? r.config.ateliers.find((x) => x.id === a.service)?.place || r.address : r.address) : "",
    firstName: a.first_name, email: core.maskEmail(a.email), personalNote: a.personal_note ?? "",
  };
}

export type CreateInput = { kind: string; service: string; modality: string; date: string; time: string; firstName: string; lastName: string; email: string; phone: string; note?: string; newsletter?: boolean; terms: boolean; idem?: string };

function alternatives(r: Cabinet, projectId: string, q: { date: string; service: string }, exceptId: string | undefined, at: number) {
  return core.slotsFor(r.config, { date: q.date, service: q.service, busy: busyFor(projectId, q.date, exceptId) }, at).filter((s) => s.available).map((s) => s.time);
}

/** Enregistre un rendez-vous (séance : créneau vérifié sur toute la durée ; atelier : place comptée) dans une transaction. */
export function createAppointment(projectId: string, input: CreateInput, at = now()): { appointment: Appointment; token: string | null; duplicate: boolean } {
  ensureTables();
  const r = liveCabinet(projectId);
  const email = str(input.email).toLowerCase(), idem = /^[\w-]{8,80}$/.test(String(input.idem ?? "")) ? String(input.idem) : null;
  const kind = input.kind === "atelier" ? "atelier" : "seance";
  const contact = { firstName: input.firstName, lastName: input.lastName, email, phone: str(input.phone), terms: input.terms === true };
  return tx(() => {
    if (idem) {
      const prev = one<Appointment>("SELECT * FROM cabinet_appointments WHERE project_id = ? AND idem = ?", projectId, idem);
      // Double clic ou renvoi du même formulaire : le même rendez-vous, sans nouvel accès.
      if (prev) return { appointment: prev, token: null, duplicate: true };
    }
    let a: Appointment;
    const base = {
      id: crypto.randomUUID(), project_id: projectId, status: "confirmed" as const,
      first_name: str(input.firstName).slice(0, 80), last_name: str(input.lastName).slice(0, 80), email: email.slice(0, 160), phone: str(input.phone).slice(0, 24),
      note: str(input.note).slice(0, 600) || null, personal_note: null, newsletter: input.newsletter === true ? 1 : 0, idem, created_at: at, updated_at: at, canceled_at: null,
    };
    if (kind === "atelier") {
      const w = core.atelierById(r.config, str(input.service));
      const taken = w ? takenFor(projectId, w.id) : 0;
      const errors = core.validate(r.config, { kind, atelier: str(input.service), contact }, { taken }, at);
      if (errors.includes("full")) throw new BookingError("full", 409, { remaining: 0 });
      if (errors.length) throw new BookingError("invalid", 400, { fields: errors });
      if (one("SELECT 1 FROM cabinet_appointments WHERE project_id = ? AND kind = 'atelier' AND service = ? AND email = ? AND status = 'confirmed'", projectId, w!.id, email)) throw new BookingError("duplicate", 409);
      const start = core.toMin(w!.time);
      a = { ...base, number: newReference(projectId, w!.date.slice(0, 4)), kind, service: w!.id, service_name: w!.title, modality: "cabinet", date: w!.date, start_min: start, end_min: start + w!.duration!, price: w!.price };
    } else {
      const q = { date: str(input.date), service: str(input.service) };
      const busy = busyFor(projectId, q.date);
      const errors = core.validate(r.config, { kind, ...q, modality: str(input.modality), time: str(input.time), contact }, { busy }, at);
      if (errors.includes("slot_taken") || (errors.includes("time") && core.isTime(str(input.time)))) throw new BookingError("unavailable", 409, { alternatives: alternatives(r, projectId, q, undefined, at) });
      if (errors.length) throw new BookingError("invalid", 400, { fields: errors });
      const svc = core.seanceById(r.config, q.service)!;
      const start = core.toMin(str(input.time));
      a = { ...base, number: newReference(projectId, q.date.slice(0, 4)), kind, service: svc.id, service_name: svc.name, modality: str(input.modality), date: q.date, start_min: start, end_min: start + svc.duration!, price: svc.price };
    }
    run("INSERT INTO cabinet_appointments (id, project_id, number, status, kind, service, service_name, modality, date, start_min, end_min, price, first_name, last_name, email, phone, note, personal_note, newsletter, idem, created_at, updated_at, canceled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      a.id, a.project_id, a.number, a.status, a.kind, a.service, a.service_name, a.modality, a.date, a.start_min, a.end_min, a.price, a.first_name, a.last_name, a.email, a.phone, a.note, a.personal_note, a.newsletter, a.idem, a.created_at, a.updated_at, a.canceled_at);
    return { appointment: a, token: issueToken(projectId, a.id, APPT_TOKEN_MS, at), duplicate: false };
  });
}

function ownedAppointment(projectId: string, t: Token): Appointment {
  const a = one<Appointment>("SELECT * FROM cabinet_appointments WHERE project_id = ? AND id = ?", projectId, t.appt_id);
  if (!a) throw new BookingError("not_found", 404);
  return a;
}

/** Rendez-vous ouvert par un jeton (page « Mon rendez-vous »). */
export function appointmentFor(projectId: string, token: string, at = now()) {
  const r = liveCabinet(projectId);
  const a = ownedAppointment(projectId, tokenOf(projectId, token, at));
  return { appointment: publicView(a, r), changeAllowed: a.status === "confirmed" && core.changeAllowed(r.config, { date: a.date, time: core.toTime(a.start_min) }, at), cancelTerms: r.cancelTerms };
}

/**
 * Modification d'horaire d'une séance : le nouveau créneau est vérifié sans compter ce rendez-vous puis écrit dans la
 * même transaction ; l'ancien n'est libéré qu'à ce moment. Un atelier ne se déplace pas (sa date est celle de l'atelier).
 */
export function moveAppointment(projectId: string, token: string, change: { date: string; time: string }, at = now()) {
  const r = liveCabinet(projectId);
  return tx(() => {
    const a = ownedAppointment(projectId, tokenOf(projectId, token, at));
    if (a.status !== "confirmed") throw new BookingError("canceled", 409);
    if (a.kind !== "seance") throw new BookingError("not_movable", 409);
    if (!core.changeAllowed(r.config, { date: a.date, time: core.toTime(a.start_min) }, at)) throw new BookingError("too_late", 409);
    const q = { date: str(change.date) || a.date, service: a.service };
    const errors = core.validate(r.config, { kind: "seance", ...q, modality: a.modality, time: str(change.time) }, { busy: busyFor(projectId, q.date, a.id) }, at);
    if (errors.length) throw new BookingError(errors.includes("slot_taken") || errors.includes("time") ? "unavailable" : "invalid", 409, { alternatives: alternatives(r, projectId, q, a.id, at) });
    const start = core.toMin(str(change.time));
    run("UPDATE cabinet_appointments SET date = ?, start_min = ?, end_min = ?, updated_at = ? WHERE id = ?", q.date, start, start + (a.end_min - a.start_min), at, a.id);
    return publicView({ ...a, date: q.date, start_min: start, end_min: start + (a.end_min - a.start_min), updated_at: at }, r);
  });
}

/** Annulation confirmée : le rendez-vous n'est plus actif ; le créneau ou la place d'atelier est rendu. */
export function cancelAppointment(projectId: string, token: string, at = now()) {
  const r = liveCabinet(projectId);
  return tx(() => {
    const a = ownedAppointment(projectId, tokenOf(projectId, token, at));
    if (a.status === "canceled") return publicView(a, r);
    if (!core.changeAllowed(r.config, { date: a.date, time: core.toTime(a.start_min) }, at)) throw new BookingError("too_late", 409);
    run("UPDATE cabinet_appointments SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?", at, at, a.id);
    return publicView({ ...a, status: "canceled", canceled_at: at, updated_at: at }, r);
  });
}

/** Note personnelle (visible seulement avec l'accès au rendez-vous, jamais transmise). */
export function saveNote(projectId: string, token: string, note: string, at = now()) {
  liveCabinet(projectId);
  const a = ownedAppointment(projectId, tokenOf(projectId, token, at));
  const clean = str(note).slice(0, 1000);
  run("UPDATE cabinet_appointments SET personal_note = ?, updated_at = ? WHERE id = ?", clean || null, at, a.id);
  return { personalNote: clean };
}

/** Lien de gestion (le jeton est dans le fragment : jamais envoyé aux serveurs). */
export function manageLink(r: Cabinet, token: string) {
  return r.siteUrl ? `${r.siteUrl}${r.managePath}#t=${encodeURIComponent(token)}` : "";
}

export type EmailStatus = "sent" | "not_configured" | "failed";

/** E-mail de confirmation ; l'état rendu est l'état réel (jamais « envoyé » sans envoi). */
export async function sendConfirmation(r: Cabinet, a: Appointment, token: string): Promise<EmailStatus> {
  if (!mailConfigured()) return "not_configured";
  const when = `${core.formatDate(a.date)} à ${core.formatTime(core.toTime(a.start_min))}`;
  const where = a.modality === "visio" ? "En visioconférence : le lien de connexion vous sera communiqué par le cabinet." : `Au cabinet${r.address ? ` : ${r.address}` : ""}.`;
  try {
    await sendMail({ to: a.email, subject: `${r.name} — rendez-vous ${a.number}`, text: `Bonjour ${a.first_name},\n\nVotre rendez-vous est enregistré : ${a.service_name}, ${when}.\n${where}\nRéférence : ${a.number}\n\n${r.siteUrl ? `Gérer votre rendez-vous : ${manageLink(r, token)}` : "Pour le modifier ou l'annuler, contactez le cabinet en indiquant cette référence."}\n\n${r.name}` });
    if (r.notifyEmail) await sendMail({ to: r.notifyEmail, subject: `Nouveau rendez-vous ${a.number}`, text: `${a.first_name} ${a.last_name} — ${a.service_name} — ${when} — ${a.modality === "visio" ? "visioconférence" : "cabinet"}\n${a.phone}\n${a.note ?? ""}` });
    return "sent";
  } catch {
    return "failed";
  }
}

/** Retrouver un rendez-vous : référence ET e-mail ; réponse toujours neutre ; lien d'accès envoyé à l'adresse du rendez-vous. */
export async function lookup(projectId: string, reference: string, email: string, at = now()): Promise<{ ok: true }> {
  const r = liveCabinet(projectId);
  ensureTables();
  const a = one<Appointment>("SELECT * FROM cabinet_appointments WHERE project_id = ? AND number = ?", projectId, str(reference).toUpperCase());
  if (!a || a.email !== str(email).toLowerCase() || !mailConfigured() || !r.siteUrl) return { ok: true };
  const token = issueToken(projectId, a.id, ACCESS_LINK_MS, at);
  try { await sendMail({ to: a.email, subject: `${r.name} — votre rendez-vous`, text: `Bonjour ${a.first_name},\n\nVoici le lien d'accès à votre rendez-vous ${a.number} :\n${manageLink(r, token)}\n\nCe lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n${r.name}` }); } catch { /* réponse neutre quoi qu'il arrive */ }
  return { ok: true };
}

/** Accès de test et de lien e-mail (aussi utilisé par les tests). */
export function accessToken(projectId: string, apptId: string, at = now(), ttl = ACCESS_LINK_MS) {
  ensureTables();
  return issueToken(projectId, apptId, ttl, at);
}

const REQUEST_KINDS = ["contact", "entreprise", "newsletter"] as const;
/** Message (contact, demande d'entreprise, inscription) : enregistré, transmis au cabinet si l'envoi est configuré. */
export async function saveRequest(projectId: string, kind: string, payload: Record<string, unknown>, at = now()): Promise<{ id: string; forwarded: EmailStatus }> {
  const r = liveCabinet(projectId);
  ensureTables();
  if (!(REQUEST_KINDS as readonly string[]).includes(kind)) throw new BookingError("invalid", 400, { fields: ["kind"] });
  const email = str(payload.email).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new BookingError("invalid", 400, { fields: ["email"] });
  const clean = Object.fromEntries(Object.entries(payload).filter(([k]) => /^[a-z_]{1,24}$/.test(k)).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
  const id = crypto.randomUUID();
  run("INSERT INTO cabinet_requests (id, project_id, kind, email, payload, created_at) VALUES (?,?,?,?,?,?)", id, projectId, kind, email, JSON.stringify(clean), at);
  if (!r.notifyEmail || !mailConfigured()) return { id, forwarded: "not_configured" };
  try {
    await sendMail({ to: r.notifyEmail, subject: kind === "newsletter" ? "Nouvelle inscription aux articles" : kind === "entreprise" ? "Demande d'information (entreprise)" : "Nouveau message du site", text: Object.entries(clean).map(([k, v]) => `${k} : ${v}`).join("\n") });
    return { id, forwarded: "sent" };
  } catch {
    return { id, forwarded: "failed" };
  }
}

/** Rendez-vous d'un cabinet (studio, propriétaire du projet) : planning d'une période. */
export function listAppointments(projectId: string, from: string, to: string): Appointment[] {
  ensureTables();
  return all<Appointment>("SELECT * FROM cabinet_appointments WHERE project_id = ? AND date BETWEEN ? AND ? ORDER BY date, start_min", projectId, from, to);
}
