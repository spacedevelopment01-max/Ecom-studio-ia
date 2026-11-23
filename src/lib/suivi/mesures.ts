/**
 * LES VRAIS CHIFFRES DU CLIENT, LUS PAR LE CODE (22 novembre 2026, recherche 08, points 2 et 10). Une seule façon de
 * les lire, pour « ta journée est prête » et pour « le point du mois » :
 *  - les pages vues de son site hébergé par le Studio (compteur sans traceur, `sites/visites.ts`) ;
 *  - les demandes reçues par son site (`site_requests`) ;
 *  - ses commandes Shopify (application créée par lui, droit `read_orders`) ou WooCommerce (clé remise par le bouton
 *    d'autorisation), et les visites de sa boutique Shopify (droit `read_reports`).
 * Chaque chiffre porte sa source. Un chiffre que le Studio ne peut pas lire vaut `null` avec sa raison (« non
 * disponible : … ») : jamais estimé, jamais inventé. Une boutique qui ne répond pas le dit aussi.
 */
import { one } from "../db";
import { L } from "../i18n-server";
import type { Connection } from "../social/publish";
import { shopifyConnection } from "../integrations/shopify";
import { wooCredentials } from "../products/sync";

export type Mesure = { cle: string; libelle: string; valeur: number | null; raison?: string; source?: string };

/** Remplaçables par les essais (aucun appel réel). */
export const mesuresDeps: {
  shopify?: (userId: string, projectId: string) => Connection | undefined;
  woo?: (projectId: string) => { url: string; key: string; secret: string } | null;
  fetch?: typeof fetch;
} = {};

const nd = (pourquoi: string) => L(`non disponible : ${pourquoi}`, `not available: ${pourquoi}`);

/** Le site du client est-il hébergé par le Studio ? (sinon, le compteur ne voit rien) */
function siteHeberge(projectId: string): boolean {
  try { return !!one("SELECT 1 FROM site_publications WHERE project_id=? LIMIT 1", projectId); } catch { return false; }
}

/** Les demandes reçues par le site entre deux instants (millisecondes). */
export function demandesRecues(projectId: string, a: number, b: number): number | null {
  try { return one<{ n: number }>("SELECT COUNT(*) n FROM site_requests WHERE project_id=? AND created_at>=? AND created_at<?", projectId, a, b)?.n ?? 0; }
  catch { return null; }
}

/**
 * Les mesures d'une période : du et au en AAAA-MM-JJ (compris), a et b les mêmes bornes en millisecondes (fuseau du
 * client). Rend toujours les quatre mêmes lignes, dans le même ordre.
 */
export async function mesuresDuProjet(p: { id: string; userId: string }, du: string, au: string, a: number, b: number): Promise<Mesure[]> {
  const out: Mesure[] = [];
  // Les demandes : seulement si un site du Studio a été publié (sinon aucune ne peut arriver).
  const heberge = siteHeberge(p.id);
  const dem = heberge ? demandesRecues(p.id, a, b) : null;
  out.push(dem == null
    ? { cle: "demandes", libelle: L("demandes reçues par ton site", "requests received by your site"), valeur: null, raison: nd(L("ton site n'est pas encore publié par le Studio", "your site isn't published by the Studio yet")) }
    : { cle: "demandes", libelle: L("demandes reçues par ton site", "requests received by your site"), valeur: dem, source: L("formulaires de ton site", "your site's forms") });

  // Les ventes : Shopify d'abord (son application), sinon WooCommerce.
  const { ventesShopify, visitesShopify, ventesWoo } = await import("../integrations/ventes");
  const conn = (mesuresDeps.shopify ?? shopifyConnection)(p.userId, p.id);
  const scopes = new Set(String(conn?.scopes ?? "").split(",").map((s) => s.trim()));
  const woo = conn ? null : (mesuresDeps.woo ?? wooCredentials)(p.id);
  const libVentes = L("commandes", "orders"), libCA = L("montant des commandes", "order total");
  if (conn && (scopes.has("read_orders") || scopes.has("write_orders"))) {
    try {
      const v = await ventesShopify(conn, du, au);
      out.push({ cle: "commandes", libelle: libVentes, valeur: v.commandes, source: v.source });
      out.push({ cle: "montant", libelle: v.devise ? `${libCA} (${v.devise})` : libCA, valeur: v.total, source: v.source });
    } catch {
      out.push({ cle: "commandes", libelle: libVentes, valeur: null, raison: nd(L("ta boutique Shopify n'a pas répondu", "your Shopify store didn't answer")) });
      out.push({ cle: "montant", libelle: libCA, valeur: null, raison: nd(L("ta boutique Shopify n'a pas répondu", "your Shopify store didn't answer")) });
    }
  } else if (woo) {
    try {
      const v = await ventesWoo(woo, du, au, mesuresDeps.fetch ?? fetch);
      out.push({ cle: "commandes", libelle: libVentes, valeur: v.commandes, source: v.source });
      out.push({ cle: "montant", libelle: v.devise ? `${libCA} (${v.devise})` : libCA, valeur: v.total, source: v.source });
    } catch {
      out.push({ cle: "commandes", libelle: libVentes, valeur: null, raison: nd(L("ta boutique WooCommerce n'a pas répondu", "your WooCommerce store didn't answer")) });
      out.push({ cle: "montant", libelle: libCA, valeur: null, raison: nd(L("ta boutique WooCommerce n'a pas répondu", "your WooCommerce store didn't answer")) });
    }
  } else {
    const r = conn ? L("le droit « read_orders » manque dans l'application de ta boutique", "the read_orders permission is missing") : L("aucune boutique reliée", "no store linked");
    out.push({ cle: "commandes", libelle: libVentes, valeur: null, raison: nd(r) });
    out.push({ cle: "montant", libelle: libCA, valeur: null, raison: nd(r) });
  }

  // Les visites : le compteur du Studio pour un site hébergé ; sinon celles de la boutique Shopify.
  const libVis = L("visites du site (pages vues)", "site visits (page views)");
  if (heberge) {
    const { visitesDe } = await import("../sites/visites");
    out.push({ cle: "visites", libelle: libVis, valeur: visitesDe(p.id, du, au).vues, source: L("compteur du Studio, sans suivre personne", "Studio counter, tracking no one") });
  } else if (conn && scopes.has("read_reports")) {
    try {
      const v = await visitesShopify(conn, du, au);
      out.push(v.visites == null ? { cle: "visites", libelle: L("visites de ta boutique", "store visits"), valeur: null, raison: nd(L("Shopify n'a pas donné ce chiffre", "Shopify didn't give this figure")) } : { cle: "visites", libelle: L("visites de ta boutique", "store visits"), valeur: v.visites, source: v.source });
    } catch { out.push({ cle: "visites", libelle: libVis, valeur: null, raison: nd(L("ta boutique Shopify n'a pas répondu", "your Shopify store didn't answer")) }); }
  } else {
    out.push({ cle: "visites", libelle: libVis, valeur: null, raison: nd(L("ton site n'est pas hébergé par le Studio et aucune boutique ne donne ses visites", "your site isn't hosted by the Studio and no store gives its visits")) });
  }
  return out;
}
