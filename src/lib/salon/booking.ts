/**
 * Service réel de rendez-vous d'un salon (thème ATELIER NUANCE, issue #177).
 *
 *  - Persistance durable et isolée par salon : chaque rendez-vous, client et jeton appartient à UN projet du studio ;
 *    aucune requête ne lit ni ne modifie les données d'un autre projet.
 *  - Règles du salon lues dans le thème enregistré du projet (section « an-salon ») : prestations et durées, équipe et
 *    compétences, horaires, fermetures, délais. Jamais celles envoyées par le navigateur.
 *  - Vérification atomique sur TOUTE la durée : l'agenda occupé du professionnel et l'enregistrement se lisent et
 *    s'écrivent dans la même transaction SQLite immédiate ; deux clients ne peuvent pas obtenir le même créneau, même
 *    partiellement (chevauchement). « Sans préférence » attribue un vrai professionnel libre.
 *  - Déplacement : le nouveau créneau est vérifié et écrit dans une transaction ; l'ancien n'est libéré qu'à ce moment.
 *  - Accès : jamais par l'adresse e-mail seule. Un jeton « rendez-vous » (rendu à la réservation) n'ouvre que ce
 *    rendez-vous ; un jeton « client » (lien envoyé par e-mail, durée limitée) ouvre l'espace du client. Les recherches
 *    par référence + e-mail, connexion et création de compte répondent toujours la même phrase neutre.
 *  - Le service n'est ouvert que si le salon l'a activé (mode « live ») : la démonstration ne passe jamais par ici.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { all, now, one, run, tx } from "../db";
import { currentTheme } from "../projects";
import type { SectionInstance, ThemeSpec } from "../theme/spec";
import { mailConfigured, sendMail } from "../mail";

type Busy = Record<string, [number, number][]>;
type Slot = { time: string; available: boolean; staff: string[]; reason: string | null };
export type SalonService = { id: string; name: string; category: string; short: string; duration: number | null; price: number | null; priceFrom: boolean; lengths: Record<string, { price: number | null; duration: number | null }> };
export type SalonStaff = { id: string; name: string; initial: string; title: string; skills: string[]; days: number[] | null };
export type SalonConfig = { timezone: string; hours: Record<number, [number, number][]>; closures: string[]; step: number; horizonDays: number; leadMinutes: number; cancelHours: number; services: SalonService[]; staff: SalonStaff[] };
type Core = {
  normalize(raw: unknown): SalonConfig;
  parseClosures(text: string): string[];
  nowIn(timezone: string, at?: number): { date: string; minute: number };
  dateStatus(cfg: SalonConfig, date: string, at?: number): string;
  dayStatus(cfg: SalonConfig, opts: Record<string, unknown>, at?: number): string;
  serviceById(cfg: SalonConfig, id: string): SalonService | null;
  staffById(cfg: SalonConfig, id: string): SalonStaff | null;
  staffFor(cfg: SalonConfig, id: string): SalonStaff[];
  offer(svc: SalonService, length?: string): { duration: number; price: number | null; priceFrom: boolean };
  slotsFor(cfg: SalonConfig, opts: { date: string; service: string; staff?: string; length?: string; busy?: Busy }, at?: number): Slot[];
  assign(cfg: SalonConfig, free: string[], busy: Busy): string | null;
  validate(cfg: SalonConfig, req: unknown, busy: Busy, at?: number): string[];
  changeAllowed(cfg: SalonConfig, appt: { date: string; time: string }, at?: number): boolean;
  monthGrid(year: number, month: number): (string | null)[];
  toMin(t: string): number;
  toTime(m: number): string;
  formatDate(date: string, lang?: string, lower?: boolean): string;
  formatTime(time: string, lang?: string): string;
  formatDuration(min: number, lang?: string, long?: boolean): string;
  formatPrice(price: number | null, from: boolean, lang?: string): string;
  maskEmail(email: string): string;
  ics(appt: Record<string, unknown>, opts: Record<string, unknown>): string;
  isDate(s: string): boolean;
  isTime(s: string): boolean;
  demoAgenda(cfg: SalonConfig, date: string): Busy;
};
/**
 * Même calcul que le site (theme-base/assets/atelier-nuance-core.js) : une seule règle des disponibilités. Le fichier est
 * un script de thème (ni module ESM ni CommonJS du dépôt) : il est évalué une fois avec son propre objet `module`.
 */
