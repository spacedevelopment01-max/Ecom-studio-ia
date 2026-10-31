import { NextResponse, type NextRequest } from "next/server";
import { siteHostOf } from "@/lib/sites/host-match";

/** En-tête interne : nom d'hôte du site publié visé, posé ici seulement (jamais repris d'une requête entrante). */
const SITE_HOST = "x-ecs-site-host";

/**
 * - Studio : transmet le chemin demandé aux pages protégées ; sans session, la connexion ramène ensuite à cette page.
 * - Sites publiés (#232, seulement si `SITES_DOMAIN` est défini) : toute requête adressée à un nom de site est servie par
 *   la route interne des sites, jamais par le studio (pages, administration, API, aperçus).
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.delete(SITE_HOST);
  const site = siteHostOf(req.headers.get("host"));
  if (site) {
    headers.set(SITE_HOST, site);
    const url = req.nextUrl.clone();
    url.pathname = `/api/site-host${req.nextUrl.pathname}`;
    return NextResponse.rewrite(url, { request: { headers } });
  }
  if (/^\/(studio|admin)(\/|$)/.test(req.nextUrl.pathname)) headers.set("x-ecs-path", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
