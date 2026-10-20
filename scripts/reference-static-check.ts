/** Vérifie un aperçu statique d'une des quatre démonstrations (reference-static-preview.ts) servi tel quel : chaque page se
 * charge (un seul h1, aucun débordement, mention d'aperçu), le menu mène à la boutique ou aux prestations, la fiche produit
 * ajoute au panier de démonstration (tiroir, compteur, page panier, retrait), la recherche répond, le formulaire de contact
 * valide sans envoyer ; aucune ressource manquante ni erreur console. Captures de chaque page à 390 et 1440 px.
 *   CHROMIUM=/chemin/chrome npx tsx scripts/reference-static-check.ts <aperçu>/<démo> <captures>
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = path.resolve(process.argv[2]), kind = path.basename(dir), shots = process.argv[3] ? path.resolve(process.argv[3]) : null; if (shots) fs.mkdirSync(shots, { recursive: true });
const MIME: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css", js: "application/javascript", json: "application/json", svg: "image/svg+xml", webp: "image/webp", png: "image/png", jpg: "image/jpeg", webm: "video/webm", mp4: "video/mp4", ttf: "font/ttf", woff2: "font/woff2" };
const server = http.createServer((req, res) => { const p = path.join(dir, decodeURIComponent((req.url ?? "/").split("?")[0].replace(/^\/+/, "") || "index.html")); if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(p).slice(1)] ?? "application/octet-stream" }); fs.createReadStream(p).pipe(res); });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const services = !fs.existsSync(path.join(dir, "produit.html"));
const results: Record<string, unknown> = {};
try {
  for (const width of [360, 390, 430, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 750 ? 844 : 900 }, reducedMotion: "reduce" });
    const errors: string[] = [], missing: string[] = [];
    page.on("console", (m) => { if (m.type() === "error" && !/favicon\.ico/.test(m.location().url ?? "")) errors.push(`${m.text()} (${m.location().url ?? ""})`); }); page.on("pageerror", (e) => errors.push(String(e))); page.on("response", (r) => { if (r.status() >= 400) missing.push(r.url()); });
    const dev = width === 390 ? "mobile" : width < 750 ? `mobile-${width}` : "ordinateur", shot = async (name: string, full = false) => { if (shots) await page.screenshot({ path: path.join(shots, `${kind}-${name}-${dev}.png`), fullPage: full }); };
    const settle = async () => { await page.waitForLoadState("networkidle"); await page.waitForTimeout(500); };
    const htmls = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && !/^recherche-(aucun|resultat)\.html$|^index\.html$/.test(f));
    for (const file of htmls) {
      await page.goto(`${origin}/${file}`, { waitUntil: "networkidle" }); await page.waitForTimeout(300);
      const m = await page.evaluate(() => ({ h1: document.querySelectorAll("h1").length, sw: document.documentElement.scrollWidth, w: innerWidth, note: !!document.getElementById("es-static-note") }));
      assert.equal(m.h1, 1, `${file} : ${m.h1} h1`); assert.ok(m.sw <= m.w + 1, `${file} déborde (${m.sw} > ${m.w})`); assert.ok(m.note, `${file} : mention d'aperçu absente`);
      if (/^(accueil|produit|page-prestations)\.html$/.test(file)) { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); }); await page.waitForLoadState("networkidle"); await page.waitForTimeout(400); }
      await shot(file.replace(/\.html$/, ""), /^(accueil|produit|page-prestations)\.html$/.test(file));
    }
    // Menu : vers la boutique (produits) ou les prestations (services).
    await page.goto(`${origin}/accueil.html`, { waitUntil: "networkidle" }); await settle();
    // Boutique : la collection si le menu y mène, sinon la fiche (boutique d'un seul produit, ex. SILLON).
    const target = services ? "page-prestations.html" : (await page.locator('#MobileMenu a[href="boutique.html"], .es-header__nav a[href="boutique.html"]').count()) ? "boutique.html" : "produit.html";
    if (width < 750) { await page.locator("[data-menu-open]").click(); await page.waitForTimeout(400); await shot("menu"); const link = page.locator(`#MobileMenu a[href="${target}"]`).first(); if (!(await link.isVisible())) { const group = page.locator("#MobileMenu details.es-mm__group summary"); if (await group.count()) { await group.first().click(); await page.waitForTimeout(300); } else await link.waitFor({ state: "visible", timeout: 5000 }); } await page.locator(`#MobileMenu a[href="${target}"]:visible`).first().click(); }
    else await page.locator(`.es-header__nav a[href="${target}"]`).first().click();
    await settle(); assert.ok(page.url().endsWith(`/${target}`), `lien du menu vers ${target} (${page.url()})`); assert.equal(await page.locator("h1").count(), 1);
    if (!services) {
      // Boutique → fiche → galerie → panier (ajout, tiroir, page, retrait).
      if (target !== "produit.html") { await page.locator("main a[href='produit.html']").first().click(); await settle(); }
      assert.match(page.url(), /produit\.html$/, "carte produit → fiche");
      const thumbs = page.locator("[data-gallery-thumb], .es-gallery__thumb, .es-thumbs button, .es-thumbs a"); if (await thumbs.count() > 1) { await thumbs.nth(1).click(); await page.waitForTimeout(400); }
      // Produit sans prix (« Prix à définir », ex. SILLON) : rien ne peut être vendu, le panier reste vide (règle du serveur).
      const unpriced = /Prix à définir/.test(await page.locator("[data-main-product]").first().innerText());
      if (!unpriced) {
      await page.evaluate(() => { try { localStorage.removeItem("es-static-cart"); } catch { /* vide */ } });
      const main = page.locator("[data-main-product]"); const add = main.locator("[data-purchase-add], [data-product-buy] button[type=submit], form[action*='panier'] button[name='add']").first();
      await add.scrollIntoViewIfNeeded(); await add.click(); await page.waitForTimeout(1200); await settle();
      const drawer = page.locator("[data-cart-drawer]"); const opened = await drawer.count() ? await drawer.first().evaluate((el) => el.classList.contains("is-open")) : false;
      if (!opened) assert.match(page.url(), /panier\.html/, "ajout : tiroir ouvert ou page panier"); else { await shot("tiroir"); await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
      await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle();
      assert.doesNotMatch(await page.locator("main").innerText(), /Votre panier est vide/, "panier rempli après ajout"); await shot("panier-rempli");
      await page.locator(".es-line-item__remove").first().click(); await page.waitForTimeout(800); await settle();
      if (!/Votre panier est vide/.test(await page.locator("main").innerText())) { await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle(); }
      assert.match(await page.locator("main").innerText(), /Votre panier est vide/); await shot("panier-vide");
      assert.equal(await page.locator("[data-cart-count]").first().innerText().catch(() => "0"), "0");
      } else { await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle(); assert.match(await page.locator("main").innerText(), /Votre panier est vide/); await shot("panier-vide"); }
    } else {
      // Prestations : chaque prestation a un titre ; appel à l'action vers le contact.
      assert.ok((await page.locator("main h2, main h3").count()) >= 2, "titres des prestations");
      assert.ok((await page.locator("main a[href='page-contact.html'], main a[href^='page-contact.html#']").count()) >= 1, "appel à l'action vers le contact");
    }
    // Recherche : terme sans résultat puis un mot du nom.
    const name = (await page.evaluate(() => document.title)).split(/[—|·-]/)[0].trim().split(" ")[0];
    await page.goto(`${origin}/recherche.html`, { waitUntil: "networkidle" }); await settle(); await page.fill("input[name=q]", "xqzv"); await page.locator("form[role=search] button, .es-search__form button").first().click(); await page.waitForTimeout(400); assert.match(await page.locator("main").innerText(), /xqzv/);
    if (!services) { await page.fill("input[name=q]", name); await page.locator("form[role=search] button, .es-search__form button").first().click(); await page.waitForTimeout(400); assert.ok((await page.locator("main .es-card, main [data-product-card], main .es-product-grid a").count()) >= 1, `résultat de recherche pour ${name}`); await shot("recherche"); }
    // Contact : validation réelle, aucun envoi.
    await page.goto(`${origin}/page-contact.html`, { waitUntil: "networkidle" }); await settle(); const form = page.locator("main form:not([role=search])").first(); await form.locator("button[type=submit]").first().click(); assert.ok((await form.locator("input:invalid, textarea:invalid").count()) >= 1, "validation du formulaire"); assert.match(page.url(), /page-contact\.html/);
    const filtered = missing.filter((m) => !/favicon\.ico/.test(m));
    assert.deepEqual(filtered, [], "ressources manquantes"); assert.deepEqual(errors, [], "erreurs console");
    results[dev] = { pages: htmls.length, ok: true }; await page.close();
  }
  console.log(JSON.stringify({ ok: true, kind, services, results }));
} finally { await browser.close(); server.close(); }
