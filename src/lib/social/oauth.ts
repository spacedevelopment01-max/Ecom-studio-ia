/**
 * Connexions par les mécanismes officiels d'autorisation (OAuth 2.0).
 * Aucun mot de passe de réseau social n'est jamais demandé ni stocké.
 * Les identifiants d'application (client id / secret) sont gérés par
 * l'administration ; les jetons des clients sont chiffrés en base.
 */
import crypto from "node:crypto";
import { id, now, one, run } from "../db";
import { encrypt } from "../secrets";
import { appUrl, getSetting } from "../settings";
import { L } from "../i18n-server";

export type ProviderKey = "meta" | "tiktok" | "youtube" | "pinterest" | "canva" | "shopify";

type ProviderInfo = { label: string; networks: string[]; docs: string; scopes: string[]; needs: string; capabilities: string[]; limits: string[] };
type Bi<T> = { fr: T; en: T };

/** Textes affichés dans la langue de l'interface au moment de la lecture (jamais figés au chargement du module). */
function info(d: { label: Bi<string>; networks: string[]; docs: string; scopes: string[]; needs: Bi<string>; capabilities: Bi<string[]>; limits: Bi<string[]> }): ProviderInfo {
  return {
    get label() { return L(d.label.fr, d.label.en); },
    networks: d.networks,
    docs: d.docs,
    scopes: d.scopes,
    get needs() { return L(d.needs.fr, d.needs.en); },
    get capabilities() { return L(d.capabilities.fr, d.capabilities.en); },
    get limits() { return L(d.limits.fr, d.limits.en); },
  };
}

