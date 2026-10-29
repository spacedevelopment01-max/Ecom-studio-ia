/**
 * Demandes reçues par un site publié (#232, lot A) : envoi par e-mail au professionnel, sans qu'il ait à se connecter.
 *
 * - La demande est TOUJOURS enregistrée avant toute notification (même transaction que la file d'envoi) : un échec SMTP
 *   ne perd jamais un devis.
 * - Destinataires : l'adresse du compte (confirmée à l'inscription) par défaut, ou des adresses ajoutées par le
 *   propriétaire, actives seulement après un clic de confirmation. Trois au plus. Jamais d'envoi vers une adresse non
 *   confirmée.
 * - File d'envoi persistante (une ligne par demande et par destinataire, unique) : réservation atomique avec bail,
 *   reprises espacées (5 essais), puis « échouée » visible dans le studio. Le journal ne garde qu'un code d'erreur, jamais
 *   le contenu ni l'adresse complète.
 * - E-mail : expéditeur = adresse du studio (SPF/DKIM/DMARC du studio), nom affiché = l'entreprise, « Répondre à » = le
 *   visiteur ; le professionnel répond depuis sa propre boîte. Identifiant de message fixe par envoi : une reprise après
 *   coupure porte le même identifiant.
 */
import { all, id, logError, now, one, run, tx } from "../db";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { fromAddress, mailConfigured, sendMail, smtpConfig } from "../mail";
import { loadProject } from "../projects";
import { rateTake } from "../rate-limit";
import { hmac, randomToken } from "../secrets";
import { appUrl } from "../settings";
import { ensureSiteTables } from "./store";
import { fieldLabel } from "./field-label";
export { fieldLabel };

export const MAX_RECIPIENTS = 3;
export const MAX_ATTEMPTS = 5;
/** Délai avant l'essai suivant, après l'échec n° 1, 2, 3, 4. */
export const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000];
/** Bail d'un envoi en cours : au-delà, un envoi interrompu (processus arrêté) est repris. */
export const LEASE_MS = 2 * 60_000;
/** Une notification restée en attente plus longtemps (SMTP absent) n'est plus envoyée : la demande reste dans le studio. */
export const EXPIRE_MS = 7 * 24 * 3600_000;
const VERIFY_TTL_MS = 48 * 3600_000;
const EMAIL = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]{2,}$/;

