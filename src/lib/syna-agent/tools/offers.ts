/**
 * Offres de la boutique et bloc d'achat des sections « Produit vedette » (consigne du propriétaire du 8 novembre 2026) :
 * SINA enregistre les offres QUE LE CLIENT DONNE (jamais devinées), puis décide d'elle-même, produit par produit, les
 * fonctions à afficher (couleurs, formats, promotion, lots ou « N achetés, M offerts », abonnement, lot à compléter,
 * cadeaux par paliers). Gratuits, sans IA.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { companyOf } from "../activity";
import { loadShopOffers, projectBuyFeatures, saveShopOffers, shopOffersSchema, type BuyFeatures, type ShopOffers } from "../product-features";
import { project } from "./common";

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
  description: "Enregistre les offres de la boutique QUE LE CLIENT A DONNÉES (gratuit) : quantity (lots { kind: \"lots\", tiers: [{ qty, pct }] } ou { kind: \"bogo\", buy, free }), subscription { pct, weeks }, bundle { products (titres exacts de l'onglet Produits), pct }, gifts [{ at (euros), label }], promo { pct, endsAt (horodatage de fin réelle, ms) }. Mettre null pour retirer une offre. N'invente JAMAIS une offre, un pourcentage ou une date : demande-les au client. La livraison offerte (réponse « Livraison » de l'activité) s'ajoute d'elle-même aux paliers.",
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

export const offersTools: AgentTool[] = [featuresTool, offersTool];
