/** Exécution PHP réelle du moteur exporté ; aucun CMS connecté ni requête fournisseur. */
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { phpAvailable } from "@/lib/cms-v2/checks";
import { cmsExport } from "@/lib/cms-v2/export";
import { phpLiquidSource } from "@/lib/cms-v2/liquid";
import { guardPurchaseExport } from "@/lib/theme/purchase-offers";
import { runWithLang } from "@/lib/i18n-server";
import { parity } from "../scripts/lib/cms-parity";
import { sampleSpec } from "./fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

const cases = [
  { name: "collection vide", source: "A{% for item in items %}{{ item }}{% else %}VIDE{% endfor %}Z", data: { items: [] }, expected: "AVIDEZ" },
  { name: "collection remplie", source: "A{% for item in items %}[{{ item }}]{% else %}VIDE{% endfor %}Z", data: { items: ["A", "B"] }, expected: "A[A][B]Z" },
  { name: "corps sans sortie", source: "{% for item in items %}{% assign hidden = item %}{% else %}VIDE{% endfor %}FIN", data: { items: ["A"] }, expected: "FIN" },
  { name: "offset au-delà du dernier article", source: "{% for item in items offset: 4 %}{{ item }}{% else %}VIDE{% endfor %}", data: { items: ["A"] }, expected: "VIDE" },
  { name: "conditions et boucles imbriquées", source: "{% for row in rows %}{% if row.show %}{% for item in row.items %}{{ item }}{% else %}vide{% endfor %}{% else %}masqué{% endif %};{% else %}aucune ligne{% endfor %}FIN", data: { rows: [{ show: true, items: [] }, { show: true, items: ["B"] }, { show: false, items: [] }] }, expected: "vide;B;masqué;FIN" },
  { name: "intervalle numérique", source: "{% for n in (1..2) %}{{ n }}{% else %}VIDE{% endfor %}", data: {}, expected: "12" },
  { name: "arrêt de boucle", source: "{% for item in items %}{{ item }}{% break %}{% else %}VIDE{% endfor %}FIN", data: { items: ["A", "B"] }, expected: "AFIN" },
];

describe("Lot 2A — moteur PHP exporté", () => {
  it.skipIf(!phpAvailable()).each(cases)("for/else : $name", async ({ source, data, expected }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lot2a-php-export-"));
    try {
      const exp = await cmsExport("woocommerce", sampleSpec("vitrine"), () => null);
      const files = unzipSync(exp.zip);
      const runtime = Object.keys(files).find((p) => p.endsWith("/inc/php/es-liquid.php"))!;
      const root = runtime.slice(0, -"es-liquid.php".length);
      for (const [file, content] of Object.entries(files)) if (file.startsWith(root)) {
        const dest = path.join(dir, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, content);
      }
      fs.mkdirSync(path.join(dir, "sections"));
      fs.mkdirSync(path.join(dir, "snippets"));
      fs.writeFileSync(path.join(dir, "sections/test.liquid"), phpLiquidSource(source));
      const code = 'require $argv[1]; echo es_liquid_render_section($argv[2], "test", [], json_decode(stream_get_contents(STDIN), true));';
      let out: string;
      try { out = execFileSync("php", ["-r", code, path.join(dir, runtime), dir], { input: JSON.stringify(data) }).toString(); }
      catch (error) { throw new Error((error as { stdout?: Buffer }).stdout?.toString() || String(error)); }
      expect(out).toBe(expected);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it("signale les grilles Liquid dont le catalogue WooCommerce doit être remplacé par un bloc natif", async () => {
    for (const type of ["featured-collection", "ref-offers"]) {
      const spec = sampleSpec("vitrine");
      spec.templates.index = { order: ["catalog"], sections: { catalog: { type, settings: { heading: "Instruments et accessoires", layout: "shop" } } } };
      const exp = await cmsExport("woocommerce", spec, () => null);
      expect(exp.issues.some((i) => i.code === "catalog_collection_requires_native_block")).toBe(true);
      const file = Object.entries(unzipSync(exp.zip)).find(([p]) => p.endsWith("/templates/front-page.html"))!;
      expect(strFromU8(file[1])).toContain("Instruments et accessoires");
    }
  });

  it.skipIf(!phpAvailable())("rend réellement les sections éditoriales des deux références (catalogue commercial distinct)", async () => {
    for (const kind of ["products", "services"]) {
      const source = JSON.parse(fs.readFileSync(`reports/lot2a/passe-2/${kind}/theme-spec.json`, "utf8")) as ThemeSpec;
      const { spec } = guardPurchaseExport(source, "woocommerce");
      const results = await runWithLang({ content: "fr", ui: "fr" }, () => parity(spec));
      // La grille commerciale nécessite explicitement le bloc Woo natif : ce n'est pas une parité certifiée.
      const editorial = results.filter((r) => r.type !== "featured-collection");
      expect(editorial.length).toBeGreaterThan(8);
      expect(editorial.filter((r) => !r.same).map((r) => `${r.where}:${r.type}`)).toEqual([]);
      if (kind === "services") expect(results.some((r) => r.type === "ref-narrative")).toBe(true);
    }
  }, 180_000);
});
