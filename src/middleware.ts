import { NextResponse, type NextRequest } from "next/server";

/** Transmet le chemin demandé aux pages protégées : sans session, la connexion ramène ensuite à cette page. */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-ecs-path", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/studio/:path*", "/studio", "/admin/:path*", "/admin"] };
