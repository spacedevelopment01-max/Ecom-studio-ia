/**
 * Demandes réelles reçues par un site publié (#232) : formulaire de contact ou de devis du thème. Contrôle d'origine,
 * champ piège, corps borné, limites par IP et par site, validation, puis enregistrement en base ET mise en file des
 * e-mails au professionnel dans la même transaction (notify.ts) : un SMTP absent ou en panne ne perd jamais une demande.
 * Conservation : 12 mois, purge à chaque nouvelle demande du projet.
 */
import { all, id, now, run, tx } from "../db";
import { clientIp, rateTake } from "../rate-limit";
import { hmac } from "../secrets";
import { dropOutbox, kickOutbox, notificationState, outboxFor, queueNotifications, requestKind, type NotificationState } from "./notify";
import { identifyProject } from "../access-scope";
import { HONEYPOT } from "./publish";
import { ensureSiteTables, type Publication, type SiteAddress } from "./store";

export const RETENTION_MS = 365 * 24 * 3600_000;
const MAX_BODY = 16_000;
const MAX_FIELDS = 20;
const MAX_VALUE = 3000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type SiteRequest = {
  id: string; publication_id: string; hostname: string; page: string; fields: Record<string, string>; email: string | null;
  created_at: number; read_at: number | null; handled_at: number | null; kind: "contact" | "devis";
  notification: NotificationState; notification_error: string | null;
};

type Outcome = { status: number; body: { ok: boolean; error?: string; message?: string } };

/** Même site : l'en-tête Origin (ou à défaut Referer) doit désigner le nom d'hôte servi. */
function sameSite(req: Request, hostname: string) {
  const src = req.headers.get("origin") ?? req.headers.get("referer");
  if (!src || src === "null") return false;
  try { return new URL(src).hostname.toLowerCase() === hostname; } catch { return false; }
}

/** Champs « contact[x] » du formulaire, bornés ; le reste (form_type, utf8…) est ignoré. */
function contactFields(data: Record<string, unknown>): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    const m = k.match(/^contact\[([a-z0-9_ -]{1,40})\]$/i);
    if (!m || typeof v !== "string" || k === HONEYPOT) continue;
    if (Object.keys(out).length >= MAX_FIELDS || v.length > MAX_VALUE) return null;
    out[m[1]] = v.trim();
  }
  return out;
}

export async function receiveSiteRequest(req: Request, address: SiteAddress, pub: Publication): Promise<Outcome> {
  ensureSiteTables();
  if (!sameSite(req, address.hostname)) return { status: 403, body: { ok: false, error: "origin" } };
  const raw = await req.text();
  if (Buffer.byteLength(raw) > MAX_BODY) return { status: 413, body: { ok: false, error: "too_large" } };
  let data: Record<string, unknown>;
  try { data = (req.headers.get("content-type") ?? "").includes("application/json") ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw)); }
  catch { return { status: 400, body: { ok: false, error: "invalid" } }; }
  if (!data || typeof data !== "object" || (data.form_type !== undefined && data.form_type !== "contact")) return { status: 400, body: { ok: false, error: "invalid" } };
  // Champ piège rempli : réponse identique à un succès, rien n'est enregistré ni envoyé.
  if (typeof data[HONEYPOT] === "string" && (data[HONEYPOT] as string).trim()) return { status: 200, body: { ok: true } };
  const fields = contactFields(data);
  if (!fields) return { status: 413, body: { ok: false, error: "too_large" } };
  const email = fields.email ?? "";
  if (!EMAIL.test(email) || !Object.entries(fields).some(([k, v]) => k !== "email" && v)) return { status: 422, body: { ok: false, error: "fields" } };
  const ip = clientIp(req) ?? "inconnue";
  const ipHash = hmac(`site-request:${ip}`).slice(0, 24);
  if (!rateTake([
    { key: `site-request:${address.project_id}:${ipHash}`, max: 5, windowMs: 10 * 60_000 },
    { key: `site-request:${address.project_id}`, max: 200, windowMs: 24 * 3600_000 },
  ])) return { status: 429, body: { ok: false, error: "rate" } };
  const page = (() => { try { return new URL(req.headers.get("referer") ?? "").pathname.slice(0, 200); } catch { return ""; } })();
  identifyProject(address.project_id);
  const requestId = id();
  const queued = tx(() => {
    run("DELETE FROM site_requests WHERE project_id = ? AND created_at < ?", address.project_id, now() - RETENTION_MS);
    dropOutbox(address.project_id);
    run("INSERT INTO site_requests (id, project_id, publication_id, hostname, page, fields, email, ip_hash, created_at, notified, kind) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      requestId, address.project_id, pub.id, address.hostname, page, JSON.stringify(fields), email, ipHash, now(), "queued", requestKind(page, fields));
    return queueNotifications(address.project_id, requestId);
  });
  if (!queued) run("UPDATE site_requests SET notified = 'no_recipient' WHERE id = ?", requestId);
  // Envoi lancé sans attendre : la réponse au visiteur ne dépend jamais du SMTP (le worker reprend ce qui reste).
  else kickOutbox(address.project_id);
  return { status: 200, body: { ok: true } };
}

export function siteRequests(projectId: string): SiteRequest[] {
  ensureSiteTables();
  const outbox = outboxFor(projectId);
  return all<{ id: string; publication_id: string; hostname: string; page: string; fields: string; email: string | null; created_at: number; read_at: number | null; handled_at: number | null; kind: string | null; notified: string }>(
    "SELECT id, publication_id, hostname, page, fields, email, created_at, read_at, handled_at, kind, notified FROM site_requests WHERE project_id = ? ORDER BY created_at DESC LIMIT 200", projectId)
    .map(({ notified, ...r }) => {
      const rows = outbox.filter((o) => o.request_id === r.id);
      return {
        ...r,
        fields: JSON.parse(r.fields) as Record<string, string>,
        kind: r.kind === "devis" ? "devis" : "contact",
        notification: notificationState(rows, undefined, notified),
        // Motif lisible (code seulement) d'un e-mail échoué ou en attente d'un nouvel essai.
        notification_error: rows.find((o) => o.status === "failed" || (o.status === "pending" && o.last_error))?.last_error ?? null,
      };
    });
}

/** Traitement minimal par le professionnel : « traitée » ou de nouveau « nouvelle ». */
export function markRequestHandled(projectId: string, requestId: string, handled: boolean) {
  ensureSiteTables();
  run("UPDATE site_requests SET handled_at = ?, read_at = COALESCE(read_at, ?) WHERE id = ? AND project_id = ?", handled ? now() : null, now(), requestId, projectId);
}

export function markRequestRead(projectId: string, requestId: string) {
  ensureSiteTables();
  run("UPDATE site_requests SET read_at = COALESCE(read_at, ?) WHERE id = ? AND project_id = ?", now(), requestId, projectId);
}

/** Effacement d'une demande à la demande du visiteur (droit à l'effacement) ou du professionnel. */
export function deleteRequest(projectId: string, requestId: string) {
  ensureSiteTables();
  tx(() => {
    run("DELETE FROM site_requests WHERE id = ? AND project_id = ?", requestId, projectId);
    dropOutbox(projectId, [requestId]);
  });
}
