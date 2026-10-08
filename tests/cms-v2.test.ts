/**
 * CMS Engine V2 (phase 11A) — exports Shopify / WordPress-WooCommerce / PrestaShop / kits Wix-Squarespace :
 * registre des capacités, Quality Gate CMS (jamais FINAL sans installation, défauts bloquants, périmètre = maillon
 * faible), messages honnêtes, structure de chaque adaptateur, médias refusés exclus, secrets, contenu inventé,
 * site de services sans WooCommerce, conversion Smarty, CSV lisible par WooCommerce, parité du rendu PHP (si PHP est
 * disponible), état d'export du studio, aucune dépense d'IA.
 * Les installations réelles (WordPress, PrestaShop locaux) et captures A/B/C : scripts/cms-v2-bench.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { strFromU8, unzipSync } from "fflate";

describe("CMS Engine V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { one, run } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  const { libraryLoader } = await import("@/lib/theme/loader");
  const { CAPABILITIES, PROVENANCE_ORDER, isInstallable } = await import("@/lib/cms-v2/capabilities");
  const { gateCmsExport, mandatoryCriteria, verdictMessage, DIMENSIONS } = await import("@/lib/cms-v2/quality");
  const { cmsExport, checkCmsExport, CMS_PLATFORMS } = await import("@/lib/cms-v2/export");
  const { blockAttrs } = await import("@/lib/cms-v2/adapters/wordpress");
  const { toSmarty, pageZones } = await import("@/lib/cms-v2/adapters/prestashop");
  const { phpAvailable, staticChecks } = await import("@/lib/cms-v2/checks");
  const { exportStatus, missingInfo } = await import("@/lib/cms-v2/status");
  const { wooProductsCsv, shopifyProductsCsv } = await import("@/lib/theme/catalog-export");
  const { POLICIES } = await import("@/lib/quality/policies");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  const u = await createUser(`cms2-${Date.now()}@test.fr`, "motdepasse-test", "T");
  const ids = { cosmetic: await seedThemeScenario(u.id, "cosmetic"), artisan: await seedThemeScenario(u.id, "artisan") };
  const shop = (await fr(() => composeThemeV2(ids.cosmetic))).spec;
  const services = (await fr(() => composeThemeV2(ids.artisan))).spec;
  const aiCalls = () => one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls WHERE user_id = ?", u.id)!.n;
  const files = (zip: Buffer) => unzipSync(new Uint8Array(zip));
  const textOf = (z: Record<string, Uint8Array>) => Object.entries(z).filter(([k]) => /\.(php|html|json|tpl|css|js|yml|txt|csv)$/.test(k)).map(([, v]) => strFromU8(v)).join("\n");

  const ALL_MEASURED = (prov: "static" | "installed_local") => Object.fromEntries([...new Set(Object.values(DIMENSIONS).flat())].map((k) => [k, { score: 9.5, provenance: prov }]));

  it("registre : chaque plateforme déclare toutes ses capacités, avec un statut et une preuve cohérents", () => {
    const keys = Object.keys(CAPABILITIES.shopify.capabilities).sort();
    for (const p of CMS_PLATFORMS) {
      const e = CAPABILITIES[p];
      expect(Object.keys(e.capabilities).sort()).toEqual(keys);
      for (const c of Object.values(e.capabilities)) {
        expect(["SUPPORTED", "PARTIAL", "EXPORT", "KIT", "UNVERIFIED", "UNSUPPORTED"]).toContain(c.status);
        if (c.verified) expect(PROVENANCE_ORDER).toContain(c.verified);
        // « Non vérifié » ne peut pas porter de preuve d'installation ; rien n'est vérifié sur une plateforme réelle.
        if (c.status === "UNVERIFIED") expect(c.verified === null || PROVENANCE_ORDER.indexOf(c.verified) < PROVENANCE_ORDER.indexOf("installed_local")).toBe(true);
        expect(c.verified === "real_platform" || c.verified === "human").toBe(false);
        expect(c.note.fr.length && c.note.en.length).toBeTruthy();
      }
    }
    expect(isInstallable("wix")).toBe(false);
    expect(isInstallable("squarespace")).toBe(false);
    expect(CAPABILITIES.wix.delivery).toBe("kit");
    // Shopify : jamais installé sur une vraie boutique.
    expect(CAPABILITIES.shopify.capabilities.installation.status).toBe("UNVERIFIED");
  });

  it("Quality Gate : sans installation, jamais FINAL (au mieux PROVISOIRE, périmètre « statique »)", () => {
    const r = gateCmsExport({ platform: "shopify", services: false, measures: ALL_MEASURED("static"), codes: [], issues: [] });
    expect(r.decision.verdict).toBe("PROVISIONAL");
    expect(r.scope).toBe("static");
    expect(verdictMessage("shopify", r, "fr")).toMatch(/reste à vérifier/);
  });

  it("Quality Gate : installé localement, tout mesuré ≥ 8, aucun défaut → FINAL limité à « validation locale installée »", () => {
    const r = gateCmsExport({ platform: "woocommerce", services: false, measures: ALL_MEASURED("installed_local"), codes: [], issues: [] });
    expect(r.decision.verdict).toBe("FINAL");
    expect(r.scope).toBe("installed_local");
    expect(r.unmeasured).toEqual([]);
    const msg = verdictMessage("woocommerce", r, "fr");
    expect(msg).toMatch(/validation locale installée/);
    expect(msg).toMatch(/reste à vérifier/);
    expect(msg).not.toMatch(/prête à vendre/i);
  });

  it("Quality Gate : un défaut bloquant, un critère obligatoire non mesuré ou une preuve plus faible empêchent FINAL", () => {
    const m = ALL_MEASURED("installed_local");
    for (const code of POLICIES.cms_export_v2.blocking) expect(gateCmsExport({ platform: "prestashop", services: false, measures: m, codes: [code], issues: [] }).decision.verdict).not.toBe("FINAL");
    const { ecommerce: _e, ...noCommerce } = m;
    const r = gateCmsExport({ platform: "woocommerce", services: false, measures: noCommerce, codes: [], issues: [] });
    expect(r.unmeasured).toEqual(["ecommerce"]);
    expect(r.decision.verdict).not.toBe("FINAL");
    // Un seul critère obligatoire de preuve statique : le périmètre entier redescend à « statique ».
    const weak = gateCmsExport({ platform: "woocommerce", services: false, measures: { ...m, navigation: { score: 10, provenance: "static" } }, codes: [], issues: [] });
    expect(weak.scope).toBe("static");
    expect(weak.decision.verdict).not.toBe("FINAL");
    // Critère sous le plancher (6) : jamais FINAL même avec une bonne moyenne.
    expect(gateCmsExport({ platform: "prestashop", services: false, measures: { ...m, native_editing: { score: 5, provenance: "installed_local" } }, codes: [], issues: [] }).decision.verdict).not.toBe("FINAL");
    // Défaut fatal (secret exposé) : refusé.
    expect(gateCmsExport({ platform: "woocommerce", services: false, measures: m, codes: ["secret_exposed"], issues: [] }).decision.verdict).toBe("REJECTED");
  });

  it("Quality Gate : un site de services n'exige pas d'e-commerce mais exige les formulaires", () => {
    expect(mandatoryCriteria(true)).toContain("forms");
    expect(mandatoryCriteria(true)).not.toContain("ecommerce");
    expect(mandatoryCriteria(false)).toContain("ecommerce");
  });

  it("kits Wix / Squarespace : présentés comme un kit de reconstruction, jamais comme un thème installable", async () => {
    const exp = await fr(() => cmsExport("wix", shop, libraryLoader, { projectId: ids.cosmetic }));
    expect(exp.kind).toBe("kit");
    const c = await fr(() => checkCmsExport("wix", exp, shop, { projectId: ids.cosmetic }));
    expect(c.gate.decision.verdict).not.toBe("FINAL");
    const msg = verdictMessage("wix", c.gate, "fr");
    expect(msg).toMatch(/[Kk]it de reconstruction/);
    expect(msg).toMatch(/n'accepte pas l'import d'un thème/);
    expect(verdictMessage("squarespace", c.gate, "en")).toMatch(/rebuild kit/);
  }, 60_000);

  it("Shopify : thème OS 2.0 conforme (Theme Check sans erreur), PROVISOIRE — installation réelle non vérifiée", async () => {
    const exp = await fr(() => cmsExport("shopify", shop, libraryLoader, { projectId: ids.cosmetic }));
    const c = await fr(() => checkCmsExport("shopify", exp, shop, { projectId: ids.cosmetic }));
    expect(c.static.stats.themeCheckErrors).toBe(0);
    expect(c.gate.decision.verdict).toBe("PROVISIONAL");
    expect(c.gate.scope).toBe("static");
    expect(c.gate.unmeasured).toContain("installation");
  }, 180_000);

  it("WooCommerce (boutique) : thème de blocs complet, intégration WooCommerce native, CSV produits, aucun faux panier", async () => {
    const exp = await fr(() => cmsExport("woocommerce", shop, libraryLoader, { projectId: ids.cosmetic }));
    const z = files(exp.zip);
    const root = Object.keys(z)[0].split("/")[0];
    for (const f of ["style.css", "theme.json", "functions.php", "templates/front-page.html", "templates/single-product.html", "templates/archive-product.html", "parts/header.html", "parts/footer.html", "inc/es-theme.php", "inc/es-woo.php", "inc/php/es-liquid.php", "inc/site.json", "assets/js/es-editor.js", "assets/css/es-woo.css", "import/produits-woocommerce.csv"]) expect(z[`${root}/${f}`], f).toBeTruthy();
    const single = strFromU8(z[`${root}/templates/single-product.html`]);
    expect(single).toContain("woocommerce/add-to-cart-form");
    // Panier : celui de WooCommerce (lien vers la page panier), pas le tiroir panier de Shopify.
    const all = textOf(z);
    expect(all).not.toMatch(/\/cart\/add\.js|shopify-section-cart-drawer/);
    expect(strFromU8(z[`${root}/inc/es-woo.php`])).toContain("wc_get_cart_url");
    const c = await fr(() => checkCmsExport("woocommerce", exp, shop, { projectId: ids.cosmetic }));
    expect(c.static.codes).toEqual([]);
    expect(c.gate.decision.verdict).not.toBe("FINAL");
  }, 120_000);

  it("WordPress (site de services) : aucune trace de WooCommerce, formulaires traités par le thème", async () => {
    const exp = await fr(() => cmsExport("woocommerce", services, libraryLoader, { projectId: ids.artisan }));
    const z = files(exp.zip);
    expect(exp.name).toMatch(/-wordpress\.zip$/);
    expect(Object.keys(z).some((k) => /es-woo|produits-woocommerce|single-product/.test(k))).toBe(false);
    expect(textOf(z).toLowerCase()).not.toContain("woocommerce");
    expect(textOf(z)).toContain("es_form");
  }, 120_000);

  it("WordPress : attributs de bloc échappés comme le fait WordPress (aucune balise ni commentaire cassé)", () => {
    const a = blockAttrs({ type: "v2-hero", settings: { heading: 'Titre <b>"gras"</b> -- & --> fin' } });
    expect(a).not.toMatch(/<|>|--/);
    expect(JSON.parse(a.replace(/\\u003c/g, "<").replace(/\\u003e/g, ">").replace(/\\u0026/g, "&").replace(/\\u002d/g, "-")).settings.heading).toBe('Titre <b>"gras"</b> -- & --> fin');
  });

  it("PrestaShop : thème enfant de Classic valide, module compagnon, fichiers préfixés, aucun faux moyen de paiement", async () => {
    const exp = await fr(() => cmsExport("prestashop", shop, libraryLoader, { projectId: ids.cosmetic }));
    const z = files(exp.zip);
    const yml = strFromU8(z["config/theme.yml"]);
    for (const p of ["name:", "display_name:", "version:", "parent: classic", "compatibility:", "default_layout:", "esstudio"]) expect(yml, p).toContain(p);
    expect(z["dependencies/modules/esstudio/esstudio.php"]).toBeTruthy();
    expect(z["dependencies/modules/esstudio/controllers/front/page.php"]).toBeTruthy();
    // Jamais assets/js/theme.js ni assets/css/theme.css : ils remplaceraient ceux de Classic (erreurs constatées).
    expect(z["assets/js/theme.js"]).toBeFalsy();
    expect(z["assets/css/theme.css"]).toBeFalsy();
    expect(z["assets/js/es-theme.js"]).toBeTruthy();
    // Page du module : pas de $php_self figé (liens des autres langues cassés, erreur 500 constatée).
    expect(strFromU8(z["dependencies/modules/esstudio/controllers/front/page.php"])).not.toMatch(/\$php_self\s*=/);
    expect(textOf(z)).not.toMatch(/es-footer__payment"[^>]*>\s*<li/);
    const c = await fr(() => checkCmsExport("prestashop", exp, shop, { projectId: ids.cosmetic }));
    expect(c.static.codes).toEqual([]);
  }, 120_000);

  it("PrestaShop : conversion Smarty sûre (accolades protégées, compteur du panier et adresses dynamiques)", () => {
    const s = toSmarty('<style>.a{color:red}</style><a href="/cart">Panier <span class="es-cart-count" data-cart-count hidden>0</span></a><img src="/assets/hero.jpg">', "montheme");
    expect(s).toContain("{literal}");
    expect(s).toContain("{$cart.products_count}");
    expect(s).toContain("themes/montheme/assets/es/hero.jpg");
    const z = pageZones('<body><header id="shopify-section-h">H</header><main id="MainContent">M</main><footer>F</footer></body>');
    expect(z).toBeTruthy();
  });

  it("CSV WooCommerce : en-tête sans guillemets (lu par l'importateur malgré le BOM), déclinaisons rattachées, aucun prix inventé", () => {
    const csv = wooProductsCsv(shop);
    expect(csv.split("\n")[0].startsWith("Type,SKU,Name,")).toBe(true);
    expect(shopifyProductsCsv(shop).split("\n")[0].startsWith("Handle,Title,")).toBe(true);
    const p = shop.store.product;
    if (p.variants.length > 1) expect(csv).toMatch(new RegExp(`"variation",.*"${p.handle}"`));
    const noPrice = structuredClone(shop);
    noPrice.store.product.price = null;
    for (const v of noPrice.store.product.variants) v.price = null;
    expect(wooProductsCsv(noPrice)).not.toMatch(/"\d+\.\d{2}"/);
  });

  it("médias refusés jamais exportés ; secrets du studio jamais dans un export ; contenu inventé signalé", async () => {
    const spec = structuredClone(shop);
    const [file, assetId] = Object.entries(spec.files)[0];
    run("UPDATE assets SET status = 'rejected' WHERE id = ?", assetId);
    for (const pf of ["woocommerce", "prestashop"] as const) {
      const exp = await fr(() => cmsExport(pf, spec, libraryLoader, { projectId: ids.cosmetic }));
      expect(exp.issues.some((i) => i.code === "rejected_media" && i.severity === "blocking")).toBe(true);
      expect(Object.keys(files(exp.zip)).some((k) => k.endsWith(`/es/${file}`) || k.endsWith(`es/${file}`))).toBe(false);
    }
    run("UPDATE assets SET status = 'ready' WHERE id = ?", assetId);
    // Secret : une valeur d'environnement sensible recopiée dans un contenu est détectée (défaut fatal).
    process.env.ES_TEST_SECRET_KEY = "zz-secret-value-for-test-123456";
    const leaky = structuredClone(services);
    const first = leaky.templates.index.sections[leaky.templates.index.order[0]];
    first.settings.heading = "zz-secret-value-for-test-123456";
    const exp = await fr(() => cmsExport("woocommerce", leaky, libraryLoader, { projectId: ids.artisan }));
    const st = await fr(() => staticChecks("woocommerce", exp, leaky, { projectId: ids.artisan }));
    expect(st.codes).toContain("secret_exposed");
    delete process.env.ES_TEST_SECRET_KEY;
    // Promesse inventée dans un contenu : signalée.
    first.settings.heading = "Le meilleur du marché, n°1 en France";
    const exp2 = await fr(() => cmsExport("woocommerce", leaky, libraryLoader, { projectId: ids.artisan }));
    expect((await fr(() => staticChecks("woocommerce", exp2, leaky, { projectId: ids.artisan }))).codes).toContain("invented_content");
  }, 180_000);

  it.skipIf(!phpAvailable())("parité : les sections rendues par le moteur PHP livré sont identiques à l'aperçu du studio", async () => {
    const { parity } = await import("../scripts/lib/cms-parity");
    for (const spec of [shop, services]) {
      const res = await fr(() => parity(spec));
      expect(res.length).toBeGreaterThan(3);
      expect(res.filter((r) => !r.same).map((r) => `${r.where}:${r.type}`)).toEqual([]);
    }
  }, 180_000);

  it("consignes « à compléter » adaptées à la plateforme (jamais « dans Shopify » sur WordPress / PrestaShop), projet intact", async () => {
    const { adaptForPlatform } = await import("@/lib/cms-v2/adapt");
    const spec = structuredClone(shop);
    spec.store.policies = [{ handle: "terms-of-service", title: "CGV", body_html: "<p>[À compléter dans Shopify : Paramètres › Politiques]</p>" }];
    expect(adaptForPlatform(spec, "woocommerce").store.policies[0].body_html).toBe("<p>[À compléter dans WordPress : Pages › modifier cette page]</p>");
    expect(adaptForPlatform(spec, "prestashop").store.policies[0].body_html).not.toMatch(/Shopify/);
    expect(adaptForPlatform(spec, "shopify")).toBe(spec);
    expect(spec.store.policies[0].body_html).toMatch(/Shopify/);
    const z = files((await fr(() => cmsExport("woocommerce", spec, libraryLoader, { projectId: ids.cosmetic }))).zip);
    const site = strFromU8(z[Object.keys(z).find((k) => k.endsWith("inc/site.json"))!]);
    expect(site).not.toMatch(/dans Shopify/);
  }, 60_000);

  it("état d'export du studio : capacités, informations à compléter, exports enregistrés", () => {
    const st = exportStatus(ids.cosmetic, shop, "prestashop", "fr");
    expect(st.capabilities.find((c) => c.key === "installation")).toBeTruthy();
    expect(st.capabilities.some((c) => c.key === "cart")).toBe(true);
    expect(exportStatus(ids.artisan, services, "woocommerce", "fr").capabilities.some((c) => c.key === "cart")).toBe(false);
    expect(missingInfo(services).every((m) => /^\[(À compléter|To complete)/.test(m))).toBe(true);
  });

  it("aucun appel d'IA ni réseau pendant les exports", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    for (const pf of ["woocommerce", "prestashop", "squarespace"] as const) await fr(() => cmsExport(pf, services, libraryLoader, { projectId: ids.artisan }));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    expect(aiCalls()).toBe(0);
  }, 120_000);
});
