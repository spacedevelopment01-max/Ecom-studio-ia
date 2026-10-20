/**
 * Exports de SILLON (issue #148) : Shopify, WordPress / WooCommerce et PrestaShop reçoivent les médias, les feuilles
 * (profil « nomade » compris), les scripts des interactions, les sections et les métadonnées SEO de la démonstration.
 * Correctif lié : dans WordPress et PrestaShop, les profils graphiques (FRAISE, ONDE, SILLON, ORBE, Atelier Rive) visent
 * des classes du <body> — ces plateformes ne posent pas les attributs `data-conversion` / `data-editorial` de Shopify.
 * Ce n'est pas une installation dans une vraie boutique : contenu des ZIP vérifié, rendu interactif testé par
 * scripts/family-export-check.ts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { libraryLoader } from "@/lib/theme/loader";
import { cmsExport } from "@/lib/cms-v2/export";
import { designLayer, exportStylesheet } from "@/lib/cms-v2/design";
import { demoProject } from "./demo-fixtures";
import { SILLON_MEDIA } from "./sillon-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const text = (z: Record<string, Uint8Array>, re: RegExp) => Object.entries(z).filter(([k]) => re.test(k)).map(([, v]) => strFromU8(v)).join("\n");

describe("SILLON : exports", async () => {
  const user = await createUser("sillon-exports@example.invalid", "isolated-test-only", "Exports SILLON");
  const demo = await fr(() => demoProject(user.id, "sillon"));
  const photos = SILLON_MEDIA.filter((m) => m.role !== "logo").map((m) => m.file);

  it("profils graphiques : sélecteurs réécrits en classes du <body>, même spécificité", () => {
    expect(exportStylesheet(':is(body[data-conversion="pop"],body[data-conversion="nomade"]) .a{} body[data-editorial="object"] .b{} body[data-editorial] .c{} [data-editorial="none"] .d{}'))
      .toBe(":is(body.es-conversion-pop,body.es-conversion-nomade) .a{} body.es-editorial-object .b{} body[class] .c{} .es-editorial-none .d{}");
  });

  it("couche de design : classes du profil « nomade » sur le <body>, scripts des interactions", async () => {
    const d = await fr(() => designLayer(demo.spec));
    expect(d.body.classes).toEqual(expect.arrayContaining(["es-conversion-nomade", "es-editorial-none", "dir-sillon"]));
    for (const s of ["conversion.js", "family.js"]) expect(d.scripts).toContain(s);
    expect(d.stylesheets).toContain("conversion.css");
  });

  it("Shopify : médias, sections, réglages du profil et SEO des pages et du produit", async () => {
    const exp = await fr(() => cmsExport("shopify", demo.spec, libraryLoader, { projectId: demo.pid }));
    const z = unzipSync(new Uint8Array(exp.zip));
    const names = Object.keys(z).join("\n");
    for (const f of photos) expect(names, f).toContain(f);
    const json = text(z, /\.json$/);
    expect(json).toMatch(/"conversion_profile":\s*"nomade"/);
    for (const t of ["cv-hero", "cv-hotspots", "cv-gallery", "featured-purchase", "cv-specs", "cv-steps", "cv-alternating", "fs-commitments"]) expect(names + json, t).toContain(t);
    const all = names + json + text(z, /\.(csv|liquid)$/);
    expect(all).toContain("Machine à café portable : bureau, voyage, plein air | SILLON");
    expect(all).toContain("Machine à espresso portable SILLON : vues, détails, rituel");
    expect(text(z, /conversion\.css$/)).toContain('body[data-conversion="nomade"]');
  });

  for (const platform of ["woocommerce", "prestashop"] as const) {
    it(`${platform} : médias, feuilles réécrites, scripts, sections et classes du profil`, async () => {
      const exp = await fr(() => cmsExport(platform, demo.spec, libraryLoader, { projectId: demo.pid }));
      expect(exp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
      const z = unzipSync(new Uint8Array(exp.zip));
      const names = Object.keys(z).join("\n");
      for (const f of photos) expect(names, `${platform} ${f}`).toContain(f);
      const css = text(z, /\.css$/);
      expect(css).toContain("body.es-conversion-nomade");
      expect(css).not.toContain("body[data-conversion=");
      const js = text(z, platform === "woocommerce" ? /assets\/js\/theme\.js$/ : /assets\/js\/es-theme\.js$/);
      expect(js).toContain("Profil « conversion »");
      expect(js).toContain("Sections de bibliothèque par famille");
      const all = names + text(z, /\.(json|php|tpl|html|txt|csv|xml)$/);
      expect(all).toContain("es-conversion-nomade");
      for (const t of ["cv-hotspots", "cv-gallery", "cv-specs"]) expect(all, `${platform} ${t}`).toContain(t);
    });
  }
});
