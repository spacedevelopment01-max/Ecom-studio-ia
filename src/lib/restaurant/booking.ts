/**
 * Service réel de réservation de table (thème restaurant TABLE SAISON, issue #175).
 *
 *  - Persistance durable et isolée par établissement : chaque réservation appartient à UN projet du studio (le
 *    restaurant) ; aucune requête ne lit ni ne modifie les réservations d'un autre projet.
 *  - Règles du restaurant lues dans le thème enregistré du projet (section « ts-restaurant ») : services et heures, jours
 *    d'ouverture, fermetures, capacité, taille des groupes, fuseau horaire. Jamais celles envoyées par le navigateur.
 *  - Vérification atomique : le calcul des couverts déjà pris et l'enregistrement se font dans la même transaction
 *    SQLite immédiate (deux réservations simultanées ne peuvent pas dépasser la capacité d'un créneau).
 *  - Doublons : une clé d'envoi (idempotence) par formulaire rend la même réservation en cas de double clic ou de
 *    renvoi ; la même adresse ne peut pas réserver deux fois le même créneau.
 *  - Accès : numéro + jeton secret (lien « Gérer ma réservation »). L'adresse e-mail seule ne donne jamais accès à une
 *    réservation : la recherche par e-mail répond toujours la même phrase neutre et envoie le lien par e-mail.
 *  - Le service n'est ouvert que si le restaurant l'a activé (mode « live » de la section) : la démonstration du thème
 *    ne passe jamais par ici.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { all, now, one, run, tx } from "../db";
import { currentTheme } from "../projects";
import type { ThemeSpec } from "../theme/spec";
import { mailConfigured, sendMail } from "../mail";

type Core = {
  normalize(raw: unknown): RestaurantConfig;
  parseClosures(text: string): string[];
  slotsFor(cfg: RestaurantConfig, date: string, party: number, booked: Record<string, number>, now?: number): { id: string; label: string; slots: { time: string; available: boolean; reason: string | null }[] }[];
  validate(cfg: RestaurantConfig, req: unknown, booked: Record<string, number>, now?: number): string[];
  dateStatus(cfg: RestaurantConfig, date: string, now?: number): string;
  formatDate(date: string, lang?: string): string;
  formatTime(time: string, lang?: string): string;
  maskEmail(email: string): string;
  nowIn(timezone: string, at?: number): { date: string; minute: number };
  monthGrid(year: number, month: number): (string | null)[];
  ics(res: { number: string; date: string; time: string }, opts: Record<string, unknown>): string;
};
/**
 * Même calcul que le site (theme-base/assets/table-saison-core.js) : une seule règle des disponibilités. Le fichier est
 * un script de thème (ni module ESM ni CommonJS du dépôt) : il est évalué une fois avec son propre objet `module`.
 */
function loadCore(): Core {
  const src = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "table-saison-core.js"), "utf8");
  const mod = { exports: {} as Core };
  new Function("module", "self", src)(mod, {});
  return mod.exports;
}
export const core: Core = loadCore();

export type RestaurantConfig = {
  timezone: string; openDays: number[]; closures: string[];
  services: { id: string; label: string; slots: string[]; days: number[] | null }[];
  capacity: number; minParty: number; maxParty: number; horizonDays: number; leadMinutes: number;
};
export type Restaurant = { config: RestaurantConfig; mode: "demo" | "live"; name: string; address: string; notifyEmail: string | null; /** Adresse publique du site, réglée par le restaurant : seule destination des liens envoyés par e-mail (jamais l'origine d'une requête). */ siteUrl: string | null };

export type Reservation = {
  id: string; project_id: string; number: string; status: "confirmed" | "canceled";
  party: number; date: string; time: string;
  first_name: string; last_name: string; email: string; phone: string | null; note: string | null; newsletter: number;
  token_hash: string; idem: string | null; created_at: number; updated_at: number; canceled_at: number | null;
};

