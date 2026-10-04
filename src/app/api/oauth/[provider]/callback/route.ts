import { NextResponse } from "next/server";
import { logError } from "@/lib/db";
import { completeOAuth, consumeState, PROVIDER_INFO, verifyShopifyHmac, type ProviderKey } from "@/lib/social/oauth";
import { appUrl } from "@/lib/settings";
import { L, langFromRequest, runWithLang } from "@/lib/i18n-server";

/** Retour d'autorisation : vérifie l'état (anti-CSRF), échange le code et enregistre les comptes. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return runWithLang(langFromRequest(req), () => callback(req, ctx));
}

async function callback(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const u = new URL(req.url).searchParams;
  const st = u.get("state") ? consumeState(u.get("state")!, provider as ProviderKey) : null;
  const back = (path: string, params: Record<string, string>) => NextResponse.redirect(`${appUrl()}${path}?${new URLSearchParams(params)}`);
  if (!st || !(provider in PROVIDER_INFO)) return back("/studio", { connexion: "erreur", message: L("Lien d'autorisation expiré ou invalide. Recommencez la connexion.", "Authorization link expired or invalid. Please start the connection again.") });
  if (u.get("error")) return back(st.redirect, { connexion: "refusee", message: u.get("error_description") ?? L("Autorisation refusée.", "Authorization denied.") });
  if (provider === "shopify" && !verifyShopifyHmac(u)) return back(st.redirect, { connexion: "erreur", message: L("Signature Shopify invalide.", "Invalid Shopify signature.") });
  try {
    const ids = await completeOAuth(provider as ProviderKey, u.get("code") ?? "", st);
    return back(st.redirect, { connexion: "ok", comptes: String(ids.length) });
  } catch (e) {
    logError(`oauth:${provider}`, e, { userId: st.user_id });
    return back(st.redirect, { connexion: "erreur", message: (e as Error).message.slice(0, 200) });
  }
}
