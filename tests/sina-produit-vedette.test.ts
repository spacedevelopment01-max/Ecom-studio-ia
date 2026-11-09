/**
 * Sections « Produit vedette » (consigne du propriétaire du 8 novembre 2026) : SINA active ou retire d'elle-même les
 * fonctions du bloc d'achat d'après la fiche du produit et les offres saisies par le client. Rien n'est affiché pour
 * une option que le produit n'a pas ; aucune offre n'est inventée. Aucun appel payant.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — bloc d'achat des sections « Produit vedette » adapté au produit", async () => {
  const F = await import("@/lib/syna-agent/product-features");
  const NOW = 1_800_000_000_000;
  const prod = (data: Record<string, unknown>, variants: Record<string, unknown>[] = []) => ({ data: { title: "Thé vert jasmin", price: 850, compareAt: null, options: [], ...data } as any, variants: variants.map((v) => ({ options: [], image: null, price: null, compareAt: null, ...v })) as any });

  it("produit simple sans offre : aucune option, tout est retiré avec sa raison", () => {
    const f = F.decideBuyFeatures(prod({}), F.NO_OFFERS, { now: NOW });
    expect(f).toMatchObject({ colors: null, formats: [], promo: null, quantity: null, subscription: null, bundle: null, gifts: [] });
    expect(f.hidden.join(" | ")).toMatch(/couleurs.*formats.*promotion.*quantité.*abonnement.*lot.*paliers/);
    expect(F.buyBlockBrief(f).lines).toEqual([]); // la consigne de la maquette n'ajoute rien
  });

  it("couleurs et formats viennent des options du produit ; la photo de chaque couleur vient de sa variante", () => {
    const p = prod({ options: [{ name: "Coloris", values: ["Sauge", "Nuit"] }, { name: "Taille", values: ["S", "M", "L"] }, { name: "Matière", values: ["Coton"] }] },
      [{ options: ["Sauge", "S"], image: "img-sauge" }, { options: ["Nuit", "S"] }]);
    const f = F.decideBuyFeatures(p, F.NO_OFFERS, { now: NOW });
    expect(f.colors).toEqual({ option: "Coloris", values: [{ name: "Sauge", image: "img-sauge" }, { name: "Nuit", image: null }] });
    expect(f.formats).toEqual([{ option: "Taille", values: ["S", "M", "L"] }]); // une seule valeur : aucun choix affiché
    const b = F.buyBlockBrief(f);
    expect(b.lines.join("\n")).toMatch(/pastilles rondes : Sauge, Nuit.*change la grande photo/);
    expect(b.lines.join("\n")).toContain("N'affiche AUCUNE autre option");
    expect(b.allowed).toEqual(expect.arrayContaining(["Sauge", "Nuit", "Taille", "M"]));
  });

  it("promotion : prix barré réel, ou promotion limitée seulement tant qu'elle n'est pas finie", () => {
    expect(F.decideBuyFeatures(prod({ price: 680, compareAt: 850 }), F.NO_OFFERS, { now: NOW }).promo).toEqual({ kind: "compareAt", pct: 20 });
    const live = { ...F.NO_OFFERS, promo: { pct: 15, endsAt: NOW + 3_600_000 } };
    expect(F.decideBuyFeatures(prod({}), live, { now: NOW }).promo).toEqual({ kind: "limited", pct: 15, endsAt: NOW + 3_600_000 });
    const over = F.decideBuyFeatures(prod({}), { ...F.NO_OFFERS, promo: { pct: 15, endsAt: NOW - 1 } }, { now: NOW });
    expect(over.promo).toBeNull();
    expect(over.hidden).toContain("promotion : terminée");
  });

  it("offres saisies : 2 achetés 1 offert, abonnement, lot limité au catalogue (jamais le produit lui-même), paliers avec la livraison offerte", () => {
    const offers = F.shopOffersSchema.parse({
      quantity: { kind: "bogo", buy: 2, free: 1 }, subscription: { pct: 10, weeks: [4, 8] },
      bundle: { products: ["Infuseur inox", "Thé vert jasmin", "Produit inconnu"], pct: 10 }, gifts: [{ at: 20, label: "Échantillon offert" }],
    });
    const f = F.decideBuyFeatures(prod({}), offers, { now: NOW, catalog: ["Thé vert jasmin", "Infuseur inox"], freeShippingFrom: 35 });
    expect(f.quantity).toEqual({ kind: "bogo", buy: 2, free: 1 });
    expect(f.bundle).toEqual({ products: ["Infuseur inox"], pct: 10 });
    expect(f.gifts).toEqual([{ at: 20, label: "Échantillon offert" }, { at: 35, label: "Livraison offerte" }]);
    const text = F.buyBlockBrief(f).lines.join("\n");
    for (const t of ["2 achetés, 1 offert", "Abonnement −10 %", "toutes les 4 semaines, toutes les 8 semaines", "Infuseur inox", "Livraison offerte dès 35 €"]) expect(text).toContain(t);
    // Lot sans aucun produit du catalogue : retiré.
    expect(F.decideBuyFeatures(prod({}), offers, { now: NOW, catalog: ["Thé vert jasmin"] }).bundle).toBeNull();
  });

  it("livraison offerte lue dans la réponse du client ; rien inventé sinon", () => {
    expect(F.freeShippingFrom("Colissimo 48 à 72 h, 4,90 €, offerte dès 35 € d'achat")).toBe(35);
    expect(F.freeShippingFrom("Livraison gratuite à partir de 49,90 euros")).toBe(49.9);
    expect(F.freeShippingFrom("Colissimo 48 à 72 h, 4,90 €")).toBeNull();
    expect(F.freeShippingFrom(undefined)).toBeNull();
  });

  it("gamme, livraison estimée et fidélité sont des fonctions du bloc : actives seulement avec de vraies données", () => {
    // Un seul produit, aucun délai connu, aucun programme : rien.
    const none = F.decideBuyFeatures(prod({}), F.NO_OFFERS, { now: NOW, catalog: ["Thé vert jasmin"] });
    expect(none).toMatchObject({ range: [], delivery: null, loyalty: null });
    expect(none.hidden).toEqual(expect.arrayContaining(["choix dans la gamme : un seul produit au catalogue", "livraison estimée : délai de livraison inconnu", "points de fidélité : aucun programme de fidélité"]));
    // Délai lu dans la réponse « Livraison » du client.
    expect(F.deliveryFrom("Colissimo 48 à 72 h, offerte dès 35 €")).toEqual({ minDays: 2, maxDays: 3 });
    expect(F.deliveryFrom("Expédié en 2-4 jours ouvrés")).toEqual({ minDays: 2, maxDays: 4 });
    expect(F.deliveryFrom("Livré sous 24 h")).toEqual({ minDays: 1, maxDays: 1 });
    expect(F.deliveryFrom("Retrait en boutique")).toBeNull();
    const offers = F.shopOffersSchema.parse({ loyalty: { pointsPerEuro: 1, rewardPoints: 100, rewardLabel: "5 € offerts" }, delivery: { minDays: 1, maxDays: 2, cutoffHour: 14 } });
    const f = F.decideBuyFeatures(prod({}), offers, { now: NOW, catalog: ["Thé vert jasmin", "Rooibos vanille", "Verveine-menthe"], shippingDelay: { minDays: 2, maxDays: 3 } });
    expect(f.range).toEqual(["Rooibos vanille", "Verveine-menthe"]); // jamais le produit lui-même
    expect(f.delivery).toEqual({ minDays: 1, maxDays: 2, cutoffHour: 14 }); // le délai saisi l'emporte sur la réponse lue
    const text = F.buyBlockBrief(f).lines.join("\n");
    for (const t of ["Choix dans la gamme", "Rooibos vanille, Verveine-menthe", "1 à 2 jours ouvrés, commande avant 14 h", "Tu gagnes N points", "100 points = 5 € offerts", "jamais une section à part"]) expect(text).toContain(t);
    // Le client peut refuser le choix entre ses produits.
    expect(F.decideBuyFeatures(prod({}), { ...offers, range: false }, { now: NOW, catalog: ["Thé vert jasmin", "Rooibos vanille"] }).range).toEqual([]);
    expect(F.shopOffersSchema.safeParse({ delivery: { minDays: 4, maxDays: 2 } }).success).toBe(false);
  });

  it("offres refusées si mal formées (pas de pourcentage inventé hors bornes, pas de lot vide)", () => {
    expect(F.shopOffersSchema.safeParse({ quantity: { kind: "lots", tiers: [] } }).success).toBe(false);
    expect(F.shopOffersSchema.safeParse({ subscription: { pct: 95, weeks: [4] } }).success).toBe(false);
    expect(F.shopOffersSchema.safeParse({ inconnu: true }).success).toBe(false);
  });

  it("la consigne de la fiche produit (maquette en code) reçoit le bloc d'achat ; l'accueil ne le reçoit pas", async () => {
    const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const pages = mockupPages("products", "multi");
    const copy = { seo: { title: "t", description: "d" }, sections: [] };
    const base = { brand: { name: "Brindi", palette: { dark: "#233A2E", primary: "#3F6B4E", secondary: "#E3EDDF", accent: "#C9A04E", light: "#FFFFFF" } }, fonts: { heading: { family: "Cormorant Garamond", weight: 500 }, body: { family: "Karla", weights: [400] } }, logo: { file: "logo.png" }, direction: { name: "A", style: "s" }, copy, lines: [], phoneLines: [], photos: [], maxNew: 0 } as any;
    const brief = F.buyBlockBrief(F.decideBuyFeatures(prod({}), { ...F.NO_OFFERS, quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] } }, { now: NOW }));
    const product = C.codeMockupPrompt({ ...base, page: pages.find((p) => p.key === "product" || p.key.startsWith("product:"))!, buyBlock: brief.lines });
    expect(product).toContain("BLOC D'ACHAT DE CE PRODUIT");
    expect(product).toContain("2 (−10 %) · 3 (−15 %)");
    const home = C.codeMockupPrompt({ ...base, page: pages.find((p) => p.key === "home")! });
    expect(home).not.toContain("BLOC D'ACHAT");
  });

  it("outils SINA : shop.offers et shop.buy_features sont au registre, gratuits", async () => {
    const { getTool } = await import("@/lib/syna-agent/registry");
    for (const n of ["shop.offers", "shop.buy_features"]) { const t = getTool(n)!; expect(t).toBeTruthy(); expect(t.estimate).toBeUndefined(); }
    expect(getTool("shop.offers")!.args.safeParse({ promo: null }).success).toBe(true);
  });
});
