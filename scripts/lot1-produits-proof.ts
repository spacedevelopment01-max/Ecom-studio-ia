/** Preuves de fiches par identité. Base temporaire, photos géométriques synthétiques, aucune IA ni CMS.
 * CHROMIUM=/usr/bin/chromium npx tsx scripts/lot1-produits-proof.ts reports/lot1/produits
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { unzipSync, strFromU8 } from "fflate";
import { check } from "@shopify/theme-check-node";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base configurée refusée : preuve isolée obligatoire.");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-product-proof-"));
process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Accès fournisseur interdit pendant cette preuve locale."); };
const out = path.resolve(process.argv[2] ?? "reports/lot1/produits"); fs.mkdirSync(out, { recursive: true });
const { productTrio, productMainHtml, csvRows, PRODUCT_TARGETS } = await import("../tests/lot1-produits-fixtures");
const { createUser } = await import("../src/lib/auth");
const { all } = await import("../src/lib/db");
const { currentTheme, saveThemeVersion } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { runContentEngineV2, saveUserEdit } = await import("../src/lib/seo-v2/engine");
const { localOnlyDeps } = await import("../src/lib/seo-v2/deps");
const { composeThemeV2 } = await import("../src/lib/theme-v2/engine");
const { storeProducts } = await import("../src/lib/theme/spec");
const { compileTheme, themeAssetBinary } = await import("../src/lib/theme/compile");
const { renderPage, routeFor, fontFilePath } = await import("../src/lib/theme/render");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { shopifyProductsCsv } = await import("../src/lib/theme/catalog-export");
const { getAsset, assetData } = await import("../src/lib/library");
const loader = (id: string) => { const a = getAsset(id); return a ? { data: assetData(a), mime: a.mime, updated: a.created_at } : null; };
const user = await createUser("fiches-preuve@example.invalid", "isolated-test-only", "Preuve synthétique");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const cases: object[] = [];
try {
  for (const domain of ["lab", "music"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const { pid, primaryFacts, accessoryFacts } = await productTrio(user.id, { domain, homonyms: true, reverse: domain === "music" });
    const initial = await composeThemeV2(pid); saveThemeVersion(pid, initial.spec, "Version initiale synthétique", "system");
    const before = currentTheme(pid)!;
    const endings = new Map<string, string>();
    for (const [i, target] of PRODUCT_TARGETS.entries()) {
      const r = await runContentEngineV2(null, pid, { type: "product_page", pageKey: target, lang: "fr" }, localOnlyDeps());
      const ending = `Fin du texte client du produit ${i + 1}, conservée dans sa propre fiche.`; endings.set(target, ending);
      saveUserEdit(pid, r.docKey!, { ...r.doc!, meta: { ...r.doc!.meta, seoTitle: `Fiche synthétique ${i + 1}`, metaDescription: `Description propre au produit ${i + 1}.` }, blocks: [{ id: "title", kind: "h1", text: "Diagnostic" }, { id: "body", kind: "p", text: i === 2 ? "Les caractéristiques de ce produit restent à renseigner." : `Notice client du produit ${i + 1}. Les informations déclarées pour cet objet restent disponibles. `.repeat(5) }, { id: "end", kind: "p", text: ending }, { id: "faq", kind: "faq", q: `Comment préparer le produit ${i + 1} ?`, a: `Réponse client propre au produit ${i + 1}.` }] });
    }
    const { spec } = await composeThemeV2(pid);
    assert.deepEqual(currentTheme(pid), before, "Aucune activation par le script de preuve.");
    const dir = path.join(out, domain); fs.mkdirSync(dir, { recursive: true });
    const exp = await cmsExport("shopify", spec, loader), zip = unzipSync(exp.zip), files = compileTheme(spec);
    fs.writeFileSync(path.join(dir, "theme.zip"), exp.zip);
    const csv = shopifyProductsCsv(spec); fs.writeFileSync(path.join(dir, "produits.csv"), csv);
    const manifest = JSON.parse(strFromU8(zip["assets/es-product-templates.json"]));
    assert.equal(manifest.products.length, 3); assert.equal(manifest.csvAssignsTemplates, false); assert.equal(manifest.installationVerified, false);
    fs.writeFileSync(path.join(dir, "affectations.json"), JSON.stringify(manifest, null, 2) + "\n");
    const extracted = path.join(temp, domain); fs.mkdirSync(extracted);
    for (const [file, data] of Object.entries(zip)) { fs.mkdirSync(path.dirname(path.join(extracted, file)), { recursive: true }); fs.writeFileSync(path.join(extracted, file), data); }
    const offenses = await check(extracted), errors = offenses.filter((o) => o.severity === 0); assert.equal(errors.length, 0, JSON.stringify(errors));
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url!, "http://local.test");
      if (u.pathname.startsWith("/assets/")) {
        const name = u.pathname.slice(8), text = files.get(`assets/${name}`);
        if (text != null) { res.writeHead(200, { "Content-Type": name.endsWith(".css") ? "text/css" : name.endsWith(".json") ? "application/json" : "application/javascript" }); return res.end(text); }
        const data = await themeAssetBinary(spec, name, loader);
        if (!data) return res.writeHead(404).end(); res.writeHead(200, { "Content-Type": data.mime }); return res.end(data.data);
      }
      if (u.pathname.startsWith("/__fonts/")) { const file = fontFilePath(u.pathname.slice(9)); if (!file) return res.writeHead(404).end(); res.writeHead(200, { "Content-Type": "font/ttf" }); return res.end(fs.readFileSync(file)); }
      const r = await renderPage({ spec, base: "", cart: [], files }, u.pathname, u.searchParams); res.writeHead(r.status, { "Content-Type": "text/html; charset=utf-8" }); res.end(r.html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const pages: object[] = [];
    try {
      for (const [i, target] of PRODUCT_TARGETS.entries()) {
        const p = storeProducts(spec).find((p) => p.contentTarget === target)!, url = `/products/${p.handle}`;
        const route = routeFor(spec, url, new URLSearchParams()); assert.equal(route.template, `product.${p.template_suffix}`);
        const assignment = manifest.products.find((a: { target: string }) => a.target === target)!; assert.equal(assignment.handle, p.handle); assert.equal(assignment.templateFile, `templates/${route.template}.json`);
        const rendered = await renderPage({ spec, base: "", cart: [], files }, url, new URLSearchParams()), html = productMainHtml(rendered.html);
        const selectedExport = strFromU8(zip[assignment.templateFile]);
        if (i === 0) for (const f of primaryFacts) { assert.ok(html.includes(f)); assert.ok(selectedExport.includes(f)); }
        else for (const f of primaryFacts) { assert.ok(!html.includes(f), `${domain}/${target} contient ${f}`); assert.ok(!selectedExport.includes(f)); }
        if (i === 1) for (const f of accessoryFacts) { assert.ok(html.includes(f)); assert.ok(selectedExport.includes(f)); }
        if (i === 2) { for (const f of accessoryFacts) assert.ok(!html.includes(f)); assert.ok(!selectedExport.includes('"type": "v2-specs"')); }
        assert.ok(html.includes(endings.get(target)!)); assert.ok(csvRows(csv).find((r) => r[0] === p.handle)![2].includes(endings.get(target)!));
        fs.writeFileSync(path.join(dir, `produit-${i + 1}.html`), rendered.html);
        fs.writeFileSync(path.join(dir, `produit-${i + 1}-gabarit.json`), selectedExport);
        const screenshots = [];
        for (const [device, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
          const page = await browser.newPage({ viewport, isMobile: device === "mobile", hasTouch: device === "mobile" });
          await page.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort());
          const response = await page.goto(origin + url, { waitUntil: "networkidle" }); assert.equal(response?.status(), 200);
          await page.addStyleTag({ content: "html{scroll-behavior:auto!important}*{animation:none!important;transition:none!important}[data-reveal],[data-reveal] *{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}" });
          await page.getByText(endings.get(target)!, { exact: true }).evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
          assert.ok(await page.getByText(endings.get(target)!, { exact: true }).isVisible());
          // Une capture intégrale doit aussi charger les miniatures paresseuses du panier fixe.
          await page.locator("[data-main-product] img[src]").evaluateAll(async (imgs) => {
            await Promise.all(imgs.map(async (el) => { const image = el as HTMLImageElement; image.loading = "eager"; await image.decode().catch(() => {}); }));
          });
          assert.equal(await page.locator('meta[name="description"]').getAttribute("content"), `Description propre au produit ${i + 1}.`);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(overflow <= 1);
          const missing = await page.locator("[data-main-product] img").evaluateAll((imgs) => imgs.filter((el) => !(el as HTMLImageElement).complete || !(el as HTMLImageElement).naturalWidth).map((el) => ({ src: el.getAttribute("src"), loading: el.getAttribute("loading"), html: el.outerHTML.slice(0, 250) })));
          const missingImages = missing.length; assert.equal(missingImages, 0, `${domain}/${target}/${device} : ${JSON.stringify(missing)}`);
          const gallery = await page.locator("[data-main-product]").innerHTML(); for (const own of p.images) assert.ok(gallery.includes(own));
          for (const other of storeProducts(spec).filter((x) => x !== p)) for (const f of other.images) assert.ok(!gallery.includes(f));
          const name = `produit-${i + 1}-${device}.png`; await page.screenshot({ path: path.join(dir, name), fullPage: true });
          screenshots.push({ file: name, width: viewport.width, overflow, missingImages }); await page.close();
        }
        pages.push({ target, url, template: route.template, exportedTemplate: assignment.templateFile, templateSuffix: p.template_suffix, endingPresent: true, otherProductFactsAbsent: true, ownImages: p.images, screenshots });
      }
    } finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
    cases.push({ domain, pages, currentVersionUnchanged: true, themeCheck: { errors: 0, warnings: offenses.length }, exportIssues: exp.issues.map((i) => ({ code: i.code, severity: i.severity })), offlineAssignment: "manual-required", installed: false });
  });
  assert.equal(all("SELECT 1 FROM ai_calls").length, 0);
  fs.writeFileSync(path.join(out, "preuves.json"), JSON.stringify({ sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), generatedAt: new Date().toISOString(), isolated: true, aiCalls: 0, cmsInstalled: false, syntheticImages: "aplats géométriques de test uniquement, aucune image IA", beforeCommit: "21ce77cc419b08ed0d3504bf9be54a53f2597368", beforeEvidence: "reports/lot1/rattachement/products/page-2.html et theme.zip (conservés)", cases }, null, 2) + "\n");
  console.log(JSON.stringify({ cases: cases.length, products: 6, screenshots: 12, themeCheckErrors: 0, aiCalls: 0, cmsInstalled: false }));
} finally { await browser.close(); fs.rmSync(temp, { recursive: true, force: true }); }
