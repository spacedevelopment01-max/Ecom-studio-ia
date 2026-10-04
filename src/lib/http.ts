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