let ready = false;
export function ensureNotifyTables() {
  ensureSiteTables();
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS site_notify_recipients (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL, email TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL,
    token_hash TEXT, token_expires_at INTEGER, created_at INTEGER NOT NULL, verified_at INTEGER)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS site_notify_recipients_email ON site_notify_recipients(project_id, email)");
  run(`CREATE TABLE IF NOT EXISTS site_request_outbox (
    id TEXT PRIMARY KEY, request_id TEXT NOT NULL, project_id TEXT NOT NULL, recipient_email TEXT NOT NULL,
    status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL, lease_until INTEGER,
    last_error TEXT, sent_at INTEGER, created_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS site_request_outbox_once ON site_request_outbox(request_id, recipient_email)");
  run("CREATE INDEX IF NOT EXISTS site_request_outbox_due ON site_request_outbox(status, next_at)");
  ready = true;
}

export type Recipient = { id: string; email: string; source: "account" | "manual"; status: "verified" | "pending" | "removed"; created_at: number; verified_at: number | null };
export type OutboxRow = { id: string; request_id: string; project_id: string; recipient_email: string; status: "pending" | "sending" | "sent" | "failed" | "cancelled"; attempts: number; next_at: number; lease_until: number | null; last_error: string | null; sent_at: number | null; created_at: number };

const accountEmail = (projectId: string) => {
  const p = loadProject(projectId);
  return (one<{ email: string }>("SELECT email FROM users WHERE id = ?", p.userId)?.email ?? "").trim().toLowerCase();
};

/** Destinataires du projet. Au premier appel, l'adresse du compte (confirmée à l'inscription) est ajoutée. */
export function recipients(projectId: string): Recipient[] {
  ensureNotifyTables();
  if (!one("SELECT 1 FROM site_notify_recipients WHERE project_id = ?", projectId)) {
    const email = accountEmail(projectId);
    if (EMAIL.test(email)) run("INSERT OR IGNORE INTO site_notify_recipients (id, project_id, email, source, status, created_at, verified_at) VALUES (?,?,?,?,?,?,?)", id(), projectId, email, "account", "verified", now(), now());
  }
  return all<Recipient>("SELECT id, email, source, status, created_at, verified_at FROM site_notify_recipients WHERE project_id = ? AND status != 'removed' ORDER BY created_at", projectId);
}
export const verifiedRecipients = (projectId: string) => recipients(projectId).filter((r) => r.status === "verified");

/**
 * Ajout d'une adresse : celle du compte est active d'emblée (déjà confirmée) ; une autre reçoit un lien de confirmation
 * valable 48 h et ne reçoit aucune demande avant ce clic.
 */
export function addRecipient(projectId: string, rawEmail: string) {
  ensureNotifyTables();
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw new HttpError(400, L("Adresse e-mail invalide.", "Invalid email address."));
  const active = recipients(projectId);
  if (active.some((r) => r.email === email)) throw new HttpError(409, L("Cette adresse reçoit déjà les demandes, ou attend sa confirmation.", "This address already receives requests, or is awaiting confirmation."));
  if (active.length >= MAX_RECIPIENTS) throw new HttpError(409, L(`${MAX_RECIPIENTS} adresses au plus : retirez-en une d'abord.`, `${MAX_RECIPIENTS} addresses at most: remove one first.`));
  if (email === accountEmail(projectId)) {
    run("INSERT INTO site_notify_recipients (id, project_id, email, source, status, created_at, verified_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(project_id, email) DO UPDATE SET status = 'verified', source = 'account', verified_at = excluded.verified_at, token_hash = NULL, token_expires_at = NULL", id(), projectId, email, "account", "verified", now(), now());
    return { status: "verified" as const };
  }
  if (!mailConfigured()) throw new HttpError(409, L("L'envoi d'e-mails n'est pas encore configuré sur le studio : impossible d'envoyer le lien de confirmation à cette adresse.", "Email sending isn't configured on the studio yet: the confirmation link can't be sent to this address."));
  run("INSERT INTO site_notify_recipients (id, project_id, email, source, status, created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(project_id, email) DO UPDATE SET status = 'pending', source = 'manual', verified_at = NULL", id(), projectId, email, "manual", "pending", now());
  sendVerification(projectId, email);
  return { status: "pending" as const };
}

/** Nouveau lien de confirmation (borné : 5 par heure et par projet). */
export function sendVerification(projectId: string, email: string) {
  ensureNotifyTables();
  const row = one<{ id: string; status: string }>("SELECT id, status FROM site_notify_recipients WHERE project_id = ? AND email = ?", projectId, email);
  if (!row || row.status !== "pending") throw new HttpError(404, L("Adresse introuvable.", "Address not found."));
  if (!mailConfigured()) throw new HttpError(409, L("L'envoi d'e-mails n'est pas configuré sur le studio.", "Email sending isn't configured on the studio."));
  if (!rateTake([{ key: `site-notify-verify:${projectId}`, max: 5, windowMs: 3600_000 }])) throw new HttpError(429, L("Trop de liens envoyés : réessayez dans une heure.", "Too many links sent: try again in an hour."));
  const token = randomToken(32);
  run("UPDATE site_notify_recipients SET token_hash = ?, token_expires_at = ? WHERE id = ?", hmac(`site-notify:${token}`), now() + VERIFY_TTL_MS, row.id);
  const p = loadProject(projectId);
  const business = (p.brand as { name?: string } | null)?.name || p.name;
  const url = `${appUrl()}/confirmer-notifications?jeton=${encodeURIComponent(token)}`;
  sendMail({
    to: email,
    subject: oneLine(`Confirmez l'adresse qui recevra les demandes de ${business}`),
    text: `Bonjour,\n\nCette adresse a été indiquée pour recevoir les demandes de devis et de contact du site « ${business} ».\n\nPour l'accepter, ouvrez ce lien valable 48 heures, puis appuyez sur « Confirmer » :\n${url}\n\nSi vous n'êtes pas concerné, ignorez ce message : aucune demande ne vous sera envoyée.\n\nE-COM STUDIO IA`,
  }).catch((e) => logError("site-notify:verify", e, { projectId, details: { code: errorCode(e) } }));
}

/** Clic sur le lien de confirmation (après appui sur « Confirmer » : un aperçu automatique du lien ne suffit pas). */
export function confirmRecipient(token: string): { business: string } | null {
  ensureNotifyTables();
  if (!/^[\w-]{40,100}$/.test(token)) return null;
  const row = one<{ id: string; project_id: string }>("SELECT id, project_id FROM site_notify_recipients WHERE token_hash = ? AND token_expires_at > ? AND status = 'pending'", hmac(`site-notify:${token}`), now());
  if (!row) return null;
  run("UPDATE site_notify_recipients SET status = 'verified', verified_at = ?, token_hash = NULL, token_expires_at = NULL WHERE id = ?", now(), row.id);
  const p = one<{ name: string }>("SELECT name FROM projects WHERE id = ?", row.project_id);
  return { business: p?.name ?? "" };
}
export function recipientTokenValid(token: string) {
  ensureNotifyTables();
  return /^[\w-]{40,100}$/.test(token) && !!one("SELECT 1 FROM site_notify_recipients WHERE token_hash = ? AND token_expires_at > ? AND status = 'pending'", hmac(`site-notify:${token}`), now());
}

/** Retrait : plus aucun envoi vers cette adresse, y compris ceux déjà en file. */
export function removeRecipient(projectId: string, recipientId: string) {
  ensureNotifyTables();
  const row = one<{ email: string }>("SELECT email FROM site_notify_recipients WHERE id = ? AND project_id = ?", recipientId, projectId);
  if (!row) throw new HttpError(404, L("Adresse introuvable.", "Address not found."));
  tx(() => {
    run("UPDATE site_notify_recipients SET status = 'removed', token_hash = NULL, token_expires_at = NULL WHERE id = ?", recipientId);
    run("UPDATE site_request_outbox SET status = 'cancelled', lease_until = NULL WHERE project_id = ? AND recipient_email = ? AND status = 'pending'", projectId, row.email);
  });
}

/** Mise en file, dans la transaction qui enregistre la demande : une ligne par destinataire confirmé. */
export function queueNotifications(projectId: string, requestId: string): number {
  ensureNotifyTables();
  const to = verifiedRecipients(projectId);
  for (const r of to) run("INSERT OR IGNORE INTO site_request_outbox (id, request_id, project_id, recipient_email, status, attempts, next_at, created_at) VALUES (?,?,?,?,?,?,?,?)", id(), requestId, projectId, r.email, "pending", 0, now(), now());
  return to.length;
}

/** Code d'erreur sans donnée personnelle (jamais le message brut du serveur, qui peut citer l'adresse). */
export function errorCode(e: unknown): string {
  const x = e as { code?: string; responseCode?: number; command?: string };
  if (x?.responseCode) return `SMTP_${x.responseCode}${x.command ? `_${String(x.command).split(" ")[0]}` : ""}`;
  if (x?.code && /^[A-Z_]{3,30}$/.test(x.code)) return x.code;
  return "ERREUR";
}
/** Refus définitif du serveur (5xx) : inutile de réessayer. */
const permanent = (e: unknown) => { const c = (e as { responseCode?: number })?.responseCode; return !!c && c >= 500 && c < 600; };

const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 180);
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type RequestRow = { id: string; project_id: string; hostname: string; page: string; fields: string; email: string | null; created_at: number; kind: string | null };

