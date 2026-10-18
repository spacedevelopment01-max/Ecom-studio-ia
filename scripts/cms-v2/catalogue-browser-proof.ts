/** Parcours des CMS réellement installés en boucle locale. Aucun faux panier, paiement, e-mail ni appel IA. */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const dir = path.resolve(process.argv[2] || "");
const mode = process.argv[3] ?? "products";
if (!process.argv[2] || dir.startsWith(process.cwd() + "/")) throw new Error("Dossier privé hors dépôt requis");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox"] });
const results: any[] = [];
async function scan(page: Page) {
  return page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
    for (const i of document.images) { i.loading = "eager"; await i.decode().catch(() => {}); }
    await document.fonts.ready; scrollTo(0, 0);
    return { overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), broken: [...document.images].filter(i => i.getAttribute("src") && !i.naturalWidth).map(i => i.getAttribute("src")), h1: document.querySelectorAll("h1").length };
  });
}
try {
  for (const platform of ["woocommerce", "prestashop"] as const) {
    const native = JSON.parse(fs.readFileSync(path.join(dir, `${platform}-native.json`), "utf8"));
    const products = native["products-update-verified"].products;
    const base = new URL(products[0].url).origin;
    assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390, locale: "fr-FR" });
      await context.route("**/*", route => { const u = new URL(route.request().url()); return ["localhost", "127.0.0.1"].includes(u.hostname) || ["data:", "blob:"].includes(u.protocol) ? route.continue() : route.abort(); });
      const page = await context.newPage(); const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
      const consoleErrors: string[] = []; page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(30_000);
      const response = await page.goto(base, { waitUntil: "networkidle" }); assert.equal(response?.status(), 200);
      const home = await scan(page); await page.screenshot({ path: path.join(dir, `${platform}-${mode}-${width}.png`), fullPage: true });
      if (mode === "products") {
        const grid = page.locator('[data-es-type="featured-collection"]');
        const text = await grid.innerText(); assert(text.includes("Sérum Éclat") && text.includes("Brosse nettoyante")); assert(!text.includes("Rouleau de jade"));
        await page.goto(products[0].url, { waitUntil: "networkidle" });
        const selected = products[0].variants[0];
        if (platform === "woocommerce") {
          const selects = page.locator("form.variations_form select"); assert.equal(await selects.count(), 3);
          // Laisser les événements natifs Woo (réinitialisation de galerie incluse) se terminer entre choix.
          for (let i = 0; i < 3; i++) { await selects.nth(i).selectOption({ label: selected.options[i] }); await page.waitForTimeout(250); }
          await page.waitForFunction(id => (document.querySelector('input.variation_id') as HTMLInputElement)?.value === String(id), selected.id, { timeout: 15_000 });
          const expectedImage = await page.locator('form.variations_form').evaluate((el, id) => JSON.parse(el.getAttribute('data-product_variations') || '[]').find((v: any) => v.variation_id === id)?.image?.src, selected.id);
          if (expectedImage) await page.waitForFunction(url => {
            const gallery = document.querySelector('.woocommerce-product-gallery');
            const visible = gallery?.querySelector('.flex-active-slide img') || gallery?.querySelector('.woocommerce-product-gallery__image img');
            return (visible as HTMLImageElement)?.src === url;
          }, expectedImage, { timeout: 15_000 });
          await page.locator(".single_add_to_cart_button").click();
          await page.waitForLoadState("networkidle");
          await page.goto(base + "/cart/", { waitUntil: "networkidle" });
          const quantity = page.locator('input.qty,.wc-block-components-quantity-selector__input').filter({ visible: true }).first(); await quantity.fill("2"); await quantity.dispatchEvent("change"); await quantity.press("Tab");
          const update = page.locator('[name="update_cart"]'); if (await update.count()) await update.click(); await page.waitForLoadState("networkidle");
          assert.equal(await quantity.inputValue(), "2");
        } else {
          for (let i = 0; i < 3; i++) { await page.locator(".product-variants select").nth(i).selectOption({ label: selected.options[i] }); await page.waitForTimeout(450); }
          if (selected.image) await page.waitForFunction(id => (document.querySelector('.js-qv-product-cover') as HTMLImageElement)?.src.includes('/'+id+'-'), selected.image, {timeout:15_000});
          await page.locator('[data-button-action="add-to-cart"]').click(); await page.waitForTimeout(900);
          await page.goto(base + "/index.php?controller=cart&action=show", { waitUntil: "networkidle" });
          const quantity = page.locator(".js-cart-line-product-quantity").first(); await quantity.fill("2"); await quantity.press("Tab"); await page.waitForTimeout(900);
          assert.equal(await quantity.inputValue(), "2");
        }
        await page.waitForFunction(() => /66[,.]70/.test(document.body.innerText), null, { timeout: 15_000 });
        if (platform === 'woocommerce') await page.waitForFunction(() => document.querySelector('span.es-cart-count')?.textContent === '2', null, { timeout: 15_000 });
        await page.screenshot({ path: path.join(dir, `${platform}-cart-${width}.png`), fullPage: true });
        const cartText = await page.locator("body").innerText(); assert(/66[,.]70/.test(cartText));
        const holdout = products.find((p: any) => p.handle === "echantillon-carre");
        if (holdout) {
          await page.goto(holdout.url, { waitUntil: "networkidle" });
          const ids: string[] = [];
          for (const v of holdout.variants) {
            await page.locator(platform === "woocommerce" ? "form.variations_form select" : ".product-variants select").first().selectOption({ label: v.options[0] });
            if (platform === "woocommerce") { await page.waitForFunction(id => (document.querySelector('input.variation_id') as HTMLInputElement)?.value === String(id), v.id, { timeout: 15_000 }); ids.push(await page.locator('input.variation_id').inputValue()); }
            else {
              await page.waitForFunction(id => Number(JSON.parse(document.querySelector('#product-details')?.getAttribute('data-product') || '{}').id_product_attribute) === id, v.id, { timeout: 15_000 });
              const id = await page.locator('#product-details').evaluate(el => JSON.parse(el.getAttribute('data-product') || '{}').id_product_attribute); ids.push(String(id));
            }
          }
          assert.equal(new Set(ids).size, holdout.variants.length);
        }
      } else {
        assert.equal(await page.locator("form.variations_form,[data-purchase-offers]").count(), 0);
        const contactUrl = platform === "woocommerce" ? JSON.parse(fs.readFileSync(path.join(dir, "service-routes.json"), "utf8")).woocommerce : base + "/pages/contact";
        await page.goto(contactUrl, { waitUntil: "networkidle" });
        const form = page.locator('form:has(input[name="form_type"][value="contact"]):has(input[name="contact[email]"])').first();
        await form.locator('[name="contact[email]"]').fill(`cms-${platform}-${width}@example.invalid`);
        const name = form.locator('[name="contact[name]"]'); if (await name.count()) await name.fill("Test isolé");
        const body = form.locator('[name="contact[body]"]'); if (await body.count()) await body.fill("Demande locale de vérification, aucun envoi externe.");
        for (const checkbox of await form.locator('input[type="checkbox"][required]').all()) await checkbox.check();
        await form.locator('[type="submit"]').click(); await page.waitForLoadState("networkidle");
        assert((await page.locator("body").innerText()).match(/enregistr|Merci|Thank/i));
        await page.screenshot({ path: path.join(dir, `${platform}-contact-${width}.png`), fullPage: true });
      }
      results.push({ platform, mode, width, home, errors, consoleErrors }); await context.close();
    }
  }
  fs.writeFileSync(path.join(dir, `browser-${mode}.json`), JSON.stringify({ results, payment: "not-run", externalEmail: "disabled", paidCalls: 0 }, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
