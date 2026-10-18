/** Preuves des thèmes FRAISE GUMMIES / ONDE AUDIO (issue #137) via les vraies routes d'aperçu : captures 390 et 1440 px
 * (accueil, fiche, boutique, pages, menu ouvert, pied de page, panier vide et rempli, tiroir), interactions réellement
 * testées (offres, quantités, suppression, stories sans vidéo, FAQ, clavier, mouvement réduit), vidéos et comparaisons
 * côte à côte avec les captures de référence du kit. Base isolée, réseau fournisseur interdit, aucun appel IA.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/lot2c-proof.ts <dossier-de-sortie> <dossier-du-kit-extrait>
 *   PROOF_VIDEO=0 pour sauter les vidéos ; PROOF_WIDTHS=1440,390 pour limiter les largeurs.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chromium, type Page } from "playwright";
if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-lot2c-")); process.env.DATA_DIR = temp; process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("Réseau fournisseur interdit"); };
const out = path.resolve(process.argv[2] ?? "reports/lot2c"); fs.mkdirSync(out, { recursive: true });
const pack = process.argv[3]; if (!pack || !fs.existsSync(pack)) console.warn("Kit absent : captures explicitement incomplètes (cadres « Visuel à importer »).");
const WIDTHS = (process.env.PROOF_WIDTHS ?? "1440,390").split(",").map(Number);
const { conversionProject, DEMO_PROVENANCE } = await import("../tests/lot2c-fixtures");
const { createUser } = await import("../src/lib/auth"); const { all } = await import("../src/lib/db");
const { saveThemeVersion } = await import("../src/lib/projects"); const { previewSegment } = await import("../src/lib/theme/preview-access");
const { GET, POST } = await import("../src/app/preview/[id]/v/[vid]/[[...path]]/route");
const { runWithLang } = await import("../src/lib/i18n-server");
const sharp = (await import("sharp")).default;
const user = await createUser("lot2c-proof@example.invalid", "isolated-test-only", "Preuve isolée");
// Mire vidéo de 3 s générée localement : prouve le lecteur de stories (source, lecture, pause, son, fermeture), sans prétendre être une vidéo produit.
const testVideo = path.join(temp, "mire.webm"); try { execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "testsrc=size=540x960:rate=24", "-t", "8", "-c:v", "libvpx-vp9", "-b:v", "400k", "-an", testVideo], { stdio: "ignore" }); } catch { console.warn("ffmpeg absent : lecteur de stories non exercé"); }
const server = http.createServer(async (req, res) => { try {
  const url = new URL(req.url!, "http://127.0.0.1"), m = url.pathname.match(/^\/preview\/([^/]+)\/v\/([^/]+)(?:\/(.*))?$/); if (!m) return res.writeHead(404).end();
  const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
  const r = await (req.method === "POST" ? POST : GET)(request, { params: Promise.resolve({ id: m[1], vid: m[2], path: (m[3] ?? "").split("/").filter(Boolean) }) }); res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
} catch (e) { console.error(e); res.writeHead(500).end(); } });
await new Promise<void>((r) => server.listen(0, "127.0.0.1", r)); const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox"] });
const device = (w: number) => w === 390 ? "mobile" : w === 768 ? "tablette" : w === 1024 ? "portable" : "ordinateur";
const viewport = (w: number) => ({ width: w, height: w === 390 ? 844 : w === 768 ? 1024 : 900 });
async function loaded(page: Page) { await page.evaluate(async () => { const pause = (ms: number) => new Promise((r) => setTimeout(r, ms)); for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .8) { scrollTo({ top: y, behavior: "instant" }); await pause(80); } await document.fonts.ready; await Promise.all([...document.images].map(async (im) => { im.loading = "eager"; await im.decode().catch(() => {}); })); scrollTo({ top: 0, behavior: "instant" }); }); await page.waitForTimeout(700); }
async function attach(page: Page) { await page.addInitScript("window.__name=(fn)=>fn"); await page.route("**/*", (r) => r.request().url().startsWith(origin + "/") ? r.continue() : r.abort()); }
async function fullPage(page: Page, file: string) { await page.addStyleTag({ content: "[data-purchase-bar],.es-sticky-buy{display:none!important}" }); await page.screenshot({ path: file, fullPage: true }); await page.evaluate(() => { const s = [...document.querySelectorAll("style")].pop(); if (s && s.textContent?.includes("data-purchase-bar")) s.remove(); }); }
const REFERENCES: Record<string, Record<string, string>> = { fraise: { accueil: "lumora-accueil.png", produit: "lumora-produit.png", "panier-vide": "PANIERS/lumora-panier-vide.jpg", "panier-rempli": "PANIERS/lumora-panier-rempli.jpg" }, onde: { accueil: "pawish-accueil.png", produit: "pawish-produit.png", "panier-vide": "PANIERS/pawish-panier-vide.jpg", "panier-rempli": "PANIERS/pawish-panier-rempli.jpg" } };
/** Référence (365 px, mobile) à gauche, notre capture 390 px à droite, même largeur de colonne, hauteur du plus grand. */
async function compare(kind: string, name: string, ours: string, dir: string) {
  const ref = pack && REFERENCES[kind][name] ? path.join(pack, "REFERENCES_THEMES", REFERENCES[kind][name]) : null; if (!ref || !fs.existsSync(ref)) return null;
  const col = 390, left = await sharp(ref).resize({ width: col }).png().toBuffer(), right = await sharp(ours).resize({ width: col }).png().toBuffer();
  const lm = await sharp(left).metadata(), rm = await sharp(right).metadata(), h = Math.max(lm.height!, rm.height!) + 40;
  const label = (t: string) => Buffer.from(`<svg width="${col}" height="40"><rect width="100%" height="100%" fill="#111"/><text x="12" y="26" font-family="sans-serif" font-size="16" fill="#fff">${t}</text></svg>`);
  const file = path.join(dir, `comparaison-${name}-390.png`);
  await sharp({ create: { width: col * 2 + 20, height: h, channels: 3, background: "#e9e9e9" } }).composite([{ input: label(`Référence ${kind === "fraise" ? "Lumora" : "Pawish"} (365 px)`), left: 0, top: 0 }, { input: left, left: 0, top: 40 }, { input: label(`${kind === "fraise" ? "FRAISE" : "ONDE"} (390 px)`), left: col + 20, top: 0 }, { input: right, left: col + 20, top: 40 }]).png().toFile(file);
  return file;
}
const evidence: any[] = [];
try {
  for (const kind of ["fraise", "onde"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
    const f = await conversionProject(user.id, kind, pack, { testVideo: fs.existsSync(testVideo) ? testVideo : undefined }), { spec, pid } = f, version = saveThemeVersion(pid, spec, "Thème référence — composition isolée", "user");
    const base = `/preview/${pid}/v/${previewSegment(version.id, user.id, pid)}`, dir = path.join(out, kind); fs.mkdirSync(dir, { recursive: true });
    const pages: any[] = [], interactions: any[] = [], comparisons: string[] = [];
    fs.writeFileSync(path.join(dir, "theme-spec.json"), JSON.stringify(spec, null, 2) + "\n");
    // Logos vectorisés : fichiers livrés avec les preuves.
    if (f.logo) for (const [k, file] of Object.entries({ color: f.logo.color, inverse: f.logo.inverse, mono: f.logo.mono, favicon: f.logo.favicon })) { const asset = spec.files[file]; const r = await GET(new Request(`${origin}${base}/assets/${file}`), { params: Promise.resolve({ id: pid, vid: base.split("/v/")[1], path: ["assets", file] }) }); fs.writeFileSync(path.join(dir, `logo-${k}.svg`), Buffer.from(await r.arrayBuffer())); void asset; }
    const routes: [string, string][] = [["accueil", "/"], ["produit", f.detail], ["boutique", "/collections/all"], ["a-propos", "/pages/a-propos"], ["contact", "/pages/contact"], ["faq", "/pages/faq"], ["livraison-retours", "/pages/livraison-retours"], ["mentions-legales", "/pages/mentions-legales"], ["panier-vide", "/cart"], ["recherche", "/search?q=rien"], ["page-404", "/page-inconnue"]];
    for (const [name, route] of routes) for (const width of WIDTHS) {
      const dev = device(width), page = await browser.newPage({ viewport: viewport(width), isMobile: width === 390, hasTouch: width === 390 }); await attach(page); const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
      const sep = route.includes("?") ? "&" : "?", resp = await page.goto(origin + base + route + sep + "es_raw=1", { waitUntil: "networkidle" });
      assert.equal(resp?.status(), name === "page-404" ? 404 : 200, `${kind}/${name}`); await loaded(page);
      const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, h1: document.querySelectorAll("h1").length, images: document.images.length, brokenImages: [...document.images].filter((im) => !im.naturalWidth && !im.closest("[hidden]")).map((im) => im.src), missingMedia: document.querySelectorAll(".ed-media--pending").length, fonts: document.fonts.status, headerHeight: document.querySelector(".es-header")?.getBoundingClientRect().height, fictionalTags: document.querySelectorAll(".cv-fictional").length }));
      assert.equal(metrics.h1, 1, `${kind}/${name}/${width} : ${metrics.h1} h1`); assert.ok(metrics.scrollWidth <= width + 1, `${kind}/${name}/${width} déborde : ${metrics.scrollWidth}`); assert.deepEqual(metrics.brokenImages, []);
      await page.screenshot({ path: path.join(dir, `${name}-entete-${dev}.png`) }); await fullPage(page, path.join(dir, `${name}-${dev}.png`));
      if (name === "accueil" || name === "produit") await page.locator(".es-footer").screenshot({ path: path.join(dir, `${name}-pied-${dev}.png`) });
      if (width === 390 && (name === "accueil" || name === "produit" || name === "panier-vide")) { const c = await compare(kind, name, path.join(dir, `${name}-${dev}.png`), dir); if (c) comparisons.push(path.basename(c)); }
      if (name === "accueil") {
        // Menu mobile ouvert, Échap le ferme et rend le focus ; stories sans vidéo : aucun bouton de lecture, mention visible ; clavier sur les avis.
        if (width === 390) { await page.locator("[data-menu-open]").click(); await page.waitForTimeout(500); assert.equal(await page.locator("[data-menu-open]").getAttribute("aria-expanded"), "true"); await page.screenshot({ path: path.join(dir, "menu-mobile.png") }); await page.keyboard.press("Escape"); await page.waitForTimeout(300); assert.equal(await page.locator("[data-menu-open]").getAttribute("aria-expanded"), "false"); }
        const stories = page.locator("[data-cv-stories]"), withClip = fs.existsSync(testVideo); assert.equal(await stories.locator("[data-cv-story-open]").count(), withClip ? 1 : 0); assert.equal(await stories.locator(".cv-story__soon").count(), withClip ? 2 : 3); assert.ok((await stories.locator(".cv-story__ai").count()) >= 3);
        await stories.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); await stories.screenshot({ path: path.join(dir, `stories-${dev}.png`) });
        if (withClip) { // Lecteur : ouverture, source chargée à la demande, pause / lecture, son, fermeture par Échap, vidéo déchargée.
          await stories.locator("[data-cv-story-open]").first().click(); await page.waitForTimeout(900); const player = stories.locator("[data-cv-player]"); assert.ok(await player.evaluate((d) => (d as HTMLDialogElement).open), "lecteur ouvert");
          assert.match(await player.locator("[data-cv-video]").getAttribute("src") ?? "", /clip-test\.webm/); assert.match(await player.locator("[data-cv-player-title]").innerText(), /clip de test/);
          await player.locator("[data-cv-player-pause]").click(); await page.waitForTimeout(200); assert.ok(await player.locator("[data-cv-video]").evaluate((v) => (v as HTMLVideoElement).paused), "pause");
          await player.locator("[data-cv-player-pause]").click(); await page.waitForFunction(() => { const v = document.querySelector("[data-cv-video]") as HTMLVideoElement; return v && !v.paused; }, null, { timeout: 4000 }).catch(() => {}); assert.equal(await player.locator("[data-cv-video]").evaluate((v) => (v as HTMLVideoElement).paused), false, "lecture");
          await player.locator("[data-cv-player-sound]").click(); assert.equal(await player.locator("[data-cv-player-sound]").getAttribute("aria-pressed"), "true"); assert.equal(await player.locator("[data-cv-video]").evaluate((v) => (v as HTMLVideoElement).muted), false);
          await page.screenshot({ path: path.join(dir, `stories-lecteur-${dev}.png`) }); await page.keyboard.press("Escape"); await page.waitForTimeout(300); assert.equal(await player.evaluate((d) => (d as HTMLDialogElement).open), false); assert.equal(await player.locator("[data-cv-video]").getAttribute("src"), null, "vidéo déchargée à la fermeture");
          interactions.push({ width, stories: "lecteur ouvert sur le clip de test (mire générée), pause / lecture, son activé, Échap ferme et décharge la vidéo ; les deux autres cartes restent « Vidéo à venir »" });
        }
        const reviews = page.locator("[data-cv-reviews]"); await reviews.scrollIntoViewIfNeeded(); await page.waitForTimeout(400); assert.equal(await reviews.locator(".cv-fictional--tag").count(), 6);
        await reviews.locator("[data-cv-track]").focus(); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(700); assert.equal(await reviews.locator("[data-cv-dot].is-active").getAttribute("data-cv-dot"), "1"); await reviews.screenshot({ path: path.join(dir, `avis-${dev}.png`) });
        const faq = page.locator(".es-faq").last(); if (await faq.count()) { await faq.scrollIntoViewIfNeeded(); await faq.locator("summary").first().click(); await page.waitForTimeout(400); assert.equal(await faq.locator("details[open]").count(), 1); await faq.screenshot({ path: path.join(dir, `faq-${dev}.png`) }); }
        const table = page.locator(".es-ctable").first(); await table.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await table.screenshot({ path: path.join(dir, `comparatif-${dev}.png`) });
        interactions.push({ width, home: "menu ouvert/fermé au clavier (mobile), stories sans vidéo sans bouton de lecture, 6 mentions « Avis fictif », flèche droite → deuxième avis, FAQ ouverte" });
      }
      if (name === "contact") { await page.locator("form.es-contact__form button[type=submit]").click(); const invalid = await page.locator("form.es-contact__form input:invalid").count(); assert.ok(invalid >= 1, "validation du formulaire de contact"); assert.ok(page.url().includes("/pages/contact"), "toujours sur la page de contact, aucun envoi"); interactions.push({ width, contact: "envoi bloqué par la validation du champ e-mail requis ; aucun message « envoyé » affiché" }); }
      if (name === "produit") {
        const main = page.locator("[data-main-product]");
        if (kind === "fraise") {
          const purchase = main.locator("[data-purchase]"); assert.equal(await purchase.count(), 1);
          for (const [i, cents] of [[0, "24,90"], [1, "49,80"], [2, "74,70"]] as const) { await purchase.locator("input[data-quantity]").nth(i).check(); await page.waitForTimeout(250); assert.match(await purchase.locator("[data-purchase-total]").innerText(), new RegExp(cents)); }
          assert.match(await purchase.locator("[data-offer-compare]").nth(1).innerText(), /104,70/);
          await purchase.locator("input[data-quantity]").nth(1).check(); await purchase.screenshot({ path: path.join(dir, `offres-${dev}.png`) });
          if (width === 390) { await page.evaluate(() => scrollTo({ top: 400, behavior: "instant" })); await page.waitForTimeout(500); const bar = page.locator("[data-purchase-bar]"); assert.equal(await bar.isHidden(), false); assert.match(await bar.innerText(), /49,80/); await page.screenshot({ path: path.join(dir, "barre-achat-mobile.png") }); }
          await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/cart"); await page.waitForLoadState("networkidle");
          assert.match(await page.locator(".es-cart__summary").innerText(), /Total : 3 articles/); assert.match(await page.locator(".es-cart__summary").innerText(), /49,80/); assert.match(await page.locator(".es-cart__summary").innerText(), /Économies/);
          interactions.push({ width, offers: "1 / 2+1 / 3+2 → 24,90 / 49,80 / 74,70 € ; prix de référence barré 104,70 € ; ajout du 2+1 → panier 49,80 €, 3 articles, économies affichées" });
        } else {
          const buy = main.locator("[data-product-buy]"); assert.equal(await buy.count(), 1); await buy.locator("[data-qty-step='1']").click(); assert.equal(await buy.locator("input[name=quantity]").inputValue(), "2");
          assert.match(await main.innerText(), /−21 %/);
          if (width === 390) { await page.evaluate(() => { const buy = document.querySelector("#MainBuy")!; scrollTo({ top: buy.getBoundingClientRect().bottom + scrollY + 240, behavior: "instant" }); }); await page.waitForTimeout(800); const sticky = page.locator("[data-sticky-buy]"); assert.ok(await sticky.evaluate((el) => el.classList.contains("is-visible")), "barre fixe visible"); await page.screenshot({ path: path.join(dir, "barre-achat-mobile.png") }); await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" })); await page.waitForTimeout(300); }
          await buy.locator("button[type=submit]").click(); await page.waitForTimeout(1200);
          const drawer = page.locator("[data-cart-drawer]"); assert.ok(await drawer.evaluate((el) => el.classList.contains("is-open")), "tiroir ouvert après ajout");
          assert.match(await drawer.innerText(), /Total : 2 articles/); assert.match(await drawer.innerText(), /298,00/); assert.match(await drawer.innerText(), /démonstration fictive/i); assert.match(await drawer.innerText(), /Code de réduction/);
          await page.screenshot({ path: path.join(dir, `tiroir-panier-rempli-${dev}.png`) });
          // Code de réduction dans l'aperçu : message explicite, aucune remise inventée.
          await drawer.locator("[data-cart-discount-input]").fill("DEMO10"); await drawer.locator("[data-cart-discount-apply]").click(); await page.waitForTimeout(300); assert.equal(await drawer.locator("[data-cart-discount-note]").isHidden(), false, "note du code de réduction affichée dans l'aperçu"); assert.match(await drawer.innerText(), /298,00/);
          await page.goto(origin + base + "/cart?es_raw=1", { waitUntil: "networkidle" });
          interactions.push({ width, buy: "quantité 2 → ajout → tiroir ouvert : Total : 2 articles, 298,00 €, économies, bloc réservation marqué « Démonstration fictive », code DEMO10 → note « aucun code actif », total inchangé" });
        }
        await loaded(page); await fullPage(page, path.join(dir, `panier-rempli-${dev}.png`));
        if (width === 390) { const c = await compare(kind, "panier-rempli", path.join(dir, `panier-rempli-${dev}.png`), dir); if (c) comparisons.push(path.basename(c)); }
        const lineImages = await page.locator(".es-cart .es-line-item__media img").evaluateAll((els) => els.map((e) => e.getAttribute("src") || "")); if (pack) lineImages.forEach((src) => assert.match(src, /02-fond-clair/));
        // Tiroir ouvert depuis l'icône du panier, protection (FRAISE) jamais précochée, puis quantité modifiée et ligne retirée.
        await page.locator("[data-cart-open]").first().click(); await page.waitForTimeout(600); const drawer = page.locator("[data-cart-drawer]"); assert.ok(await drawer.evaluate((el) => el.classList.contains("is-open")));
        if (kind === "fraise") { assert.equal(await drawer.locator("[data-cart-protect-toggle]").getAttribute("aria-checked"), "false"); await drawer.locator("[data-cart-protect-toggle]").click(); assert.equal(await drawer.locator("[data-cart-protect-note]").isHidden(), false); assert.match(await drawer.innerText(), /aucun montant n'est ajouté/); await drawer.locator("[data-cart-protect-toggle]").click(); }
        await page.screenshot({ path: path.join(dir, `tiroir-panier-${dev}.png`) }); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
        if (kind === "onde") { await page.locator("[data-cart-qty]").first().fill("1"); await page.locator("button[name='update']").click(); await page.waitForLoadState("networkidle"); assert.match(await page.locator(".es-cart__summary").innerText(), /Total : 1 article\b/); assert.match(await page.locator(".es-cart__summary").innerText(), /149,00/); }
        await page.locator(".es-line-item__remove").first().click(); await page.waitForLoadState("networkidle"); assert.equal(await page.locator(".es-cart .es-line-item").count(), 0); assert.match(await page.locator("main").innerText(), /Votre panier est vide/);
        await page.locator("[data-cart-open]").first().click(); await page.waitForTimeout(600); await page.screenshot({ path: path.join(dir, `tiroir-panier-vide-${dev}.png`) }); await page.keyboard.press("Escape");
        interactions.push({ width, cart: "tiroir ouvert, protection non précochée (FRAISE : interrupteur → note « aucun montant ajouté »), quantité modifiée (ONDE : 2 → 1 = 149,00 €), ligne retirée → panier vide, tiroir vide capturé" });
      }
      assert.deepEqual(errors, []); pages.push({ name, route, width, metrics, javascriptErrors: errors }); await page.close();
    }
    const reduced = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }); await attach(reduced); await reduced.goto(origin + base + "/?es_raw=1", { waitUntil: "networkidle" }); await reduced.waitForTimeout(600);
    assert.equal(await reduced.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length), 0); await reduced.close();
    if (process.env.PROOF_VIDEO !== "0") for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: viewport(width), recordVideo: { dir, size: viewport(width) } }), page = await context.newPage(); await attach(page);
      const scroll = async () => { await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .7) { scrollTo({ top: y, behavior: "smooth" }); await new Promise((r) => setTimeout(r, 480)); } }); };
      await page.goto(origin + base + "/?es_raw=1", { waitUntil: "networkidle" }); await page.waitForTimeout(800); await scroll();
      await page.goto(origin + base + f.detail + "?es_raw=1", { waitUntil: "networkidle" }); await page.waitForTimeout(700);
      if (kind === "fraise") { const purchase = page.locator("[data-main-product] [data-purchase]"); await purchase.scrollIntoViewIfNeeded(); for (const i of [0, 1, 2, 1]) { await purchase.locator("input[data-quantity]").nth(i).check(); await page.waitForTimeout(600); } await purchase.locator("[data-purchase-add]").click(); await page.waitForURL("**/cart"); }
      else { const buy = page.locator("[data-main-product] [data-product-buy]"); await buy.scrollIntoViewIfNeeded(); await buy.locator("[data-qty-step='1']").click(); await page.waitForTimeout(500); await buy.locator("button[type=submit]").click(); await page.waitForTimeout(1500); await page.keyboard.press("Escape"); await page.waitForTimeout(400); await page.goto(origin + base + "/cart?es_raw=1", { waitUntil: "networkidle" }); }
      await page.waitForTimeout(900); await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * .6) { scrollTo({ top: y, behavior: "smooth" }); await new Promise((r) => setTimeout(r, 600)); } }); await page.waitForTimeout(600);
      await page.locator(".es-line-item__remove").first().click(); await page.waitForLoadState("networkidle"); await page.waitForTimeout(900);
      const video = page.video()!; await context.close(); const webm = await video.path(), name = `parcours-${device(width)}`; fs.renameSync(webm, path.join(dir, name + ".webm")); execFileSync("ffmpeg", ["-y", "-i", path.join(dir, name + ".webm"), "-c:v", "libx264", "-preset", "fast", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", path.join(dir, name + ".mp4")], { stdio: "ignore" }); fs.rmSync(path.join(dir, name + ".webm"));
    }
    evidence.push({ kind, provenance: DEMO_PROVENANCE, mediaCount: f.media.length, missing: f.missing, logo: f.logo ? { colors: f.logo.colors, size: [f.logo.width, f.logo.height] } : null, pages, interactions, comparisons, paidCalls: all("SELECT 1 FROM ai_calls WHERE project_id=?", pid).length });
  });
  fs.writeFileSync(path.join(out, "preuves.json"), JSON.stringify({ testedCommit: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), workingTree: execFileSync("git", ["status", "--porcelain", "--", "src", "theme-base", "tests", "scripts"], { encoding: "utf8" }).trim() ? "modified" : "clean", date: new Date().toISOString(), renderMode: "es_raw=1 — thème issu des vraies routes, sans le bandeau flottant du studio", widths: WIDTHS, evidence }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, output: out, media: evidence.map((e) => e.mediaCount), missing: evidence.map((e) => e.missing), pages: evidence.map((e) => e.pages.length) }));
} finally { await browser.close(); await new Promise<void>((r) => server.close(() => r())); fs.rmSync(temp, { recursive: true, force: true }); }