export class BookingError extends Error {
  constructor(public code: string, public status = 400, public details: Record<string, unknown> = {}) { super(code); }
}

let ready = false;
/** Tables créées à la première utilisation (aucune modification du schéma commun du studio). */
function ensureTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS restaurant_reservations (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, number TEXT NOT NULL, status TEXT NOT NULL,
    party INTEGER NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, note TEXT, newsletter INTEGER NOT NULL DEFAULT 0,
    token_hash TEXT NOT NULL, idem TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, canceled_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS restaurant_reservations_number ON restaurant_reservations(project_id, number)");
  run("CREATE UNIQUE INDEX IF NOT EXISTS restaurant_reservations_idem ON restaurant_reservations(project_id, idem) WHERE idem IS NOT NULL");
  run("CREATE INDEX IF NOT EXISTS restaurant_reservations_slot ON restaurant_reservations(project_id, date, time, status)");
  run(`CREATE TABLE IF NOT EXISTS restaurant_requests (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, kind TEXT NOT NULL, email TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL)`);
  ready = true;
}

const SLOT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const list = (v: unknown) => String(v ?? "").split(/[\s,;]+/).map((x) => x.trim()).filter((x) => SLOT_RE.test(x));
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Réglages du restaurant du thème (section « ts-restaurant » de l'en-tête), ou null. */
export function restaurantSection(spec: Pick<ThemeSpec, "templates" | "groups">) {
  for (const t of [spec.groups?.header, ...Object.values(spec.templates ?? {})]) for (const s of Object.values(t?.sections ?? {})) if (s.type === "ts-restaurant" && !s.disabled) return s;
  return null;
}

/** Règles d'un restaurant lues dans les réglages de sa section de réservation (même lecture que le site). */
export function configFromSettings(s: Record<string, unknown>): RestaurantConfig {
  const days = String(s.open_days ?? "1,2,3,4,5,6").split(/[\s,;]+/).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  return core.normalize({
    timezone: str(s.timezone) || "Europe/Paris",
    openDays: days,
    closures: core.parseClosures(String(s.closures ?? "")),
    services: [
      { id: "dejeuner", label: str(s.lunch_label) || "Déjeuner", slots: list(s.lunch_slots) },
      { id: "diner", label: str(s.dinner_label) || "Dîner", slots: list(s.dinner_slots) },
    ],
    capacity: s.capacity, minParty: s.min_party, maxParty: s.max_party, horizonDays: s.horizon_days, leadMinutes: s.lead_minutes,
  });
}

export function restaurantOf(projectId: string): Restaurant {
  const theme = currentTheme(projectId);
  const sec = theme ? restaurantSection(theme.spec) : null;
  if (!theme || !sec) throw new BookingError("not_found", 404);
  const s = sec.settings ?? {};
  return { config: configFromSettings(s), mode: s.booking_mode === "live" ? "live" : "demo", name: theme.spec.store?.shopName || "", address: str(s.address), notifyEmail: /@/.test(str(s.notify_email)) ? str(s.notify_email) : null, siteUrl: /^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(str(s.site_url)) ? str(s.site_url) : null };
}

/** Restaurant dont le service réel est activé ; sinon refus (la démonstration ne passe jamais par le serveur). */
export function liveRestaurant(projectId: string): Restaurant {
  if (!/^[\w-]{1,64}$/.test(projectId)) throw new BookingError("not_found", 404);
  const r = restaurantOf(projectId);
  if (r.mode !== "live") throw new BookingError("not_live", 403);
  return r;
}

/** Couverts déjà pris par heure pour une date (réservations confirmées), en excluant éventuellement une réservation. */
export function bookedCovers(projectId: string, date: string, exceptId?: string): Record<string, number> {
  ensureTables();
  const rows = all<{ time: string; n: number }>("SELECT time, SUM(party) n FROM restaurant_reservations WHERE project_id = ? AND date = ? AND status = 'confirmed' AND id != ? GROUP BY time", projectId, date, exceptId ?? "");
  return Object.fromEntries(rows.map((r) => [r.time, r.n]));
}

export function availability(projectId: string, date: string, party: number, at = now()) {
  const r = liveRestaurant(projectId);
  return { status: core.dateStatus(r.config, date, at), services: core.slotsFor(r.config, date, party, bookedCovers(projectId, date), at) };
}

const hash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const newToken = () => crypto.randomBytes(24).toString("base64url");

function alternatives(projectId: string, r: Restaurant, date: string, party: number, exceptId: string | undefined, at: number) {
  return core.slotsFor(r.config, date, party, bookedCovers(projectId, date, exceptId), at).map((s) => ({ id: s.id, label: s.label, times: s.slots.filter((x) => x.available).map((x) => x.time) })).filter((s) => s.times.length);
}

export type CreateInput = { party: number; date: string; time: string; firstName: string; lastName: string; email: string; phone?: string; note?: string; newsletter?: boolean; terms: boolean; idem?: string };

/** Public : ce que le client voit de sa réservation (adresse masquée, jamais le jeton ni les coordonnées complètes). */
export function publicView(res: Reservation) {
  return { number: res.number, status: res.status, party: res.party, date: res.date, time: res.time, emailMasked: core.maskEmail(res.email), note: res.note ?? "", createdAt: res.created_at };
}

/** Enregistre une réservation après vérification atomique de la disponibilité. */
export function createReservation(projectId: string, input: CreateInput, at = now()): { reservation: Reservation; token: string | null; duplicate: boolean } {
  ensureTables();
  const r = liveRestaurant(projectId);
  const email = str(input.email).toLowerCase(), idem = /^[\w-]{8,80}$/.test(String(input.idem ?? "")) ? String(input.idem) : null;
  const request = { party: Number(input.party), date: str(input.date), time: str(input.time), contact: { firstName: input.firstName, lastName: input.lastName, email, phone: str(input.phone), terms: input.terms === true } };
  return tx(() => {
    if (idem) {
      const prev = one<Reservation>("SELECT * FROM restaurant_reservations WHERE project_id = ? AND idem = ?", projectId, idem);
      // Double clic ou renvoi du même formulaire : la même réservation, sans nouveau jeton (le premier reste valable).
      if (prev) return { reservation: prev, token: null, duplicate: true };
    }
    const errors = core.validate(r.config, request, bookedCovers(projectId, request.date), at);
    if (errors.some((e) => e.startsWith("slot_"))) throw new BookingError("unavailable", 409, { alternatives: alternatives(projectId, r, request.date, request.party, undefined, at) });
    if (errors.length) throw new BookingError("invalid", 400, { fields: errors });
    const same = one<{ id: string }>("SELECT id FROM restaurant_reservations WHERE project_id = ? AND email = ? AND date = ? AND time = ? AND status = 'confirmed'", projectId, email, request.date, request.time);
    if (same) throw new BookingError("duplicate", 409);
    const seq = (one<{ n: number }>("SELECT COUNT(*) n FROM restaurant_reservations WHERE project_id = ?", projectId)?.n ?? 0) + 1;
    const token = newToken();
    const res: Reservation = {
      id: crypto.randomUUID(), project_id: projectId, number: `TS-${String(seq).padStart(4, "0")}`, status: "confirmed",
      party: request.party, date: request.date, time: request.time,
      first_name: str(input.firstName).slice(0, 80), last_name: str(input.lastName).slice(0, 80), email: email.slice(0, 160),
      phone: str(input.phone).slice(0, 24) || null, note: str(input.note).slice(0, 600) || null, newsletter: input.newsletter ? 1 : 0,
      token_hash: hash(token), idem, created_at: at, updated_at: at, canceled_at: null,
    };
    run("INSERT INTO restaurant_reservations (id, project_id, number, status, party, date, time, first_name, last_name, email, phone, note, newsletter, token_hash, idem, created_at, updated_at, canceled_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      res.id, res.project_id, res.number, res.status, res.party, res.date, res.time, res.first_name, res.last_name, res.email, res.phone, res.note, res.newsletter, res.token_hash, res.idem, res.created_at, res.updated_at, res.canceled_at);
    return { reservation: res, token, duplicate: false };
  });
}

/** Réservation d'un projet par numéro ET jeton (comparaison à temps constant) ; sinon introuvable. */
export function reservationByToken(projectId: string, number: string, token: string): Reservation {
  ensureTables();
  const res = one<Reservation>("SELECT * FROM restaurant_reservations WHERE project_id = ? AND number = ?", projectId, str(number).toUpperCase());
  const a = Buffer.from(res?.token_hash ?? "0".repeat(64), "hex"), b = Buffer.from(hash(String(token ?? "")), "hex");
  if (!res || !token || !crypto.timingSafeEqual(a, b)) throw new BookingError("not_found", 404);
  return res;
}

/** Modification (personnes, date, heure, remarque) : disponibilité vérifiée de nouveau, hors couverts de cette réservation. */
export function modifyReservation(projectId: string, number: string, token: string, change: { party?: number; date?: string; time?: string; note?: string }, at = now()): Reservation {
  const r = liveRestaurant(projectId);
  return tx(() => {
    const res = reservationByToken(projectId, number, token);
    if (res.status !== "confirmed") throw new BookingError("canceled", 409);
    const next = { party: change.party === undefined ? res.party : Number(change.party), date: change.date === undefined ? res.date : str(change.date), time: change.time === undefined ? res.time : str(change.time) };
    const moved = next.party !== res.party || next.date !== res.date || next.time !== res.time;
    if (moved) {
      const errors = core.validate(r.config, next, bookedCovers(projectId, next.date, res.id), at);
      if (errors.some((e) => e.startsWith("slot_"))) throw new BookingError("unavailable", 409, { alternatives: alternatives(projectId, r, next.date, next.party, res.id, at) });
      if (errors.length) throw new BookingError("invalid", 400, { fields: errors });
    }
    const note = change.note === undefined ? res.note : str(change.note).slice(0, 600) || null;
    run("UPDATE restaurant_reservations SET party = ?, date = ?, time = ?, note = ?, updated_at = ? WHERE id = ?", next.party, next.date, next.time, note, at, res.id);
    return { ...res, ...next, note, updated_at: at };
  });
}

/** Annulation définitive : la réservation n'est plus active et libère ses couverts. */
export function cancelReservation(projectId: string, number: string, token: string, at = now()): Reservation {
  liveRestaurant(projectId);
  return tx(() => {
    const res = reservationByToken(projectId, number, token);
    if (res.status === "canceled") return res;
    run("UPDATE restaurant_reservations SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?", at, at, res.id);
    return { ...res, status: "canceled" as const, canceled_at: at, updated_at: at };
  });
}

/** Lien sécurisé de gestion (page « Ma réservation » du site, numéro et jeton dans le fragment : jamais envoyé aux serveurs). */
export function manageLink(siteUrl: string | null, number: string, token: string) {
  if (!siteUrl) return "";
  return `${siteUrl.replace(/\/+$/, "")}/pages/ma-reservation#r=${encodeURIComponent(number)}&t=${encodeURIComponent(token)}`;
}

export type EmailStatus = "sent" | "not_configured" | "failed";

/** E-mail de confirmation ; l'état rendu est l'état réel (jamais « envoyé » sans envoi). */
export async function sendConfirmation(r: Restaurant, res: Reservation, token: string): Promise<EmailStatus> {
  if (!mailConfigured()) return "not_configured";
  const when = `${core.formatDate(res.date)} à ${core.formatTime(res.time)}`;
  try {
    await sendMail({ to: res.email, subject: `${r.name} — réservation ${res.number}`, text: `Bonjour ${res.first_name},\n\nVotre table est réservée : ${res.party} personne(s), ${when}.\nNuméro : ${res.number}\n\n${r.siteUrl ? `Gérer ou annuler votre réservation : ${manageLink(r.siteUrl, res.number, token)}` : "Pour modifier ou annuler, contactez le restaurant en indiquant ce numéro."}\n\n${r.name}${r.address ? `\n${r.address}` : ""}` });
    if (r.notifyEmail) await sendMail({ to: r.notifyEmail, subject: `Nouvelle réservation ${res.number}`, text: `${res.first_name} ${res.last_name} — ${res.party} pers. — ${when}\n${res.phone ?? ""}\n${res.note ?? ""}` });
    return "sent";
  } catch {
    return "failed";
  }
}

/**
 * Recherche par e-mail : jamais de données dans la réponse. Les réservations actives à venir de cette adresse reçoivent
 * un nouveau lien sécurisé par e-mail (le jeton est renouvelé : l'ancien lien cesse de fonctionner).
 */
export async function lookupByEmail(projectId: string, email: string, at = now()): Promise<{ ok: true }> {
  const r = liveRestaurant(projectId);
  ensureTables();
  const addr = str(email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) || !mailConfigured() || !r.siteUrl) return { ok: true };
  const today = core.nowIn(r.config.timezone, at).date;
  const rows = all<Reservation>("SELECT * FROM restaurant_reservations WHERE project_id = ? AND email = ? AND status = 'confirmed' AND date >= ? ORDER BY date, time LIMIT 5", projectId, addr, today);
  if (!rows.length) return { ok: true };
  const links = rows.map((res) => { const token = newToken(); run("UPDATE restaurant_reservations SET token_hash = ?, updated_at = ? WHERE id = ?", hash(token), at, res.id); return `${res.number} — ${core.formatDate(res.date)} à ${core.formatTime(res.time)} : ${manageLink(r.siteUrl, res.number, token)}`; });
  try { await sendMail({ to: addr, subject: `${r.name} — vos réservations`, text: `Bonjour,\n\nVoici le lien de gestion de vos réservations :\n\n${links.join("\n")}\n\n${r.name}` }); } catch { /* réponse neutre quoi qu'il arrive */ }
  return { ok: true };
}

/** Demande de groupe ou message : enregistrée (preuve de réception) puis transmise au restaurant si l'e-mail est configuré. */
export async function saveRequest(projectId: string, kind: "group" | "contact", payload: Record<string, unknown>, at = now()): Promise<{ id: string; forwarded: EmailStatus }> {
  const r = liveRestaurant(projectId);
  ensureTables();
  const email = str(payload.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BookingError("invalid", 400, { fields: ["email"] });
  const clean = Object.fromEntries(Object.entries(payload).filter(([k]) => /^[a-z_]{1,24}$/.test(k)).map(([k, v]) => [k, String(v ?? "").slice(0, 2000)]));
  const id = crypto.randomUUID();
  run("INSERT INTO restaurant_requests (id, project_id, kind, email, payload, created_at) VALUES (?,?,?,?,?,?)", id, projectId, kind, email, JSON.stringify(clean), at);
  if (!r.notifyEmail || !mailConfigured()) return { id, forwarded: "not_configured" };
  try {
    await sendMail({ to: r.notifyEmail, subject: kind === "group" ? "Nouvelle demande de groupe" : "Nouveau message du site", text: Object.entries(clean).map(([k, v]) => `${k} : ${v}`).join("\n") });
    return { id, forwarded: "sent" };
  } catch {
    return { id, forwarded: "failed" };
  }
}

/** Réservations d'un projet (studio, propriétaire du projet) : liste du jour ou d'une période. */
export function listReservations(projectId: string, from: string, to: string): Reservation[] {
  ensureTables();
  return all<Reservation>("SELECT * FROM restaurant_reservations WHERE project_id = ? AND date BETWEEN ? AND ? ORDER BY date, time", projectId, from, to);
}
