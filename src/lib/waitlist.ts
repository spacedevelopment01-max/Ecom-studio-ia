/**
 * Liste d'attente E-COM STUDIO IA (#420).
 *
 * Le formulaire public reste sur son site (hébergé à part). Son serveur transmet chaque inscription au Studio par une
 * requête signée (HMAC-SHA256 du corps avec un secret partagé, jamais exposé au navigateur) ; le Studio l'enregistre
 * puis prévient l'équipe par e-mail (SMTP du Studio, adresse interne). Garanties :
 *  - une inscription reçue est enregistrée AVANT tout envoi : une panne SMTP ne la fait jamais perdre ;
 *  - une même adresse (ou le même identifiant du site) n'est enregistrée et notifiée qu'une fois : une resoumission,
 *    une nouvelle tentative du site ou une requête rejouée ne renvoie pas d'e-mail ;
 *  - les anciennes inscriptions importées ne déclenchent aucun e-mail (aucun envoi rétroactif) ;
 *  - aucun e-mail n'est envoyé aux inscrits ; les coordonnées ne vont jamais dans les journaux.
 */
import crypto from "node:crypto";
import { all, id, logError, now, one, run, tx } from "./db";
import { getSetting, setSetting, appUrl } from "./settings";
import { mailConfigured, sendMail, type Mail } from "./mail";
import { randomToken } from "./secrets";

/** Adresse interne prévenue à chaque nouvelle inscription (modifiable dans Administration › Liste d'attente). */
export const DEFAULT_NOTIFY_TO = "ecomstudioia@gmail.com";
export const SECRET_KEY = "waitlist.ingestSecret";
export const NOTIFY_KEY = "waitlist.notifyTo";
/** Fenêtre de validité d'une signature : au-delà, la requête est refusée (rejeu). */
export const SIGNATURE_TOLERANCE_S = 300;
export const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000];
export const MAX_ATTEMPTS = 5;
/** Bail d'un envoi en cours : au-delà, un envoi interrompu (processus arrêté) est repris. */
export const LEASE_MS = 2 * 60_000;

export type Consent = "given" | "refused" | "unrecorded";
export type NotifyStatus = "pending" | "sending" | "sent" | "failed" | "skipped";
export type WaitlistRow = {
  id: string; external_id: string | null; email: string; email_key: string; first_name: string | null; category: string;
  description: string | null; consent: Consent; consent_at: number | null; consent_text: string | null; offer: string | null;
  source: "site" | "import"; signed_up_at: number; received_at: number; resubmissions: number; last_resubmitted_at: number | null;
  notify_status: NotifyStatus; notify_attempts: number; notify_next_at: number; notify_lease_until: number | null;
  notify_error: string | null; notified_at: number | null;
};

