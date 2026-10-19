/** Preuve de navigation sur un aperçu statique LIVRÉ : depuis le pied de page (bas de la page), un lien vers une autre page
 * ouvre cette page EN HAUT — à la fois quand l'aperçu est servi directement et quand il est affiché dans une enveloppe
 * (page parente d'une autre origine qui le montre dans un cadre haut et défile elle-même, comme un visualiseur) ; une
 * ancre va à sa cible ; précédent / suivant laissent le navigateur restaurer la position ; un changement de quantité
 * dans le panier ne fait pas sauter la page. Téléphone et ordinateur, plusieurs pages de départ. Captures + vidéo.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-nav-proof.ts <aperçu>/fraise fraise <dossier-de-sortie>
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium, type Page, type FrameLocator } from "playwright";
const dir = path.resolve(process.argv[2]), kind = process.argv[3] as "fraise" | "onde", out = path.resolve(process.argv[4] ?? "reports/lot2c-nav"); fs.mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".webm": "video/webm", ".png": "image/png" };
const inner = http.createServer((req, res) => { const p = path.join(dir, decodeURIComponent(new URL(req.url!, "http://x").pathname)); if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end(); res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" }); fs.createReadStream(p).pipe(res); });
await new Promise<void>((r) => inner.listen(0, "127.0.0.1", r)); const innerOrigin = `http://127.0.0.1:${(inner.address() as { port: number }).port}`;
// Enveloppe : autre origine (localhost), bandeau de 60 px puis cadre de 12 000 px ; la page parente défile.
const outer = http.createServer((req, res) => { const start = new URL(req.url!, "http://x").searchParams.get("p") ?? "accueil.html"; res.writeHead(200, { "content-type": "text/html" }); res.end(`<!doctype html><html><body style="margin:0"><div style="height:60px;background:#222;color:#fff;font:14px system-ui;display:grid;place-items:center">enveloppe de test</div><iframe id="f" src="${innerOrigin}/${start}" style="width:100%;height:12000px;border:0;display:block"></iframe></body></html>`); });
await new Promise<void>((r) => outer.listen(0, "localhost", r)); const outerOrigin = `http://localhost:${(outer.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && !/^(index|recherche-aucun|recherche-resultat|404)\.html$/.test(f));
const report: Record<string, unknown>[] = [];
try {
  for (const [label, width, height, mobile] of [["mobile", 390, 700, true], ["ordinateur", 1280, 800, false]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, locale: "fr-FR", recordVideo: { dir: path.join(out, "video-tmp"), size: { width, height } } });
    const page = await context.newPage(); await page.addInitScript("window.__name=(fn)=>fn");
    // 1. Direct : depuis le bas de chaque page de départ, les liens du pied de page vers d'autres pages ouvrent en haut.
    const direct: Record<string, unknown>[] = [];
    for (const start of ["accueil.html", "produit.html", "page-faq.html"]) {
      await page.goto(`${innerOrigin}/${start}`, { waitUntil: "networkidle" }); await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(400);
      const hrefs = [...new Set(await page.locator("footer a[href$='.html']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!)))].filter((h) => h !== start).slice(0, 4);
      for (const href of hrefs) { await page.locator(`footer a[href='${href}']`).first().click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(500); const y = await page.evaluate(() => scrollY); assert.equal(y, 0, `${label} direct ${start} → ${href} : scrollY ${y}`); direct.push({ from: start, to: href, scrollY: y }); await page.goBack({ waitUntil: "networkidle" }); await page.waitForTimeout(400); const back = await page.evaluate(() => scrollY); assert.ok(back > 200, `${label} retour sur ${start} : position restaurée (${back})`); }
    }
    // 2. Enveloppe : la page parente est en bas ; un lien du pied de page ouvre la nouvelle page en haut (le cadre revient en vue).
    await page.goto(`${outerOrigin}/?p=accueil.html`, { waitUntil: "networkidle" }); const frame: FrameLocator = page.frameLocator("#f");
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(500); const parentBefore = await page.evaluate(() => scrollY); assert.ok(parentBefore > 1000, "enveloppe défilée en bas");
    await page.screenshot({ path: path.join(out, `${kind}-nav-1-pied-de-page-${label}.png`) });
    const framed: Record<string, unknown>[] = [];
    for (const href of ["page-faq.html", "page-contact.html", "produit.html"].filter((h) => pages.includes(h))) {
      await frame.locator(`footer a[href='${href}']`).first().click(); await page.waitForTimeout(1600);
      const parentY = await page.evaluate(() => scrollY), insidePath = await frame.locator("body").evaluate(() => location.pathname);
      assert.ok(insidePath.endsWith(href), `enveloppe : page ${href} ouverte (${insidePath})`); assert.ok(parentY <= 60, `${label} enveloppe → ${href} : la page parente est revenue en haut (scrollY ${parentY})`);
      framed.push({ to: href, parentScrollY: parentY }); if (href === "page-faq.html") await page.screenshot({ path: path.join(out, `${kind}-nav-2-nouvelle-page-en-haut-${label}.png`) });
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
    }
    // 3. Ancre : la cible, pas le haut. 4. Précédent : position du navigateur, pas de remise en haut forcée.
    await frame.locator("body").evaluate(() => { location.href = "accueil.html#MainContent"; }); await page.waitForTimeout(1200);
    const anchor = { hash: await frame.locator("body").evaluate(() => location.hash), parentScrollY: await page.evaluate(() => scrollY) }; assert.equal(anchor.hash, "#MainContent");
    assert.ok(anchor.parentScrollY > 60, `ancre : l'enveloppe n'est pas forcée en haut (${anchor.parentScrollY})`);
    // 5. Panier : changement de quantité sans saut (page directe, tiroir ouvert).
    await page.goto(`${innerOrigin}/produit.html`, { waitUntil: "networkidle" });
    const purchase = page.locator("[data-main-product] [data-purchase]");
    if (await purchase.count()) { await purchase.scrollIntoViewIfNeeded(); await purchase.locator("input[data-quantity]").nth(1).check(); await page.waitForTimeout(300); await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/panier.html*", { timeout: 15000 }); await page.waitForLoadState("networkidle"); await page.goto(`${innerOrigin}/accueil.html`, { waitUntil: "networkidle" }); }
    else { const buy = page.locator("[data-main-product] [data-product-buy]"); await buy.scrollIntoViewIfNeeded(); await buy.locator("[data-qty-step='1']").click(); await buy.locator("button[type=submit]").click(); await page.waitForTimeout(1500); }
    if (!(await page.locator("[data-cart-drawer].is-open").count())) { await page.locator("[data-cart-open]").first().click(); await page.waitForTimeout(800); }
    const pageYBefore = await page.evaluate(() => scrollY); await page.locator(".es-line-item .es-qty [data-qty-change]").nth(1).click(); await page.waitForTimeout(1200);
    const pageYAfter = await page.evaluate(() => scrollY); assert.equal(pageYAfter, pageYBefore, `${label} panier : pas de saut de page au changement de quantité`);
    report.push({ device: label, direct, framed, anchor, cart: { before: pageYBefore, after: pageYAfter } });
    const video = page.video(); await context.close(); if (video) await video.saveAs(path.join(out, `${kind}-navigation-${label}.webm`));
  }
  fs.rmSync(path.join(out, "video-tmp"), { recursive: true, force: true });
  fs.writeFileSync(path.join(out, `${kind}-navigation.json`), JSON.stringify({ kind, dir, date: new Date().toISOString(), report }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, kind, devices: report.map((r) => r.device) }));
} finally { await browser.close(); inner.close(); outer.close(); }
