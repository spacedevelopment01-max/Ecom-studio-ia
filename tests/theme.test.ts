import { describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { compileTheme, themeFingerprint, exportThemeZip } from "@/lib/theme/compile";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { DIRECTIONS } from "@/lib/theme/directions";
import { sampleSpec } from "./fixtures";

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
      const r = await renderPage({ spec, base: "/p", files, cart: [{ variantIndex: 1, quantity: 1 }] }, path, new URLSearchParams("q=sérum"));
      expect(r.html.length, path).toBeGreaterThan(1000);
      if (path === "/nope") expect(r.status).toBe(404);
    }
    const product = await renderPage({ spec, base: "/p", files, cart: [] }, "/products/serum-eclat", new URLSearchParams());
    expect(product.html).toContain("34,90");
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
