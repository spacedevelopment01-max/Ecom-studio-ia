/**
 * Offres de la boutique et bloc d'achat des sections « Produit vedette » (consigne du propriétaire du 8 novembre 2026) :
 * SINA enregistre les offres QUE LE CLIENT DONNE (jamais devinées), puis décide d'elle-même, produit par produit, les
 * fonctions à afficher (couleurs, formats, promotion, lots ou « N achetés, M offerts », abonnement, lot à compléter,
 * cadeaux par paliers, choix dans la gamme, livraison estimée, points de fidélité) : des fonctions du bloc d'achat,
 * jamais des sections à part. Gratuits, sans IA.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { companyOf } from "../activity";
import { loadShopOffers, projectBuyFeatures, saveShopOffers, shopOffersSchema, type BuyFeatures, type ShopOffers } from "../product-features";
import { project } from "./common";
import { currentTheme } from "../../projects";
import { listProducts } from "../../products/catalog";
import { listStores } from "../../products/sync";
import { storeFetch } from "../../products/connectors/transport";
import { assertStoreUrl } from "../../products/connectors/types";
import { droitsRemises, etatRemisesShopify, shopifyConnection } from "../../integrations/shopify";
import { gardePreuveRemises, offreDuSite } from "../custom-theme/install";
import { guideRemisesShopify, lirePreuveRemises, remisesConfirmees, type PreuveRemises } from "../custom-theme/remises";

function describe(f: BuyFeatures): string {
  const on: string[] = [];
  if (f.colors) on.push(`couleurs (${f.colors.values.map((v) => v.name).join(", ")})`);
  for (const x of f.formats) on.push(`${x.option.toLowerCase()} (${x.values.join(", ")})`);
  if (f.promo) on.push(f.promo.kind === "limited" ? `promotion −${f.promo.pct} % avec compte à rebours` : `prix barré −${f.promo.pct} %`);
  if (f.quantity?.kind === "lots") on.push(`lots ${f.quantity.tiers.map((t) => `${t.qty} à −${t.pct} %`).join(", ")}`);
  if (f.quantity?.kind === "bogo") on.push(`${f.quantity.buy} achetés, ${f.quantity.free} offert${f.quantity.free > 1 ? "s" : ""}`);
  if (f.subscription) on.push(`abonnement −${f.subscription.pct} %`);
  if (f.bundle) on.push(`lot à compléter (${f.bundle.products.join(", ")}, −${f.bundle.pct} %)`);
  if (f.gifts.length) on.push(`cadeaux par paliers (${f.gifts.map((g) => `${g.label} dès ${g.at} €`).join(", ")})`);
  if (f.range.length) on.push(`choix dans la gamme (${f.range.join(", ")})`);
  if (f.delivery) on.push(`livraison estimée (${f.delivery.minDays} à ${f.delivery.maxDays} jours ouvrés)`);
  if (f.loyalty) on.push(`points de fidélité (${f.loyalty.pointsPerEuro} par euro)`);
  return on.length ? on.join(" ; ") : "aucune option : nom, prix, quantité et bouton d'ajout seulement";
}

const featuresTool: AgentTool<Record<string, never>> = {
  name: "shop.buy_features", module: "commerce", kind: "read", needsProject: true,
  description: "Étapes 6 et 7 (gratuit) : pour chaque produit de l'onglet Produits, les fonctions que la section « Produit vedette » affichera, décidées d'après la fiche du produit (options, variantes, prix barré) et les offres saisies (shop.offers), avec ce qui est retiré et pourquoi. La maquette en code de la fiche produit les reçoit d'elle-même. À montrer au client avant la maquette de la fiche.",
  args: z.object({}).strict(),
  run: (ctx) => {
    const p = project(ctx);
    const list = projectBuyFeatures(p.id, companyOf(p.id).shipping);
    if (!list.length) return { ok: true, summary: L("Aucun produit dans l'onglet Produits : le bloc d'achat sera décidé quand ils seront créés.", "No products yet."), data: [] };
    return { ok: true, summary: list.map((x) => `${x.product} : ${describe(x.features)}`).join("\n"), data: list.map((x) => ({ product: x.product, features: x.features })) };
  },
};

const offersTool: AgentTool<Partial<ShopOffers>> = {
  name: "shop.offers", module: "commerce", kind: "write", needsProject: true,
  description: "Enregistre les offres de la boutique QUE LE CLIENT A DONNÉES (gratuit) : quantity (lots { kind: \"lots\", tiers: [{ qty, pct }] } ou { kind: \"bogo\", buy, free }), subscription { pct, weeks }, bundle { products (titres exacts de l'onglet Produits), pct }, gifts [{ at (euros), label }], promo { pct, endsAt (fin réelle, ms), nom (son offre du moment), cadeauHandle (produit offert avec) } ; fiche produit en vente directe, SEULEMENT ce qu'il donne : packs [{ quantite, nom, remisePct ou prixCentimes, cadeauHandle (produit du catalogue offert), populaire (le pack qu'IL désigne) }], seuilStock (« plus que N » sous ce seuil, avec le vrai stock suivi), stockDepart (quantité de départ du lot, jauge « x % vendu »), delaiLivraison (ses mots), fenetreOffre { titre, texte, code (le code de réduction qu'il a créé dans sa boutique) }, remisesConfirmees (true seulement quand il confirme que les remises automatiques existent dans sa boutique). delivery { minDays, maxDays (jours ouvrés), cutoffHour (heure limite ou null) } si le délai n'est pas déjà dans la réponse « Livraison » ; loyalty { pointsPerEuro, rewardPoints, rewardLabel } seulement pour un vrai programme de fidélité ; range (false s'il ne veut pas du choix entre ses produits dans le bloc). null retire une offre. N'invente JAMAIS une offre, un pourcentage ou une date : demande-les au client. La livraison offerte (réponse « Livraison » de l'activité) s'ajoute d'elle-même aux paliers.",
  args: shopOffersSchema.partial().strict(),
  preview: (ctx, a) => `Offres enregistrées : ${Object.keys(a).join(", ") || "aucune modification"}.`,
  run: (ctx, a) => {
    const p = project(ctx);
    const before = loadShopOffers(p.id);
    const after = saveShopOffers(p.id, a);
    const verified = JSON.stringify(loadShopOffers(p.id)) === JSON.stringify(after);
    return {
      ok: true,
      summary: L("Offres enregistrées : la section « Produit vedette » de chaque produit s'adapte d'elle-même.", "Offers saved."),
      hint: "Appelle shop.buy_features pour montrer au client ce que chaque produit affichera.",
      changes: [{ module: "commerce", object: "offres de la boutique", summary: L("offres mises à jour", "offers updated"), before, after, verified }],
    };
  },
};

/** Ce que l'outil appelle au-dehors (remplacé dans les tests : aucun appel réel). */
export const discountsDeps = {
  /** Interroge une boutique WooCommerce ou PrestaShop (adresse contrôlée, aucune clé envoyée). */
  preuve: async (plateforme: "woocommerce" | "prestashop", url: string): Promise<PreuveRemises> => { const u = await assertStoreUrl(url); return lirePreuveRemises(plateforme, `${u.origin}${u.pathname.replace(/\/+$/, "")}`, storeFetch()); },
  shopify: etatRemisesShopify,
};
const NOMS: Record<string, string> = { shopify: "Shopify", woocommerce: "WooCommerce", prestashop: "PrestaShop" };