export const PROVIDER_INFO: Record<ProviderKey, ProviderInfo> = {
  meta: info({
    label: { fr: "Meta (Facebook et Instagram)", en: "Meta (Facebook and Instagram)" },
    networks: ["facebook", "instagram"],
    docs: "https://developers.facebook.com/docs/instagram-platform/content-publishing",
    scopes: ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "instagram_basic", "instagram_content_publish", "business_management"],
    needs: { fr: "Une application Meta (Facebook Login) avec les autorisations de publication validées par Meta.", en: "A Meta app (Facebook Login) with publishing permissions approved by Meta." },
    capabilities: {
      fr: ["Publier sur une Page Facebook : texte, lien, image, vidéo", "Publier sur un compte Instagram professionnel relié à la Page : image, carrousel, reel"],
      en: ["Publish to a Facebook Page: text, link, image, video", "Publish to an Instagram professional account linked to the Page: image, carousel, reel"],
    },
    limits: {
      fr: ["Instagram exige un compte professionnel relié à une Page Facebook", "Les médias doivent être accessibles publiquement en HTTPS (adresse publique du studio requise)", "Limite de 50 publications Instagram par 24 h et par compte (API)"],
      en: ["Instagram requires a professional account linked to a Facebook Page", "Media must be publicly accessible over HTTPS (the studio needs a public address)", "Limit of 50 Instagram posts per 24 hours per account (API)"],
    },
  }),
  tiktok: info({
    label: { fr: "TikTok", en: "TikTok" },
    networks: ["tiktok"],
    docs: "https://developers.tiktok.com/doc/content-posting-api-get-started",
    scopes: ["user.info.basic", "video.publish", "video.upload"],
    needs: { fr: "Une application TikTok for Developers avec le produit « Content Posting API ».", en: "A TikTok for Developers app with the \"Content Posting API\" product." },
    capabilities: {
      fr: ["Publier une vidéo directement sur le compte (Direct Post)", "Envoyer une vidéo en brouillon dans l'application TikTok (Upload)"],
      en: ["Publish a video directly to the account (Direct Post)", "Send a video as a draft to the TikTok app (Upload)"],
    },
    limits: {
      fr: ["Tant que l'application n'a pas passé l'audit de TikTok, les publications directes sont limitées à la visibilité « moi uniquement »", "Les publications photo nécessitent un domaine vérifié auprès de TikTok"],
      en: ["Until the app passes TikTok's audit, direct posts are limited to \"Only me\" visibility", "Photo posts require a domain verified with TikTok"],
    },
  }),
  youtube: info({
    label: { fr: "YouTube", en: "YouTube" },
    networks: ["youtube"],
    docs: "https://developers.google.com/youtube/v3/guides/uploading_a_video",
    scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
    needs: { fr: "Un projet Google Cloud avec l'API YouTube Data v3 et un écran de consentement OAuth.", en: "A Google Cloud project with the YouTube Data API v3 and an OAuth consent screen." },
    capabilities: {
      fr: ["Mettre en ligne une vidéo (Shorts si verticale et courte) avec titre, description et visibilité"],
      en: ["Upload a video (as a Short if vertical and short) with title, description and visibility"],
    },
    limits: {
      fr: ["Les applications non vérifiées par Google ne peuvent publier qu'en privé", "Quota quotidien de l'API (environ 6 mises en ligne par jour avec le quota par défaut)"],
      en: ["Apps not verified by Google can only publish privately", "Daily API quota (about 6 uploads per day with the default quota)"],
    },
  }),
  pinterest: info({
    label: { fr: "Pinterest", en: "Pinterest" },
    networks: ["pinterest"],
    docs: "https://developers.pinterest.com/docs/api/v5/pins-create",
    scopes: ["boards:read", "pins:read", "pins:write", "user_accounts:read"],
    needs: { fr: "Une application Pinterest avec l'accès standard à l'API v5.", en: "A Pinterest app with standard access to API v5." },
    capabilities: {
      fr: ["Créer une épingle image ou vidéo sur un tableau, avec titre, description et lien"],
      en: ["Create an image or video Pin on a board, with title, description and link"],
    },
    limits: {
      fr: ["Un accès « Trial » limite la visibilité des épingles ; l'accès standard est demandé à Pinterest"],
      en: ["\"Trial\" access limits Pin visibility; standard access must be requested from Pinterest"],
    },
  }),
  canva: info({
    label: { fr: "Canva", en: "Canva" },
    networks: [],
    docs: "https://www.canva.dev/docs/connect/",
    scopes: ["asset:read", "asset:write", "design:meta:read", "design:content:read", "design:content:write"],
    needs: { fr: "Une intégration Canva Connect (client id / secret) avec les autorisations ci-dessus.", en: "A Canva Connect integration (client ID / secret) with the permissions above." },
    capabilities: {
      fr: ["Envoyer une création du studio dans Canva et ouvrir un design modifiable", "Récupérer le design exporté (PNG, JPG, PDF ou MP4) dans les fichiers du projet"],
      en: ["Send a studio creation to Canva and open an editable design", "Bring the exported design (PNG, JPG, PDF or MP4) back into the project files"],
    },
    limits: {
      fr: ["L'intégration doit être approuvée par Canva pour être utilisée par tous les comptes", "L'export MP4 dépend du type de design"],
      en: ["The integration must be approved by Canva before all accounts can use it", "MP4 export depends on the design type"],
    },
  }),
  shopify: info({
    label: { fr: "Shopify", en: "Shopify" },
    networks: [],
    docs: "https://shopify.dev/docs/apps/build/authentication-authorization",
    scopes: ["write_themes", "write_products", "write_content", "write_files", "write_online_store_navigation"],
    needs: { fr: "Une application Shopify (Dev Dashboard) avec ces autorisations et l'adresse de retour du studio.", en: "A Shopify app (Dev Dashboard) with these permissions and the studio's redirect URL." },
    capabilities: {
      fr: ["Installer le thème comme thème non publié", "Créer le produit, ses images et variantes", "Créer les pages (Notre histoire, FAQ, Contact, Livraison) et les menus"],
      en: ["Install the theme as an unpublished theme", "Create the product, its images and variants", "Create the pages (Our story, FAQ, Contact, Shipping) and the menus"],
    },
    limits: {
      fr: ["L'installation du thème depuis le studio demande une adresse publique (Shopify télécharge le ZIP) ; sinon importez le ZIP manuellement", "La publication du thème reste une décision du marchand dans Shopify"],
      en: ["Installing the theme from the studio requires a public address (Shopify downloads the ZIP); otherwise, import the ZIP manually", "Publishing the theme remains the merchant's decision in Shopify"],
    },
  }),
};

