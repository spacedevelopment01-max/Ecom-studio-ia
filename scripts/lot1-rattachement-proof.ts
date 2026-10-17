/** Preuves de la correction de rattachement, uniquement en base temporaire et sans réseau fournisseur.
 * CHROMIUM=/usr/bin/chromium npx tsx scripts/lot1-rattachement-proof.ts reports/lot1/rattachement
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
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base configurée refusée : isolation obligatoire.");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-association-proof-"));
process.env.DATA_DIR = data; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Accès fournisseur interdit pendant cette preuve."); };
const out = path.resolve(process.argv[2] ?? "reports/lot1/rattachement"); fs.mkdirSync(out, { recursive: true });
const { servicePair, productPair, writePair, markers } = await import("../tests/lot1-rattachement-fixtures");
const { createUser } = await import("../src/lib/auth");
const { all } = await import("../src/lib/db");
const { currentTheme } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { composeThemeV2 } = await import("../src/lib/theme-v2/engine");
const { storeProducts } = await import("../src/lib/theme/spec");
const { compileTheme } = await import("../src/lib/theme/compile");
const { renderPage, fontFilePath } = await import("../src/lib/theme/render");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { exportBundle } = await import("../src/lib/seo-v2/cms");
const { referenceDoc } = await import("../src/lib/seo-v2/theme-copy");
const { shopifyProductsCsv } = await import("../src/lib/theme/catalog-export");
const user = await createUser("rattachement-preuve@example.invalid", "isolated-test-only", "Preuve synthétique");
const cases: object[] = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const business of ["services", "products"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const { pid } = business === "services" ? await servicePair(user.id, { reversePages: true, reverseServices: true }) : await productPair(user.id, { reverseProducts: true });
    const before = currentTheme(pid)!;
    await writePair(pid, business);
    const { spec } = await composeThemeV2(pid);
    assert.deepEqual(currentTheme(pid), before, "La preuve ne doit pas activer de version.");
    const targets = business === "services" ? ["service:offer-1", "service:offer-2"] : ["product:main", "product:catalog:accessory"];
    const dir = path.join(out, business); fs.mkdirSync(dir, { recursive: true });
    const exported = await cmsExport("shopify", spec, () => null);
    fs.writeFileSync(path.join(dir, "theme.zip"), exported.zip);
    const zip = unzipSync(exported.zip);
    const extracted = path.join(data, business); fs.mkdirSync(extracted);
    for (const [f, b] of Object.entries(zip)) { fs.mkdirSync(path.dirname(path.join(extracted, f)), { recursive: true }); fs.writeFileSync(path.join(extracted, f), b); }
    const offenses = await check(extracted), errors = offenses.filter((o) => o.severity === 0);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    const csv = shopifyProductsCsv(spec);
    if (business === "products") fs.writeFileSync(path.join(dir, "produits.csv"), csv);
    const files = compileTheme(spec);
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url!, "http://local.test");
      if (u.pathname.startsWith("/assets/")) { const text = files.get(u.pathname.slice(1)); res.writeHead(text ? 200 : 404, { "Content-Type": u.pathname.endsWith(".css") ? "text/css" : "application/javascript" }); return res.end(text ?? ""); }
      if (u.pathname.startsWith("/__fonts/")) { const f = fontFilePath(u.pathname.slice(9)); if (!f) return res.writeHead(404).end(); res.writeHead(200, { "Content-Type": "font/ttf" }); return res.end(fs.readFileSync(f)); }
      const rendered = await renderPage({ spec, base: "", cart: [], files }, u.pathname, u.searchParams);
      res.writeHead(rendered.status, { "Content-Type": "text/html; charset=utf-8" }); res.end(rendered.html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const pages = [];
    try {
      for (const [i, target] of targets.entries()) {
        const entry = business === "services" ? spec.store.pages.find((p) => p.contentTarget === target)! : storeProducts(spec).find((p) => p.contentTarget === target)!;
        const url = `/${business === "services" ? "pages" : "products"}/${entry.handle}`;
        const m = markers(i + 1), other = markers(2 - i);
        assert.deepEqual(entry.seo, { title: m.title, description: m.description });
        const doc = referenceDoc(pid, business === "services" ? "service_page" : "product_page", "fr", target)!;
        for (const [file, text] of Object.entries(exportBundle(doc))) fs.writeFileSync(path.join(dir, `${i + 1}-${path.basename(file)}`), text);
        const nativeBody = business === "services" ? strFromU8(zip[`templates/page.${entry.template_suffix}.json`]) : csv.split("\n").find((l) => l.startsWith(`"${entry.handle}",`))!;
        assert.ok(nativeBody.includes(m.text)); assert.ok(!nativeBody.includes(other.text));
        const rendered = await renderPage({ spec, base: "", cart: [], files }, url, new URLSearchParams());
        fs.writeFileSync(path.join(dir, `page-${i + 1}.html`), rendered.html);
        const screens = [];
        for (const [device, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
          const page = await browser.newPage({ viewport, isMobile: device === "mobile", hasTouch: device === "mobile" });
          await page.route("**/*", (route) => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
          const response = await page.goto(origin + url, { waitUntil: "networkidle" }); assert.equal(response?.status(), 200);
          await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}[data-reveal],[data-reveal] *{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}" });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.ok(overflow <= 1, `${business}/${target}/${device} : débordement de ${overflow}px`);
          assert.equal(await page.getByText(m.text, { exact: true }).count(), 1); assert.ok(await page.getByText(m.text, { exact: true }).isVisible());
          assert.equal(await page.getByText(other.text, { exact: true }).count(), 0);
          assert.ok((await page.title()).includes(m.title)); assert.equal(await page.locator('meta[name="description"]').getAttribute("content"), m.description);
          const file = `page-${i + 1}-${device}.png`; await page.screenshot({ path: path.join(dir, file), fullPage: true });
          screens.push({ file, width: viewport.width, overflow }); await page.close();
        }
        pages.push({ target, url, seo: entry.seo, textPresent: true, otherTextAbsent: true, nativeExportBodyPresent: true, metadataInContentExport: true, screenshots: screens });
      }
    } finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
    cases.push({ business, pages, themeCheck: { errors: 0, warnings: offenses.length }, versionUnchanged: true, missingMedia: exported.issues.filter((x) => x.code === "missing_media").length });
  });
  assert.equal(all("SELECT 1 FROM ai_calls").length, 0);
  fs.writeFileSync(path.join(out, "preuves.json"), JSON.stringify({ sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), generatedAt: new Date().toISOString(), isolated: true, aiCalls: 0, data: "synthétiques uniquement", cases }, null, 2) + "\n");
  console.log(JSON.stringify({ cases: cases.length, pages: 4, screenshots: 8, themeCheckErrors: 0, aiCalls: 0 }));
} finally { await browser.close(); fs.rmSync(data, { recursive: true, force: true }); }
