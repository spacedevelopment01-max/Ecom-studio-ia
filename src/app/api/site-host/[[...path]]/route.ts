/**
 * Sites publiés (#232) : point d'entrée des requêtes adressées à un nom de site, réécrites ici par le middleware.
 * Appel direct sur le studio (sans l'en-tête posé par le middleware) : 404. Aucune session, aucun cookie.
 */
import { withAccessScope } from "@/lib/access-scope";
import { logError } from "@/lib/db";
import { normalizeHost, siteHostOf } from "@/lib/sites/host-match";
import { serveSite } from "@/lib/sites/serve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type P = { params: Promise<{ path?: string[] }> };

async function handleSite(req: Request, ctx: P) {
  const header = normalizeHost(req.headers.get("x-ecs-site-host"));
  // Double contrôle : l'en-tête doit correspondre au Host réellement reçu et à la règle du middleware.
  if (!header || siteHostOf(req.headers.get("host")) !== header) return new Response("Not Found", { status: 404 });
  const { path } = await ctx.params;
  const pathname = `/${(path ?? []).join("/")}`;
  try {
    return await withAccessScope({ kind: "http" }, () => serveSite(req, header, pathname));
  } catch (e) {
    logError("site-host", e, { details: { host: header, path: pathname } });
    return new Response("Erreur temporaire du site.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
}

export const GET = handleSite;
export const HEAD = handleSite;
export const POST = handleSite;
