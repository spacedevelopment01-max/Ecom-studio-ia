/** Preuves reproductibles du lot 1. Données inédites synthétiques, aucun fournisseur ni compte CMS appelé.
 * STOCK_OFFLINE=1 CHROMIUM=/usr/bin/chromium npx tsx scripts/lot1-proof.ts reports/lot1
 * Crée sa propre base temporaire et refuse de réutiliser une base configurée.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";
import { unzipSync } from "fflate";
import { check } from "@shopify/theme-check-node";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Exécuter sans base configurée : isolation obligatoire.");
const data = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot1-proof-"));
process.env.DATA_DIR = data;
process.env.STOCK_OFFLINE = "1";
const out = path.resolve(process.argv[2] ?? "reports/lot1");
fs.mkdirSync(out, { recursive: true });
// Même une configuration externe accidentelle ne peut entraîner un appel sortant.
globalThis.fetch = async () => { throw new Error("Preuve locale : accès fournisseur interdit."); };
const { seedHoldout, HOLDOUTS } = await import("../tests/lot1-holdout-fixtures");
const { createUser } = await import("../src/lib/auth");
const { run, all } = await import("../src/lib/db");
const { runWithLang } = await import("../src/lib/i18n-server");
const { runContentEngineV2, saveUserEdit } = await import("../src/lib/seo-v2/engine");
const { localOnlyDeps } = await import("../src/lib/seo-v2/deps");
const { composeThemeV2 } = await import("../src/lib/theme-v2/engine");
const { saveThemeVersion } = await import("../src/lib/projects");
const { compileTheme } = await import("../src/lib/theme/compile");
const { renderPage, fontFilePath } = await import("../src/lib/theme/render");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { shopifyProductsCsv } = await import("../src/lib/theme/catalog-export");
const user = await createUser("preuve-lot1@example.invalid", "isolated-test-only", "Données synthétiques");
const cases: any[] = [];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
try {
  for (const [i, c] of HOLDOUTS.entries()) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const pid = seedHoldout(user.id, i);
    const services = c.business === "services";
    const r = await runContentEngineV2(null, pid, { type: services ? "service_page" : "product_page", pageKey: services ? "service:offer-one" : "product:main" }, localOnlyDeps());
    const ending = "Chaque information utile reste disponible jusqu'au dernier paragraphe.";
    const doc = { ...r.doc!, blocks: [{ id: "title", kind: "h1" as const, text: c.offer }, { id: "intro", kind: "p" as const, text: c.detail }, { id: "subtitle", kind: "h2" as const, text: "Préparer votre choix" }, { id: "long", kind: "p" as const, text: (c.detail + " ").repeat(20) }, { id: "end", kind: "p" as const, text: ending }] };
    saveUserEdit(pid, r.docKey!, doc);
    // Le nom de projet ne sert jamais de condition de sélection.
    run("UPDATE projects SET name=? WHERE id=?", "Projet de contrôle renommé", pid);
    const built = await composeThemeV2(pid);
    const version = saveThemeVersion(pid, built.spec, "Preuve synthétique uniquement", "user");
    const spec = built.spec;
    const files = compileTheme(spec);
    const target = services ? "/pages/texte-service-offer-one" : `/products/${spec.store.product.handle}`;
    const exp = await cmsExport("shopify", spec, () => null);
    const dir = path.join(out, c.key); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "theme.zip"), exp.zip);
    if (!services) fs.writeFileSync(path.join(dir, "produits.csv"), shopifyProductsCsv(spec));
    const extracted = path.join(data, c.key); fs.mkdirSync(extracted);
    for (const [f, b] of Object.entries(unzipSync(exp.zip))) { fs.mkdirSync(path.dirname(path.join(extracted, f)), { recursive: true }); fs.writeFileSync(path.join(extracted, f), b); }
    const offenses = await check(extracted);
    const errors = offenses.filter((o) => o.severity === 0);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    const server = http.createServer(async (req, res) => {
      const u = new URL(req.url!, "http://local.test");
      if (u.pathname.startsWith("/assets/")) { const text = files.get(u.pathname.slice(1)); res.writeHead(text ? 200 : 404, { "Content-Type": u.pathname.endsWith(".css") ? "text/css" : "application/javascript" }); return res.end(text ?? ""); }
      if (u.pathname.startsWith("/__fonts/")) { const f = fontFilePath(u.pathname.slice(9)); if (!f) return res.writeHead(404).end(); res.writeHead(200, { "Content-Type": "font/ttf" }); return res.end(fs.readFileSync(f)); }
      const rendered = await renderPage({ spec, base: "", cart: [], files }, u.pathname, u.searchParams);
      res.writeHead(rendered.status, { "Content-Type": "text/html; charset=utf-8" }); res.end(rendered.html);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${(server.address() as any).port}`;
    const screens = [];
    try {
      for (const [device, viewport] of [["ordinateur", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
        const page = await browser.newPage({ viewport, isMobile: device === "mobile", hasTouch: device === "mobile" });
        await page.route("**/*", (route) => route.request().url().startsWith(origin + "/") ? route.continue() : route.abort());
        for (const [label, url] of [["accueil", "/"], ["contenu", target]]) {
          await page.goto(origin + url, { waitUntil: "networkidle" });
          await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}[data-reveal],[data-reveal] *{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}" });
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.ok(overflow <= 1, `${c.key}/${label}/${device} déborde de ${overflow}px`);
          if (label === "contenu") { assert.equal(await page.locator("h1").count(), 1); assert.equal(await page.getByText(ending, { exact: true }).count(), 1); assert.ok(await page.getByText(ending, { exact: true }).isVisible()); }
          const name = `${label}-${device}.png`;
          await page.screenshot({ path: path.join(dir, name), fullPage: true });
          screens.push({ file: `${c.key}/${name}`, width: viewport.width, overflow });
        }
        await page.close();
      }
    } finally { await new Promise<void>((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
    const html = await renderPage({ spec, base: "", cart: [] }, target, new URLSearchParams());
    assert.ok(html.html.includes(ending));
    fs.writeFileSync(path.join(dir, "apercu.html"), html.html);
    cases.push({ case: c.key, business: c.business, conversion: c.conversion, source: "local puis correction client synthétique", target: doc.page.key, runId: doc.meta2.runId, contextHash: doc.meta2.contract?.contextHash, themeVersion: version.id, documents: (spec.meta as any)?.contentDelivery ?? [], renderedPath: target, endingPresent: true, themeCheck: { errors: errors.length, warnings: offenses.length - errors.length }, missingMedia: exp.issues.filter((x) => x.code === "missing_media").length, screenshots: screens });
  });
  assert.equal(all("SELECT 1 FROM ai_calls").length, 0);
  fs.writeFileSync(path.join(out, "preuves.json"), JSON.stringify({ sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), generatedAt: new Date().toISOString(), isolated: true, paidCalls: 0, data: "synthétiques uniquement", cases }, null, 2) + "\n");
  console.log(JSON.stringify({ cases: cases.length, screenshots: cases.flatMap((x) => x.screenshots).length, themeCheckErrors: 0, aiCalls: 0, output: out }));
} finally { await browser.close(); fs.rmSync(data, { recursive: true, force: true }); }
