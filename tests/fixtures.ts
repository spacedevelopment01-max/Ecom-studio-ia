import { buildSpec } from "@/lib/theme/directions";
import { localCopy } from "@/lib/engine/local-copy";
import { emptyProduct } from "@/lib/project-types";
import type { DirectionId } from "@/lib/theme/directions";

export const product = {
  ...emptyProduct(),
  name: "Sérum Éclat",
  sector: "beaute" as const,
  facts: [
    { key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed" as const, source: "photo" as const },
    { key: "shipping", label: "Livraison", value: "", status: "unknown" as const, source: "ai" as const },
  ],
};

export const catalogSample = {
  products: [
    { title: "Brosse nettoyante", handle: "brosse-nettoyante", vendor: "Maison Ondine", description_html: "<p>Brosse</p>", price: 2490, compare_at_price: 2990, currency: "EUR", options: [], variants: [], images: ["es-packshot.jpg"], tags: ["Soin du visage"] },
    { title: "Rouleau de jade", handle: "rouleau-de-jade", vendor: "Maison Ondine", description_html: "<p>Rouleau</p>", price: 1990, compare_at_price: null, currency: "EUR", options: ["Pierre"], variants: [{ title: "Jade", options: ["Jade"], price: 1990, available: true }, { title: "Quartz rose", options: ["Quartz rose"], price: 2190, available: true }], images: ["es-packshot.jpg"], tags: ["Outils"] },
  ],
  collections: [
    { handle: "soin-du-visage", title: "Soin du visage", description: "", products: ["serum-eclat", "brosse-nettoyante"] },
    { handle: "outils", title: "Outils", description: "", products: ["rouleau-de-jade"] },
  ],
};

export function sampleSpec(direction: DirectionId = "atelier", storeType: "mono" | "multi" | "niche" = "mono") {
  const copy = localCopy(product, { name: "Maison Ondine", tagline: "Le soin, simplement.", story: "", values: [] });
  return buildSpec({
    direction,
    shopName: "Maison Ondine",
    palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" },
    copy,
    images: { hero: "es-hero.jpg", cutout: "es-cutout.webp", packshot: "es-packshot.jpg" },
    files: {},
    product: { title: "Sérum Éclat", handle: "serum-eclat", vendor: "Maison Ondine", description_html: "<p>Desc</p>", price: 3490, compare_at_price: null, currency: "EUR", options: ["Contenance"], variants: [{ title: "30 ml", options: ["30 ml"], price: 3490, available: true }, { title: "50 ml", options: ["50 ml"], price: 4990, available: true }], images: ["es-packshot.jpg"], tags: [] },
    ...(storeType === "mono" ? {} : { storeType, ...catalogSample }),
  });
}
