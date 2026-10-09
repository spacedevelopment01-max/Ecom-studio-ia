import { NextResponse } from "next/server";
import { logError } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { completeOAuth, consumeState, PROVIDER_INFO, verifyShopifyHmac, type ProviderKey } from "@/lib/social/oauth";
import { appUrl } from "@/lib/settings";
import { internalUrl } from "@/lib/http";
import { L, langFromRequest, runWithLang } from "@/lib/i18n-server";

/** Retour d'autorisation : vérifie l'état (anti-CSRF), échange le code et enregistre les comptes. */
export async function GET(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  return runWithLang(langFromRequest(req), () => callback(req, ctx));
}

async function callback(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const u = new URL(req.url).searchParams;
  const st = u.get("state") ? consumeState(u.get("state")!, provider as ProviderKey) : null;
  // Retour toujours sur le studio (jamais vers une autre origine, même avec un état forgé).
  const back = (path: string, params: Record<string, string>) => NextResponse.redirect(internalUrl(appUrl(), path, params));
  if (!st || !(provider in PROVIDER_INFO)) return back("/studio", { connexion: "erreur", message: L("Lien d'autorisation expiré ou invalide. Recommencez la connexion.", "Authorization link expired or invalid. Please start the connection again.") });
  // L'autorisation n'est rattachée qu'au compte qui l'a demandée ET qui est connecté dans ce navigateur : un lien
  // d'autorisation transmis par un tiers ne peut pas lui faire récupérer les comptes de quelqu'un d'autre.
  const me = await currentUser().catch(() => null);
  if (!me || me.id !== st.user_id) {
    logError(`oauth:${provider}`, new Error("retour d'autorisation sans la session du compte demandeur"), { userId: st.user_id });
    return back("/studio", { connexion: "erreur", message: L("Cette autorisation a été demandée depuis un autre compte ou une autre session. Connectez-vous puis recommencez la connexion depuis le studio.", "This authorization was requested from another account or session. Sign in, then start the connection again from the studio.") });
  }
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
