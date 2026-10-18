/** Rendus réels via les routes d'aperçu, base temporaire, médias autorisés existants, aucun appel IA.
 * CHROMIUM=/usr/bin/chromium npx tsx scripts/lot2a-passe2-proof.ts reports/lot2a/passe-2
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
import { unzipSync, strFromU8 } from "fflate";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base configurée refusée : données isolées obligatoires.");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot2a-"));
process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Réseau fournisseur interdit dans cette preuve."); };
const out = path.resolve(process.argv[2] ?? "reports/lot2a/passe-2"); fs.mkdirSync(out, { recursive: true });
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const sourceDirty = execFileSync("git", ["status", "--porcelain", "--", "src", "theme-base", "tests", "scripts", "public/theme-references"], { encoding: "utf8" }).trim() !== "";
const { referenceProject } = await import("../tests/lot2a-fixtures");
const { referencePurchase } = await import("../tests/lot2a-purchase-fixture");
const { createUser } = await import("../src/lib/auth");
const { all } = await import("../src/lib/db");
const { saveThemeVersion } = await import("../src/lib/projects");
const { previewSegment } = await import("../src/lib/theme/preview-access");
const { GET, POST } = await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { libraryLoader } = await import("../src/lib/theme/loader");
const { shopifyProductsCsv } = await import("../src/lib/theme/catalog-export");
const { runWithLang } = await import("../src/lib/i18n-server");
const sharp = (await import("sharp")).default;
const user = await createUser("references-lot2a@example.invalid", "isolated-test-only", "Démonstrations isolées");
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, "http://127.0.0.1"), match = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/);
    if (!match) return res.writeHead(404).end();
    const data: Buffer[] = []; for await (const chunk of req) data.push(Buffer.from(chunk));
    const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, ...(data.length ? { body: Buffer.concat(data) } : {}) });
    const response = await (req.method === "POST" ? POST : GET)(request, { params: Promise.resolve({ id: match[1], vid: match[2], path: (match[3] ?? "").split("/").filter(Boolean) }) });
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500).end(); }
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const evidence: any[] = [];
async function loaded(page: Page) {
  await page.evaluate("window.__name = (fn) => fn");
  await page.evaluate(async () => {
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .75) { scrollTo({ top: y, behavior: "instant" }); await pause(180); }
    await Promise.all([...document.images].map(async (im) => { im.loading = "eager"; await im.decode().catch(() => {}); }));
    await document.fonts.ready; scrollTo({ top: 0, behavior: "instant" });
  });
  await page.waitForTimeout(750);
  const missing = await page.locator("img[src]").evaluateAll((els) => els.filter((x) => !(x as HTMLImageElement).naturalWidth).map((x) => x.getAttribute("alt")));
  assert.deepEqual(missing, [], "Toutes les images, recommandations comprises, doivent être chargées.");
}
try {
  for (const kind of ["products", "services"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const ref = await referenceProject(user.id, kind), { spec, pid } = ref;
    if (kind === "products") {
      referencePurchase(spec);
      // Le cadeau de test n'a pas de photographie : ne pas lui emprunter l'image de la montre.
      spec.store.collections = [{ handle: "selection-reference", title: "La montre", description: "Démonstration", products: [spec.store.product.handle] }];
      for (const section of Object.values(spec.templates.index.sections)) if (section.type === "featured-collection") section.settings.collection = "selection-reference";
      for (const section of Object.values(spec.templates[`product.${spec.store.product.template_suffix}`].sections)) if (section.type === "product-recommendations") section.disabled = true;
    }
    const version = saveThemeVersion(pid, spec, "Référence de démonstration isolée", "user");
    const base = `/preview/${pid}/v/${previewSegment(version.id, user.id, pid)}`, dir = path.join(out, kind); fs.mkdirSync(dir, { recursive: true });
    const detail = kind === "products" ? `/products/${spec.store.product.handle}` : `/pages/${spec.store.pages.find((p) => p.contentTarget === "service:creation")!.handle}`;
    const pages: any[] = [], exports: any[] = [], purchaseStates: any[] = [];
    let purchaseKeyboard = false;
    fs.writeFileSync(path.join(dir, "plan-contenus-medias.json"), JSON.stringify({ demo: true, note: "Photographies autorisées existantes ; répétitions éventuelles = même prise de vue, jamais annoncées comme de nouveaux projets. Accessoire cadeau fictif sans visuel.", pages: Object.entries(spec.templates).filter(([key]) => key === "index" || key.startsWith(kind === "products" ? "product." : "page.seo-")).map(([key, template]) => ({ template: key, sections: template.order.map((id) => ({ id, type: template.sections[id].type, role: ["ref-hero", "main-product"].includes(template.sections[id].type) ? "présentation" : template.sections[id].type === "ref-narrative" ? "détails / méthode" : template.sections[id].type.includes("media") ? "contexte" : "information / orientation", assets: [...new Set(JSON.stringify(template.sections[id]).match(/es-[a-z0-9_.-]+\.(?:jpg|png|webp)/g) ?? [])].map((file) => ({ file, asset: spec.files[file] })) })) })) }, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "theme-spec.json"), JSON.stringify(spec, null, 2) + "\n");
    fs.writeFileSync(path.join(dir, "pages-a-creer.json"), JSON.stringify(spec.store.pages, null, 2) + "\n");
    if (kind === "products") fs.writeFileSync(path.join(dir, "produits.csv"), shopifyProductsCsv(spec));
    for (const platform of ["shopify", "woocommerce", "prestashop"] as const) {
      const exp = await cmsExport(platform, spec, libraryLoader), zip = unzipSync(exp.zip);
      fs.writeFileSync(path.join(dir, `${platform}.zip`), exp.zip);
      fs.writeFileSync(path.join(dir, `${platform}-fichiers.json`), JSON.stringify(exp.files, null, 2) + "\n");
      if (platform === "shopify" && kind === "products") {
        const manifest = JSON.parse(strFromU8(zip["assets/es-product-templates.json"]));
        assert.equal(manifest.csvAssignsTemplates, false); assert.equal(manifest.installationVerified, false);
      }
      exports.push({ platform, kind: exp.kind, bytes: exp.zip.length, files: exp.files.length, media: exp.media.length, issues: exp.issues });
    }
    fs.writeFileSync(path.join(dir, "provenance-medias.json"), JSON.stringify(ref.media.map(({ id: _id, ...m }) => m), null, 2) + "\n");
    for (const [name, route] of [["accueil", "/"], [kind === "products" ? "produit" : "prestation", detail]] as const) {
      for (const width of [1440, 390, 768, 1024]) {
        const device = width === 390 ? "mobile" : "ordinateur";
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, isMobile: width === 390, hasTouch: width === 390 });
        await page.addInitScript("window.__name = (fn) => fn"); // Instrumentation du sérialiseur tsx, aucun style ni contenu modifié.
        const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
        await page.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort());
        await page.addInitScript(() => {
          (window as any).__metrics = { cls: 0, lcp: 0 };
          new PerformanceObserver((l) => l.getEntries().forEach((e: any) => { if (!e.hadRecentInput) (window as any).__metrics.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
          new PerformanceObserver((l) => l.getEntries().forEach((e: any) => { (window as any).__metrics.lcp = e.startTime; })).observe({ type: "largest-contentful-paint", buffered: true });
        });
        const response = await page.goto(origin + base + route + "?es_raw=1", { waitUntil: "networkidle" }); assert.equal(response?.status(), 200);
        await loaded(page);
        const measurements = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, h1: document.querySelectorAll("h1").length, images: document.images.length, ...((window as any).__metrics), duration: (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).duration, transferBytes: performance.getEntriesByType("resource").reduce((n, e: any) => n + e.transferSize, 0) || null }));
        assert.ok(measurements.scrollWidth <= width + 1, `${kind}/${name}/${width} déborde : ${measurements.scrollWidth}`);
        assert.equal(measurements.h1, 1, `${kind}/${name} doit avoir un titre principal unique`);
        let file: string | null = null;
        if (width === 1440 || width === 390) {
          file = `${name}-${device}.png`; await page.screenshot({ path: path.join(dir, file), fullPage: true });
          await sharp(path.join(dir, file)).resize({ width: width === 1440 ? 720 : 390 }).webp({ quality: 78 }).toFile(path.join(dir, `${name}-${device}-apercu.webp`));
          if (kind === "products" && name === "produit") {
            const purchase = page.locator("[data-purchase]").first();
            assert.equal(await purchase.count(), 1);
            for (const quantity of [2, 3, 1]) {
              await purchase.locator(`input[data-quantity="${quantity}"]`).check();
              await page.waitForTimeout(220);
              assert.equal(await purchase.locator("[data-offer-variants] select").count(), quantity);
              assert.equal(await purchase.locator("[data-gift].is-unlocked").count(), quantity >= 3 ? 1 : 0);
              const shot = `achat-${quantity}-${device}.png`; await purchase.screenshot({ path: path.join(dir, shot) });
              purchaseStates.push({ width, quantity, file: shot, gift: quantity >= 3, total: await purchase.locator("[data-purchase-total]").textContent() });
            }
            await purchase.locator("input[data-quantity='2']").focus(); await page.keyboard.press("ArrowDown");
            assert.ok(await purchase.locator("input[data-quantity='3']").isChecked());
            await page.keyboard.press("ArrowUp"); assert.ok(await purchase.locator("input[data-quantity='2']").isChecked()); purchaseKeyboard = true;
            assert.ok(await purchase.locator("option[value='1002']").first().evaluate((el) => (el as HTMLOptionElement).disabled));
            assert.match(await purchase.locator("[data-gift]").innerText(), /Pochette de démonstration/);
            await purchase.locator("input[data-quantity='3']").check();
            await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1001");
            assert.match((await purchase.locator("[data-purchase-total]").textContent())!, /349/);
            await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1000");
            await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/cart"); await loaded(page);
            assert.match((await page.locator(".es-cart__summary").innerText()), /340,56/);
            assert.ok(await page.locator("[data-cart-qty]").last().isDisabled());
            await page.screenshot({ path: path.join(dir, `panier-trio-${device}.png`), fullPage: true });
            await page.locator("[data-cart-qty]").first().fill("2");
            await page.locator("button[name='update']").click(); await page.waitForLoadState("networkidle");
            await page.waitForTimeout(300);
            assert.equal(await page.locator(".es-cart .es-line-item").count(), 1);
            assert.match(await page.locator(".es-cart__summary").innerText(), /237,36/);
            await page.screenshot({ path: path.join(dir, `panier-duo-${device}.png`), fullPage: true });
            await page.locator(".es-line-item__remove").first().click(); await page.waitForLoadState("networkidle");
            assert.equal(await page.locator(".es-cart .es-line-item").count(), 0);
          }
          if (name === "accueil") {
            await page.screenshot({ path: path.join(dir, `entete-${device}.png`) });
            await page.locator(".ref-editorial").first().screenshot({ path: path.join(dir, `section-${device}.png`) });
            await page.locator(".es-footer").screenshot({ path: path.join(dir, `pied-${device}.png`) });
          }
        }
        pages.push({ name, route, width, file, measurements, missingImages: 0, javascriptErrors: errors });
        assert.deepEqual(errors, []); await page.close();
      }
    }
    if (kind === "products") {
      const emptyStock = structuredClone(spec); emptyStock.store.products!.find((p) => p.contentTarget === "product:catalog:test-pouch")!.variants[0].inventory_quantity = 0;
      const unavailable = saveThemeVersion(pid, emptyStock, "État isolé : stock cadeau nul", "user");
      const stockBase = `/preview/${pid}/v/${previewSegment(unavailable.id, user.id, pid)}`;
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort());
      await page.goto(origin + stockBase + detail + "?es_raw=1", { waitUntil: "networkidle" }); await loaded(page);
      await page.locator("[data-purchase] input[data-quantity='3']").check();
      assert.equal(await page.locator("[data-gift].is-unlocked").count(), 0);
      await page.locator("[data-purchase]").screenshot({ path: path.join(dir, "achat-cadeau-indisponible-mobile.png") });
      purchaseStates.push({ width:390, quantity:3, gift:"stock nul", file:"achat-cadeau-indisponible-mobile.png" });
      await page.close();
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir, size: { width: 1280, height: 800 } } });
    const page = await context.newPage();
    await page.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort());
    await page.goto(origin + base + "/?es_raw=1", { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    for (const selector of [".ref-narrative", ".ref-offers", ".v2-faq"]) {
      const el = page.locator(selector).first(); if (await el.count()) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(900); }
    }
    const chapter = page.locator("[data-narrative-chapter] summary").nth(1);
    if (await chapter.count()) { await chapter.click(); await page.waitForTimeout(750); assert.ok(await chapter.evaluate((el) => el.parentElement!.hasAttribute("open"))); }
    const faq = page.locator(".v2-faq details summary").first();
    if (await faq.count()) { await faq.click(); assert.ok(await faq.evaluate((el) => el.parentElement!.hasAttribute("open"))); await page.waitForTimeout(600); }
    await page.goto(origin + base + detail + "?es_raw=1", { waitUntil: "networkidle" }); await page.waitForTimeout(800);
    let gallery = false, cart = false;
    if (kind === "products") {
      const thumb = page.locator("[data-gallery-go='1']").first();
      if (await thumb.count()) { await thumb.click(); await page.waitForTimeout(700); gallery = await thumb.evaluate((e) => e.classList.contains("is-active")); }
      const purchase = page.locator("[data-purchase]");
      await purchase.locator("input[data-quantity='3']").check(); await page.waitForTimeout(650);
      await purchase.locator("[data-offer-variants] select").nth(1).selectOption("1001"); await page.waitForTimeout(650);
      await purchase.locator("input[data-quantity='1']").check(); await page.waitForTimeout(650);
      await purchase.locator("input[data-quantity='3']").check(); await page.waitForTimeout(650);
      await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/cart"); await page.waitForTimeout(900);
      cart = await page.locator(".es-cart .es-line-item").count() === 3 || await page.locator(".es-cart .es-line-item").count() === 2;
      await page.locator("[data-cart-qty]").first().fill("1"); await page.locator("button[name='update']").click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(750);
    } else {
      await page.getByRole("link", { name: "Parlons de votre projet" }).first().click();
      await page.waitForLoadState("networkidle");
      await page.locator("input[name='contact[name]']").fill("Essai isolé");
      await page.locator("input[name='contact[email]']").fill("essai@example.invalid");
      await page.locator("textarea[name='contact[body]']").fill("Démonstration locale : aucun envoi réel.");
      await page.waitForTimeout(1200);
    }
    await page.setViewportSize({ width: 390, height: 800 }); await page.goto(origin + base + "/?es_raw=1", { waitUntil: "networkidle" });
    await page.locator("[data-menu-open]").click(); await page.waitForTimeout(900);
    assert.equal(await page.locator("[data-menu-open]").getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Escape"); assert.equal(await page.locator("[data-menu-open]").getAttribute("aria-expanded"), "false");
    assert.ok(await page.locator("[data-menu-open]").evaluate((el) => document.activeElement === el), "Focus rendu au bouton du menu");
    const focus = await page.locator("[data-menu-open]").evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, width: getComputedStyle(el).outlineWidth }));
    assert.notEqual(focus.style, "none"); assert.notEqual(focus.width, "0px");
    await page.emulateMedia({ reducedMotion: "reduce" });
    const motion = await page.locator(".ref-hero__copy").evaluate((e) => getComputedStyle(e).animationName); assert.equal(motion, "none");
    await page.goto(origin + base + (kind === "products" ? detail : "/") + "?es_raw=1", { waitUntil: "networkidle" });
    const narrativeMotion = await page.locator("[data-narrative-image]:not([hidden])").first().evaluate((el) => getComputedStyle(el).animationName);
    assert.equal(narrativeMotion, "none", "Le nouveau récit respecte aussi le mouvement réduit");
    const video = page.video()!; await context.close(); const webm = await video.path();
    execFileSync("ffmpeg", ["-y", "-i", webm, "-an", "-c:v", "libx264", "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(dir, "parcours.mp4")], { stdio: "ignore" });
    fs.renameSync(webm, path.join(dir, "parcours.webm")); // Source native conservée à côté de la version de lecture MP4.
    if (kind === "products") { assert.ok(gallery, "Miniature de galerie active"); assert.ok(cart, "Panier natif d'aperçu ouvert"); }
    // Pages clés supplémentaires et validation HTML du formulaire, sans simuler un envoi réussi.
    const extra = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await extra.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort());
    const keyRoutes = kind === "products" ? ["/collections/all", "/pages/contact"] : ["/pages/prestations", "/pages/a-propos", "/pages/contact"];
    for (const route of keyRoutes) { const r = await extra.goto(origin + base + route + "?es_raw=1", { waitUntil: "networkidle" }); assert.equal(r?.status(), 200); await loaded(extra); assert.ok(await extra.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)); }
    const requiredEmail = extra.locator("main input[name='contact[email]']");
    assert.equal(await requiredEmail.getAttribute("type"), "email");
    assert.ok(await requiredEmail.evaluate((el) => !(el as HTMLInputElement).checkValidity()));
    await requiredEmail.fill("test@example.invalid"); assert.ok(await requiredEmail.evaluate((el) => (el as HTMLInputElement).checkValidity()));
    await extra.close();
    evidence.push({ kind, direction: spec.direction, purchaseStates, sections: spec.templates.index.order.map((id) => spec.templates.index.sections[id].type), visibleSections: spec.templates.index.order.filter((id) => !spec.templates.index.sections[id].disabled).length, pages, keyRoutes, exports, interactions: { gallery, cart, purchaseKeyboard, faq: true, mobileMenu: true, escape: true, focusReturned: true, focus, emailValidation: true, reducedMotion: motion, narrativeReducedMotion:narrativeMotion, contactDelivery: "non vérifiée : aucune soumission externe" } });
    console.log(`${kind} : ${pages.length} vues vérifiées, PNG et vidéo enregistrés.`);
  });
  assert.equal(all("SELECT 1 FROM ai_calls").length, 0);
  fs.writeFileSync(path.join(out, "preuves.json"), JSON.stringify({ sourceCommit, sourceDirty, generatedAt: new Date().toISOString(), environment: "Chromium local, routes GET/POST d'aperçu réelles, base temporaire, réseau fournisseur bloqué", aiCalls: 0, cmsInstalled: false, cases: evidence }, null, 2) + "\n");
} finally { await browser.close(); await new Promise<void>((r) => server.close(() => r())); fs.rmSync(temp, { recursive: true, force: true }); }
