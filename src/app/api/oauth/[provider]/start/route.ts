import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { authorizeUrl, createState, providerConfig, PROVIDER_INFO, type ProviderKey } from "@/lib/social/oauth";
import { L } from "@/lib/i18n-server";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ provider: string }> }) => {
  const user = await requireUser();
  const { provider } = await ctx.params;
  if (!(provider in PROVIDER_INFO)) throw new HttpError(404, L("Fournisseur inconnu.", "Unknown provider."));
  const p = provider as ProviderKey;
  if (!providerConfig(p).configured) throw new HttpError(409, L(`La connexion ${PROVIDER_INFO[p].label} n'est pas encore configurée par l'administration (identifiants d'application manquants).`, `The ${PROVIDER_INFO[p].label} connection has not been set up by the administrator yet (app credentials missing).`));
  const u = new URL(req.url).searchParams;
  const projectId = u.get("project");
  if (projectId) ownedProject(user, projectId);
  let extra: string | undefined;
  if (p === "shopify") {
    const shop = (u.get("shop") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const full = shop.endsWith(".myshopify.com") ? shop : `${shop}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(full)) throw new HttpError(400, L("Adresse de boutique invalide (ex. ma-boutique.myshopify.com).", "Invalid store address (e.g. my-store.myshopify.com)."));
    extra = full;
  }
  const s = createState(user.id, p, projectId, u.get("redirect") ?? (projectId ? `/studio/${projectId}/connexions` : "/studio"), extra);
  return NextResponse.redirect(authorizeUrl(p, s, extra));
});
