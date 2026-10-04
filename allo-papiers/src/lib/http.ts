import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { env } from "./env";
import { ConfigError } from "./db";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = () => new HttpError(401, "non_connecte", "Veuillez vous connecter.");
export const notFound = () => new HttpError(404, "introuvable", "Élément introuvable.");
export const forbidden = (msg = "Accès refusé.") => new HttpError(403, "interdit", msg);

/** Protection CSRF : les requêtes qui modifient des données doivent venir de notre propre origine. */
export function assertSameOrigin(req: Request) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  const allowed = new Set([env.appUrl, new URL(req.url).origin]);
  if (!origin || !allowed.has(origin)) throw new HttpError(403, "origine", "Requête refusée (origine inconnue).");
}

export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "json", "Requête invalide.");
  }
  return schema.parse(body);
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "0.0.0.0").trim();
}

/** Encapsule un gestionnaire d'API : contrôle d'origine, erreurs propres, aucun contenu sensible dans les journaux. */
export function route<C = unknown>(handler: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown): Response {
  if (e instanceof HttpError) return NextResponse.json({ error: e.code, message: e.message }, { status: e.status });
  if (e instanceof ZodError)
    return NextResponse.json({ error: "validation", message: "Certaines informations sont invalides.", issues: e.issues.map((i) => i.path.join(".")) }, { status: 400 });
  if (e instanceof ConfigError) {
    console.error("[config]", e.message);
    return NextResponse.json({ error: "configuration", message: `Service pas encore configuré : ${e.message}` }, { status: 503 });
  }
  // Journal minimal : type d'erreur uniquement, jamais le contenu des documents.
  console.error("[erreur]", e instanceof Error ? `${e.name}: ${e.message.slice(0, 200)}` : "inconnue");
  return NextResponse.json({ error: "interne", message: "Une erreur est survenue. Réessayez dans un instant." }, { status: 500 });
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);
