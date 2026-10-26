/** Aides pour les routes API : erreurs utiles, JSON, validation. */
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./auth";
import { UserFacingError } from "./jobs";
import { logError } from "./db";
import { redact } from "./redact";
import { L, langFromRequest, runWithLang } from "./i18n-server";
import { withAccessScope } from "./access-scope";
import { getSetting } from "./settings";

export function ok(data: unknown = { ok: true }, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "private, no-store");
  return NextResponse.json(data, { ...init, headers });
}

export function fail(status: number, message: string, code?: string) {
  return ok({ error: message, code }, { status });
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>, options?: { allowOpaqueOrigin?: (req: Request) => boolean }) {
  return async (...args: A): Promise<Response> => {
    const req = args[0] instanceof Request ? args[0] : null;
    return withAccessScope({kind:"http"}, () => runWithLang(req ? langFromRequest(req) : {}, () => run(...args)));
  };
  async function run(...args: A): Promise<Response> {
    try {
      const req = args[0] instanceof Request ? args[0] : null;
      if (req && !(req.headers.get("origin") === "null" && options?.allowOpaqueOrigin?.(req))) assertMutationOrigin(req);
      const response = await fn(...args);
      try { response.headers.set("Cache-Control", "private, no-store");return response; }
      catch { const headers=new Headers(response.headers);headers.set("Cache-Control","private, no-store");return new Response(response.body,{status:response.status,statusText:response.statusText,headers}); }
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      // Refus clair d'une fonction du studio (limite atteinte, IA indisponible…) : son message est montré tel quel,
      // jamais remplacé par « Une erreur inattendue » (ce n'est pas une panne).
      if (e instanceof UserFacingError) return fail(422, e.message, e.code);
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return fail(400, L(`Donnée invalide : ${first?.path.join(".") || "requête"} — ${first?.message}`, `Invalid data: ${first?.path.join(".") || "request"} — ${first?.message}`));
      }
      logError("api", e);
      // Journal du serveur : jamais de clé d'API ni de jeton (message et pile passés au caviardage).
      console.error(redact(e instanceof Error ? (e.stack ?? e.message) : String(e)));
      return fail(500, L("Une erreur inattendue est survenue. Elle a été enregistrée ; réessayez dans un instant.", "An unexpected error occurred. It has been logged; please try again in a moment."));
    }
  }
}

/** Les cookies SameSite ne remplacent pas le contrôle de l'origine des mutations. */
export function assertMutationOrigin(req: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  const allowed = new Set([new URL(req.url).origin]);
  // Même source de vérité que les liens du studio, y compris derrière un proxy privé.
  // Ne jamais déduire une origine autorisée d'un en-tête Forwarded fourni par l'appelant.
  const configuredUrl = getSetting("app.url") || process.env.APP_URL;
  if (configuredUrl) {
    try { allowed.add(new URL(configuredUrl).origin); } catch { /* configuration invalide : aucun droit ajouté */ }
  }
  if ((origin && !allowed.has(origin)) || (!origin && req.headers.get("sec-fetch-site") === "cross-site")) {
    throw new HttpError(403, L("Origine de la requête refusée.", "Request origin refused."), "request_origin");
  }
}

/** Limite les octets effectivement reçus, y compris avec une longueur mensongère ou absente. */
export async function boundedBody(req: Request, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, L("Envoi trop volumineux.", "Upload too large."));
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, L("Envoi trop volumineux.", "Upload too large."));
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

/**
 * Lecture d'un envoi de fichiers (multipart) avec une taille MAXIMALE vérifiée AVANT la lecture : sans cela, le
 * serveur charge tout le corps en mémoire avant de pouvoir refuser un fichier trop gros (épuisement de la mémoire).
 */
export async function readForm(req: Request, maxBytes: number): Promise<FormData> {
  const declared = Number(req.headers.get("content-length") ?? "");
  const mb = Math.round(maxBytes / 1048576);
  if (!Number.isFinite(declared) || declared <= 0) {
    if (req.headers.get("transfer-encoding")) throw new HttpError(411, L("Envoi sans taille annoncée refusé.", "Upload without a declared size refused."));
  } else if (declared > maxBytes) throw new HttpError(413, L(`Envoi trop volumineux (${mb} Mo au maximum).`, `Upload too large (${mb} MB maximum).`));
  const bytes = await boundedBody(req, maxBytes);
  return new Response(bytes as BodyInit, { headers: { "Content-Type": req.headers.get("content-type") ?? "" } }).formData();
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(await boundedBody(req, 2 * 1048576)).toString("utf8"));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(400, L("Corps de requête JSON attendu.", "JSON request body expected."));
  }
  return schema.parse(raw);
}

/**
 * Chemin de retour interne sûr (après une connexion OAuth, par exemple) : uniquement un chemin du studio,
 * jamais une autre origine (`//hote`, `@hote`, `\\hote`, `https:`…). Sinon : `fallback`.
 */
export function safeInternalPath(raw: string | null | undefined, fallback = "/studio"): string {
  if (!raw || raw.length > 500) return fallback;
  if (!/^\/studio(?:[/?#]|$)/.test(raw)) return fallback;
  if (!/^\/(?![/\\])[\w\-/?=&.%#~+:,]*$/.test(raw) || raw.includes("\\") || raw.includes("@")) return fallback;
  return raw;
}

/** Adresse absolue d'un chemin interne sur `base` (adresse publique du studio), en restant sur la même origine. */
export function internalUrl(base: string, path: string, params: Record<string, string> = {}): string {
  const b = base.replace(/\/$/, "");
  const origin = new URL(b).origin;
  let u = new URL(`${b}${safeInternalPath(path)}`);
  if (u.origin !== origin) u = new URL(`${b}/studio`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/**
 * En-tête `Range` (une seule plage d'octets) : plage à servir, « unsatisfiable » (réponse 416), ou null (en-tête
 * ignoré : fichier entier). Gère les plages de fin (`bytes=-500` : les 500 derniers octets).
 */
export function parseRange(header: string | null | undefined, size: number): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const m = header.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) return null;
  if (size <= 0) return "unsatisfiable";
  if (!m[1]) {
    const n = Number(m[2]);
    if (n <= 0) return "unsatisfiable";
    return { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(m[1]);
  const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) return "unsatisfiable";
  return { start, end };
}