/** Lecture des champs habituels des formulaires des thèmes (noms variables selon les thèmes). */
export function readFields(fields: Record<string, string>) {
  const pick = (...keys: string[]) => keys.map((k) => fields[k]).find((v) => v && v.trim())?.trim() ?? "";
  const name = pick("name", "nom", "full_name") || [pick("first_name", "firstName", "prenom"), pick("last_name", "lastName")].filter(Boolean).join(" ");
  const used = new Set(["name", "nom", "full_name", "first_name", "firstName", "prenom", "last_name", "lastName", "email", "phone", "tel", "telephone", "body", "message", "service", "prestation", "subject", "objet", "photos"]);
  return {
    name: oneLine(name),
    email: pick("email"),
    phone: oneLine(pick("phone", "tel", "telephone")),
    subject: oneLine(pick("service", "prestation", "subject", "objet")),
    message: pick("body", "message"),
    photos: Number(fields.photos) || 0,
    other: Object.entries(fields).filter(([k, v]) => !used.has(k) && v && v.trim()),
  };
}
/** Devis si la page ou un champ court du formulaire (type de demande, objet…) le dit ; le message lui-même ne compte pas. */
export const requestKind = (page: string, fields: Record<string, string>): "devis" | "contact" =>
  /devis|quote|estimation|estimate/i.test(page) || Object.entries(fields).some(([k, v]) => !["body", "message", "email"].includes(k) && v.length <= 80 && /\bdevis\b|\bquote\b|estimation/i.test(v)) ? "devis" : "contact";