const discountsTool: AgentTool<Record<string, never>> = {
  name: "shop.discounts_check", module: "commerce", kind: "read", needsProject: true,
  description: "Gratuit, sans IA : interroge la BOUTIQUE RELIÉE du client (Shopify, WooCommerce ou PrestaShop) pour savoir si les remises de son offre (lots, packs, cadeaux saisis avec shop.offers) y sont vraiment en place, et dit simplement ce qui manque. Le site n'affiche un prix de lot ou de pack que si la boutique le tient : sa réponse est gardée et l'emporte ensuite sur ce que le client a déclaré. À appeler après l'envoi du site en boutique, et chaque fois qu'il dit avoir créé ou changé ses remises. Pour Shopify, quand l'accès du Studio ne permet pas de créer les remises, rend le pas à pas exact à lui donner (data.guide).",
  args: z.object({}).strict(),
  run: async (ctx) => {
    const p = project(ctx);
    if (p.business === "services") return { ok: true, summary: L("Un site de services n'a pas de remises de boutique à vérifier.", "A services site has no shop discounts to check.") };
    const saisies = (() => { try { return loadShopOffers(p.id); } catch { return null; } })();
    const offre = offreDuSite(p.id, saisies, currentTheme(p.id)?.spec ?? null);
    if (!offre) return { ok: true, summary: L("Aucune remise dans les offres du client (ni lot par quantité, ni pack remisé, ni cadeau) : rien à vérifier dans la boutique.", "No discount in the offers: nothing to check."), data: { remises: 0 } };
    const plateforme = (["shopify", "woocommerce", "prestashop"].includes(p.platform) ? p.platform : "shopify") as "shopify" | "woocommerce" | "prestashop";
    const titres = Object.fromEntries((() => { try { return listProducts(p.id).map((x) => [x.handle, x.data.title] as const); } catch { return []; } })());
    const guide = plateforme === "shopify" ? guideRemisesShopify(offre, titres) : [];
    let preuve: PreuveRemises;
    if (plateforme === "shopify") {
      const c = shopifyConnection(ctx.user.id, p.id);
      if (!c) return { ok: true, summary: L("La boutique Shopify du client n'est pas reliée au Studio : les remises ne peuvent pas être vérifiées. Elles sont à créer dans Shopify, pas à pas.", "The Shopify store is not connected."), data: { confirmees: false, relie: false, guide }, hint: "Donne au client le pas à pas (data.guide), une étape à la fois, avec ses mots. Tant que ce n'est pas vérifié, le site n'affiche ni prix de lot ni cadeau." };
      const droits = droitsRemises(c);
      preuve = await discountsDeps.shopify(c, offre);
      gardePreuveRemises(p.id, preuve);
      const v = remisesConfirmees(offre, preuve);
      if (v.ok) return { ok: true, summary: L("Les remises de l'offre sont en place dans la boutique Shopify : les prix de lot et de pack peuvent s'afficher.", "Discounts are in place."), data: { confirmees: true, plateforme, luLe: preuve.luLe } };
      return {
        ok: true,
        summary: L(`Les remises ne sont pas encore en place dans la boutique Shopify : ${(preuve.manque ?? []).slice(0, 6).join(" ; ") || v.pourquoi}`, "Discounts are not in place yet."),
        data: { confirmees: false, plateforme, manque: preuve.manque ?? [], droitsManquants: droits.manque, guide },
        hint: droits.ok
          ? "Dis au client ce qui manque, simplement. Tant que ce n'est pas en place, le site n'affiche ni prix de lot ni cadeau."
          : "L'accès du Studio à sa boutique date d'avant l'accord sur les remises : il ne permet ni de les vérifier ni de les créer à sa place. Deux chemins, à lui proposer simplement : relier sa boutique Shopify à nouveau (le Studio pourra alors s'en occuper), ou les créer lui-même avec le pas à pas (data.guide), une étape à la fois, avec ses mots. Puis rappelle cet outil. Ne lui parle pas de droits ni d'autorisations techniques.",
      };
    }
    const store = (() => { try { return listStores(p.id).find((x) => x.platform === plateforme && x.status === "active") ?? null; } catch { return null; } })();
    if (!store) return { ok: true, summary: L(`La boutique ${NOMS[plateforme]} du client n'est pas reliée au Studio : les remises ne peuvent pas être vérifiées.`, "The store is not connected."), data: { confirmees: false, relie: false }, hint: "Propose au client de relier sa boutique (onglet Produits), puis rappelle cet outil. Tant que ce n'est pas vérifié, le site n'affiche ni prix de lot ni cadeau." };
    try { preuve = await discountsDeps.preuve(plateforme, store.url); }
    catch (e) { preuve = { plateforme, empreinte: null, actif: false, manque: [e instanceof Error ? e.message : "la boutique ne répond pas"], luLe: Date.now() }; }
    gardePreuveRemises(p.id, preuve);
    const v = remisesConfirmees(offre, preuve);
    if (v.ok) return { ok: true, summary: L(`Les remises de l'offre sont en place dans la boutique ${NOMS[plateforme]} : les prix de lot et de pack peuvent s'afficher.`, "Discounts are in place."), data: { confirmees: true, plateforme, luLe: preuve.luLe } };
    return {
      ok: true, summary: L(`Les remises ne sont pas encore en place dans la boutique ${NOMS[plateforme]} : ${v.pourquoi}`, "Discounts are not in place yet."),
      data: { confirmees: false, plateforme, manque: preuve.manque ?? [] },
      hint: plateforme === "woocommerce"
        ? "Les remises partent avec le site : il faut que la dernière version du site soit installée dans WooCommerce et que les produits y soient publiés. Dis-le simplement, puis rappelle cet outil."
        : "Les remises partent avec le site : dans PrestaShop, elles se posent à l'import du catalogue, ou par Modules › E-COM STUDIO IA › Configurer › « Poser les remises ». Dis-le simplement, puis rappelle cet outil.",
    };
  },
};

export const offersTools: AgentTool[] = [featuresTool, offersTool, discountsTool];
