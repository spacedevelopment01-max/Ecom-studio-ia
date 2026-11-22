/**
 * SHOPIFY RELIÉ PAR L'APPLICATION DU CLIENT (22 novembre 2026, recherche 04, parties 1.1 à 1.4).
 *
 * Depuis 2026, une application créée par le marchand lui-même, dans son Dev Dashboard, donne un « Client ID » et un
 * « Client secret » ; le Studio les échange contre un jeton de 24 heures (`grant_type=client_credentials`), sans
 * jeton de renouvellement : il en redemande un avant chaque envoi. Ce chemin évite la relecture de Shopify (aucune
 * attente de validation, règle du propriétaire du 15 novembre 2026). Les droits réellement accordés (`scope`) sont
 * comparés à ceux qu'il faut, et le droit qui manque est dit au client en clair.
 *
 * Non vérifié sur une vraie boutique (aucune boutique d'essai ouverte) : l'échange, la publication et l'envoi du thème
 * restent à essayer sur une boutique de développement que le propriétaire ouvrira (recherche 04, point 2).
 */
import { id, now, one, run } from "../db";
import { decrypt, encrypt } from "../secrets";
import { L } from "../i18n-server";
import { UserFacingError } from "../jobs";
import type { Connection } from "../social/publish";

/** La version de l'interface Shopify demandée (la plus récente tenue au 22 novembre 2026). */
export const SHOPIFY_API_VERSION = "2026-10";

/** Les droits qu'il faut, avec ce qu'ils permettent (dits au client quand l'un manque). */
export const DROITS_SHOPIFY: { droit: string; pourquoi: string }[] = [
  { droit: "write_themes", pourquoi: "installer ton thème" },
  { droit: "write_products", pourquoi: "créer tes produits et tes collections" },
  { droit: "read_locations", pourquoi: "lire tes entrepôts pour le stock" },
  { droit: "write_inventory", pourquoi: "poser ton stock" },
  { droit: "write_publications", pourquoi: "rendre tes produits visibles dans ta boutique" },
  { droit: "write_online_store_pages", pourquoi: "créer tes pages" },
  { droit: "write_online_store_navigation", pourquoi: "créer tes menus" },
  { droit: "write_legal_policies", pourquoi: "remplir tes pages légales" },
  { droit: "write_files", pourquoi: "envoyer ton logo et tes images" },
  { droit: "write_discounts", pourquoi: "créer tes remises" },
];

const SHOP = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
export const boutiqueValide = (s: string) => SHOP.test(s.trim().toLowerCase());

type Fetcher = typeof fetch;
export const shopifyAppDeps: { fetch?: Fetcher } = {};
const f = () => shopifyAppDeps.fetch ?? fetch;

/** Un droit accordé en écriture vaut aussi la lecture (« write_x » couvre « read_x »). */
export function droitsManquants(accordes: string[]): { droit: string; pourquoi: string }[] {
  const set = new Set(accordes.map((x) => x.trim()).filter(Boolean));
  return DROITS_SHOPIFY.filter((d) => !set.has(d.droit) && !(d.droit.startsWith("read_") && set.has(d.droit.replace(/^read_/, "write_"))));
}