let ready = false;
export function ensureWaitlistTables() {
  // Le drapeau seul ne suffit pas : une création faite dans une transaction annulée disparaît.
  if (ready && one("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'waitlist_signups'")) return;
  run(`CREATE TABLE IF NOT EXISTS waitlist_signups (
    id TEXT PRIMARY KEY, external_id TEXT, email TEXT NOT NULL, email_key TEXT NOT NULL, first_name TEXT,
    category TEXT NOT NULL, description TEXT, consent TEXT NOT NULL, consent_at INTEGER, consent_text TEXT, offer TEXT,
    source TEXT NOT NULL, signed_up_at INTEGER NOT NULL, received_at INTEGER NOT NULL,
    resubmissions INTEGER NOT NULL DEFAULT 0, last_resubmitted_at INTEGER,
    notify_status TEXT NOT NULL, notify_attempts INTEGER NOT NULL DEFAULT 0, notify_next_at INTEGER NOT NULL,
    notify_lease_until INTEGER, notify_error TEXT, notified_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email ON waitlist_signups(email_key)");
  run("CREATE UNIQUE INDEX IF NOT EXISTS waitlist_external ON waitlist_signups(external_id) WHERE external_id IS NOT NULL");
  run("CREATE INDEX IF NOT EXISTS waitlist_due ON waitlist_signups(notify_status, notify_next_at)");
  ready = true;
}

// ——— Secret partagé et signature ———

export const ingestSecret = () => getSetting(SECRET_KEY)?.trim() || null;
export const notifyTo = () => getSetting(NOTIFY_KEY)?.trim() || DEFAULT_NOTIFY_TO;

/** Nouveau secret (affiché une seule fois à l'administrateur pour être copié dans les secrets du site). */
export function rotateIngestSecret(): string {
  const secret = `wl_${randomToken(32)}`;
  setSetting(SECRET_KEY, secret, true);
  return secret;
}

/** En-tête attendu : `X-Waitlist-Signature: t=<secondes>,v1=<hex HMAC-SHA256 de "t.corps">` (même schéma que Stripe). */
export function signPayload(payload: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

export function verifySignature(payload: string, header: string | null, secret = ingestSecret()): boolean {
  if (!secret || !header) return false;
  const parts = header.split(",").map((s) => s.trim());
  const t = parts.find((x) => x.startsWith("t="))?.slice(2);
  const v1 = parts.filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !/^\d{1,12}$/.test(t) || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > SIGNATURE_TOLERANCE_S) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
  return v1.some((sig) => /^[0-9a-f]{64}$/.test(sig) && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

// ——— Lecture tolérante d'une inscription (formulaire actuel ou export de l'ancienne base) ———

const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;
const clean = (v: unknown, max: number) => (typeof v === "string" || typeof v === "number" ? String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max) : "") || null;
const pickField = (o: Record<string, unknown>, names: string[]) => { for (const n of names) if (o[n] !== undefined && o[n] !== null && o[n] !== "") return o[n]; return undefined; };
export const emailKey = (email: string) => email.trim().toLowerCase();

function parseDate(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" || /^\d{9,13}$/.test(String(v))) { const n = Number(v); return n < 1e11 ? n * 1000 : n; }
  const d = Date.parse(String(v).replace(" ", "T"));
  return Number.isFinite(d) ? d : null;
}

function parseConsent(o: Record<string, unknown>): { consent: Consent; at: number | null; text: string | null } {
  const raw = pickField(o, ["consent", "consentement", "consent_given", "consentGiven", "rgpd", "optin", "opt_in"]);
  const obj = raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
  const value = obj ? obj.given ?? obj.value : raw;
  const at = parseDate(obj?.at ?? pickField(o, ["consent_at", "consentAt", "consentement_date"]));
  const text = clean(obj?.text ?? pickField(o, ["consent_text", "consentText"]), 600);
  if (value === undefined || value === null || value === "") return { consent: at ? "given" : "unrecorded", at, text };
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "oui", "yes", "on", "given", "accepte", "accepté", "ok"].includes(s)) return { consent: "given", at, text };
  if (["false", "0", "non", "no", "off", "refused", "refuse", "refusé"].includes(s)) return { consent: "refused", at, text };
  return { consent: "unrecorded", at, text };
}

export type SignupInput = {
  externalId: string | null; email: string; firstName: string | null; category: string; description: string | null;
  consent: Consent; consentAt: number | null; consentText: string | null; offer: string | null; signedUpAt: number | null;
};

/** Champs du formulaire actuel ou d'un export (noms usuels FR / EN). Lève une erreur lisible si l'e-mail manque. */
export function readSignup(raw: unknown): SignupInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Inscription illisible.");
  const o = raw as Record<string, unknown>;
  const email = clean(pickField(o, ["email", "e-mail", "mail", "courriel", "adresse_email"]), 254);
  if (!email || !EMAIL.test(email)) throw new Error("Adresse e-mail absente ou invalide.");
  const c = parseConsent(o);
  return {
    externalId: clean(pickField(o, ["id", "external_id", "externalId", "rowid", "uuid"]), 120),
    email,
    firstName: clean(pickField(o, ["firstName", "first_name", "prenom", "prénom", "firstname", "name"]), 80),
    category: clean(pickField(o, ["category", "categorie", "catégorie", "project_type", "projectType", "type", "type_projet", "projet"]), 120) ?? "Non précisé",
    description: clean(pickField(o, ["description", "message", "details", "détails", "projet_description", "project_description"]), 2000),
    consent: c.consent, consentAt: c.at, consentText: c.text,
    offer: clean(pickField(o, ["offer", "offre", "plan", "forfait"]), 200),
    signedUpAt: parseDate(pickField(o, ["createdAt", "created_at", "date", "submitted_at", "submittedAt", "timestamp", "inscrit_le"])),
  };
}

// ——— Enregistrement ———

export type IngestResult = { status: "created" | "duplicate"; id: string };

/**
 * Enregistre une inscription. `backfill` (import des anciennes lignes) : aucune notification, jamais.
 * Doublon (même identifiant du site ou même adresse) : rien n'est remplacé, la resoumission est comptée, aucun e-mail.
 */
export function ingestSignup(input: SignupInput, opts: { backfill?: boolean } = {}): IngestResult {
  ensureWaitlistTables();
  return tx(() => {
    const key = emailKey(input.email);
    const existing = one<{ id: string }>("SELECT id FROM waitlist_signups WHERE email_key = ? OR (? IS NOT NULL AND external_id = ?) LIMIT 1", key, input.externalId, input.externalId);
    if (existing) {
      if (!opts.backfill) run("UPDATE waitlist_signups SET resubmissions = resubmissions + 1, last_resubmitted_at = ? WHERE id = ?", now(), existing.id);
      return { status: "duplicate" as const, id: existing.id };
    }
    const rowId = id(), t = now();
    run(`INSERT INTO waitlist_signups (id, external_id, email, email_key, first_name, category, description, consent, consent_at, consent_text, offer,
      source, signed_up_at, received_at, notify_status, notify_attempts, notify_next_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`,
      rowId, input.externalId, input.email.trim(), key, input.firstName, input.category, input.description, input.consent, input.consentAt, input.consentText, input.offer,
      opts.backfill ? "import" : "site", input.signedUpAt ?? t, t, opts.backfill ? "skipped" : "pending", t);
    return { status: "created" as const, id: rowId };
  });
}

/** Import des anciennes inscriptions (export de la base du site) : jamais de notification, doublons ignorés. */
export function importSignups(rows: unknown[]): { created: number; duplicates: number; rejected: { index: number; reason: string }[] } {
  const out = { created: 0, duplicates: 0, rejected: [] as { index: number; reason: string }[] };
  rows.forEach((r, index) => {
    try { ingestSignup(readSignup(r), { backfill: true }).status === "created" ? out.created++ : out.duplicates++; }
    catch (e) { out.rejected.push({ index, reason: (e as Error).message }); }
  });
  return out;
}

/** CSV simple (séparateur virgule ou point-virgule, guillemets) → objets, pour coller un export D1 / tableur. */
export function parseCsv(text: string): Record<string, string>[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch; continue; }
    if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; }
    else cell += ch;
  }
  row.push(cell); if (row.some((c) => c.trim())) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const names = head.map((h) => h.trim().toLowerCase().replace(/^﻿/, ""));
  return body.map((r) => Object.fromEntries(names.map((n, i) => [n, (r[i] ?? "").trim()])));
}

// ——— Notification interne ———

const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 160);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const CONSENT_LABEL: Record<Consent, string> = { given: "Consentement donné", refused: "Consentement refusé", unrecorded: "Consentement non enregistré" };
const date = (ms: number) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(ms));
const domainOf = (url: string) => { try { return new URL(url).hostname || "ecom-studio-ia"; } catch { return "ecom-studio-ia"; } };

export function buildNotification(r: WaitlistRow, to = notifyTo()): Mail {
  const admin = `${appUrl()}/admin`;
  const lines: [string, string][] = [
    ["Date", date(r.signed_up_at)],
    ["Prénom", r.first_name ?? "—"],
    ["E-mail", r.email],
    ["Type de projet", r.category],
    ["Description", r.description ?? "—"],
    ["Consentement", CONSENT_LABEL[r.consent] + (r.consent_at ? ` (${date(r.consent_at)})` : "")],
    ...(r.offer ? [["Offre affichée", r.offer] as [string, string]] : []),
  ];
  return {
    to,
    subject: oneLine(`Liste d'attente — nouvelle inscription : ${r.category}`),
    fromName: "E-COM STUDIO IA",
    replyTo: r.email,
    // Identifiant fixe par inscription : un éventuel second envoi (reprise après coupure) est fusionné par la messagerie.
    messageId: `<waitlist-${r.id}@${domainOf(appUrl())}>`,
    headers: { "X-Ecs-Waitlist": r.id, "Auto-Submitted": "auto-generated" },
    text: [`Nouvelle inscription à la liste d'attente E-COM STUDIO IA.`, "", ...lines.map(([k, v]) => `${k} : ${v}`), "", `Toutes les inscriptions : ${admin} (onglet « Liste d'attente »).`,
      "", "Notification interne : aucun e-mail n'a été envoyé à la personne inscrite."].join("\n"),
    html: `<p>Nouvelle inscription à la liste d'attente <strong>E-COM STUDIO IA</strong>.</p><table cellpadding="6" style="border-collapse:collapse">${lines
      .map(([k, v]) => `<tr><td style="color:#666;vertical-align:top">${esc(k)}</td><td style="white-space:pre-wrap">${esc(v)}</td></tr>`).join("")}</table>
      <p><a href="${esc(admin)}">Ouvrir l'Administration › Liste d'attente</a></p><p style="color:#888;font-size:12px">Notification interne : aucun e-mail n'a été envoyé à la personne inscrite.</p>`,
  };
}

function errorCode(e: unknown): string {
  const x = e as { code?: string; responseCode?: number; command?: string; message?: string };
  if (x?.responseCode) return `SMTP_${x.responseCode}${x.command ? `_${String(x.command).split(" ")[0]}` : ""}`;
  if (x?.code && /^[A-Z_]{3,30}$/.test(x.code)) return x.code;
  if (/SMTP non configuré/.test(x?.message ?? "")) return "SMTP_NON_CONFIGURE";
  return "ERREUR";
}
const permanent = (e: unknown) => { const c = (e as { responseCode?: number })?.responseCode; return !!c && c >= 500 && c < 600; };
const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1…$2");

/** Envoie les notifications dues (nouvelles inscriptions, reprises espacées). Appelé après chaque inscription et par le worker. */
export async function processWaitlistOutbox(opts: { limit?: number; send?: (m: Mail) => Promise<unknown> } = {}): Promise<{ sent: number; failed: number; retried: number; skipped?: "smtp_not_configured" }> {
  ensureWaitlistTables();
  const out = { sent: 0, failed: 0, retried: 0 };
  const send = opts.send ?? ((m: Mail) => sendMail(m));
  if (!opts.send && !mailConfigured()) return { ...out, skipped: "smtp_not_configured" };
  const t0 = now();
  const due = all<WaitlistRow>("SELECT * FROM waitlist_signups WHERE (notify_status = 'pending' AND notify_next_at <= ?) OR (notify_status = 'sending' AND notify_lease_until < ?) ORDER BY notify_next_at LIMIT ?", t0, t0, opts.limit ?? 20);
  for (const row of due) {
    const t = now();
    // Réservation atomique : deux processus (site et worker) ne peuvent pas envoyer la même notification.
    const claimed = run("UPDATE waitlist_signups SET notify_status = 'sending', notify_lease_until = ?, notify_attempts = notify_attempts + 1 WHERE id = ? AND ((notify_status = 'pending' AND notify_next_at <= ?) OR (notify_status = 'sending' AND notify_lease_until < ?))", t + LEASE_MS, row.id, t, t).changes === 1;
    if (!claimed) continue;
    const attempts = row.notify_attempts + 1;
    try {
      await send(buildNotification(row));
      run("UPDATE waitlist_signups SET notify_status = 'sent', notified_at = ?, notify_lease_until = NULL, notify_error = NULL WHERE id = ? AND notify_status = 'sending'", now(), row.id);
      out.sent++;
    } catch (e) {
      const code = errorCode(e);
      if (permanent(e) || attempts >= MAX_ATTEMPTS) {
        run("UPDATE waitlist_signups SET notify_status = 'failed', notify_error = ?, notify_lease_until = NULL WHERE id = ?", code, row.id);
        logError("waitlist:notify", new Error(`Notification de liste d'attente non envoyée (${code}) après ${attempts} essai(s)`), { details: { signup: row.id, to: maskEmail(notifyTo()), code } });
        out.failed++;
      } else {
        run("UPDATE waitlist_signups SET notify_status = 'pending', notify_next_at = ?, notify_error = ?, notify_lease_until = NULL WHERE id = ?", now() + BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)], code, row.id);
        out.retried++;
      }
    }
  }
  return out;
}

