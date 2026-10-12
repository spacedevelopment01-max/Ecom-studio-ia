/**
 * Parcours navigateur des modèles de pages (base de test, serveur sur le port 3100) :
 *   OUT=dossier npx tsx scripts/pages-v2/parcours.ts
 * Dominer : ajoute une page depuis un modèle, deux mises en page produit ; Créer : bibliothèque verrouillée ;
 * services : page de prestation et calendrier ; vérifie après rechargement ; captures ordinateur et téléphone.
 */
import { chromium, type Page } from "playwright";
const BASE = "http://localhost:3100";
const OUT = process.env.OUT!;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const errors: string[] = [];
async function login(email: string, mobile = false) {
  const ctx = await b.newContext({ locale: "fr-FR", ...(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } }) });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); localStorage.setItem("es-tuto-seen", "1"); } catch {} });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${email}: ${e.message}`));
  await p.goto(`${BASE}/connexion`);
  await p.fill("#email", email);
  await p.fill("#password", "motdepasse-test");
  await Promise.all([p.waitForURL(/\/studio/, { timeout: 90000, waitUntil: "commit" }), p.click("button[type=submit]")]);
  return p;
}
const shot = (p: Page, n: string, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
async function openEditor(p: Page) {
  await p.goto(`${BASE}/studio`, { waitUntil: "networkidle" });
  const href = await p.locator('a[href*="/pilote"]').first().getAttribute("href");
  await p.goto(`${BASE}${href!.replace("/pilote", "/boutique")}`, { waitUntil: "networkidle" });
  // Téléphone : la barre de l'aperçu (et son bouton « Pages ») est dans la vue « Aperçu ».
  if (!(await p.locator("[data-pages-manager]").first().isVisible().catch(() => false))) await p.getByRole("tab", { name: "Aperçu", exact: true }).click().catch(() => {});
  await p.locator("[data-pages-manager]").first().waitFor({ timeout: 90000 });
}

// --- Dominer : bibliothèque, aperçu, création, mises en page produit
const d = await login("dominer@test.fr");
await openEditor(d);
await d.locator("[data-pages-manager]").first().click();
await d.getByRole("tab", { name: "Ajouter une page" }).click();
await d.waitForTimeout(6000);
await shot(d, "01-bibliotheque-modeles");
await d.getByRole("button", { name: "Utiliser ce modèle" }).first().click();
await d.locator("#np-title").fill("Notre boutique à Lyon");
await shot(d, "02-nouvelle-page");
await d.getByRole("button", { name: "Créer la page" }).click();
await d.waitForTimeout(5000);
await shot(d, "03-page-creee-dans-l-editeur");
await d.locator("[data-pages-manager]").first().click();
await d.getByRole("tab", { name: "Mises en page des produits" }).click();
const rows = d.locator("li", { has: d.getByRole("button", { name: "Nouvelle mise en page" }) });
await rows.nth(0).locator("select").nth(1).selectOption("produit-essentiel");
await rows.nth(0).getByRole("button", { name: "Nouvelle mise en page" }).click();
await d.waitForTimeout(4000);
await d.locator("[data-pages-manager]").first().click();
await d.getByRole("tab", { name: "Mises en page des produits" }).click();
await rows.nth(1).locator("select").nth(1).selectOption("produit-demonstration");
await rows.nth(1).getByRole("button", { name: "Nouvelle mise en page" }).click();
await d.waitForTimeout(4000);
await d.reload({ waitUntil: "networkidle" });
await d.locator("[data-pages-manager]").first().click();
await d.waitForTimeout(1500);
await shot(d, "04-liste-des-pages-apres-rechargement");
await d.getByRole("tab", { name: "Mises en page des produits" }).click();
await d.waitForTimeout(800);
await shot(d, "05-mises-en-page-produits");
const opts = await d.locator('select[aria-label="Page affichée"]').first().locator("option").allTextContents();
console.log("pages de l'éditeur :", opts.join(" | "));

// --- Créer : verrou visible
const c = await login("creer@test.fr");
await openEditor(c);
await c.locator("[data-pages-manager]").first().click();
await c.getByRole("tab", { name: "Ajouter une page" }).click();
await c.waitForTimeout(2500);
await shot(c, "06-creer-verrouille");
const disabled = await c.getByRole("button", { name: "Utiliser ce modèle" }).first().isDisabled();
console.log("Créer : bouton Utiliser désactivé =", disabled);

// --- Services : page de prestation, calendrier
const s = await login("services@test.fr");
await openEditor(s);
await s.locator("[data-pages-manager]").first().click();
await s.getByRole("tab", { name: "Ajouter une page" }).click();
await s.waitForTimeout(2000);
const card = s.locator("li", { hasText: "Prestation — Rendez-vous" }).first();
await card.getByRole("button", { name: "Aperçu", exact: true }).click();
await s.waitForTimeout(5000);
await shot(s, "07-apercu-modele-prestation");
await s.getByRole("button", { name: "Téléphone" }).last().click();
await s.waitForTimeout(4000);
await shot(s, "08-apercu-modele-prestation-mobile");
await s.getByRole("button", { name: "Utiliser ce modèle" }).last().click();
await s.locator("#np-title").fill("Ravalement de façade");
await s.getByRole("button", { name: "Créer la page" }).click();
await s.waitForTimeout(5000);
await shot(s, "08b-apres-creation-prestation");
await s.locator("[data-pages-manager]").first().click();
await s.waitForTimeout(1500);
await shot(s, "08c-liste-services");
const line = s.getByRole("dialog").locator('li:has(input[type="url"])', { hasText: "Ravalement de façade" }).first();
await line.locator('input[type="url"]').waitFor({ timeout: 60000 });
await line.locator('input[type="url"]').fill("https://calendly.com/exemple-artisan");
await line.getByRole("button", { name: "Configurer mon calendrier" }).click();
await s.waitForTimeout(3000);
await shot(s, "09-prestation-calendrier-configure");

// --- Téléphone : gestion des pages
const m = await login("dominer@test.fr", true);
await openEditor(m);
await m.locator("[data-pages-manager]").first().click();
await m.waitForTimeout(1500);
await shot(m, "10-mobile-pages", true);
const over = () => m.evaluate(() => Math.max(document.documentElement.scrollWidth - innerWidth, ...[...document.querySelectorAll('[role="dialog"] *')].map((e) => Math.round(e.getBoundingClientRect().right - innerWidth))));
console.log("débordement mobile (pages) :", await over());
await m.getByRole("tab", { name: "Ajouter une page" }).click();
await m.waitForTimeout(5000);
await shot(m, "11-mobile-modeles", true);
console.log("débordement mobile (modèles) :", await over());
await m.getByRole("tab", { name: "Mises en page des produits" }).click();
await m.waitForTimeout(1500);
await shot(m, "12-mobile-mises-en-page", true);
console.log("débordement mobile (produits) :", await over());
console.log("erreurs :", JSON.stringify(errors));
await b.close();
