/** Vérifie un aperçu statique produit par lot2c-static-preview.ts : fichiers servis tels quels, navigation, galerie, stories,
 * panier de démonstration (ajout, tiroir, quantités, retrait, page panier), recherche et formulaires, sans erreur console ni 404.
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-static-check.ts <dossier>/fraise fraise <captures>
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const dir = path.resolve(process.argv[2]), kind = process.argv[3] as "fraise" | "onde", shots = process.argv[4] ? path.resolve(process.argv[4]) : null; if (shots) fs.mkdirSync(shots, { recursive: true });
const MIME: Record<string, string> = { html: "text/html; charset=utf-8", css: "text/css", js: "application/javascript", json: "application/json", svg: "image/svg+xml", webp: "image/webp", png: "image/png", jpg: "image/jpeg", webm: "video/webm", mp4: "video/mp4", ttf: "font/ttf", woff2: "font/woff2" };
const server = http.createServer((req, res) => { const p = path.join(dir, decodeURIComponent((req.url ?? "/").split("?")[0].replace(/^\/+/, "") || "index.html")); if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; } res.writeHead(200, { "Content-Type": MIME[path.extname(p).slice(1)] ?? "application/octet-stream" }); fs.createReadStream(p).pipe(res); });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const results: Record<string, unknown> = {};
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390, locale: "fr-FR" }); await page.addInitScript("window.__name=(fn)=>fn");
    const errors: string[] = [], missing: string[] = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); }); page.on("response", (r) => { if (r.status() >= 400) missing.push(`${r.status()} ${r.url()}`); });
    const dev = width === 390 ? "mobile" : "ordinateur", shot = async (name: string) => { if (shots) await page.screenshot({ path: path.join(shots, `${kind}-${name}-${dev}.png`) }); };
    const settle = async () => { await page.waitForLoadState("networkidle"); await page.waitForTimeout(500); };
    // Pages : chaque fichier HTML se charge, un seul h1, aucun débordement.
    const htmls = fs.readdirSync(dir).filter((f) => f.endsWith(".html") && !/^recherche-(aucun|resultat)\.html$|^index\.html$/.test(f));
    for (const file of htmls) { await page.goto(`${origin}/${file}`, { waitUntil: "networkidle" }); await page.waitForTimeout(300); const m = await page.evaluate(() => ({ h1: document.querySelectorAll("h1").length, sw: document.documentElement.scrollWidth, w: innerWidth, note: !!document.getElementById("es-static-note") })); assert.equal(m.h1, 1, `${file} : ${m.h1} h1`); assert.ok(m.sw <= m.w + 1, `${file} déborde`); assert.ok(m.note, `${file} : mention d'aperçu absente`); }
    // Navigation : menu → fiche produit → galerie.
    await page.goto(`${origin}/accueil.html`, { waitUntil: "networkidle" }); await settle();
    if (width === 390) { await page.locator("[data-menu-open]").click(); await page.waitForTimeout(400); await shot("menu"); await page.locator("#MobileMenu .es-mobile-menu__list a").filter({ hasText: kind === "fraise" ? "Les gummies" : "Le casque" }).first().click(); }
    else await page.locator(".es-header__nav a").filter({ hasText: kind === "fraise" ? "Les gummies" : "Le casque" }).first().click();
    await settle(); assert.match(page.url(), /produit\.html/, "lien du menu vers la fiche"); assert.equal(await page.locator("h1").count(), 1);
    const thumbs = page.locator("[data-gallery-thumb], .es-gallery__thumb, .es-thumbs button, .es-thumbs a"); if (await thumbs.count() > 1) { await thumbs.nth(1).click(); await page.waitForTimeout(400); }
    await shot("fiche");
    // Panier : ajout depuis la fiche, tiroir, quantité, retrait, page panier.
    try { localStorage.clear(); } catch { /* navigateur */ }
    await page.evaluate(() => { try { localStorage.removeItem("es-static-cart"); } catch { /* vide */ } });
    if (kind === "fraise") {
      const purchase = page.locator("[data-main-product] [data-purchase]"); await purchase.locator("input[data-quantity]").nth(1).check(); await page.waitForTimeout(200); await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/panier.html"); await settle();
      assert.match(await page.locator(".es-cart__summary").innerText(), /Total : 3 articles/); assert.match(await page.locator(".es-cart__summary").innerText(), /49,80/); await shot("panier-rempli");
      await page.locator("[data-cart-open]").first().click(); await page.waitForTimeout(600); const drawer = page.locator("[data-cart-drawer]"); assert.ok(await drawer.evaluate((el) => el.classList.contains("is-open"))); assert.match(await drawer.innerText(), /49,80/); await shot("tiroir");
      assert.equal(await drawer.locator("[data-cart-protect-toggle]").getAttribute("aria-checked"), "false"); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      await page.locator(".es-line-item__remove").first().click(); await page.waitForTimeout(800); await settle();
      // La ligne retirée : la page panier rechargée depuis l'état enregistré est vide.
      if (!/Votre panier est vide/.test(await page.locator("main").innerText())) { await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle(); }
      assert.match(await page.locator("main").innerText(), /Votre panier est vide/); await shot("panier-vide");
    } else {
      const buy = page.locator("[data-main-product] [data-product-buy]"); await buy.locator("[data-qty-step='1']").click(); await buy.locator("button[type=submit]").click(); await page.waitForTimeout(1200);
      const drawer = page.locator("[data-cart-drawer]"); assert.ok(await drawer.evaluate((el) => el.classList.contains("is-open")), "tiroir ouvert"); assert.match(await drawer.innerText(), /Total : 2 articles/); assert.match(await drawer.innerText(), /298,00/); await shot("tiroir");
      await drawer.locator("[data-qty-change]").first().click(); await page.waitForTimeout(800); assert.match(await drawer.innerText(), /Total : 1 article\b/); assert.match(await drawer.innerText(), /149,00/);
      await drawer.locator("[data-cart-discount-input]").fill("DEMO10"); await drawer.locator("[data-cart-discount-apply]").click(); await page.waitForTimeout(300); assert.equal(await drawer.locator("[data-cart-discount-note]").isHidden(), false);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle();
      assert.match(await page.locator(".es-cart__summary").innerText(), /Total : 1 article\b/); await shot("panier-rempli");
      await page.locator("[data-cart-qty]").first().fill("2"); await page.locator("button[name='update']").click(); await page.waitForURL("**/panier.html"); await settle(); assert.match(await page.locator(".es-cart__summary").innerText(), /Total : 2 articles/);
      await page.locator(".es-line-item__remove").first().click(); await page.waitForTimeout(800); await settle(); if (!/Votre panier est vide/.test(await page.locator("main").innerText())) { await page.goto(`${origin}/panier.html`, { waitUntil: "networkidle" }); await settle(); } assert.match(await page.locator("main").innerText(), /Votre panier est vide/); await shot("panier-vide");
    }
    assert.equal(await page.locator("[data-cart-count]").first().innerText().catch(() => "0"), "0");
    // Stories : lecteur ouvert sur le clip de test, puis Échap.
    await page.goto(`${origin}/accueil.html`, { waitUntil: "networkidle" }); await settle(); const stories = page.locator("[data-cv-stories]"); await stories.scrollIntoViewIfNeeded();
    if (await stories.locator("[data-cv-story-open]").count()) { await stories.locator("[data-cv-story-open]").first().click(); await page.waitForTimeout(1200); const player = stories.locator("[data-cv-player]"); assert.ok(await player.evaluate((d) => (d as HTMLDialogElement).open)); assert.match(await player.locator("[data-cv-video]").getAttribute("src") ?? "", /clip-test\.webm/); await shot("stories"); await page.keyboard.press("Escape"); }
    // Recherche : terme sans résultat puis terme du produit.
    await page.goto(`${origin}/recherche.html`, { waitUntil: "networkidle" }); await settle(); await page.fill("input[name=q]", "rien"); await page.locator("form[role=search] button, .es-search__form button").first().click(); await page.waitForTimeout(400); assert.match(await page.locator("main").innerText(), /rien/);
    await page.fill("input[name=q]", kind === "fraise" ? "gummies" : "casque"); await page.locator("form[role=search] button, .es-search__form button").first().click(); await page.waitForTimeout(400); assert.ok((await page.locator("main .es-card, main [data-product-card], main .es-product-grid a").count()) >= 1, "résultat de recherche"); await shot("recherche");
    // Contact : validation réelle, aucun envoi.
    await page.goto(`${origin}/page-contact.html`, { waitUntil: "networkidle" }); await settle(); await page.locator("form.es-contact__form button[type=submit]").click(); assert.ok((await page.locator("form.es-contact__form input:invalid").count()) >= 1); assert.match(page.url(), /page-contact\.html/);
    const filtered = missing.filter((m) => !/favicon\.ico/.test(m));
    assert.deepEqual(filtered, [], "ressources manquantes"); assert.deepEqual(errors, [], "erreurs console");
    results[dev] = { pages: htmls.length, ok: true }; await page.close();
  }
  console.log(JSON.stringify({ ok: true, kind, results }));
} finally { await browser.close(); server.close(); }