/** E-mail envoyé au professionnel pour une demande. Tout ce qui vient du visiteur est échappé. */
export function buildNotification(req: RequestRow, to: string, outboxId: string) {
  const p = loadProject(req.project_id);
  const business = oneLine((p.brand as { name?: string } | null)?.name || p.name);
  const f = readFields(JSON.parse(req.fields) as Record<string, string>);
  const kind = (req.kind ?? "contact") === "devis" ? "devis" : "contact";
  const when = new Date(req.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });
  const link = `${appUrl()}/studio/${req.project_id}/boutique?demande=${encodeURIComponent(req.id)}`;
  const replyTo = EMAIL.test(f.email) ? f.email : undefined;
  const title = kind === "devis" ? "Nouvelle demande de devis" : "Nouveau message";
  const rows: [string, string][] = [
    ["Site", req.hostname + (req.page ? ` (page ${req.page})` : "")],
    ["Reçue le", when],
    ["Nom", f.name || "non indiqué"],
    ["E-mail", f.email || "non indiqué"],
    ["Téléphone", f.phone || "non indiqué"],
    ...(f.subject ? [["Prestation / objet", f.subject] as [string, string]] : []),
    ...f.other.map(([k, v]) => [fieldLabel(k), oneLine(v)] as [string, string]),
  ];
  const photoNote = f.photos > 0 ? `Le visiteur a choisi ${f.photos} photo(s) dans le formulaire, mais les photos ne sont pas transmises par le site : demandez-les-lui en répondant à cet e-mail.` : "";
  const text = [
    `${title} sur votre site ${business}.`,
    "",
    ...rows.map(([k, v]) => `${k} : ${v}`),
    "",
    "Message :",
    f.message || "(aucun message)",
    "",
    ...(photoNote ? [photoNote, ""] : []),
    replyTo ? "Pour répondre, utilisez simplement « Répondre » : votre réponse partira de votre boîte vers le visiteur." : "Le visiteur n'a pas laissé d'adresse e-mail valide.",
    `Retrouver cette demande dans le studio : ${link}`,
    "",
    "Cet e-mail vous est envoyé par E-COM STUDIO IA, qui héberge votre site. Les demandes sont conservées 12 mois dans le studio.",
  ].join("\n");
  const html = `<!doctype html><html lang="fr"><body style="font-family:Arial,Helvetica,sans-serif;color:#1d232b;max-width:640px;margin:0 auto;padding:16px;line-height:1.5">
<h1 style="font-size:20px;margin:0 0 12px">${esc(title)} sur votre site ${esc(business)}</h1>
<table style="border-collapse:collapse;width:100%;font-size:14px">${rows.map(([k, v]) => `<tr><th style="text-align:left;vertical-align:top;padding:4px 12px 4px 0;white-space:nowrap;color:#5b6573;font-weight:normal">${esc(k)}</th><td style="padding:4px 0">${esc(v)}</td></tr>`).join("")}</table>
<h2 style="font-size:15px;margin:16px 0 6px">Message</h2>
<div style="white-space:pre-wrap;background:#f4f5f7;border-radius:6px;padding:12px;font-size:14px">${esc(f.message || "(aucun message)")}</div>
${photoNote ? `<p style="font-size:13px;color:#8a4b00">${esc(photoNote)}</p>` : ""}
<p style="font-size:14px">${replyTo ? "Pour répondre, utilisez simplement « Répondre » : votre réponse partira de votre boîte vers le visiteur." : "Le visiteur n'a pas laissé d'adresse e-mail valide."}</p>
<p style="font-size:14px"><a href="${esc(link)}">Retrouver cette demande dans le studio</a></p>
<p style="font-size:12px;color:#5b6573">Cet e-mail vous est envoyé par E-COM STUDIO IA, qui héberge votre site. Les demandes sont conservées 12 mois dans le studio.</p>
</body></html>`;
  const cfg = smtpConfig();
  const domain = cfg ? fromAddress(cfg.from).split("@")[1] || "studio.invalid" : "studio.invalid";
  return {
    to,
    subject: oneLine(`${title}${f.name ? ` de ${f.name}` : ""} — ${business}`),
    text,
    html,
    fromName: oneLine(`${business} (via E-COM STUDIO IA)`).replace(/["<>]/g, ""),
    replyTo,
    messageId: `<site-demande-${outboxId}@${domain}>`,
    headers: { "Auto-Submitted": "auto-generated", "X-Auto-Response-Suppress": "All" },
  };
}

/**
 * Envoi des notifications dues. Appelé juste après une demande (sans attendre) et à chaque passage du worker.
 * Réservation atomique : deux processus ne prennent jamais la même ligne ; un envoi interrompu est repris après son bail.
 */
export async function processOutbox(opts: { projectId?: string; limit?: number } = {}): Promise<{ sent: number; failed: number; retried: number; skipped?: "smtp_not_configured" }> {
  const limit = opts.limit ?? 20;
  ensureNotifyTables();
  const out = { sent: 0, failed: 0, retried: 0 };
  // Trop ancienne pour être encore utile : la demande reste dans le studio, sans e-mail tardif.
  run("UPDATE site_request_outbox SET status = 'failed', last_error = 'EXPIRE', lease_until = NULL WHERE status = 'pending' AND created_at < ?", now() - EXPIRE_MS);
  if (!mailConfigured()) return { ...out, skipped: "smtp_not_configured" };
  // Depuis une requête (site ou studio) : seulement le projet concerné ; le worker, lui, traite tous les projets.
  const due = all<OutboxRow>(`SELECT * FROM site_request_outbox WHERE ((status = 'pending' AND next_at <= ?) OR (status = 'sending' AND lease_until < ?))${opts.projectId ? " AND project_id = ?" : ""} ORDER BY next_at LIMIT ?`, ...[now(), now(), ...(opts.projectId ? [opts.projectId] : []), limit]);
  for (const row of due) {
    const t = now();
    const claimed = run("UPDATE site_request_outbox SET status = 'sending', lease_until = ?, attempts = attempts + 1 WHERE id = ? AND ((status = 'pending' AND next_at <= ?) OR (status = 'sending' AND lease_until < ?))", t + LEASE_MS, row.id, t, t).changes === 1;
    if (!claimed) continue;
    const req = one<RequestRow>("SELECT id, project_id, hostname, page, fields, email, created_at, kind FROM site_requests WHERE id = ?", row.request_id);
    const stillWanted = one("SELECT 1 FROM site_notify_recipients WHERE project_id = ? AND email = ? AND status = 'verified'", row.project_id, row.recipient_email);
    if (!req || !stillWanted) { run("UPDATE site_request_outbox SET status = 'cancelled', lease_until = NULL WHERE id = ?", row.id); continue; }
    const attempts = row.attempts + 1;
    try {
      await sendMail(buildNotification(req, row.recipient_email, row.id));
      run("UPDATE site_request_outbox SET status = 'sent', sent_at = ?, lease_until = NULL, last_error = NULL WHERE id = ? AND status = 'sending'", now(), row.id);
      out.sent++;
    } catch (e) {
      const code = errorCode(e);
      if (permanent(e) || attempts >= MAX_ATTEMPTS) {
        run("UPDATE site_request_outbox SET status = 'failed', last_error = ?, lease_until = NULL WHERE id = ?", code, row.id);
        logError("site-notify:echec", new Error(`Notification de demande non envoyée (${code}) après ${attempts} essai(s)`), { projectId: row.project_id, details: { outbox: row.id, to: row.recipient_email.replace(/^(.).*(@.*)$/, "$1…$2"), code } });
        out.failed++;
      } else {
        run("UPDATE site_request_outbox SET status = 'pending', next_at = ?, last_error = ?, lease_until = NULL WHERE id = ?", now() + BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)], code, row.id);
        out.retried++;
      }
    }
  }
  return out;
}