/** L'échange des deux identifiants contre un jeton de 24 heures. */
export async function echangerJeton(shop: string, clientId: string, clientSecret: string): Promise<{ token: string; scopes: string[]; expiresAt: number }> {
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret });
  const r = await f()(`https://${shop}/admin/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j?.access_token) {
    const why = String(j?.error ?? j?.errors ?? r.status);
    if (/shop_not_permitted/.test(why)) throw new UserFacingError(L("Shopify refuse : l'application doit être créée dans ta propre boutique (Paramètres › Applications › Développer des applications), pas ailleurs.", "Shopify refused: the app must be created in your own store."));
    throw new UserFacingError(L("Shopify refuse ces identifiants : recopie le Client ID et le Client secret de ton application, sans espace.", "Shopify refused these credentials."));
  }
  return { token: String(j.access_token), scopes: String(j.scope ?? "").split(",").map((x) => x.trim()).filter(Boolean), expiresAt: Date.now() + Math.max(60, Number(j.expires_in ?? 86_399)) * 1000 };
}

/** Relie (ou met à jour) la boutique du client par son application ; rend les droits qui manquent, dits en clair. */
export async function relierAppShopify(userId: string, projectId: string | null, input: { shop: string; clientId: string; clientSecret: string }): Promise<{ connectionId: string; manque: { droit: string; pourquoi: string }[] }> {
  const shop = input.shop.trim().toLowerCase();
  if (!boutiqueValide(shop)) throw new UserFacingError(L("L'adresse de la boutique ressemble à « ma-boutique.myshopify.com ».", "The store address looks like my-store.myshopify.com."));
  const clientId = input.clientId.trim(), secret = input.clientSecret.trim();
  if (!clientId || !secret) throw new UserFacingError(L("Il faut le Client ID et le Client secret de ton application.", "Client ID and secret are required."));
  const t = await echangerJeton(shop, clientId, secret);
  const meta = JSON.stringify({ mode: "client_credentials", clientId, secret: encrypt(secret) });
  const existing = one<{ id: string }>("SELECT id FROM connections WHERE user_id=? AND provider='shopify' AND external_id=?", userId, shop);
  const cid = existing?.id ?? id();
  if (existing) run("UPDATE connections SET access_token=?, expires_at=?, scopes=?, meta=?, status='active', status_message=NULL, updated_at=? WHERE id=?", encrypt(t.token), t.expiresAt, t.scopes.join(","), meta, now(), cid);
  else run("INSERT INTO connections(id,user_id,provider,external_id,name,access_token,expires_at,scopes,meta,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'active',?,?)", cid, userId, "shopify", shop, shop, encrypt(t.token), t.expiresAt, t.scopes.join(","), meta, now(), now());
  if (projectId) run("INSERT OR IGNORE INTO project_connections(project_id, connection_id) VALUES(?,?)", projectId, cid);
  return { connectionId: cid, manque: droitsManquants(t.scopes) };
}

/** Un jeton frais avant chaque envoi (jamais plus de 24 heures ; périmé 60 secondes avant la fin). */
export async function jetonFrais<C extends Pick<Connection, "id" | "external_id" | "access_token"> & { expires_at?: number | null; meta?: string | null }>(c: C): Promise<C> {
  let meta: any = {};
  try { meta = JSON.parse(String(c.meta ?? "{}")); } catch { /* ancienne connexion */ }
  if (meta.mode !== "client_credentials") return c;
  if (c.expires_at && c.expires_at - 60_000 > Date.now()) return c;
  const t = await echangerJeton(c.external_id, meta.clientId, decrypt(meta.secret) ?? "");
  run("UPDATE connections SET access_token=?, expires_at=?, scopes=?, updated_at=? WHERE id=?", encrypt(t.token), t.expiresAt, t.scopes.join(","), now(), c.id);
  return { ...c, access_token: encrypt(t.token), expires_at: t.expiresAt };
}

/** Prévient l'administration quand Shopify répond dans une autre version que celle demandée. */
export function noterVersionServie(servie: string | null, demandee: string): string | null {
  if (!servie || servie === demandee) return null;
  run("INSERT INTO settings(key,value,updated_at) VALUES('shopify.apiVersionServed',?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at", `${servie} (demandée : ${demandee})`, now());
  return L(`Shopify a répondu en version ${servie} au lieu de ${demandee}.`, `Shopify answered in version ${servie} instead of ${demandee}.`);
}

/**
 * Le forfait de la boutique avant de monter le site (recherche 04, partie 2) : sur Starter, un seul thème, aucune
 * collection, aucun nouveau modèle de page : le site de SINA ne peut pas y partir, et c'est dit avant tout travail.
 */
export function forfaitRefuse(plan: { displayName?: string | null; partnerDevelopment?: boolean } | null): string | null {
  const nom = String(plan?.displayName ?? "");
  if (/starter|retail/i.test(nom)) return L(`Ta boutique est au forfait ${nom} : Shopify n'y permet ni thème à toi, ni collections, ni nouvelles pages. Pour que je monte ton site, passe au forfait Basic au moins (Paramètres › Forfait).`, `Your store is on ${nom}: no custom theme possible.`);
  return null;
}
