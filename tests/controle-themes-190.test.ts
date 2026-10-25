/**
 * Mission #190, point 3 — défauts trouvés par le contrôle des liens des démonstrations (scripts/crawl-demos-190.ts) :
 * APLAT, page « Enduits et préparation » : les liens d'étapes (#observer, #reprendre…) visent la carte de l'étape
 * correspondante (identifiant tiré de sa catégorie), sans identifiant en double pour les cartes réservées au téléphone.
 * Panier (page) sur téléphone : trois colonnes au plus, le lien « Supprimer » passe sous la ligne (HEUREN débordait de
 * 9 px, lien coupé ; vérifié à 390 et 360 px sur la démonstration).
 * Export WordPress : le script propre au thème appelé par une section (phase.js, *-core.js des réservations) existe à
 * l'adresse attendue (sinon la page 404 était lue comme du JavaScript : « Unexpected token '<' » à l'installation).
 * Exports WordPress et PrestaShop : la feuille de style propre au thème qu'une section appelle (sillon.css, phase.css,
 * table-saison.css, atelier-nuance.css, parenthese.css) est livrée et chargée : sans elle, ces cinq thèmes s'affichaient
 * sans mise en forme une fois installés (constaté sur les boutiques de test, mission #190).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { sampleSpec, serviceSpec } from "./fixtures";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { runWithLang } from "@/lib/i18n-server";
import { unzipSync, strFromU8 } from "fflate";
import { cmsExport } from "@/lib/cms-v2/export";
import { libraryLoader } from "@/lib/theme/loader";

const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);

describe("contrôle des liens des thèmes (mission #190)", () => {
  it("APLAT : chaque lien d'étape mène à sa carte ; une carte réservée au téléphone ne double pas l'identifiant", async () => {
    const spec = fr(() => serviceSpec("aplat" as never));
    const item = (n: string, link: string) => ({ type: "item", settings: { number: n, title: n, text: "", link } });
    const card = (category: string, show_on = "all") => ({ type: "card", settings: { title: `Étape ${category}`, text: "Texte", category, show_on } });
    const blocks = (list: { type: string; settings: Record<string, unknown> }[]) => Object.fromEntries(list.map((b, i) => [`b${i}`, b]));
    // Sections posées comme dans la démonstration (tests/aplat-fixtures.ts), ancres comprises.
    const r = { spec: structuredClone(spec) };
    r.spec.templates.index.sections.strip = { type: "ap-strip", settings: { style: "steps" }, blocks: blocks([item("01", "#observer"), item("02", "#reprendre")]), block_order: ["b0", "b1"] };
    r.spec.templates.index.sections.cards = { type: "ap-cards", settings: { layout: "alternate" }, blocks: blocks([card("observer"), card("reprendre"), card("observer", "mobile")]), block_order: ["b0", "b1", "b2"] };
    r.spec.templates.index.order = ["strip", "cards", ...r.spec.templates.index.order];
    const html = (await fr(() => renderPage({ spec: r.spec, base: "", files: compileTheme(r.spec), cart: [] }, "/", new URLSearchParams()))).html;
    for (const id of ["observer", "reprendre"]) {
      expect(html).toContain(`href="#${id}"`);
      expect(html.match(new RegExp(`id="${id}"`, "g"))?.length, id).toBe(1);
    }
  });

  it("panier sur téléphone : la ligne d'article tient dans l'écran (lien « Supprimer » sous la ligne)", () => {
    const css = fs.readFileSync("theme-base/assets/theme.css", "utf8");
    const rule = css.match(/@media \(max-width: 749px\) \{ \.es-line-items--page \.es-line-item \{ grid-template-columns: ([^;]+);[^\n]*\.es-line-item__remove[^\n]*grid-column: 2 \/ -1/);
    expect(rule?.[1]).toBe("84px minmax(0, 1fr) auto");
  });

  it("export WordPress : chaque script appelé par une section existe à son adresse, sans double exécution", async () => {
    for (const id of ["phase", "table-saison"]) {
      const spec = fr(() => serviceSpec(id as never));
      const exp = await fr(() => cmsExport("woocommerce", spec, libraryLoader));
      const files = unzipSync(new Uint8Array(exp.zip));
      const root = Object.keys(files)[0].split("/")[0];
      const theme = strFromU8(files[`${root}/assets/js/theme.js`]);
      const called = [...new Set(Object.values(spec.groups.header.sections).flatMap((sec) => fs.existsSync(`theme-base/sections/${sec.type}.liquid`) ? [...fs.readFileSync(`theme-base/sections/${sec.type}.liquid`, "utf8").matchAll(/'([a-z0-9-]+\.js)' \| asset_url/g)].map((m) => m[1]) : []))];
      expect(called.length, id).toBeGreaterThan(0);
      for (const name of called) {
        const stub = files[`${root}/assets/es/${name}`];
        expect(stub, `${id} ${name}`).toBeDefined();
        expect(strFromU8(stub)).toMatch(/inclus dans assets\/js\/theme\.js/);
        expect(theme.length, `${id} ${name}`).toBeGreaterThan(fs.readFileSync(`theme-base/assets/${name}`, "utf8").length);
      }
    }
  }, 120_000);

  it("exports WordPress et PrestaShop : la feuille propre au thème appelée par une section est livrée et chargée", async () => {
    const cases: [string, "services" | "products", string][] = [["phase", "services", "phase.css"], ["table-saison", "services", "table-saison.css"], ["atelier-nuance", "services", "atelier-nuance.css"], ["parenthese", "services", "parenthese.css"], ["sillon", "products", "sillon.css"]];
    for (const [id, kind, sheet] of cases) {
      const spec = fr(() => (kind === "services" ? serviceSpec(id as never) : sampleSpec(id as never)));
      const usesSheet = Object.values(spec.groups.header.sections).some((sec) => fs.existsSync(`theme-base/sections/${sec.type}.liquid`) && fs.readFileSync(`theme-base/sections/${sec.type}.liquid`, "utf8").includes(`'${sheet}' | asset_url`));
      if (!usesSheet) continue;
      const wp = unzipSync(new Uint8Array((await fr(() => cmsExport("woocommerce", spec, libraryLoader))).zip));
      const root = Object.keys(wp)[0].split("/")[0];
      expect(wp[`${root}/assets/css/${sheet}`], `${id} WordPress`).toBeDefined();
      expect(strFromU8(wp[`${root}/assets/css/${sheet}`]).length, id).toBeGreaterThan(1000);
      expect(wp[`${root}/assets/es/${sheet}`], `${id} WordPress (adresse appelée par la section)`).toBeDefined();
      const ps = unzipSync(new Uint8Array((await fr(() => cmsExport("prestashop", spec, libraryLoader))).zip));
      expect(ps[`assets/css/es-${sheet}`], `${id} PrestaShop`).toBeDefined();
      expect(strFromU8(ps["config/theme.yml"])).toContain(`assets/css/es-${sheet}`);
      expect(ps[`assets/es/${sheet}`], `${id} PrestaShop (adresse appelée par la section)`).toBeDefined();
    }
  }, 300_000);
});
