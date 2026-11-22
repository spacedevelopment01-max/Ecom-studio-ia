/**
 * LES VENTES ET LES VISITES DE LA BOUTIQUE DU CLIENT, LUES (22 novembre 2026, recherche 08 parties 1.2 et 1.3). Des
 * chiffres mesurés, jamais estimés, chacun avec sa source :
 *  - Shopify, par l'application du client (droits `read_orders`, `read_all_orders`, `read_reports`, sans relecture par
 *    Shopify) : les commandes de la période, et les visites par le tableau « sessions » de ShopifyQL ;
 *  - WooCommerce, par la clé que le bouton d'autorisation remet au Studio : les commandes de la période (les visites,
 *    elles, ne sont pas dans WooCommerce).
 * Non vérifié sur une vraie boutique : la forme exacte des réponses (le Studio lit prudemment et dit « non disponible »
 * plutôt que d'inventer un chiffre).
 */
import { hmac } from "../secrets";
import { appUrl } from "../settings";
import { shopifyAppDeps } from "./shopify-app";
import type { Connection } from "../social/publish";
import { decrypt } from "../secrets";
import { jetonFrais, SHOPIFY_API_VERSION } from "./shopify-app";

export type Ventes = { commandes: number; total: number | null; devise: string | null; source: string };
export type Visites = { visites: number | null; source: string };

const f = () => shopifyAppDeps.fetch ?? fetch;

async function gql(c0: Connection, query: string, variables: Record<string, unknown> = {}) {
  const c = await jetonFrais(c0 as Connection & { expires_at?: number | null; meta?: string | null });
  const r = await f()(`https://${c.external_id}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": decrypt(c.access_token)! }, body: JSON.stringify({ query, variables }) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j?.errors) throw new Error(`Shopify : ${JSON.stringify(j?.errors ?? r.status).slice(0, 200)}`);
  return j.data;
}

/** Les commandes Shopify entre deux dates (AAAA-MM-JJ, comprises), payées ou en cours, annulées exclues. */
export async function ventesShopify(c: Connection, du: string, au: string): Promise<Ventes> {
  let after: string | null = null, commandes = 0, total = 0, devise: string | null = null;
  for (let page = 0; page < 40; page++) {
    const d: any = await gql(c, `query($q: String!, $after: String){ orders(first: 250, after: $after, query: $q){ nodes{ cancelledAt totalPriceSet{ shopMoney{ amount currencyCode } } } pageInfo{ hasNextPage endCursor } } }`, { q: `created_at:>=${du} created_at:<=${au}T23:59:59`, after });
    for (const o of d?.orders?.nodes ?? []) {
      if (o.cancelledAt) continue;
      commandes++; total += Number(o.totalPriceSet?.shopMoney?.amount ?? 0); devise ??= o.totalPriceSet?.shopMoney?.currencyCode ?? null;
    }
    if (!d?.orders?.pageInfo?.hasNextPage) break;
    after = d.orders.pageInfo.endCursor;
  }
  return { commandes, total: Math.round(total * 100) / 100, devise, source: `commandes de ta boutique Shopify, du ${du} au ${au}` };
}

/** Les visites de la boutique Shopify (tableau « sessions », visites humaines seulement). */
export async function visitesShopify(c: Connection, du: string, au: string): Promise<Visites> {
  const d: any = await gql(c, `query($q: String!){ shopifyqlQuery(query: $q){ tableData{ columns{ name } rows } parseErrors } }`, { q: `FROM sessions SHOW sessions WHERE human_or_bot_session = 'human' SINCE ${du} UNTIL ${au}` });
  const t = d?.shopifyqlQuery?.tableData, i = (t?.columns ?? []).findIndex((x: any) => x?.name === "sessions");
  const rows: any[] = Array.isArray(t?.rows) ? t.rows : [];
  if (i < 0 || !rows.length) return { visites: null, source: "visites Shopify non disponibles" };
  const n = rows.reduce((s, r) => s + Number(Array.isArray(r) ? r[i] : r?.sessions ?? 0), 0);
  return { visites: Number.isFinite(n) ? n : null, source: `visites de ta boutique Shopify, du ${du} au ${au}` };
}

/** Les commandes WooCommerce entre deux dates (terminées ou en cours). */
export async function ventesWoo(creds: { url: string; key: string; secret: string }, du: string, au: string, fetcher: typeof fetch = fetch): Promise<Ventes> {
  const base = creds.url.replace(/\/+$/, ""), auth = "Basic " + Buffer.from(`${creds.key}:${creds.secret}`).toString("base64");
  let commandes = 0, total = 0, devise: string | null = null;
  for (let page = 1; page < 40; page++) {
    const r = await fetcher(`${base}/wp-json/wc/v3/orders?after=${du}T00:00:00&before=${au}T23:59:59&status=completed,processing&per_page=100&page=${page}`, { headers: { Authorization: auth, Accept: "application/json" }, redirect: "error" });
    if (!r.ok) throw new Error(`WooCommerce : ${r.status}`);
    const list: any[] = await r.json();
    for (const o of list) { commandes++; total += Number(o.total ?? 0); devise ??= o.currency ?? null; }
    if (list.length < 100) break;
  }
  return { commandes, total: Math.round(total * 100) / 100, devise, source: `commandes de ta boutique WooCommerce, du ${du} au ${au}` };
}

/**
 * Le bouton « relier ma boutique WooCommerce » (recherche 08, 1.3) : le client clique « Approuver » sur son site, et
 * WooCommerce remet lui-même la clé au Studio ; rien à recopier. `user_id` porte, signés, le projet et la boutique.
 */
export function lienAutorisationWoo(projectId: string, userId: string, storeUrl: string): string {
  const base = storeUrl.replace(/\/+$/, ""), etat = Buffer.from(JSON.stringify({ p: projectId, u: userId, s: base })).toString("base64url");
  const q = new URLSearchParams({ app_name: "Studio", scope: "read_write", user_id: `${etat}.${hmac(`woo:${etat}`).slice(0, 32)}`, return_url: `${appUrl()}/studio/${projectId}`, callback_url: `${appUrl()}/api/connections/woo-callback` });
  return `${base}/wc-auth/v1/authorize?${q.toString()}`;
}
/** Le retour de WooCommerce, vérifié : le projet, le client et la boutique signés au départ. */
export function etatAutorisationWoo(userIdField: string): { projectId: string; userId: string; storeUrl: string } | null {
  const [etat, sig] = String(userIdField).split(".");
  if (!etat || !sig || hmac(`woo:${etat}`).slice(0, 32) !== sig) return null;
  try { const o = JSON.parse(Buffer.from(etat, "base64url").toString("utf8")); return { projectId: String(o.p), userId: String(o.u), storeUrl: String(o.s) }; } catch { return null; }
}
