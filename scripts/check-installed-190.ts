/**
 * Mission #190, point 6 — contrôle d'un thème INSTALLÉ dans une boutique de test (WordPress/WooCommerce ou PrestaShop).
 *
 *   npx tsx scripts/check-installed-190.ts <plateforme> <adresse> <pages.json> <dossier-de-sortie>
 *
 * pages.json : { "pages": ["/", "/contact/", …], "product": "/product/…/", "cart": "/cart/", "checkout": "/checkout/" }
 * Pour chaque page, à 1440 px et 390 px : code HTTP, erreurs PHP affichées, erreurs JavaScript, sections du studio
 * rendues, images non chargées, débordement horizontal, liens internes (réponse de chaque adresse), capture.
 * Puis, pour une boutique : choix d'une variante et « Ajouter au panier » DANS LA PAGE (bouton du thème), panier
 * relu, et commande passée par le paiement à la livraison de la boutique de test (aucun paiement réel).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

const [platform, base, plan, outDir] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(plan, "utf8")) as { pages: string[]; product?: string; cart?: string; checkout?: string };
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const origin = new URL(base).origin;
const linkStatus = new Map<string, number>();
const result: Record<string, unknown> = { platform, base, pages: [] as unknown[] };

async function visit(p: Page, route: string, width: number) {
  const errors: string[] = [];
  p.removeAllListeners("pageerror"); p.removeAllListeners("console");
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|favicon/.test(m.text())) errors.push(m.text().slice(0, 160)); });
  await p.setViewportSize({ width, height: width > 800 ? 900 : 844 });
  const resp = await p.goto(new URL(route, base).href, { waitUntil: "load", timeout: 60_000 });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(250);
  const info = await p.evaluate(() => ({
    php: (document.body.innerText.match(/(Fatal error|Parse error|Warning|Notice|Deprecated): .{0,120}/g) ?? []).slice(0, 3),
    liquid: /Liquid error/.test(document.body.innerHTML),
    sections: document.querySelectorAll("[data-es-type], .shopify-section").length,
    images: [...document.images].filter((i) => i.currentSrc && i.complete && i.naturalWidth === 0).map((i) => i.currentSrc).slice(0, 5),
    overflow: document.documentElement.scrollWidth - innerWidth,
    links: [...new Set([...document.querySelectorAll<HTMLAnchorElement>("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin) && !/wp-admin|logout|add-to-cart|#$/.test(h)).map((h) => h.split("#")[0]))],
  }));
  if (width === 1440 || route === "/") await p.screenshot({ path: path.join(outDir, `${route.replace(/[^a-z0-9]+/gi, "_") || "accueil"}-${width}.png`), fullPage: false });
  return { route, width, status: resp?.status() ?? 0, errors, ...info, links: info.links.length, linkList: info.links };
}

for (const route of cfg.pages) for (const width of [1440, 390]) {
  try {
    const r = await visit(page, route, width);
    for (const l of r.linkList) if (!linkStatus.has(l) && linkStatus.size < 400) linkStatus.set(l, (await ctx.request.get(l, { maxRedirects: 3, timeout: 30_000 }).catch(() => null))?.status() ?? 0);
    const { linkList: _l, ...rest } = r;
    (result.pages as unknown[]).push(rest);
  } catch (e) { (result.pages as unknown[]).push({ route, width, status: 0, errors: [(e as Error).message.slice(0, 200)] }); }
}
result.brokenLinks = [...linkStatus].filter(([, s]) => s >= 400 || s === 0).map(([l, s]) => `${s} ${l.slice(origin.length)}`);
result.linksChecked = linkStatus.size;

// Achat : variante choisie et ajout au panier par le bouton de la page, panier, commande (paiement à la livraison).
if (cfg.product) {
  const buy: Record<string, unknown> = {};
  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(new URL(cfg.product, base).href, { waitUntil: "load" });
    for (const sel of await page.locator("form.cart select, form.variations_form select, #add-to-cart-or-refresh select").all()) {
      const values = await sel.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
      if (values.length) { await sel.selectOption(values[values.length > 1 ? 1 : 0]).catch(() => undefined); buy.variant = values[values.length > 1 ? 1 : 0]; }
    }
    await page.waitForTimeout(500);
    const add = page.locator("form.cart button.single_add_to_cart_button, button.add-to-cart, [data-button-action=add-to-cart]").filter({ visible: true }).first();
    buy.addButton = await add.count();
    // Bandeau des cookies (choix demandé avant tout) : refusé, comme le ferait un visiteur.
    const consent = page.getByRole("button", { name: /refuser|tout refuser|accepter|j'accepte/i }).filter({ visible: true }).first();
    if (await consent.count()) { await consent.click({ timeout: 3000 }).catch(() => undefined); buy.cookies = "bandeau fermé"; }
    if (await add.count()) {
      buy.disabled = await add.isDisabled();
      await add.click({ timeout: 8000 }).catch(async () => { buy.forced = true; await add.click({ force: true, timeout: 8000 }); });
      await page.waitForTimeout(platform === "prestashop" ? 2500 : 1500);
    }
    await page.goto(new URL(cfg.cart ?? "/cart/", base).href, { waitUntil: "load" });
    await page.screenshot({ path: path.join(outDir, "panier-1440.png") });
    buy.cartText = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 400);
    if (platform === "woocommerce") {
      const cart = await (await ctx.request.get(`${origin}/wp-json/wc/store/v1/cart`)).json() as { items: { id: number; name: string; quantity: number; variation: unknown[] }[]; totals: { total_price: string } };
      buy.cartItems = cart.items.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, variation: i.variation }));
      const nonce = (await ctx.request.get(`${origin}/wp-json/wc/store/v1/cart`)).headers()["nonce"];
      const addr = { first_name: "Test", last_name: "Mission190", address_1: "1 rue de l'Essai", city: "Paris", postcode: "75001", country: "FR", email: "essai@example.invalid", phone: "0600000000" };
      const order = await ctx.request.post(`${origin}/wp-json/wc/store/v1/checkout`, { headers: { Nonce: nonce, "Content-Type": "application/json" }, data: { billing_address: addr, shipping_address: addr, payment_method: "cod" } });
      const j = await order.json() as { order_id?: number; status?: string; message?: string };
      buy.checkout = { http: order.status(), order: j.order_id ?? null, status: j.status ?? j.message ?? null };
    }
    if (platform === "prestashop") {
      // Commande invitée par le tunnel natif : coordonnées, adresse, livraison, paiement hors ligne (virement), CGV.
      const steps: string[] = [];
      try {
        await page.goto(new URL("/index.php?controller=order", base).href, { waitUntil: "load" });
        const f = page.locator("#customer-form");
        await f.locator("input[name=firstname]").fill("Test");
        await f.locator("input[name=lastname]").fill("Mission");
        await f.locator("input[name=email]").fill(`essai-${Date.now()}@example.invalid`);
        for (const c of await f.locator("input[type=checkbox][required], input[name=customer_privacy], input[name=psgdpr]").all()) await c.check({ force: true }).catch(() => undefined);
        await f.locator("button[name=continue]").click(); steps.push("coordonnées");
        await page.waitForLoadState("load");
        const a = page.locator(".js-address-form form, #delivery-address form").first();
        await a.locator("input[name=address1]").fill("1 rue de l'Essai");
        await a.locator("input[name=postcode]").fill("75001");
        await a.locator("input[name=city]").fill("Paris");
        await a.locator("button[name=confirm-addresses]").click(); steps.push("adresse");
        await page.waitForLoadState("load");
        await page.locator("button[name=confirmDeliveryOption]").click(); steps.push("livraison");
        await page.waitForLoadState("load");
        await page.locator("input[name=payment-option]").first().check({ force: true }); steps.push("paiement");
        await page.locator("input[name='conditions_to_approve[terms-and-conditions]']").check({ force: true }).catch(() => undefined);
        await page.locator("#payment-confirmation button").click();
        await page.waitForURL(/order-confirmation|confirmation/, { timeout: 30_000 });
        steps.push("commande");
        await page.screenshot({ path: path.join(outDir, "commande-1440.png") });
        buy.checkout = { steps, url: page.url().replace(origin, ""), ok: true };
      } catch (e) { buy.checkout = { steps, ok: false, error: (e as Error).message.slice(0, 200) }; }
    }
  } catch (e) { buy.error = (e as Error).message.slice(0, 300); }
  result.buy = buy;
}
fs.writeFileSync(path.join(outDir, "resultat.json"), JSON.stringify(result, null, 2) + "\n");
const pages = result.pages as { status: number; errors?: string[]; php?: string[]; images?: string[]; overflow?: number; sections?: number }[];
console.log(JSON.stringify({ pages: pages.length, http_ko: pages.filter((p) => p.status >= 400 || !p.status).length, js: pages.reduce((n, p) => n + (p.errors?.length ?? 0), 0), php: pages.reduce((n, p) => n + (p.php?.length ?? 0), 0), images: pages.reduce((n, p) => n + (p.images?.length ?? 0), 0), overflow: pages.filter((p) => (p.overflow ?? 0) > 1).length, noSections: pages.filter((p) => !p.sections).length, brokenLinks: (result.brokenLinks as string[]).length, linksChecked: result.linksChecked, buy: result.buy }));
await browser.close();
