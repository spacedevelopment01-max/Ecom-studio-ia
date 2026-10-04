/** Vérifie un thème compilé avec Theme Check (outil officiel de Shopify). */
import fs from "node:fs";
import path from "node:path";
import { check } from "@shopify/theme-check-node";
import { buildSpec } from "../src/lib/theme/directions";
import { localCopy } from "../src/lib/engine/local-copy";
import { emptyProduct } from "../src/lib/project-types";
import { compileTheme } from "../src/lib/theme/compile";
import { catalogSample } from "../tests/fixtures";
import { runWithLang } from "../src/lib/i18n-server";

// Usage : [LANG_THEME=en] theme-check.ts <dossier> <direction> [mono|multi|niche]
const language = process.env.LANG_THEME === "en" ? "en" : "fr";
const storeType = (process.argv[4] as "mono" | "multi" | "niche") || "mono";

const dir = process.argv[2] || "/tmp/es-theme-check";
const product = { ...emptyProduct(), name: "Sérum Éclat", sector: "beaute" as const, summary: "Sérum.", facts: [] };
const copy = runWithLang({ content: language }, () => localCopy(product, { name: "Maison Ondine", tagline: "Le soin, simplement.", story: "", values: [] }));
const spec = buildSpec({ direction: (process.argv[3] as any) || "atelier", shopName: "Maison Ondine", palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" }, copy, images: { hero: "es-hero.jpg", packshot: "es-packshot.jpg" }, files: {}, product: { title: "Sérum", handle: "serum", vendor: "M", description_html: "", price: 100, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] }, language, ...(storeType === "mono" ? {} : { storeType, ...catalogSample }) });
fs.rmSync(dir, { recursive: true, force: true });
for (const [p, c] of compileTheme(spec)) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), c); }
fs.writeFileSync(path.join(dir, "assets/es-hero.jpg"), ""); fs.writeFileSync(path.join(dir, "assets/es-packshot.jpg"), "");
const offenses = await check(dir);
const by = new Map<string, number>();
for (const o of offenses) {
  by.set(o.check, (by.get(o.check) ?? 0) + 1);
  console.log(`${o.severity === 0 ? "ERROR" : o.severity === 1 ? "WARN" : "INFO"} ${o.check} ${o.uri.replace(/.*es-theme-check\//, "")}:${o.start?.line ?? ""} ${o.message}`);
}
console.log("Total", offenses.length, Object.fromEntries(by));
process.exit(offenses.some((o) => o.severity === 0) ? 1 : 0);
