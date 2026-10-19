/** Configuration commerciale fictive, réservée aux essais isolés. Aucun tarif ajouté aux projets clients. */
import type { ThemeSpec, StoreProduct } from "@/lib/theme/spec";
export function referencePurchase(spec: ThemeSpec, benefits = ["Boîtier en acier poli", "Bracelet en cuir brun", "Cadran noir et argent"]) {
 const p = spec.store.product, template = spec.templates[`product.${p.template_suffix}`] ?? spec.templates.product;
 const [id, main] = Object.entries(template.sections).find(([, s]) => s.type === "main-product")!;
 p.options = ["Configuration de démonstration"];
 p.variants = [
  { title: "Démo A", options: ["Démo A"], price: p.price, available: true, sku: "DEMO-A", inventory_quantity: 12 },
  { title: "Démo B", options: ["Démo B"], price: (p.price ?? 0) + 1000, available: true, sku: "DEMO-B", inventory_quantity: 6 },
  { title: "Démo indisponible", options: ["Démo indisponible"], price: p.price, available: false, sku: "DEMO-C", inventory_quantity: 0 },
 ];
 const gift: StoreProduct = { contentTarget: "product:catalog:test-pouch", handle: "pochette-de-demonstration", title: "Pochette de démonstration", vendor: spec.store.shopName, price: 1900, compare_at_price: null, currency: p.currency, description_html: "<p>Accessoire fictif utilisé pour tester les cadeaux. Aucun visuel disponible.</p>", options: ["Title"], variants: [{ title: "Default Title", options: ["Default Title"], price: 1900, available: true, sku: "DEMO-GIFT", inventory_quantity: 5 }], images: [], tags: ["Donnée fictive de test"] };
 spec.store.products = [...(spec.store.products ?? []), gift];
 main.settings = { ...main.settings, purchase_enabled: true, purchase_heading: "Choisissez votre offre", purchase_style: "outlined", product_target: p.contentTarget! };
 main.blocks ??= {}; main.block_order ??= Object.keys(main.blocks);
 // La démonstration configure ses arguments près de l’achat, sans les répéter juste dessous.
 for (const b of Object.values(main.blocks)) if (b.type === "highlights") b.disabled = true;
 for (const [i, quantity] of [1, 2, 3, 4].entries()) {
  const key = `quantity_${quantity}`;
  main.blocks[key] = { type: "quantity_offer", settings: { title: ["Un article", "Le duo", "Le trio", "Quatre articles"][i], quantity, discount: [0, 8, 12, 15][i], recommended: quantity === 2 } }; main.block_order.push(key);
 }
 main.blocks.gift_pouch = { type: "threshold_gift", settings: { gift_target: gift.contentTarget!, threshold: 3, quantity: 1, sku: "DEMO-GIFT" } }; main.block_order.push("gift_pouch");
 for (const [i, title] of benefits.entries()) { const key = `purchase_benefit_${i}`; main.blocks[key] = { type: "purchase_benefit", settings: { title, icon: ["sparkle", "heart", "check"][i] } }; main.block_order.push(key); }
 return { template: `product.${p.template_suffix}`, section: id, gift };
}
