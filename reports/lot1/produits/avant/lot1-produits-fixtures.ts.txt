/** Trois produits synthétiques, mêmes noms possibles, faits et photos distincts ; aucune IA. */
import sharp from "sharp";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { loadProject, saveProduct, saveCatalog, saveBrand, saveStrategy, remember } from "@/lib/projects";
import { saveAsset } from "@/lib/library";
import { localCopy } from "@/lib/engine/local-copy";
import { localBrand } from "@/lib/engine/local";
export const PRODUCT_TARGETS = ["product:main", "product:catalog:steel", "product:catalog:blank"] as const;
export async function productTrio(userId: string, o: { reverse?: boolean; homonyms?: boolean; domain?: "lab" | "music"; images?: boolean } = {}) {
  const pid = seedHoldout(userId, 0, "Fiches synthétiques");
  const p = loadProject(pid), music = o.domain === "music";
  const names = o.homonyms ? ["Diagnostic", "Diagnostic", "Diagnostic"] : music ? ["Cordes de violoncelle", "Étui de transport", "Accessoire non renseigné"] : ["Cartouche de filtration", "Support métallique", "Accessoire non renseigné"];
  saveProduct(pid, { ...p.product, name: names[0], category: music ? "Cordes frottées" : "Consommables de laboratoire", summary: music ? "Jeu de cordes en nickel." : "Cartouche en cellulose pour filtration.", price: { amount: 4900, currency: "EUR", status: "confirmed" }, facts: [{ key: "material", label: "Matière", value: music ? "nickel" : "cellulose", status: "confirmed", source: "user" }, { key: "size", label: music ? "Tension" : "Diamètre", value: music ? "Tension moyenne" : "47 mm", status: "confirmed", source: "user" }] });
  const photos: string[] = [];
  if (o.images !== false) for (const [i, color] of ["#a0522d", "#1e65b0", "#65964b"].entries()) {
    const data = await sharp({ create: { width: 700, height: 700, channels: 3, background: color } }).png().toBuffer();
    const a = await saveAsset({ projectId: pid, userId, data, mime: "image/png", name: `objet-${i}.png`, role: i === 0 ? "packshot" : "catalog-original", folderKey: i === 0 ? "product.packshots" : "product.catalog", origin: "upload", status: "approved", meta: {} });
    photos.push(a.id);
  }
  const items = [
    { key: "steel", name: names[1], category: music ? "Étuis" : "Supports", description: music ? "Étui indépendant pour instrument." : "Support indépendant pour le laboratoire.", features: music ? ["Coque en polypropylène", "Poids : 850 g"] : ["Matière : acier inoxydable", "Masse : 210 g"], price: 2100, compareAt: null, originalAssetId: photos[1] ?? null },
    { key: "blank", name: names[2], category: "", description: "", features: [], price: 900, compareAt: null, originalAssetId: photos[2] ?? null },
  ];
  saveCatalog(pid, o.reverse ? items.reverse() : items, "multi");
  const project = loadProject(pid);
  const identity = localBrand(project.product, "Boutique synthétique indépendante", { business: "products", services: project.services });
  saveBrand(pid, identity.brand); saveStrategy(pid, identity.strategy);
  const refreshed = loadProject(pid), copy = localCopy(refreshed.product, refreshed.brand!, refreshed);
  copy.product.tabs = [{ heading: "Entretien du principal", content_html: "<p>ENTRETIEN_EXCLUSIF_PRINCIPAL</p>" }];
  copy.features.items = [{ title: "Bénéfice du principal", text: "BENEFICE_EXCLUSIF_PRINCIPAL", icon: "check" }, { title: "Autre bénéfice principal", text: "DETAIL_EXCLUSIF_PRINCIPAL", icon: "check" }];
  copy.faq.items = [{ q: "Question du principal uniquement ?", a: "FAQ_EXCLUSIVE_PRINCIPAL" }];
  remember(pid, { kind: "artifact", key: "shop_copy", value: JSON.stringify(copy), source: "user", status: "confirmed" });
  return { pid, photos, primaryFacts: music ? ["nickel", "Tension moyenne"] : ["cellulose", "47 mm"], accessoryFacts: items.find((x) => x.key === "steel")!.features };
}
export const productMainHtml = (html: string) => html.match(/<main\b[^>]*\bid="MainContent"[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? "";
/** Lire aussi les paragraphes avec sauts de ligne, qui sont légitimes dans un champ CSV entre guillemets. */
export function csvRows(csv: string): string[][] {
  const rows: string[][] = []; let cells: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') { if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === "," || c === "\n")) { cells.push(cell); cell = ""; if (c === "\n") { rows.push(cells); cells = []; } }
    else cell += c;
  }
  cells.push(cell); rows.push(cells); return rows;
}
