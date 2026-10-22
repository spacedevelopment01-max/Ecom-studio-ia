/**
 * Exports WordPress / WooCommerce et PrestaShop des sections de bibliothèque (issue #145) :
 *  - le script du thème exporté reprend TOUS les scripts de la mise en page Shopify (dont family.js : carrousels,
 *    repères, avant / après ; conversion.js : carrousels d'avis, stories), dans le même ordre ;
 *  - les scripts {% javascript %} des sections utilisées (onglets, tableau comparatif…) y sont ajoutés, et retirés des
 *    gabarits donnés au moteur PHP (balise inconnue : la section entière tombait en erreur dans WordPress) ;
 *  - « Sélection de produits » devient la grille de produits native de WooCommerce, avec les mêmes produits.
 * Les interactions elles-mêmes sont testées dans Chromium par scripts/family-export-check.ts.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR; if (!root) throw new Error("Tests isolés obligatoires");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/exports-familles-`), shared = globalThis as { __ecomDb?: { close(): void } }, previousDb = shared.__ecomDb; delete shared.__ecomDb; vi.stubEnv("DATA_DIR", dir); return { dir, previousDb };
});
afterAll(() => { const shared = globalThis as { __ecomDb?: { close(): void } }; if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close(); if (session.previousDb) shared.__ecomDb = session.previousDb; else delete shared.__ecomDb; vi.unstubAllEnvs(); });
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { applyOps } from "@/lib/theme/ops";
import { compileTheme } from "@/lib/theme/compile";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer } from "@/lib/cms-v2/design";
import { phpAvailable } from "@/lib/cms-v2/checks";
import { liquidGlobals, normalizedSection, phpLiquidSource, phpTemplates, sectionSchemaOf } from "@/lib/cms-v2/liquid";
import type { ThemeSpec } from "@/lib/theme/spec";
import { demoProject } from "./demo-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const FAMILY_JS = "Sections de bibliothèque par famille";
const CONVERSION_JS = "Profil « conversion »";

describe("exports CMS des sections de bibliothèque", async () => {
  const user = await createUser("exports-familles@example.invalid", "isolated-test-only", "Exports");
  const demo = await fr(() => demoProject(user.id, "fraise"));
  const add = (spec: ThemeSpec, type: string, settings: Record<string, unknown> = {}, blocks: { type: string; settings: Record<string, unknown> }[] = []) => {
    const r = applyOps(spec, [{ op: "add_section", template: "index", type, settings, blocks } as never], { targeted: new Set(), storeKind: "specialty" });
    expect(r.applied.length, `${type} : ${r.rejected.map((x) => x.reason).join(" ; ")}`).toBe(1);
    return r.spec;
  };
  let spec = add(demo.spec, "comparison-table", { layout: "table" });
  spec = add(spec, "content-tabs");
  spec = add(spec, "fs-products", { layout: "carousel", source: "manual" }, [{ type: "product", settings: { product: spec.store.product.handle } }]);

  it("mise en page : les scripts du thème sont lus dans le rendu, dans l'ordre de Shopify", async () => {
    const d = await fr(() => designLayer(spec));
    expect(d.scripts[0]).toBe("theme.js");
    for (const name of ["reference-interactions.js", "purchase-offers.js", "editorial.js", "conversion.js", "family.js"]) expect(d.scripts, name).toContain(name);
    expect(d.scripts.indexOf("family.js")).toBeGreaterThan(d.scripts.indexOf("conversion.js"));
  });

  it("WordPress et PrestaShop : family.js, conversion.js et les scripts de section sont dans le script exporté", async () => {
    for (const [platform, js] of [["woocommerce", "assets/js/theme.js"], ["prestashop", "assets/js/es-theme.js"]] as const) {
      const exp = await fr(() => cmsExport(platform, spec, libraryLoader, { projectId: demo.pid }));
      const z = unzipSync(new Uint8Array(exp.zip));
      const prefix = platform === "woocommerce" ? `${Object.keys(z)[0].split("/")[0]}/` : "";
      const bundle = strFromU8(z[prefix + js]);
      expect(bundle, platform).toContain(FAMILY_JS);
      expect(bundle, platform).toContain(CONVERSION_JS);
      expect(bundle, platform).toContain("/* section comparison-table */");
      expect(bundle, platform).toContain("/* section content-tabs */");
      expect(bundle, platform).not.toMatch(/\{%-?\s*(end)?javascript/);
    }
  }, 180_000);

  it("WooCommerce : « Sélection de produits » devient la grille native avec les mêmes produits", async () => {
    const exp = await fr(() => cmsExport("woocommerce", spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const root = Object.keys(z)[0].split("/")[0];
    const front = strFromU8(z[`${root}/templates/front-page.html`]);
    const block = front.split("\n").find((l) => l.includes("wp:es/catalog") && l.includes("fs-products"));
    expect(block).toBeTruthy();
    expect(block).toContain(spec.store.product.handle);
    expect(front).not.toMatch(/"type":"fs-products"/);
    expect(strFromU8(z[`${root}/inc/es-woo.php`])).toContain("$s['handles']");
  }, 120_000);

  it("moteur PHP : un gabarit avec {% javascript %} se rend sans erreur (balise retirée)", () => {
    const files = compileTheme(spec);
    const src = phpLiquidSource(files.get("sections/comparison-table.liquid")!);
    expect(src).not.toMatch(/\{%-?\s*javascript/);
    if (!phpAvailable()) return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "es-php-js-"));
    try {
      for (const [p, s] of phpTemplates(files, ["comparison-table", "content-tabs"])) { fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true }); fs.writeFileSync(path.join(dir, p), s); }
      fs.mkdirSync(path.join(dir, "snippets"), { recursive: true });
      const order = spec.templates.index.order.filter((id) => ["comparison-table", "content-tabs"].includes(spec.templates.index.sections[id].type));
      const sections = order.map((id) => { const s = spec.templates.index.sections[id]; return { type: s.type, section: normalizedSection(id, s, sectionSchemaOf(files.get(`sections/${s.type}.liquid`) ?? "")) }; });
      const globals = liquidGlobals({ files, settings: spec.settings, shopName: spec.store.shopName, menus: spec.store.menus, url: (p: string) => p, pageType: "index", policies: spec.store.policies });
      const out = execFileSync("php", [path.resolve("assets/cms/php/render-cli.php")], { input: JSON.stringify({ dir, assetBase: "/assets/", strings: {}, globals, sections }), maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
      expect(out).toContain("data-ctable");
      expect(out).toContain("data-ctabs");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