export function providerConfig(p: ProviderKey) {
  const clientId = getSetting(`oauth.${p}.clientId`);
  const clientSecret = getSetting(`oauth.${p}.clientSecret`);
  return { clientId, clientSecret, configured: !!clientId && !!clientSecret };
}

export const redirectUri = (p: ProviderKey) => `${appUrl()}/api/oauth/${p}/callback`;

const b64url = (b: Buffer) => b.toString("base64url");

export function createState(userId: string, provider: ProviderKey, projectId: string | null, redirect: string, extra?: string) {
  const state = b64url(crypto.randomBytes(24));
  const verifier = b64url(crypto.randomBytes(48));
  run("DELETE FROM oauth_states WHERE created_at < ?", now() - 30 * 60_000);
  run("INSERT INTO oauth_states (state, user_id, provider, project_id, verifier, redirect, created_at) VALUES (?,?,?,?,?,?,?)", state, userId, provider, projectId, extra ? `${verifier}|${extra}` : verifier, redirect, now());
  return { state, verifier, challenge: b64url(crypto.createHash("sha256").update(verifier).digest()) };
}

export function consumeState(state: string, provider: ProviderKey) {
  const row = one<{ state: string; user_id: string; provider: string; project_id: string | null; verifier: string; redirect: string; created_at: number }>("SELECT * FROM oauth_states WHERE state = ?", state);
  if (!row || row.provider !== provider || row.created_at < now() - 30 * 60_000) return null;
  run("DELETE FROM oauth_states WHERE state = ?", state);
  const [verifier, extra] = row.verifier.split("|");
  return { ...row, verifier, extra };
}

export function authorizeUrl(p: ProviderKey, s: { state: string; challenge: string }, extra?: string): string {
  const { clientId } = providerConfig(p);
  const ru = encodeURIComponent(redirectUri(p));
  const scope = (sep: string) => encodeURIComponent(PROVIDER_INFO[p].scopes.join(sep));
  switch (p) {
    case "meta":
      return `https://www.facebook.com/${graphVersion()}/dialog/oauth?client_id=${clientId}&redirect_uri=${ru}&state=${s.state}&response_type=code&scope=${scope(",")}`;
    case "tiktok":
      return `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientId}&response_type=code&scope=${scope(",")}&redirect_uri=${ru}&state=${s.state}`;
    case "youtube":
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${ru}&response_type=code&access_type=offline&prompt=consent&include_granted_scopes=true&scope=${scope(" ")}&state=${s.state}`;
    case "pinterest":
      return `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${ru}&response_type=code&scope=${scope(",")}&state=${s.state}`;
    case "canva":
      return `https://www.canva.com/api/oauth/authorize?code_challenge_method=s256&response_type=code&client_id=${clientId}&redirect_uri=${ru}&scope=${scope(" ")}&state=${s.state}&code_challenge=${s.challenge}`;
    case "shopify": {
      const shop = extra!;
      return `https://${shop}/admin/oauth/authorize?client_id=${clientId}&scope=${scope(",")}&redirect_uri=${ru}&state=${s.state}`;
    }
  }
}

export function graphVersion() {
  return getSetting("meta.graphVersion") || "v23.0";
}

async function postForm(url: string, body: Record<string, string>, headers: Record<string, string> = {}) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(body) });
  const text = await r.text();
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    j = { raw: text };
  }
  if (!r.ok || j.error) throw new Error(L(`Échange du code refusé (${r.status}) : ${JSON.stringify(j.error ?? j).slice(0, 300)}`, `Code exchange refused (${r.status}): ${JSON.stringify(j.error ?? j).slice(0, 300)}`));
  return j;
}