function loadCore(): Core {
  const src = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "atelier-nuance-core.js"), "utf8");
  const mod = { exports: {} as Core };
  new Function("module", "self", src)(mod, {});
  return mod.exports;
}
export const core: Core = loadCore();

export type Salon = { config: SalonConfig; mode: "demo" | "live"; name: string; address: string; notifyEmail: string | null; siteUrl: string | null; accountPath: string; cancelTerms: string };
export type Appointment = {
  id: string; project_id: string; number: string; status: "confirmed" | "canceled";
  service: string; service_name: string; length: string; staff: string; date: string; start_min: number; end_min: number;
  price: number | null; price_from: number; client_id: string;
  first_name: string; last_name: string; email: string; phone: string; note: string | null; newsletter: number;
  idem: string | null; created_at: number; updated_at: number; canceled_at: number | null;
};
export type Client = { id: string; project_id: string; email: string; first_name: string; last_name: string; phone: string; prefs: string; newsletter: number; created_at: number; updated_at: number };
type Token = { hash: string; project_id: string; client_id: string; appt_id: string | null; scope: "client" | "appt"; expires_at: number; revoked_at: number | null };

export class BookingError extends Error {
  constructor(public code: string, public status = 400, public details: Record<string, unknown> = {}) { super(code); }
}

/** Durée de validité d'un lien d'accès envoyé par e-mail, et d'un accès « rendez-vous » rendu à la réservation. */
export const CLIENT_LINK_MS = 7 * 24 * 3600_000;
export const APPT_TOKEN_MS = 120 * 24 * 3600_000;