/** Envoi lancé sans attendre : la réponse au site ne dépend jamais du SMTP. */
export function kickWaitlistOutbox() {
  processWaitlistOutbox().catch((e) => logError("waitlist:process", e));
}

/** Nouvel essai demandé par l'administrateur (une inscription en échec ou en attente) — repart de zéro, même identifiant de message. */
export function retryNotification(signupId: string): boolean {
  ensureWaitlistTables();
  return run("UPDATE waitlist_signups SET notify_status = 'pending', notify_attempts = 0, notify_next_at = ?, notify_error = NULL WHERE id = ? AND notify_status IN ('failed', 'pending')", now(), signupId).changes === 1;
}

// ——— Lecture pour l'administration ———

export type AdminSignup = {
  id: string; signedUpAt: number; receivedAt: number; firstName: string | null; email: string; category: string; description: string | null;
  consent: Consent; consentAt: number | null; offer: string | null; source: "site" | "import"; resubmissions: number;
  notify: { status: NotifyStatus; attempts: number; error: string | null; notifiedAt: number | null; nextAt: number | null };
};

export function adminWaitlist(limit = 500) {
  ensureWaitlistTables();
  const rows = all<WaitlistRow>("SELECT * FROM waitlist_signups ORDER BY signed_up_at DESC, received_at DESC LIMIT ?", limit);
  const total = one<{ n: number }>("SELECT COUNT(*) n FROM waitlist_signups")!.n;
  const counts = Object.fromEntries(all<{ s: string; n: number }>("SELECT notify_status s, COUNT(*) n FROM waitlist_signups GROUP BY notify_status").map((r) => [r.s, r.n]));
  const secret = ingestSecret();
  return {
    total, truncated: total > rows.length, counts,
    settings: { secretConfigured: !!secret, notifyTo: notifyTo(), smtpConfigured: mailConfigured(), endpoint: `${appUrl()}/api/waitlist/ingest` },
    signups: rows.map((r): AdminSignup => ({
      id: r.id, signedUpAt: r.signed_up_at, receivedAt: r.received_at, firstName: r.first_name, email: r.email, category: r.category, description: r.description,
      consent: r.consent, consentAt: r.consent_at, offer: r.offer, source: r.source, resubmissions: r.resubmissions,
      notify: { status: r.notify_status, attempts: r.notify_attempts, error: r.notify_error, notifiedAt: r.notified_at, nextAt: r.notify_status === "pending" ? r.notify_next_at : null },
    })),
  };
}
