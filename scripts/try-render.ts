import fs from "node:fs";
import { buildSpec } from "../src/lib/theme/directions";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import { renderPage } from "../src/lib/theme/render";
import { compileTheme } from "../src/lib/theme/compile";

const product = { ...emptyProduct(), name: "Sérum Éclat", sector: "beaute" as const, summary: "Un sérum en flacon de verre ambré.", facts: [
  { key: "capacity", label: "Contenance", value: "30 ml", status: "confirmed" as const, source: "photo" as const },
  { key: "ingredients", label: "Actifs indiqués", value: "Niacinamide, acide hyaluronique", status: "confirmed" as const, source: "photo" as const },
  { key: "shipping", label: "Livraison", value: "", status: "unknown" as const, source: "ai" as const },
]};
const brand = { name: "Maison Ondine", tagline: "Le soin, simplement.", story: "", values: [] };
const copy = localCopy(product, brand);
for (const dir of ["atelier","clinique","brut","terroir","nocturne","pop","galerie","elan"] as const) {
  const spec = buildSpec({ direction: dir, shopName: "Maison Ondine", palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" }, copy, images: { hero: "es-hero.jpg", cutout: "es-cutout.webp", packshot: "es-packshot.jpg" }, files: {}, product: { title: "Sérum Éclat", handle: "serum-eclat", vendor: "Maison Ondine", description_html: "<p>Desc</p>", price: 3490, compare_at_price: null, currency: "EUR", options: ["Contenance"], variants: [{ title: "30 ml", options: ["30 ml"], price: 3490, available: true }, { title: "50 ml", options: ["50 ml"], price: 4990, available: true }], images: ["es-packshot.jpg"], tags: [] } });
  const files = compileTheme(spec);
  for (const path of ["/", "/products/serum-eclat", "/collections/all", "/cart", "/pages/faq", "/pages/notre-histoire", "/pages/contact", "/pages/livraison-et-retours", "/search", "/nope", "/collections"]) {
    const t = Date.now();
    try {
      const r = await renderPage({ spec, base: "/preview/p/v/x", files, cart: [{ variantId: 1000, quantity: 2 }] }, path, new URLSearchParams("q=sérum"));
      if (dir === "atelier") fs.writeFileSync(`/tmp/claude-0/-home-user-Ecom-studio-ia/30a1ccd5-08f9-5162-80f0-38bf5e876ac5/scratchpad/render-${path.replace(/\W+/g,"_")}.html`, r.html);
      console.log(dir, path, r.status, r.template, r.html.length, Date.now()-t+"ms");
    } catch (e) { console.log("ERR", dir, path, (e as Error).message); }
  }
}
