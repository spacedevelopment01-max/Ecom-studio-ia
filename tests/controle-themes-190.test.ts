/**
 * Mission #190, point 3 — défauts trouvés par le contrôle des liens des démonstrations (scripts/crawl-demos-190.ts) :
 * APLAT, page « Enduits et préparation » : les liens d'étapes (#observer, #reprendre…) visent la carte de l'étape
 * correspondante (identifiant tiré de sa catégorie), sans identifiant en double pour les cartes réservées au téléphone.
 * MAISON & HORIZON (formulaires) : les cases cachées des choix restent dans leur libellé (PrestaShop élargit les champs :
 * la page « Créer une alerte » dépassait de 444 px).
 * Aperçu du studio : les liens d'un texte riche gardé dans un attribut (ONDE, étapes de la commande) suivent l'adresse de
 * l'aperçu comme les autres liens.
 * ONDE, page « Aide » : les anneaux décoratifs de l'ouverture restent dans l'écran (138 px de trop au téléphone).
 * Panier (page) sur téléphone : trois colonnes au plus, le lien « Supprimer » passe sous la ligne (HEUREN débordait de
 * 9 px, lien coupé ; vérifié à 390 et 360 px sur la démonstration).
 * Export WordPress : le script propre au thème appelé par une section (phase.js, *-core.js des réservations) existe à
 * l'adresse attendue (sinon la page 404 était lue comme du JavaScript : « Unexpected token '<' » à l'installation).
 * Exports WordPress et PrestaShop : la feuille de style propre au thème qu'une section appelle (sillon.css, phase.css,
 * table-saison.css, atelier-nuance.css, parenthese.css) est livrée et chargée : sans elle, ces cinq thèmes s'affichaient
 * sans mise en forme une fois installés (constaté sur les boutiques de test, mission #190).
 * Export WordPress : le filtrage des réglages (wp_kses_post) ne double plus l'esperluette (« Coupe &amp; brushing »).
 * Export WordPress : la langue de la page est celle du site exporté, pas celle de l'administration de WordPress.
 * Moteur PHP de l'export WordPress : les réglages « police » sont des objets (famille, graisse) ; PHASE perdait sa police
 * de texte (variable CSS vide) et son pied de page dépassait l'écran du téléphone.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { sampleSpec, serviceSpec } from "./fixtures";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage, rewriteLinks } from "@/lib/theme/render";
import { runWithLang } from "@/lib/i18n-server";
import { unzipSync, strFromU8 } from "fflate";
import { cmsExport } from "@/lib/cms-v2/export";
import { phpAvailable } from "@/lib/cms-v2/checks";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
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

  it("MAISON & HORIZON : case cachée d'un choix posée dans son libellé", () => {
    const css = fs.readFileSync("theme-base/assets/horizon.css", "utf8");
    for (const c of ["re-seg", "re-pill"]) expect(css, c).toContain(`.${c} input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; pointer-events: none; }`);
  });

  it("ONDE : la page « Aide » coupe ses anneaux décoratifs au bord de l'écran", () => {
    expect(fs.readFileSync("theme-base/assets/onde.css", "utf8")).toContain('body[data-conversion="onde"] .on-faq--page{overflow-x:clip}');
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

  it.skipIf(!phpAvailable())("export WordPress : la police du thème est rendue par le moteur PHP (PHASE)", async () => {
    const spec = fr(() => serviceSpec("phase" as never));
    const files = unzipSync(new Uint8Array((await fr(() => cmsExport("woocommerce", spec, libraryLoader))).zip));
    const runtime = Object.keys(files).find((p) => p.endsWith("/inc/php/es-liquid.php"))!;
    const root = runtime.slice(0, -"php/es-liquid.php".length);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "controle-190-"));
    try {
      for (const [file, content] of Object.entries(files)) if (file.startsWith(root)) { const dest = path.join(dir, file.slice(root.length)); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, content); }
      const site = JSON.parse(strFromU8(files[`${root}site.json`]));
      expect(site.settings.type_body_font).toMatchObject({ family: expect.stringContaining("Inter"), weight: 400 });
      const code = 'require $argv[1]; echo es_liquid_render_section($argv[2], "ph-header", ["settings" => []], ["settings" => json_decode(stream_get_contents(STDIN), true)]);';
      const out = execFileSync("php", ["-r", code, path.join(dir, "php/es-liquid.php"), dir], { input: JSON.stringify(site.settings) }).toString();
      expect(out).toMatch(/--ph-body: "Inter", "Inter", sans-serif;/);
      expect(out.slice(0, out.indexOf("body.dir-phase"))).not.toMatch(/inter_n\d|Array/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }, 120_000);

  it.skipIf(!phpAvailable())("export WordPress : « & » d'un réglage n'est pas doublé par le filtrage de sécurité", () => {
    const src = fs.readFileSync("assets/cms/wordpress/es-theme.php", "utf8");
    const fn = src.slice(src.indexOf("function es_clean"), src.indexOf("function es_with_defaults"));
    // Filtrage de WordPress simulé : même normalisation de l'esperluette, balises interdites retirées.
    const code = `function wp_kses_post($s) { $s = preg_replace('/<script[^>]*>.*?<\\/script>/is', '', $s); return preg_replace('/&(?![a-z]+;|#\\d+;)/i', '&amp;', $s); } ${fn.replace(/^/, "")} echo json_encode([es_clean("Coupe & brushing"), es_clean("&lt;b&gt; <script>alert(1)</script>ok")]);`;
    const out = JSON.parse(execFileSync("php", ["-r", code]).toString());
    expect(out).toEqual(["Coupe & brushing", "&lt;b&gt; ok"]);
  });

  it.skipIf(!phpAvailable())("export WordPress : la langue de la page est celle du site exporté", () => {
    const src = fs.readFileSync("assets/cms/wordpress/es-theme.php", "utf8");
    const start = src.indexOf("add_filter('language_attributes', function ($out) {");
    const body = src.slice(start + "add_filter('language_attributes', ".length, src.indexOf("});", start) + 1);
    for (const [lang, expected] of [["fr", 'lang="fr-FR"'], ["en", 'lang="en"']]) {
      const code = `function es_site() { return ["lang" => "${lang}", "body" => ["ds" => "none"]]; } function esc_attr($s) { return $s; } $f = ${body}; echo $f('lang="en-US"');`;
      expect(execFileSync("php", ["-r", code]).toString(), lang).toContain(expected);
    }
  });

  it("aperçu : liens d'un texte riche gardé dans un attribut réécrits comme les autres", () => {
    const html = `<a href="/pages/faq">FAQ</a><p data-texts="Voir nos &lt;a href=&quot;/pages/conditions-de-vente&quot;&gt;CGV&lt;/a&gt;"></p><a href="https://exemple.fr/x">ext</a>`;
    const out = rewriteLinks(html, "/preview/p/v/x");
    expect(out).toContain(`href="/preview/p/v/x/pages/faq"`);
    expect(out).toContain(`href=&quot;/preview/p/v/x/pages/conditions-de-vente&quot;`);
    expect(out).toContain(`href="https://exemple.fr/x"`);
    expect(rewriteLinks(out, "/preview/p/v/x")).toBe(out);
    // Échappement de Liquid (« escape ») : &#34;
    expect(rewriteLinks(`<p data-texts="&lt;a href=&#34;/pages/cgv&#34;&gt;"></p>`, "/b")).toContain(`href=&#34;/b/pages/cgv&#34;`);
  });
});
