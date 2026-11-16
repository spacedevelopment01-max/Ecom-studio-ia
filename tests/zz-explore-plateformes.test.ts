import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { tenueSection } from "@/lib/syna-agent/custom-theme/tenue";
process.env.STUDIO_SYNA_AGENT = "1";
describe("explore", () => {
  it("export", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { cmsExport } = await import("@/lib/cms-v2/export");
    const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/[\w.-]+/g, "/api/files/a1") });
    const t = { version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, pages: [{ key: "home", label: "Accueil", sections: [sec("tn-atouts", "at"), sec("tn-appel-produit", "ap")] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy", "vente-directe"), sec("tn-versions", "v1"), sec("tn-lots", "l1"), sec("tn-garantie", "g1")] }] } as any;
    const out = customThemeSpec(t, { name: "Essai", business: "products", products: [{ handle: "tee", title: "Tee", categories: [] }], company: { shipping: "48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, dropMissing: true, base: null } as any);
    console.log("PROBLEMS", out.problems);
    const spec = out.spec;
    spec.store.product = { title: "Tee", handle: "tee", vendor: "Essai", description_html: "<p>Un tee.</p>", price: 2900, compare_at_price: null, currency: "EUR", options: ["Couleur", "Taille"], variants: ["Noir", "Sable"].flatMap((c) => ["S", "M", "L"].map((s, i) => ({ title: `${c} / ${s}`, options: [c, s], price: 2900, available: true, inventory_quantity: 4 + i, sku: `TEE-${c}-${s}`.toUpperCase() }))), images: [], tags: [] } as any;
    const dir = process.env.EXPLORE_OUT!;
    for (const pf of ["woocommerce", "prestashop"] as const) {
      const exp = await cmsExport(pf, spec, async () => null);
      console.log(pf, "ISSUES", exp.issues, "SECTIONS", exp.sections);
      const z = unzipSync(new Uint8Array(exp.zip));
      for (const [k, v] of Object.entries(z)) { const f = path.join(dir, pf, k); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, v); }
    }
    fs.writeFileSync(path.join(dir, "custom-sections.json"), JSON.stringify(spec.customSections, null, 1));
    expect(1).toBe(1);
  });
});
