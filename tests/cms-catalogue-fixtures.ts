import { sampleSpec } from "./fixtures";
export function multiAxisSpec() {
  const s = sampleSpec("atelier", "multi");
  const p = s.store.product;
  p.options = ["Finition", "Taille", "Câble"];
  p.variants = [
    { title: "Été / S / Court", options: ["Été", "S", "Court"], sku: "LAMPE-ÉTÉ-S", price: 3210, available: true, inventory_quantity: 7, image: p.images[0] },
    { title: "Ete / L / Long", options: ["Ete", "L", "Long"], price: 4560, available: false, inventory_quantity: 0, image: p.images[1] },
    { title: "Été / L / Court", options: ["Été", "L", "Court"], price: 3780, available: true },
  ];
  return s;
}