export type SavedConnection = { provider: string; externalId: string; name: string; avatar?: string | null; access: string; refresh?: string | null; expiresAt?: number | null; scopes: string; meta: Record<string, unknown> };

export function upsertConnection(userId: string, c: SavedConnection, projectId?: string | null) {
  const existing = one<{ id: string }>("SELECT id FROM connections WHERE user_id = ? AND provider = ? AND external_id = ?", userId, c.provider, c.externalId);
  const cid = existing?.id ?? id();
  if (existing) {
    run(
      "UPDATE connections SET name=?, avatar_url=?, access_token=?, refresh_token=COALESCE(?, refresh_token), expires_at=?, scopes=?, meta=?, status='active', status_message=NULL, updated_at=? WHERE id=?",
      c.name,
      c.avatar ?? null,
      encrypt(c.access),
      c.refresh ? encrypt(c.refresh) : null,
      c.expiresAt ?? null,
      c.scopes,
      JSON.stringify(c.meta),
      now(),
      cid,
    );
  } else {
    run(
      "INSERT INTO connections (id, user_id, provider, external_id, name, avatar_url, access_token, refresh_token, expires_at, scopes, meta, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      cid,
      userId,
      c.provider,
      c.externalId,
      c.name,
      c.avatar ?? null,
      encrypt(c.access),
      c.refresh ? encrypt(c.refresh) : null,
      c.expiresAt ?? null,
      c.scopes,
      JSON.stringify(c.meta),
      "active",
      now(),
      now(),
    );
  }
  if (projectId) run("INSERT OR IGNORE INTO project_connections (project_id, connection_id) VALUES (?,?)", projectId, cid);
  return cid;
}

