/** MAISON & HORIZON (issue #172) : preuve des interactions dans un vrai navigateur, sur l'export statique de la démo
 * (scripts/reference-static-preview.ts ou prepare-theme-demos.ts). Aucun réseau, aucun envoi.
 * Filtres, tri, pagination, état vide et remise à zéro, critères gardés dans l'adresse et retour arrière, carte / liste,
 * visionneuse et compteur réel, favoris (compteur de l'en-tête, page Favoris, comparaison), partage, formulaires
 * (erreurs, message honnête), estimation en trois étapes, onglets légaux, conseils filtrables, téléphone (accordéons,
 * défilement de la galerie). Captures et résumé JSON.
 *
 *   CHROMIUM=/chemin/chrome npx tsx scripts/maison-horizon-interactions.ts <export>/maison-horizon <dossier-sortie>
 */
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const [dir, outArg] = process.argv.slice(2);
if (!dir || !fs.existsSync(path.join(dir, "accueil.html"))) throw new Error("Export de la démo introuvable");
const out = path.resolve(outArg ?? "reports/maison-horizon-interactions"); fs.mkdirSync(out, { recursive: true });
const url = (file: string) => `file://${path.resolve(dir, file)}`;
const fiche = (prefix: string) => fs.readdirSync(dir).find((f) => f.startsWith(prefix))!;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const steps: { step: string; ok: boolean; detail?: unknown }[] = [];
const ok = (step: string, detail?: unknown) => { steps.push({ step, ok: true, detail }); console.log("✓", step); };
const errors: string[] = [];
async function open(page: Page, file: string) { await page.goto(url(file), { waitUntil: "load" }); await page.waitForTimeout(300); }
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(() => { try { localStorage.setItem("es-cookie-consent", JSON.stringify({ analytics: false, marketing: false })); } catch { /* */ } });
  const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
  const count = async () => (await page.locator("[data-re-count]").first().innerText()).trim();
  const visibleCards = async () => page.locator("[data-re-grid] [data-re-card]:visible").count();

  // 1. Acheter : 14 biens, 6 par page, pagination, tri, filtres, état vide, remise à zéro, adresse.
  await open(page, "page-acheter.html");
  assert.equal(await visibleCards(), 6); assert.match(await count(), /6 biens sur 14/);
  await page.locator("[data-re-pager] button", { hasText: /^3$/ }).click(); assert.equal(await visibleCards(), 2);
  ok("pagination : 6 + 6 + 2 biens, page 3", await count());
  await page.selectOption("[data-re-sort]", "prix-desc");
  const prices = await page.locator("[data-re-grid] [data-re-card]:visible").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-price"))));
  assert.deepEqual(prices, [...prices].sort((a, b) => b - a)); ok("tri par prix décroissant", prices);
  await page.fill("[data-re-filters] input[name=ville]", "Aix"); await page.selectOption("[data-re-filters] select[name=surface]", "200");
  await page.locator("[data-re-filters] [data-re-apply]").click(); await page.waitForTimeout(200);
  assert.match(await count(), /3 biens trouvés sur 14/); assert.match(page.url(), /ville=Aix/); assert.match(page.url(), /surface=200/);
  await page.screenshot({ path: path.join(out, "01-acheter-filtre.png"), fullPage: false });
  ok("filtres ville + surface : 3 biens (200, 210 et 220 m²), critères dans l'adresse", page.url().split("?")[1]);
  await page.locator("[data-re-filters] input[name=piscine]").check(); await page.locator("[data-re-filters] select[name=chambres]").selectOption("5"); await page.waitForTimeout(200);
  assert.equal(await page.locator("[data-re-empty]").isVisible(), true);
  await page.screenshot({ path: path.join(out, "02-acheter-vide.png"), fullPage: false });
  ok("état sans résultat affiché");
  await page.locator("[data-re-empty] [data-re-reset]").click(); await page.waitForTimeout(200);
  assert.match(await count(), /6 biens sur 14/); assert.ok(!/ville=/.test(page.url()));
  ok("remise à zéro : 14 biens, adresse nettoyée");
  await page.goBack(); await page.waitForTimeout(300); assert.match(page.url(), /ville=Aix/); assert.match(await count(), /trouvé/);
  ok("retour arrière : critères précédents rétablis", page.url().split("?")[1]);

  // 2. Accueil → recherche : onglet Louer, budget, arrivée filtrée sur la page Louer.
  await open(page, "accueil.html");
  await page.locator("[data-re-search] [data-re-tab=location]").click();
  await page.fill("[data-re-search] input[name=ville]", "Lyon"); await page.selectOption("[data-re-search] select[name=max]", "1250");
  await page.locator("[data-re-search] button[type=submit]").click(); await page.waitForLoadState("load"); await page.waitForTimeout(400);
  assert.match(page.url(), /page-louer\.html\?/); assert.match(page.url(), /ville=Lyon/); assert.match(page.url(), /max=1250/);
  const lyon = await visibleCards(); assert.ok(lyon >= 1);
  await page.screenshot({ path: path.join(out, "03-recherche-accueil-louer.png"), fullPage: false });
  ok("recherche de l'accueil : Louer, Lyon, 1 250 € max → page Louer filtrée", { url: page.url().split("?")[1], biens: lyon });

  // 3. Carte : ville proposée, repères, survol, Carte / Liste, sans ville.
  await open(page, "page-carte.html");
  assert.equal(await page.locator("[data-re-pin]:visible").count(), 3);
  await page.locator("[data-re-pin]:visible").first().hover(); assert.equal(await page.locator("[data-re-card].is-active").count(), 1);
  await page.screenshot({ path: path.join(out, "04-carte.png"), fullPage: false });
  ok("carte : 3 repères pour Aix-en-Provence, survol relié à la carte du bien");
  await page.locator("[data-re-view=list]").click(); assert.equal(await page.locator("[data-re-map]").isVisible(), false);
  await page.locator("[data-re-view=map]").click(); assert.equal(await page.locator("[data-re-map]").isVisible(), true);
  ok("bascule Carte / Liste");
  await page.locator("[data-re-filters] [data-re-reset]").first().click(); await page.waitForTimeout(200);
  assert.equal(await page.locator("[data-re-pin]:visible").count(), 0); assert.equal(await page.locator("[data-re-map-hint]").isVisible(), true);
  ok("sans ville : aucun repère, message « Choisissez une ville »");

  // 4. Fiche : visionneuse et compteur réel, clavier, favoris, partage, demande de visite.
  await open(page, fiche("bien-maison-avec-jardin-v-0001"));
  await page.locator(".re-gallery__all").click(); const lb = page.locator("[data-re-lightbox]");
  assert.equal(await lb.locator("[data-re-lb-count]").innerText(), "1 / 4");
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); assert.equal(await lb.locator("[data-re-lb-count]").innerText(), "3 / 4");
  await page.screenshot({ path: path.join(out, "05-visionneuse.png"), fullPage: false });
  await page.keyboard.press("Escape"); assert.equal(await lb.isVisible(), false);
  ok("visionneuse : compteur réel 1 / 4 → 3 / 4 au clavier, Échap ferme");
  await page.locator(".re-bien__tools [data-re-fav]").click();
  assert.equal(await page.locator(".es-header__favorites [data-re-fav-count]").innerText(), "1");
  ok("favori ajouté : compteur de l'en-tête à 1");
  await page.locator(".re-bien__tools [data-re-share]").click(); await page.waitForTimeout(300);
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  assert.ok(clip.includes("bien-maison-avec-jardin")); ok("partage : lien du bien copié", clip.split("/").pop());
  await page.locator(".re-ask [data-re-ask=visite]").click(); const dialog = page.locator("[data-re-dialog]");
  await dialog.locator("button[type=submit]").click(); const errs = await dialog.locator(".re-error").allInnerTexts();
  assert.ok(errs.length >= 3); ok("demande vide refusée : erreurs par champ", errs);
  await dialog.locator("input[name='contact[name]']").fill("Camille Test"); await dialog.locator("input[name='contact[email]']").fill("pas-un-email");
  await dialog.locator("button[type=submit]").click(); assert.match((await dialog.locator(".re-error").allInnerTexts()).join(" "), /e-mail valide/);
  await dialog.locator("input[name='contact[email]']").fill("camille@example.invalid"); await dialog.locator("input[name='contact[consentement]']").check();
  await dialog.locator("button[type=submit]").click(); const status = await dialog.locator("[data-re-status]").innerText();
  assert.match(status, /rien n'a été envoyé/); assert.match(status, /aucune visite n'est réservée/);
  await page.screenshot({ path: path.join(out, "06-demande-visite.png"), fullPage: false });
  ok("demande valide : message honnête (démonstration, rien envoyé, aucune visite réservée)", status);

  // 5. Favoris et comparaison.
  await open(page, fiche("bien-appartement-haussmannien-l-0013")); await page.locator("[data-re-bien] [data-re-fav]").first().click();
  await open(page, "page-favoris.html");
  assert.equal(await page.locator("[data-re-fav-item]:visible").count(), 2);
  await page.locator("[data-re-compare]").click(); assert.equal(await page.locator(".re-compare__table thead th").count(), 3);
  await page.screenshot({ path: path.join(out, "07-favoris-comparaison.png"), fullPage: true });
  ok("page Favoris : 2 biens, comparaison côte à côte");
  await page.locator("[data-re-fav-item]:visible .re-favorites__row [data-re-fav]").first().click(); await page.waitForTimeout(200);
  assert.equal(await page.locator("[data-re-fav-item]:visible").count(), 1); assert.equal(await page.locator("[data-re-compare]").isDisabled(), true);
  ok("retrait d'un favori : 1 bien, comparaison désactivée");

  // 6. Estimation en trois étapes (aucun prix calculé).
  await open(page, "page-estimer.html");
  const est = page.locator(".re-form-section--estimate form");
  await est.locator("[data-re-step='1'] [data-re-next-step]").click(); assert.ok(await est.locator(".re-error").count() >= 2);
  await est.locator("input[value=Maison]").check({ force: true }); await est.locator("input[name='contact[ville]']").fill("Uzès"); await est.locator("input[name='contact[surface]']").fill("140");
  await est.locator("[data-re-step='1'] [data-re-next-step]").click(); assert.equal(await est.locator("[data-re-step='2']").isVisible(), true);
  await est.locator("input[value=Vendre]").check({ force: true }); await est.locator("[data-re-step='2'] [data-re-next-step]").click();
  await est.locator("input[name='contact[name]']").fill("Camille Test"); await est.locator("input[name='contact[email]']").fill("camille@example.invalid"); await est.locator("input[name='contact[consentement]']").check();
  await est.locator("button[type=submit]").click(); const estStatus = await est.locator("[data-re-status]").innerText();
  assert.match(estStatus, /aucune estimation n'est calculée/);
  await page.screenshot({ path: path.join(out, "08-estimation.png"), fullPage: false });
  ok("estimation : étapes 1 → 2 → 3 vérifiées, aucun prix calculé", estStatus);

  // 7. Onglets légaux, conseils filtrables.
  await open(page, "page-mentions-legales.html"); await page.locator("[data-re-legal-tab=honoraires]").click();
  assert.equal(await page.locator("#Panneau-honoraires").isVisible(), true); assert.match(page.url(), /#honoraires/);
  await page.keyboard.press("ArrowRight"); assert.equal(await page.locator("#Panneau-confidentialite").isVisible(), true);
  ok("informations légales : onglets à la souris et au clavier, adresse #onglet");
  await open(page, "page-cookies.html"); assert.equal(await page.locator("#Panneau-cookies").isVisible(), true); ok("page Cookies : onglet Cookies ouvert d'office");
  await open(page, "page-conseils.html"); await page.locator("[data-re-tile-filter=Louer]").click();
  assert.equal(await page.locator("[data-re-tile-list] > li:visible").count(), 2); ok("conseils : filtre « Louer », 2 articles");

  // 8. Téléphone : galerie défilante et compteur, accordéons, barre de visite.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await phone.addInitScript(() => { try { localStorage.setItem("es-cookie-consent", JSON.stringify({ analytics: false, marketing: false })); } catch { /* */ } });
  const m = await phone.newPage(); m.on("pageerror", (e) => errors.push(e.message));
  await m.goto(url(fiche("bien-appartement-meuble-avec-balcon-l-0001")), { waitUntil: "load" }); await m.waitForTimeout(300);
  await m.locator("[data-re-track]").evaluate((t) => { t.scrollLeft = t.clientWidth * 2; t.dispatchEvent(new Event("scroll")); }); await m.waitForTimeout(300);
  assert.equal(await m.locator("[data-re-current]").innerText(), "3");
  const accOpen = await m.locator("[data-re-acc][open]").count(); assert.equal(accOpen, 1);
  await m.locator("[data-re-acc] > summary").nth(1).click(); assert.equal(await m.locator("[data-re-acc][open]").count(), 2);
  await m.evaluate(() => window.scrollTo(0, 1600)); await m.waitForTimeout(400); assert.equal(await m.locator("[data-re-sticky]").evaluate((e) => e.classList.contains("is-visible")), true);
  await m.screenshot({ path: path.join(out, "09-telephone-fiche.png"), fullPage: false });
  ok("téléphone : galerie défilante (3 / 7), accordéons, barre « Organiser une visite » après défilement");
  await phone.close();

  assert.deepEqual(errors, [], "erreurs JavaScript");
  fs.writeFileSync(path.join(out, "maison-horizon-interactions.json"), JSON.stringify({ export: dir, steps, date: new Date().toISOString() }, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, steps: steps.length }));
} finally { await browser.close(); }
