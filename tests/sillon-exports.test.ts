/**
 * Exports de SILLON V2 (PR #182) : Shopify reçoit les médias, les sections sv-*, la feuille et le script du thème et les
 * métadonnées SEO de la démonstration ; WordPress / WooCommerce et PrestaShop reçoivent les médias sans blocage.
 * Ce n'est pas une installation dans une vraie boutique : contenu des ZIP vérifié.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { demoProject } from "./demo-fixtures";
import { SILLON_MEDIA } from "./sillon-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const text = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");

describe("SILLON V2 : exports", async () => {
  const user = await createUser("sillon-exports@example.invalid", "isolated-test-only", "Exports SILLON");
  const demo = await fr(() => demoProject(user.id, "sillon"));
  const photos = SILLON_MEDIA.map((m) => m.file);

  it("Shopify : médias, sections sv-*, feuille et script du thème, SEO des pages et du produit", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of photos) expect(names, f).toContain(f);
    for (const t of ["sv-header", "sv-hero", "sv-product", "sv-cart", "sv-checkout", "sv-faq", "sv-footer"]) expect(names, t).toContain(`sections/${t}.liquid`);
    expect(names).toContain("assets/sillon.css");
    expect(names).toContain("assets/sillon.js");
    const all = names + text(z, /\.(json|csv|liquid)$/);
    expect(all).toContain("SILLON V2 — l'espresso qui prend l'air");
  });

  for (const platform of ["woocommerce", "prestashop"] as const) {
    it(`${platform} : médias exportés, aucun blocage`, async () => {
      const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      const names = Object.keys(unzipSync(new Uint8Array(exp.zip))).join("\n");
      for (const f of photos) expect(names, `${platform} ${f}`).toContain(f);
    });
  }
});