/** Échange le code d'autorisation et enregistre le ou les comptes autorisés. */
export async function completeOAuth(p: ProviderKey, code: string, st: NonNullable<ReturnType<typeof consumeState>>): Promise<string[]> {
  const { clientId, clientSecret } = providerConfig(p);
  if (!clientId || !clientSecret) throw new Error(L("Connexion non configurée par l'administration.", "Connection not set up by the administrator."));
  const ru = redirectUri(p);
  const saved: string[] = [];
  if (p === "meta") {
    const v = graphVersion();
    const short = await (await fetch(`https://graph.facebook.com/${v}/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(ru)}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`)).json();
    if (short.error) throw new Error(short.error.message);
    const long = await (await fetch(`https://graph.facebook.com/${v}/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${short.access_token}`)).json();
    const userToken = long.access_token ?? short.access_token;
    const perms = await (await fetch(`https://graph.facebook.com/${v}/me/permissions?access_token=${userToken}`)).json();
    const granted = (perms.data ?? []).filter((x: any) => x.status === "granted").map((x: any) => x.permission).join(",");
    const pages = await (await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}&limit=50&access_token=${userToken}`)).json();
    if (pages.error) throw new Error(pages.error.message);
    for (const page of pages.data ?? []) {
      saved.push(upsertConnection(st.user_id, { provider: "facebook", externalId: page.id, name: page.name, avatar: page.picture?.data?.url, access: page.access_token, scopes: granted, meta: { pageId: page.id } }, st.project_id));
      const ig = page.instagram_business_account;
      if (ig) saved.push(upsertConnection(st.user_id, { provider: "instagram", externalId: ig.id, name: `@${ig.username}`, avatar: ig.profile_picture_url, access: page.access_token, scopes: granted, meta: { pageId: page.id, igUserId: ig.id } }, st.project_id));
    }
    if (!saved.length) throw new Error(L("Aucune Page Facebook n'a été autorisée. Relancez la connexion et sélectionnez au moins une Page.", "No Facebook Page was authorized. Restart the connection and select at least one Page."));
  } else if (p === "tiktok") {
    const t = await postForm("https://open.tiktokapis.com/v2/oauth/token/", { client_key: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: ru });
    const info = await (await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    const u = info.data?.user ?? {};
    saved.push(upsertConnection(st.user_id, { provider: "tiktok", externalId: t.open_id ?? u.open_id, name: u.display_name ?? L("Compte TikTok", "TikTok account"), avatar: u.avatar_url, access: t.access_token, refresh: t.refresh_token, expiresAt: now() + (t.expires_in ?? 86400) * 1000, scopes: t.scope ?? "", meta: { refreshExpiresAt: now() + (t.refresh_expires_in ?? 0) * 1000 } }, st.project_id));
  } else if (p === "youtube") {
    const t = await postForm("https://oauth2.googleapis.com/token", { client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: ru });
    const ch = await (await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    const c = ch.items?.[0];
    if (!c) throw new Error(L("Aucune chaîne YouTube sur ce compte Google.", "No YouTube channel on this Google account."));
    saved.push(upsertConnection(st.user_id, { provider: "youtube", externalId: c.id, name: c.snippet.title, avatar: c.snippet.thumbnails?.default?.url, access: t.access_token, refresh: t.refresh_token, expiresAt: now() + (t.expires_in ?? 3600) * 1000, scopes: t.scope ?? "", meta: {} }, st.project_id));
  } else if (p === "pinterest") {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const t = await postForm("https://api.pinterest.com/v5/oauth/token", { grant_type: "authorization_code", code, redirect_uri: ru }, { Authorization: `Basic ${basic}` });
    const me = await (await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    const boards = await (await fetch("https://api.pinterest.com/v5/boards?page_size=100", { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    saved.push(upsertConnection(st.user_id, { provider: "pinterest", externalId: me.username ?? "pinterest", name: me.username ?? L("Compte Pinterest", "Pinterest account"), avatar: me.profile_image, access: t.access_token, refresh: t.refresh_token, expiresAt: now() + (t.expires_in ?? 2592000) * 1000, scopes: t.scope ?? "", meta: { boards: (boards.items ?? []).map((b: any) => ({ id: b.id, name: b.name })), boardId: boards.items?.[0]?.id ?? null } }, st.project_id));
  } else if (p === "canva") {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const t = await postForm("https://api.canva.com/rest/v1/oauth/token", { grant_type: "authorization_code", code, code_verifier: st.verifier, redirect_uri: ru }, { Authorization: `Basic ${basic}` });
    const me = await (await fetch("https://api.canva.com/rest/v1/users/me/profile", { headers: { Authorization: `Bearer ${t.access_token}` } })).json().catch(() => ({}));
    const who = await (await fetch("https://api.canva.com/rest/v1/users/me", { headers: { Authorization: `Bearer ${t.access_token}` } })).json().catch(() => ({}));
    saved.push(upsertConnection(st.user_id, { provider: "canva", externalId: who?.team_user?.user_id ?? "canva", name: me?.profile?.display_name ?? L("Compte Canva", "Canva account"), access: t.access_token, refresh: t.refresh_token, expiresAt: now() + (t.expires_in ?? 14400) * 1000, scopes: t.scope ?? "", meta: {} }, st.project_id));
  } else if (p === "shopify") {
    const shop = st.extra!;
    const r = await fetch(`https://${shop}/admin/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }) });
    const t = await r.json();
    if (!t.access_token) throw new Error(L("Shopify n'a pas délivré de jeton d'accès.", "Shopify did not issue an access token."));
    saved.push(upsertConnection(st.user_id, { provider: "shopify", externalId: shop, name: shop, access: t.access_token, scopes: t.scope ?? "", meta: { shop } }, st.project_id));
    if (st.project_id) run("UPDATE projects SET store_url = ? WHERE id = ?", `https://${shop}`, st.project_id);
  }
  return saved;
}

/** Vérifie la signature HMAC d'un retour Shopify. */
export function verifyShopifyHmac(params: URLSearchParams): boolean {
  const { clientSecret } = providerConfig("shopify");
  if (!clientSecret) return false;
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const msg = [...params.entries()].filter(([k]) => k !== "hmac" && k !== "signature").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  const digest = crypto.createHmac("sha256", clientSecret).update(msg).digest("hex");
  return digest.length === hmac.length && crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}
