/** Preuve mobile « petite hauteur » sur un aperçu statique LIVRÉ (le dossier publié, pas le rendu local) : FAQ (deux
 * questions ouvertes, deux fermées, couleurs réellement calculées : question ET réponse lisibles) sur la page FAQ et sur
 * l'accueil ; tiroir du panier avec plusieurs articles : ouvrir → lire la ligne (image, titre, prix, quantités, retrait)
 * sans occultation → défiler jusqu'à la protection, les économies et la réassurance → modifier la quantité → retirer →
 * fermer. Géométrie vérifiée (rien sous le bandeau ni sous le pied), captures et vidéo WebM de la séquence.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-mobile-proof.ts <dossier-aperçu>/fraise fraise <dossier-de-sortie>
 */
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
const dir = path.resolve(process.argv[2]), kind = process.argv[3] as "fraise" | "onde", out = path.resolve(process.argv[4] ?? "reports/lot2c-mobile"); fs.mkdirSync(out, { recursive: true });
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".webm": "video/webm", ".png": "image/png" };
const server = http.createServer((req, res) => { const p = path.join(dir, decodeURIComponent(new URL(req.url!, "http://x").pathname)); if (!p.startsWith(dir) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) return res.writeHead(404).end(); res.writeHead(200, { "content-type": TYPES[path.extname(p)] ?? "application/octet-stream" }); fs.createReadStream(p).pipe(res); });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const luminance = (rgb: string) => { const m = rgb.match(/\d+(\.\d+)?/g)!.map(Number); const [r, g, b] = m.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };
/** Couleur de fond effective d'un élément (le premier ancêtre non transparent). */
const faqColors = (page: Page) => page.evaluate(() => [...document.querySelectorAll(".es-faq .es-faq__item")].map((d) => { const bg = (el: Element | null): string => { let e: Element | null = el; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && !/, 0\)$/.test(c)) return c; e = e.parentElement; } return "rgb(255, 255, 255)"; }; const q = d.querySelector(".es-faq__q")!, a = d.querySelector(".es-accordion__body")!; const qs = getComputedStyle(q); return { open: d.hasAttribute("open"), question: { bg: bg(q), color: qs.color, px: parseFloat(qs.fontSize), bold: parseInt(qs.fontWeight, 10) >= 700 }, answer: { bg: bg(a), color: getComputedStyle(a).color, visible: (a as HTMLElement).getClientRects().length > 0 } }; }));
/** Seuil WCAG AA : 4,5:1, ou 3:1 pour un grand texte (≥ 24 px, ou ≥ 18,66 px en gras). */
const threshold = (px: number, bold: boolean) => px >= 24 || (bold && px >= 18.66) ? 3 : 4.5;
const rect = (page: Page, sel: string) => page.evaluate((s) => { const el = document.querySelector(s); if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), visible: (el as HTMLElement).getClientRects().length > 0 }; }, sel);
const inside = (a: { top: number; bottom: number } | null, box: { top: number; bottom: number } | null) => !!a && !!box && a.top >= box.top - 1 && a.bottom <= box.bottom + 1;
const report: Record<string, unknown>[] = [];
try {
  for (const [width, height] of [[390, 620], [360, 560]] as const) {
    const dev = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, locale: "fr-FR", recordVideo: { dir: path.join(out, "video-tmp"), size: { width, height } } });
    const page = await context.newPage(); await page.addInitScript("window.__name=(fn)=>fn"); const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    // 1. FAQ : page FAQ puis accueil (« La recette ») : deux ouvertes, deux fermées.
    for (const [name, file] of [["faq", "page-faq.html"], ["accueil", "accueil.html"]] as const) {
      if (!fs.existsSync(path.join(dir, file))) continue;
      await page.goto(`${origin}/${file}`, { waitUntil: "networkidle" }); const items = page.locator(".es-faq .es-faq__item"); const n = await items.count(); if (!n) { report.push({ dev, faq: name, present: false }); continue; }
      await items.nth(0).scrollIntoViewIfNeeded(); await items.nth(0).locator("summary").tap(); await items.nth(1).locator("summary").tap(); await page.waitForTimeout(900);
      const colors = await faqColors(page); const open = colors.filter((c) => c.open), closed = colors.filter((c) => !c.open);
      assert.equal(open.length, 2, `${dev}/${name} : deux questions ouvertes`); assert.ok(closed.length >= 2, `${dev}/${name} : deux questions fermées au moins`);
      for (const c of open) { assert.ok(c.answer.visible, "réponse rendue"); assert.ok(contrast(c.question.bg, c.question.color) >= threshold(c.question.px, c.question.bold), `${dev}/${name} question ouverte lisible (${c.question.bg} / ${c.question.color})`); assert.ok(contrast(c.answer.bg, c.answer.color) >= 4.5, `${dev}/${name} réponse ouverte lisible (${c.answer.bg} / ${c.answer.color})`); }
      for (const c of closed) assert.ok(contrast(c.question.bg, c.question.color) >= threshold(c.question.px, c.question.bold), `${dev}/${name} question fermée lisible (${c.question.bg} / ${c.question.color}, ${c.question.px}px${c.question.bold ? " gras" : ""})`);
      await items.nth(0).scrollIntoViewIfNeeded(); await page.evaluate(() => scrollBy(0, -8)); await page.screenshot({ path: path.join(out, `${kind}-faq-${name}-${dev}.png`) });
      report.push({ dev, faq: name, present: true, open: open.map((c) => ({ q: c.question, a: c.answer, contrast: [Math.round(contrast(c.question.bg, c.question.color) * 10) / 10, Math.round(contrast(c.answer.bg, c.answer.color) * 10) / 10] })), closed: closed.slice(0, 2).map((c) => ({ q: c.question, contrast: Math.round(contrast(c.question.bg, c.question.color) * 10) / 10, threshold: threshold(c.question.px, c.question.bold) })) });
    }
    // 2. Panier : plusieurs articles depuis la fiche, tiroir ouvert en petite hauteur.
    await page.goto(`${origin}/produit.html`, { waitUntil: "networkidle" });
    const purchase = page.locator("[data-main-product] [data-purchase]");
    if (await purchase.count()) { await purchase.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await purchase.locator("input[data-quantity]").nth(1).check(); await page.waitForTimeout(400); await purchase.locator("[data-purchase-add]").tap(); await page.waitForURL("**/panier.html*", { timeout: 15000 }); await page.waitForLoadState("networkidle"); await page.goto(`${origin}/accueil.html`, { waitUntil: "networkidle" }); }
    else { const buy = page.locator("[data-main-product] [data-product-buy]"); await buy.scrollIntoViewIfNeeded(); await buy.locator("[data-qty-step='1']").tap(); await buy.locator("[data-qty-step='1']").tap(); await buy.locator("button[type=submit]").tap(); await page.waitForTimeout(1500); }
    if (!(await page.locator("[data-cart-drawer].is-open").count())) { await page.locator("[data-cart-open]").first().tap(); await page.waitForTimeout(900); }
    const drawer = page.locator("[data-cart-drawer]"); assert.ok(await drawer.evaluate((el) => el.classList.contains("is-open")), "tiroir ouvert");
    const geo = async () => ({ viewport: height, head: await rect(page, ".es-drawer__head"), scroll: await rect(page, "[data-cart-scroll]"), bands: await page.evaluate(() => [...document.querySelectorAll(".es-drawer__band")].map((b) => { const r = b.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; })), line: await rect(page, ".es-line-item"), title: await rect(page, ".es-line-item__title"), price: await rect(page, ".es-line-item__price"), qty: await rect(page, ".es-line-item .es-qty"), remove: await rect(page, ".es-line-item__remove"), protect: await rect(page, "[data-cart-protect-toggle]"), guarantee: await rect(page, ".es-drawer__guarantee"), foot: await rect(page, ".es-drawer__foot"), checkout: await rect(page, ".es-drawer__checkout"), close: await rect(page, ".es-drawer__head [data-cart-close]"), chip: await rect(page, "#es-static-note") });
    const opening = await geo(); await page.screenshot({ path: path.join(out, `${kind}-panier-1-ouverture-${dev}.png`) });
    // Dès l'ouverture : ligne complète (titre, prix, quantités, retrait) dans la zone défilable, sous les bandeaux ; pied et bouton dans l'écran ; rien sous la pastille.
    for (const k of ["line", "title", "price", "qty", "remove"] as const) assert.ok(inside(opening[k], opening.scroll), `${dev} : ${k} visible dès l'ouverture (${JSON.stringify(opening[k])} dans ${JSON.stringify(opening.scroll)})`);
    for (const b of opening.bands) assert.ok(b.bottom <= opening.line!.top + 1, `${dev} : bandeau au-dessus de la ligne, sans recouvrement`);
    assert.ok(opening.foot!.bottom <= height && opening.checkout!.bottom <= height, `${dev} : pied et bouton de paiement dans l'écran`);
    assert.ok(opening.foot!.top >= opening.scroll!.bottom - 1, `${dev} : le pied ne recouvre pas la zone des articles`);
    assert.ok(!opening.chip?.visible, `${dev} : pastille d'aperçu masquée pendant que le tiroir est ouvert (mention dans le pied du tiroir)`);
    assert.ok(opening.scroll!.bottom - opening.scroll!.top >= 200, `${dev} : zone des articles exploitable (${opening.scroll!.bottom - opening.scroll!.top}px)`);
    const scroller = page.locator("[data-cart-scroll]"); const atBottom = async () => { await scroller.evaluate((el) => { el.scrollTo({ top: el.scrollHeight, behavior: "instant" as ScrollBehavior }); }); await page.waitForTimeout(500); };
    await atBottom(); const bottom = await geo(); await page.screenshot({ path: path.join(out, `${kind}-panier-2-bas-${dev}.png`) });
    if (bottom.protect) assert.ok(inside(bottom.protect, bottom.scroll), `${dev} : interrupteur de protection atteignable par défilement`);
    if (bottom.guarantee) assert.ok(inside(bottom.guarantee, bottom.scroll), `${dev} : réassurance atteignable par défilement`);
    await scroller.evaluate((el) => el.scrollTo({ top: 0 })); await page.waitForTimeout(300);
    const before = await drawer.locator(".es-drawer__total strong").innerText(); await page.locator(".es-line-item .es-qty [data-qty-change]").nth(1).tap(); await page.waitForTimeout(1200); const after = await drawer.locator(".es-drawer__total strong").innerText(); assert.notEqual(after, before, `${dev} : total mis à jour après +1`);
    const plus = await geo(); for (const k of ["line", "qty", "remove"] as const) assert.ok(inside(plus[k], plus.scroll), `${dev} : ${k} visible après modification`); await page.screenshot({ path: path.join(out, `${kind}-panier-3-quantite-${dev}.png`) });
    await page.locator(".es-line-item__remove").first().tap(); await page.waitForTimeout(1200); assert.equal(await page.locator(".es-line-item").count(), 0, `${dev} : ligne retirée`); assert.match(await drawer.innerText(), /vide/i); await page.screenshot({ path: path.join(out, `${kind}-panier-4-retire-${dev}.png`) });
    await page.locator(".es-drawer__head [data-cart-close]").tap(); await page.waitForTimeout(700); assert.equal(await drawer.evaluate((el) => el.classList.contains("is-open")), false, `${dev} : tiroir fermé`);
    assert.deepEqual(errors, [], `${dev} : erreurs JavaScript`);
    report.push({ dev, cart: { opening, bottom, afterPlus: { total: after, before }, removed: true, closed: true } });
    const video = page.video(); await context.close(); if (video) { const file = path.join(out, `${kind}-panier-sequence-${dev}.webm`); await video.saveAs(file); }
  }
  fs.rmSync(path.join(out, "video-tmp"), { recursive: true, force: true });
  fs.writeFileSync(path.join(out, `${kind}-mobile.json`), JSON.stringify({ kind, dir, date: new Date().toISOString(), report }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, kind, devices: report.map((r) => r.dev) }));
} finally { await browser.close(); server.close(); }
