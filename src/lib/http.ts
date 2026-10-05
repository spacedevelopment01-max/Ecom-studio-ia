/** Aides pour les routes API : erreurs utiles, JSON, validation. */
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./auth";
import { logError } from "./db";
import { L, langFromRequest, runWithLang } from "./i18n-server";

export function ok(data: unknown = { ok: true }, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const req = args[0] instanceof Request ? args[0] : null;
    return runWithLang(req ? langFromRequest(req) : {}, () => run(...args));
  };
  async function run(...args: A): Promise<Response> {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return fail(400, L(`Donnée invalide : ${first?.path.join(".") || "requête"} — ${first?.message}`, `Invalid data: ${first?.path.join(".") || "request"} — ${first?.message}`));
      }
      logError("api", e);
      console.error(e);
      return fail(500, L("Une erreur inattendue est survenue. Elle a été enregistrée ; réessayez dans un instant.", "An unexpected error occurred. It has been logged; please try again in a moment."));
    }
  }
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
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
