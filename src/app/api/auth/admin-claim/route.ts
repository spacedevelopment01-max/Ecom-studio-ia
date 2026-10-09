import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { confirmAdminClaim } from "@/lib/admin-claim";
import { internalUrl } from "@/lib/http";
import { appUrl } from "@/lib/settings";

/** Lien de confirmation de l'accès administrateur (envoyé à ADMIN_EMAIL) : à ouvrir en étant connecté. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("jeton");
  const me = await currentUser();
  if (!me) return NextResponse.redirect(internalUrl(appUrl(), "/connexion", { suite: `/api/auth/admin-claim?jeton=${token ?? ""}` }));
  const ok = confirmAdminClaim(token, me);
  return NextResponse.redirect(internalUrl(appUrl(), ok ? "/admin" : "/studio", ok ? {} : { erreur: "lien-admin-invalide" }));
}