/** Envoi lancé sans attendre (la réponse au visiteur ne dépend jamais du SMTP). */
export function kickOutbox(projectId: string) {
  processOutbox({ projectId }).catch((e) => logError("site-notify:process", e, { projectId }));
}

/** Nouvel essai d'une notification échouée, à la demande du propriétaire (repart de zéro, même identifiant de message). */
export function retryNotification(projectId: string, requestId: string) {
  ensureNotifyTables();
  const n = run("UPDATE site_request_outbox SET status = 'pending', attempts = 0, next_at = ?, last_error = NULL WHERE project_id = ? AND request_id = ? AND status = 'failed'", now(), projectId, requestId).changes;
  if (!n) throw new HttpError(409, L("Aucune notification échouée pour cette demande.", "No failed notification for this request."));
  kickOutbox(projectId);
}

export type NotificationState = "sent" | "pending" | "retrying" | "smtp_not_configured" | "failed" | "partial" | "no_recipient" | "before_email";
/** État lisible d'une demande, à partir de ses lignes d'envoi (et, sans ligne, de ce qui a été noté à la réception). */
export function notificationState(rows: Pick<OutboxRow, "status" | "last_error">[], smtp = mailConfigured(), noted = "queued"): NotificationState {
  const live = rows.filter((r) => r.status !== "cancelled");
  // Reçue avant l'envoi des demandes par e-mail (aucune ligne d'envoi n'a jamais existé pour elle).
  if (!live.length && !rows.length && noted !== "queued" && noted !== "no_recipient") return "before_email";
  if (!live.length) return "no_recipient";
  if (live.some((r) => r.status === "pending" && r.last_error) && smtp) return "retrying";
  if (live.every((r) => r.status === "sent")) return "sent";
  if (live.some((r) => r.status === "pending" || r.status === "sending")) return smtp ? "pending" : "smtp_not_configured";
  return live.some((r) => r.status === "sent") ? "partial" : "failed";
}
export function outboxFor(projectId: string) {
  ensureNotifyTables();
  return all<OutboxRow>("SELECT * FROM site_request_outbox WHERE project_id = ?", projectId);
}
/** Lignes d'envoi supprimées avec la demande (effacement, purge de conservation). */
export function dropOutbox(projectId: string, requestIds?: string[]) {
  ensureNotifyTables();
  if (!requestIds) run("DELETE FROM site_request_outbox WHERE project_id = ? AND request_id NOT IN (SELECT id FROM site_requests WHERE project_id = ?)", projectId, projectId);
  else for (const r of requestIds) run("DELETE FROM site_request_outbox WHERE project_id = ? AND request_id = ?", projectId, r);
}
