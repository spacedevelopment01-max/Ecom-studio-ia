/** Aides pour les routes API : erreurs utiles, JSON, validation. */
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { HttpError } from "./auth";
import { logError } from "./db";

export function ok(data: unknown = { ok: true }, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, code?: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      if (e instanceof ZodError) {
        const first = e.issues[0];
        return fail(400, `Donnée invalide : ${first?.path.join(".") || "requête"} — ${first?.message}`);
      }
      logError("api", e);
      console.error(e);
      return fail(500, "Une erreur inattendue est survenue. Elle a été enregistrée ; réessayez dans un instant.");
    }
  };
}

export async function body<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "Corps de requête JSON attendu.");
  }
  return schema.parse(raw);
}