let ready = false;
/** Tables créées à la première utilisation (aucune modification du schéma commun du studio). */
function ensureTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS salon_clients (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, email TEXT NOT NULL, first_name TEXT NOT NULL DEFAULT '', last_name TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
    prefs TEXT NOT NULL DEFAULT '{}', newsletter INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS salon_clients_email ON salon_clients(project_id, email)");
  run(`CREATE TABLE IF NOT EXISTS salon_appointments (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, number TEXT NOT NULL, status TEXT NOT NULL,
    service TEXT NOT NULL, service_name TEXT NOT NULL, length TEXT NOT NULL DEFAULT '', staff TEXT NOT NULL, date TEXT NOT NULL, start_min INTEGER NOT NULL, end_min INTEGER NOT NULL,
    price REAL, price_from INTEGER NOT NULL DEFAULT 0, client_id TEXT NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, note TEXT, newsletter INTEGER NOT NULL DEFAULT 0,
    idem TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, canceled_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS salon_appointments_number ON salon_appointments(project_id, number)");
  run("CREATE UNIQUE INDEX IF NOT EXISTS salon_appointments_idem ON salon_appointments(project_id, idem) WHERE idem IS NOT NULL");
  run("CREATE INDEX IF NOT EXISTS salon_appointments_day ON salon_appointments(project_id, date, staff, status)");
  run(`CREATE TABLE IF NOT EXISTS salon_tokens (
    hash TEXT PRIMARY KEY, project_id TEXT NOT NULL, client_id TEXT NOT NULL, appt_id TEXT, scope TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER, created_at INTEGER NOT NULL)`);
  run(`CREATE TABLE IF NOT EXISTS salon_requests (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, email TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  ready = true;
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Réglages du salon du thème (section « an-salon » de l'en-tête), ou null. */
export function salonSection(spec: Pick<ThemeSpec, "templates" | "groups">): SectionInstance | null {
  for (const t of [spec.groups?.header, ...Object.values(spec.templates ?? {})]) for (const s of Object.values(t?.sections ?? {})) if (s.type === "an-salon" && !s.disabled) return s;
  return null;
}

/** Règles d'un salon lues dans sa section de réglages (même lecture que le site). */
export function configFromSection(sec: SectionInstance): SalonConfig {
  const s = sec.settings ?? {};
  const blocks = (sec.block_order ?? Object.keys(sec.blocks ?? {})).map((id) => sec.blocks?.[id]).filter((b): b is NonNullable<typeof b> => !!b);
  return core.normalize({
    timezone: str(s.timezone) || "Europe/Paris",
    hours: { 0: s.hours_sun, 1: s.hours_mon, 2: s.hours_tue, 3: s.hours_wed, 4: s.hours_thu, 5: s.hours_fri, 6: s.hours_sat },
    closures: core.parseClosures(String(s.closures ?? "")),
    step: s.slot_step, horizonDays: s.horizon_days, leadMinutes: s.lead_minutes, cancelHours: s.cancel_hours,
    services: blocks.filter((b) => b.type === "service").map((b) => {
      const v = b.settings ?? {};
      return { id: v.service_id, name: v.name, category: v.category, short: v.short, duration: num(v.duration), price: num(v.price), priceFrom: v.price_from === true, lengths: { short: { price: num(v.short_price), duration: num(v.short_duration) }, mid: { price: num(v.mid_price), duration: num(v.mid_duration) }, long: { price: num(v.long_price), duration: num(v.long_duration) } } };
    }),
    staff: blocks.filter((b) => b.type === "member").map((b) => { const v = b.settings ?? {}; return { id: v.member_id, name: v.name, initial: v.initial, title: v.title, skills: v.skills, days: v.days, hours: str(v.hours) || null }; }),
  });
}

export function salonOf(projectId: string): Salon {
  const theme = currentTheme(projectId);
  const sec = theme ? salonSection(theme.spec) : null;
  if (!theme || !sec) throw new BookingError("not_found", 404);
  const s = sec.settings ?? {};
  return {
    config: configFromSection(sec), mode: s.booking_mode === "live" ? "live" : "demo", name: theme.spec.store?.shopName || "", address: str(s.address),
    notifyEmail: EMAIL_RE.test(str(s.notify_email)) ? str(s.notify_email) : null,
    siteUrl: /^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(str(s.site_url)) ? str(s.site_url).replace(/\/+$/, "") : null,
    accountPath: /^\/[\w\-/]*$/.test(str(s.page_account)) ? str(s.page_account) : "/pages/mon-espace",
    cancelTerms: str(s.cancel_terms),
  };
}

/** Salon dont le service réel est activé ; sinon refus (la démonstration ne passe jamais par le serveur). */
export function liveSalon(projectId: string): Salon {
  if (!/^[\w-]{1,64}$/.test(projectId)) throw new BookingError("not_found", 404);
  const r = salonOf(projectId);
  if (r.mode !== "live") throw new BookingError("not_live", 403);
  return r;
}

/** Agenda occupé d'une date (rendez-vous confirmés), en excluant éventuellement un rendez-vous (déplacement). */
export function busyFor(projectId: string, date: string, exceptId = ""): Busy {
  ensureTables();
  const out: Busy = {};
  for (const a of all<{ staff: string; start_min: number; end_min: number }>("SELECT staff, start_min, end_min FROM salon_appointments WHERE project_id = ? AND date = ? AND status = 'confirmed' AND id != ?", projectId, date, exceptId)) (out[a.staff] ??= []).push([a.start_min, a.end_min]);
  return out;
}

export type SlotQuery = { date: string; service: string; staff?: string; length?: string };
/** Créneaux libres d'une date (jamais l'identité des autres clients). */
export function availability(projectId: string, q: SlotQuery & { exceptId?: string }, at = now()) {
  const r = liveSalon(projectId);
  const slots = core.slotsFor(r.config, { date: q.date, service: q.service, staff: q.staff || "any", length: q.length, busy: busyFor(projectId, q.date, q.exceptId) }, at);
  return { status: core.dateStatus(r.config, q.date, at), slots: slots.map((s) => ({ time: s.time, available: s.available, staff: s.staff })) };
}

/** Statut de chaque date d'un mois pour le calendrier (passée, fermée, complète, au-delà, ouverte). */
export function monthAvailability(projectId: string, q: { month: string; service: string; staff?: string; length?: string; exceptId?: string }, at = now()) {
  const r = liveSalon(projectId);
  const m = /^(\d{4})-(\d{2})$/.exec(q.month);
  if (!m) throw new BookingError("invalid", 400, { fields: ["month"] });
  const days: Record<string, string> = {};
  for (const d of core.monthGrid(Number(m[1]), Number(m[2]))) if (d) days[d] = core.dayStatus(r.config, { date: d, service: q.service, staff: q.staff || "any", length: q.length, busy: busyFor(projectId, d, q.exceptId) }, at);
  return { days };
}

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(24).toString("base64url");
/** Référence non devinable : AN-AAAA-XXXXX (alphabet sans caractères ambigus). */
function newReference(projectId: string, year: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let i = 0; i < 20; i++) {
    const bytes = crypto.randomBytes(5);
    const ref = `AN-${year}-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
    if (!one("SELECT 1 FROM salon_appointments WHERE project_id = ? AND number = ?", projectId, ref)) return ref;
  }
  throw new BookingError("server", 500);
}

function issueToken(projectId: string, clientId: string, scope: "client" | "appt", apptId: string | null, ttl: number, at: number) {
  const token = newToken();
  run("INSERT INTO salon_tokens (hash, project_id, client_id, appt_id, scope, expires_at, revoked_at, created_at) VALUES (?,?,?,?,?,?,?,?)", hash(token), projectId, clientId, apptId, scope, at + ttl, null, at);
  return token;
}

/** Jeton valide d'un salon (comparaison par empreinte) ; expiré : « expired » ; inconnu ou d'un autre salon : « not_found ». */
export function tokenOf(projectId: string, token: string, at = now()): Token {
  ensureTables();
  if (!token || token.length > 200) throw new BookingError("not_found", 401);
  const row = one<Token>("SELECT * FROM salon_tokens WHERE hash = ?", hash(token));
  if (!row || row.project_id !== projectId || row.revoked_at) throw new BookingError("not_found", 401);
  if (row.expires_at < at) throw new BookingError("expired", 401);
  return row;
}

function upsertClient(projectId: string, c: { email: string; firstName?: string; lastName?: string; phone?: string; newsletter?: boolean }, at: number): Client {
  const email = c.email.toLowerCase();
  const prev = one<Client>("SELECT * FROM salon_clients WHERE project_id = ? AND email = ?", projectId, email);
  if (prev) {
    // Une réservation sans connexion ne modifie jamais les informations d'un client existant (seulement les vides).
    const patch = { first_name: prev.first_name || str(c.firstName).slice(0, 80), last_name: prev.last_name || str(c.lastName).slice(0, 80), phone: prev.phone || str(c.phone).slice(0, 24), newsletter: prev.newsletter || (c.newsletter ? 1 : 0) };
    run("UPDATE salon_clients SET first_name = ?, last_name = ?, phone = ?, newsletter = ?, updated_at = ? WHERE id = ?", patch.first_name, patch.last_name, patch.phone, patch.newsletter, at, prev.id);
    return { ...prev, ...patch, updated_at: at };
  }
  const client: Client = { id: crypto.randomUUID(), project_id: projectId, email, first_name: str(c.firstName).slice(0, 80), last_name: str(c.lastName).slice(0, 80), phone: str(c.phone).slice(0, 24), prefs: "{}", newsletter: c.newsletter ? 1 : 0, created_at: at, updated_at: at };
  run("INSERT INTO salon_clients (id, project_id, email, first_name, last_name, phone, prefs, newsletter, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", client.id, projectId, client.email, client.first_name, client.last_name, client.phone, client.prefs, client.newsletter, at, at);
  return client;
}

function alternatives(r: Salon, projectId: string, q: SlotQuery, exceptId: string | undefined, at: number) {
  return core.slotsFor(r.config, { date: q.date, service: q.service, staff: q.staff || "any", length: q.length, busy: busyFor(projectId, q.date, exceptId) }, at).filter((s) => s.available).map((s) => s.time);
}

export type CreateInput = SlotQuery & { time: string; firstName: string; lastName: string; email: string; phone: string; note?: string; newsletter?: boolean; terms: boolean; idem?: string };

/** Ce que le client voit d'un rendez-vous (jamais l'identifiant interne ni d'autres clients). */
export function publicView(a: Appointment) {
  return { number: a.number, status: a.status, service: a.service, serviceName: a.service_name, length: a.length, staff: a.staff, date: a.date, time: core.toTime(a.start_min), duration: a.end_min - a.start_min, price: a.price, priceFrom: !!a.price_from, note: a.note ?? "" };
}

/** Enregistre un rendez-vous après vérification atomique du créneau sur toute sa durée. */
export function createAppointment(projectId: string, input: CreateInput, at = now()): { appointment: Appointment; clientToken: string | null; duplicate: boolean } {
  ensureTables();
  const r = liveSalon(projectId);
  const email = str(input.email).toLowerCase(), idem = /^[\w-]{8,80}$/.test(String(input.idem ?? "")) ? String(input.idem) : null;
  const length = ["short", "mid", "long"].includes(String(input.length)) ? String(input.length) : "";
  const q: SlotQuery = { date: str(input.date), service: str(input.service), staff: str(input.staff) || "any", length };
  const contact = { firstName: input.firstName, lastName: input.lastName, email, phone: str(input.phone), terms: input.terms === true };
  return tx(() => {
    if (idem) {
      const prev = one<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND idem = ?", projectId, idem);
      // Double clic ou renvoi du même formulaire : le même rendez-vous, sans nouvel accès (le premier reste valable).
      if (prev) return { appointment: prev, clientToken: null, duplicate: true };
    }
    const busy = busyFor(projectId, q.date);
    const errors = core.validate(r.config, { ...q, time: str(input.time), contact }, busy, at);
    if (errors.includes("slot_taken") || (errors.includes("time") && core.isTime(str(input.time)))) throw new BookingError("unavailable", 409, { alternatives: alternatives(r, projectId, q, undefined, at) });
    if (errors.length) throw new BookingError("invalid", 400, { fields: errors });
    const svc = core.serviceById(r.config, q.service)!;
    const offer = core.offer(svc, length);
    const time = str(input.time), start = core.toMin(time);
    const slot = core.slotsFor(r.config, { ...q, busy }, at).find((s) => s.time === time)!;
    const staff = q.staff && q.staff !== "any" ? q.staff : core.assign(r.config, slot.staff, busy);
    if (!staff) throw new BookingError("unavailable", 409, { alternatives: alternatives(r, projectId, q, undefined, at) });
    const same = one("SELECT 1 FROM salon_appointments WHERE project_id = ? AND email = ? AND date = ? AND start_min = ? AND status = 'confirmed'", projectId, email, q.date, start);
    if (same) throw new BookingError("duplicate", 409);
    const client = upsertClient(projectId, { email, firstName: input.firstName, lastName: input.lastName, phone: input.phone, newsletter: input.newsletter }, at);
    const a: Appointment = {
      id: crypto.randomUUID(), project_id: projectId, number: newReference(projectId, q.date.slice(0, 4)), status: "confirmed",
      service: svc.id, service_name: svc.name, length, staff, date: q.date, start_min: start, end_min: start + offer.duration,
      price: offer.price, price_from: offer.priceFrom ? 1 : 0, client_id: client.id,
      first_name: str(input.firstName).slice(0, 80), last_name: str(input.lastName).slice(0, 80), email: email.slice(0, 160), phone: str(input.phone).slice(0, 24),
      note: str(input.note).slice(0, 600) || null, newsletter: input.newsletter ? 1 : 0, idem, created_at: at, updated_at: at, canceled_at: null,
    };
    run("INSERT INTO salon_appointments (id, project_id, number, status, service, service_name, length, staff, date, start_min, end_min, price, price_from, client_id, first_name, last_name, email, phone, note, newsletter, idem, created_at, updated_at, canceled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      a.id, a.project_id, a.number, a.status, a.service, a.service_name, a.length, a.staff, a.date, a.start_min, a.end_min, a.price, a.price_from, a.client_id, a.first_name, a.last_name, a.email, a.phone, a.note, a.newsletter, a.idem, a.created_at, a.updated_at, a.canceled_at);
    // Accès « rendez-vous » : n'ouvre que CE rendez-vous (réserver avec l'adresse d'un autre ne donne jamais accès à ses données).
    const clientToken = issueToken(projectId, client.id, "appt", a.id, APPT_TOKEN_MS, at);
    return { appointment: a, clientToken, duplicate: false };
  });
}

/** Rendez-vous accessibles avec un jeton : tous ceux du client (jeton client) ou un seul (jeton rendez-vous). */
function appointmentsFor(t: Token): Appointment[] {
  return t.scope === "client"
    ? all<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND client_id = ? ORDER BY date, start_min", t.project_id, t.client_id)
    : all<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND id = ?", t.project_id, t.appt_id ?? "");
}

/** Espace client : informations (jeton client) et rendez-vous à venir / passés. */
export function me(projectId: string, token: string, at = now()) {
  liveSalon(projectId);
  const t = tokenOf(projectId, token, at);
  const r = salonOf(projectId);
  const nowIn = core.nowIn(r.config.timezone, at);
  const list = appointmentsFor(t);
  const isPast = (a: Appointment) => a.date < nowIn.date || (a.date === nowIn.date && a.end_min <= nowIn.minute);
  const c = one<Client>("SELECT * FROM salon_clients WHERE id = ? AND project_id = ?", t.client_id, projectId);
  const appt = list[0];
  // Jeton « rendez-vous » : seules les informations saisies pour CE rendez-vous (jamais la fiche du client).
  const client = t.scope === "client" && c
    ? { firstName: c.first_name, lastName: c.last_name, email: c.email, phone: c.phone, prefs: safeJson(c.prefs) }
    : { firstName: appt?.first_name ?? "", lastName: appt?.last_name ?? "", email: appt ? core.maskEmail(appt.email) : "", phone: "", prefs: {} };
  return { scope: t.scope, client, upcoming: list.filter((a) => a.status === "confirmed" && !isPast(a)).map(publicView), past: list.filter((a) => a.status !== "confirmed" || isPast(a)).map(publicView) };
}
const safeJson = (s: string) => { try { const v = JSON.parse(s); return v && typeof v === "object" ? v : {}; } catch { return {}; } };

/** Mise à jour des informations et préférences : jeton client seulement (lien reçu par e-mail). */
export function updateMe(projectId: string, token: string, patch: { firstName?: string; lastName?: string; phone?: string; prefs?: Record<string, unknown> }, at = now()) {
  liveSalon(projectId);
  const t = tokenOf(projectId, token, at);
  if (t.scope !== "client") throw new BookingError("scope", 403);
  const c = one<Client>("SELECT * FROM salon_clients WHERE id = ? AND project_id = ?", t.client_id, projectId);
  if (!c) throw new BookingError("not_found", 404);
  const prefs = { ...safeJson(c.prefs) } as Record<string, unknown>;
  if (patch.prefs) {
    const p = patch.prefs;
    if (p.staff !== undefined) prefs.staff = str(p.staff).slice(0, 48);
    if (p.note !== undefined) prefs.note = str(p.note).slice(0, 600);
    if (p.reminders !== undefined) prefs.reminders = p.reminders === true;
    if (p.newsletter !== undefined) prefs.newsletter = p.newsletter === true;
  }
  const next = { first_name: patch.firstName === undefined ? c.first_name : str(patch.firstName).slice(0, 80), last_name: patch.lastName === undefined ? c.last_name : str(patch.lastName).slice(0, 80), phone: patch.phone === undefined ? c.phone : str(patch.phone).slice(0, 24) };
  if (!next.first_name || !next.last_name) throw new BookingError("invalid", 400, { fields: [!next.first_name ? "firstName" : "lastName"] });
  run("UPDATE salon_clients SET first_name = ?, last_name = ?, phone = ?, prefs = ?, newsletter = ?, updated_at = ? WHERE id = ?", next.first_name, next.last_name, next.phone, JSON.stringify(prefs), prefs.newsletter === true ? 1 : c.newsletter, at, c.id);
  return { firstName: next.first_name, lastName: next.last_name, email: c.email, phone: next.phone, prefs };
}

function ownedAppointment(projectId: string, t: Token, number: string): Appointment {
  const a = one<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND number = ?", projectId, str(number).toUpperCase());
  const owned = a && (t.scope === "client" ? a.client_id === t.client_id : a.id === t.appt_id);
  if (!a || !owned) throw new BookingError("not_found", 404);
  return a;
}

/**
 * Déplacement : le nouveau créneau (même prestation, même professionnel) est vérifié sans compter ce rendez-vous puis
 * écrit dans la même transaction ; l'ancien n'est libéré qu'à ce moment-là. Refusé dans le délai réglé par le salon.
 */
export function moveAppointment(projectId: string, token: string, number: string, change: { date: string; time: string }, at = now()) {
  const r = liveSalon(projectId);
  return tx(() => {
    const t = tokenOf(projectId, token, at);
    const a = ownedAppointment(projectId, t, number);
    if (a.status !== "confirmed") throw new BookingError("canceled", 409);
    if (!core.changeAllowed(r.config, { date: a.date, time: core.toTime(a.start_min) }, at)) throw new BookingError("too_late", 409);
    const q: SlotQuery = { date: str(change.date), service: a.service, staff: a.staff, length: a.length };
    const errors = core.validate(r.config, { ...q, time: str(change.time) }, busyFor(projectId, q.date, a.id), at);
    if (errors.length) throw new BookingError(errors.includes("slot_taken") || errors.includes("time") ? "unavailable" : "invalid", 409, { alternatives: alternatives(r, projectId, q, a.id, at) });
    const start = core.toMin(str(change.time));
    run("UPDATE salon_appointments SET date = ?, start_min = ?, end_min = ?, updated_at = ? WHERE id = ?", q.date, start, start + (a.end_min - a.start_min), at, a.id);
    return publicView({ ...a, date: q.date, start_min: start, end_min: start + (a.end_min - a.start_min), updated_at: at });
  });
}

/** Annulation explicite : le rendez-vous n'est plus actif et libère son créneau. Refusée dans le délai réglé par le salon. */
export function cancelAppointment(projectId: string, token: string, number: string, at = now()) {
  const r = liveSalon(projectId);
  return tx(() => {
    const t = tokenOf(projectId, token, at);
    const a = ownedAppointment(projectId, t, number);
    if (a.status === "canceled") return publicView(a);
    if (!core.changeAllowed(r.config, { date: a.date, time: core.toTime(a.start_min) }, at)) throw new BookingError("too_late", 409);
    run("UPDATE salon_appointments SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?", at, at, a.id);
    return publicView({ ...a, status: "canceled", canceled_at: at, updated_at: at });
  });
}

export function logout(projectId: string, token: string, at = now()) {
  ensureTables();
  run("UPDATE salon_tokens SET revoked_at = ? WHERE hash = ? AND project_id = ?", at, hash(token), projectId);
}

/** Lien d'accès (page « Mon espace » du site ; le jeton est dans le fragment : jamais envoyé aux serveurs). */
export function accountLink(r: Salon, token: string) {
  return r.siteUrl ? `${r.siteUrl}${r.accountPath}#c=${encodeURIComponent(token)}` : "";
}

export type EmailStatus = "sent" | "not_configured" | "failed";

/** E-mail de confirmation ; l'état rendu est l'état réel (jamais « envoyé » sans envoi). */
export async function sendConfirmation(r: Salon, a: Appointment, token: string): Promise<EmailStatus> {
  if (!mailConfigured()) return "not_configured";
  const p = r.config.staff.find((x) => x.id === a.staff);
  const when = `${core.formatDate(a.date)} à ${core.formatTime(core.toTime(a.start_min))}`;
  try {
    await sendMail({ to: a.email, subject: `${r.name} — rendez-vous ${a.number}`, text: `Bonjour ${a.first_name},\n\nVotre rendez-vous est confirmé : ${a.service_name}, ${when}${p ? `, avec ${p.name}` : ""}.\nRéférence : ${a.number}\n\n${r.siteUrl ? `Gérer votre rendez-vous : ${accountLink(r, token)}` : "Pour le modifier ou l'annuler, contactez le salon en indiquant cette référence."}\n\n${r.name}${r.address ? `\n${r.address}` : ""}` });
    if (r.notifyEmail) await sendMail({ to: r.notifyEmail, subject: `Nouveau rendez-vous ${a.number}`, text: `${a.first_name} ${a.last_name} — ${a.service_name} — ${when}${p ? ` — ${p.name}` : ""}\n${a.phone}\n${a.note ?? ""}` });
    return "sent";
  } catch {
    return "failed";
  }
}

/** Accès « client » à durée limitée (lien envoyé par e-mail ; aussi utilisé par les tests). */
export function clientAccess(projectId: string, clientId: string, at = now()) {
  ensureTables();
  return issueToken(projectId, clientId, "client", null, CLIENT_LINK_MS, at);
}

async function sendAccess(r: Salon, projectId: string, client: Client, at: number, intro: string) {
  if (!mailConfigured() || !r.siteUrl) return;
  const token = clientAccess(projectId, client.id, at);
  try { await sendMail({ to: client.email, subject: `${r.name} — votre espace`, text: `Bonjour${client.first_name ? ` ${client.first_name}` : ""},\n\n${intro}\n\n${accountLink(r, token)}\n\nCe lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n${r.name}` }); } catch { /* réponse neutre quoi qu'il arrive */ }
}

/** Retrouver un rendez-vous : référence ET e-mail ; réponse toujours neutre ; lien d'accès envoyé à l'adresse du rendez-vous. */
export async function lookup(projectId: string, reference: string, email: string, at = now()): Promise<{ ok: true }> {
  const r = liveSalon(projectId);
  ensureTables();
  const a = one<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND number = ?", projectId, str(reference).toUpperCase());
  if (!a || a.email !== str(email).toLowerCase()) return { ok: true };
  const c = one<Client>("SELECT * FROM salon_clients WHERE id = ?", a.client_id);
  if (c) await sendAccess(r, projectId, c, at, "Voici le lien d'accès à vos rendez-vous :");
  return { ok: true };
}

/** Se connecter : un lien n'est envoyé que si le client existe ; réponse toujours neutre. */
export async function login(projectId: string, email: string, at = now()): Promise<{ ok: true }> {
  const r = liveSalon(projectId);
  ensureTables();
  const c = one<Client>("SELECT * FROM salon_clients WHERE project_id = ? AND email = ?", projectId, str(email).toLowerCase());
  if (c) await sendAccess(r, projectId, c, at, "Voici votre lien de connexion :");
  return { ok: true };
}

/** Créer un compte : fiche créée si besoin (jamais modifiée), lien envoyé à l'adresse ; réponse toujours neutre. */
export async function register(projectId: string, email: string, firstName: string, at = now()): Promise<{ ok: true }> {
  const r = liveSalon(projectId);
  ensureTables();
  const addr = str(email).toLowerCase();
  if (!EMAIL_RE.test(addr)) throw new BookingError("invalid", 400, { fields: ["email"] });
  const c = upsertClient(projectId, { email: addr, firstName }, at);
  await sendAccess(r, projectId, c, at, "Votre espace client est prêt. Ouvrez-le avec ce lien :");
  return { ok: true };
}

/** Message du formulaire de contact : enregistré (preuve de réception), transmis au salon si l'envoi est configuré. */
export async function saveRequest(projectId: string, payload: Record<string, unknown>, at = now()): Promise<{ id: string; forwarded: EmailStatus }> {
  const r = liveSalon(projectId);
  ensureTables();
  const email = str(payload.email).toLowerCase();
  if (!EMAIL_RE.test(email)) throw new BookingError("invalid", 400, { fields: ["email"] });
  const clean = Object.fromEntries(Object.entries(payload).filter(([k]) => /^[a-z_]{1,24}$/.test(k)).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
  const id = crypto.randomUUID();
  run("INSERT INTO salon_requests (id, project_id, kind, email, payload, created_at) VALUES (?,?,?,?,?,?)", id, projectId, "contact", email, JSON.stringify(clean), at);
  if (!r.notifyEmail || !mailConfigured()) return { id, forwarded: "not_configured" };
  try {
    await sendMail({ to: r.notifyEmail, subject: "Nouveau message du site", text: Object.entries(clean).map(([k, v]) => `${k} : ${v}`).join("\n") });
    return { id, forwarded: "sent" };
  } catch {
    return { id, forwarded: "failed" };
  }
}

/** Rendez-vous d'un salon par sa référence (studio, propriétaire du projet). */
function byNumber(projectId: string, number: string): Appointment {
  const a = one<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND number = ?", projectId, str(number).toUpperCase());
  if (!a) throw new BookingError("not_found", 404);
  return a;
}

/**
 * Déplacement par le salon lui-même (rubrique « Rendez-vous » du studio) : autre jour, autre heure et, au besoin, autre
 * professionnel. Même contrôle de créneau que le site, dans la même transaction exclusive ; le délai d'annulation
 * imposé aux clients ne s'applique pas au salon.
 */
export function proMoveAppointment(projectId: string, number: string, change: { date: string; time: string; staff?: string }, at = now()) {
  const r = liveSalon(projectId);
  return tx(() => {
    const a = byNumber(projectId, number);
    if (a.status !== "confirmed") throw new BookingError("canceled", 409);
    const q: SlotQuery = { date: str(change.date), service: a.service, staff: str(change.staff) || a.staff, length: a.length };
    const errors = core.validate(r.config, { ...q, time: str(change.time) }, busyFor(projectId, q.date, a.id), at);
    if (errors.length) throw new BookingError(errors.includes("slot_taken") || errors.includes("time") ? "unavailable" : "invalid", 409, { alternatives: alternatives(r, projectId, q, a.id, at) });
    const start = core.toMin(str(change.time));
    run("UPDATE salon_appointments SET date = ?, start_min = ?, end_min = ?, staff = ?, updated_at = ? WHERE id = ?", q.date, start, start + (a.end_min - a.start_min), q.staff, at, a.id);
    return publicView({ ...a, date: q.date, start_min: start, end_min: start + (a.end_min - a.start_min), staff: q.staff ?? a.staff, updated_at: at });
  });
}

/** Annulation par le salon (studio) : le créneau est libéré ; aucun délai ne s'impose au salon. */
export function proCancelAppointment(projectId: string, number: string, at = now()) {
  liveSalon(projectId);
  return tx(() => {
    const a = byNumber(projectId, number);
    if (a.status === "canceled") return publicView(a);
    run("UPDATE salon_appointments SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?", at, at, a.id);
    return publicView({ ...a, status: "canceled", canceled_at: at, updated_at: at });
  });
}

/** Rendez-vous d'un salon (studio, propriétaire du projet) : planning d'une période. */
export function listAppointments(projectId: string, from: string, to: string): Appointment[] {
  ensureTables();
  return all<Appointment>("SELECT * FROM salon_appointments WHERE project_id = ? AND date BETWEEN ? AND ? ORDER BY date, start_min", projectId, from, to);
}
