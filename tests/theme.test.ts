import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { compileTheme, themeFingerprint, exportThemeZip } from "@/lib/theme/compile";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { DIRECTIONS } from "@/lib/theme/directions";
import { sampleSpec } from "./fixtures";
import { shopifyProductsCsv } from "@/lib/theme/catalog-export";

describe("thème Shopify", () => {
  it("chaque direction produit un thème OS 2.0 complet et valide", () => {
    for (const d of DIRECTIONS) {
      const spec = sampleSpec(d.id);
      expect(validateSpec(spec)).toEqual([]);
      const files = compileTheme(spec);
      for (const f of ["layout/theme.liquid", "config/settings_schema.json", "config/settings_data.json", "templates/index.json", "templates/product.json", "templates/collection.json", "templates/cart.json", "templates/search.json", "templates/404.json", "sections/header-group.json", "sections/footer-group.json", "locales/fr.default.json"]) {
        expect(files.has(f), `${d.id}: ${f}`).toBe(true);
      }
      JSON.parse((files.get("templates/index.json") as string).replace(/^\/\*[\s\S]*?\*\//, ""));
    }
  });

  it("l'aperçu, la version enregistrée et le ZIP exporté sont identiques", async () => {
    const spec = sampleSpec();
    const files = compileTheme(spec);
    const zip = unzipSync(new Uint8Array((await exportThemeZip(spec, () => null)).zip));
    for (const [name, content] of files) {
      if (typeof content !== "string") continue;
      expect(strFromU8(zip[name]), name).toBe(content);
    }
    expect(themeFingerprint(spec)).toBe(themeFingerprint(structuredClone(spec)));
  });

  it("rend toutes les pages publiques avec un vrai prix", async () => {
    const spec = sampleSpec();
    const files = compileTheme(spec);
    for (const path of ["/", "/products/serum-eclat", "/collections/all", "/cart", "/search", "/pages/faq", "/nope"]) {
      const r = await renderPage({ spec, base: "/p", files, cart: [{ variantId: 1001, quantity: 1 }] }, path, new URLSearchParams("q=sérum"));
      expect(r.html.length, path).toBeGreaterThan(1000);
      if (path === "/nope") expect(r.status).toBe(404);
    }
    const product = await renderPage({ spec, base: "/p", files, cart: [] }, "/products/serum-eclat", new URLSearchParams());
    expect(product.html).toContain("34,90");
  });

  it("boutiques multi-produit et niche : grille, collections, fiches, panier et exports", async () => {
    for (const type of ["multi", "niche"] as const) {
      for (const d of DIRECTIONS) {
        const spec = sampleSpec(d.id, type);
        expect(validateSpec(spec), `${d.id}/${type}`).toEqual([]);
        const types = spec.templates.index.order.map((id) => spec.templates.index.sections[id].type);
        expect(types, `${d.id}/${type}`).toContain("featured-collection");
        expect(types, `${d.id}/${type}`).toContain("collection-list");
      }
      const spec = sampleSpec("atelier", type);
      const files = compileTheme(spec);
      const home = await renderPage({ spec, base: "/p", files, cart: [] }, "/", new URLSearchParams());
      for (const t of ["Sérum Éclat", "Brosse nettoyante", "Rouleau de jade", "/p/collections/soin-du-visage"]) expect(home.html, `${type} accueil : ${t}`).toContain(t);
      const coll = await renderPage({ spec, base: "/p", files, cart: [] }, "/collections/outils", new URLSearchParams());
      expect(coll.status).toBe(200);
      expect(coll.html).toContain("Rouleau de jade");
      expect(coll.html).not.toContain("Brosse nettoyante</");
      const second = await renderPage({ spec, base: "/p", files, cart: [] }, "/products/rouleau-de-jade", new URLSearchParams());
      expect(second.status).toBe(200);
      expect(second.html).toContain("Quartz rose");
      expect(second.html).toContain("19,90");
      // Les textes rédigés pour le produit principal ne débordent pas sur les autres fiches.
      const short = (await renderPage({ spec, base: "/p", files, cart: [] }, "/products/serum-eclat", new URLSearchParams())).html.match(/es-product__text[^>]*>([\s\S]{0,80})/)?.[1];
      if (short) expect(second.html).not.toContain(short);
      // Panier mixte : une variante du produit principal et une du troisième produit.
      const cart = await renderPage({ spec, base: "/p", files, cart: [{ variantId: 1000, quantity: 1 }, { variantId: 3001, quantity: 2 }] }, "/cart", new URLSearchParams());
      expect(cart.html).toContain("Rouleau de jade - Quartz rose");
      expect(cart.html).toContain("78,70");
      expect((await renderPage({ spec, base: "/p", files, cart: [] }, "/collections/inconnue", new URLSearchParams())).status).toBe(404);
      const csv = shopifyProductsCsv(spec);
      expect(csv.split("\n").filter((l) => /^"(serum-eclat|brosse-nettoyante|rouleau-de-jade)",/.test(l)).length).toBeGreaterThanOrEqual(5);
      expect(csv).toContain("Soin du visage");
    }
  });

  it("une modification ciblée ne touche pas le reste et respecte les verrous", () => {
    const spec = sampleSpec();
    const index = spec.templates.index;
    const [first, second] = index.order;
    const locked = applyOps(spec, [{ op: "lock", template: "index", section: second, locked: true }]).spec;
    const before = JSON.stringify(locked.templates.index.sections[first]);
    const res = applyOps(locked, [
      { op: "remove_section", template: "index", section: second },
      { op: "set_global", key: "button_radius", value: 4 } as any,
    ]);
    expect(res.rejected.some((r) => r.op.op === "remove_section")).toBe(true);
    expect(res.spec.templates.index.sections[second]).toBeDefined();
    expect(JSON.stringify(res.spec.templates.index.sections[first])).toBe(before);
  });
});

describe("icônes", () => {
  it("la branche par défaut est la dernière (sinon les icônes suivantes s'empilent)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("theme-base/snippets/icon.liquid", "utf8");
    const lastWhen = src.lastIndexOf("{%- when");
    const elseAt = src.indexOf("{%- else");
    expect(elseAt).toBeGreaterThan(lastWhen);
  });
});
