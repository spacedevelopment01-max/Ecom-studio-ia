/**
 * Test navigateur réel du panneau « SEO & textes » (phase 8A), sans aucun appel d'IA :
 *   EMAIL=… PASSWORD=… PROJECT=… COSMETIC=… OUT=reports/screenshots/content-v2 npx tsx scripts/e2e-content-v2.ts
 * Parcours : onglet Activité (Sébastien Blanc) → stratégie SEO → rédiger une page de prestation (sans IA) → modifier
 * un paragraphe + gras → enregistrer → recharger (tout est conservé, nouvelle version) → retouche « Ajoute une FAQ »
 * (locale) → restaurer la version 1 ; onglet Blog (cosmétique) → brouillon d'article ; puis format téléphone.
 */
import fs from "node:fs";
import { chromium, type BrowserContext } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "reports/screenshots/content-v2";
const PROJECT = process.env.PROJECT!;
const COSMETIC = process.env.COSMETIC!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      // Bulles « tutoriel » déjà vues (elles masqueraient le bas de l'écran).
      for (const t of ["produit", "activite", "blog", "pilote", "services", "boutique"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", process.env.EMAIL!);
  await page.fill("#password", process.env.PASSWORD!);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}

const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
const page = await login(desk);
await page.goto(`${BASE}/studio/${PROJECT}/produit`, { waitUntil: "networkidle" });
const panel = page.locator("[data-content-panel]");
await panel.waitFor({ timeout: 30_000 });
await panel.scrollIntoViewIfNeeded();
check("Panneau visible dans l'onglet Activité", await panel.isVisible());
await panel.getByRole("button", { name: "Stratégie SEO" }).click();
const strat = panel.locator("[data-seo-strategy]");
await strat.waitFor();
const stext = await strat.innerText();
check("Stratégie : hypothèses annoncées, pages prévues, à confirmer", /Hypothèses sémantiques/.test(stext) && /prévue/.test(stext) && /bandes à joints/.test(stext));
await strat.screenshot({ path: `${OUT}/1-strategie.png` });
await panel.getByRole("button", { name: "Masquer la stratégie" }).click();

await panel.locator("#cnt-type").selectOption("service_page");
await panel.locator("#cnt-page").selectOption({ label: "Enduits et lissage (prévue)" });
await panel.getByRole("button", { name: /Rédiger/ }).click();
const editor = panel.locator("[data-content-editor]");
await editor.waitFor({ timeout: 30_000 });
await page.waitForTimeout(500);
const h1 = await editor.locator("input").nth(3).inputValue().catch(() => "");
check("Page de prestation rédigée sans IA", (await editor.innerText()).length > 0, h1);
const seoTitle = await editor.locator("#seo-title").inputValue();
check("Titre SEO ≤ 60 caractères", seoTitle.length <= 60, seoTitle);
await editor.screenshot({ path: `${OUT}/2-editeur.png` });

// Modification manuelle + gras (sélection) + enregistrement.
const para = editor.locator("textarea").nth(1);
await para.fill("Enduits et lissage pour des murs prêts à peindre, à Mâcon.");
await para.evaluate((el: HTMLTextAreaElement) => {
  el.focus();
  el.setSelectionRange(0, 18);
});
await editor.getByTitle("Gras").first().click();
await editor.getByRole("button", { name: "Enregistrer" }).click();
await page.waitForTimeout(1200);
await page.reload({ waitUntil: "networkidle" });
await panel.waitFor();
await panel.getByRole("button", { name: /Enduits et lissage/ }).first().click();
await editor.waitFor();
await page.waitForTimeout(600);
const kept = await editor.locator("textarea").nth(1).inputValue();
check("Modification conservée après rechargement (gras compris)", kept === "**Enduits et lissage** pour des murs prêts à peindre, à Mâcon.", kept);
const versions = await editor.innerText();
check("Nouvelle version créée", /v2 · modification du client/.test(versions));

// Retouche locale en conversation.
await editor.locator("[data-content-chat] input").fill("Ajoute une FAQ");
await editor.getByRole("button", { name: "Envoyer" }).click();
await page.waitForTimeout(1500);
check("Retouche « Ajoute une FAQ » faite localement", /v3 · retouche locale/.test(await editor.innerText()));
await editor.getByRole("button", { name: "Aperçu" }).click();
await page.waitForTimeout(300);
const prev = await editor.locator("article").innerHTML();
check("Aperçu : HTML propre (gras, FAQ)", prev.includes("<strong>Enduits et lissage</strong>") && prev.includes("<details>"));
await editor.screenshot({ path: `${OUT}/3-apercu.png` });
await editor.getByRole("button", { name: "Modifier" }).click();
await editor.getByRole("button", { name: "Restaurer" }).last().click();
await page.waitForTimeout(1500);
check("Restauration de la version 1 (copie)", /v4 · restauration de la version 1/.test(await editor.innerText()));

// Blog V2 (projet cosmétique) : brouillon local.
await page.goto(`${BASE}/studio/${COSMETIC}/blog`, { waitUntil: "networkidle" });
const bpanel = page.locator("[data-content-panel]");
await bpanel.waitFor({ timeout: 30_000 });
await bpanel.getByRole("button", { name: /Rédiger/ }).click();
await bpanel.locator("[data-content-editor]").waitFor({ timeout: 30_000 });
const fields = await bpanel.locator("[data-content-editor] textarea, [data-content-editor] input").evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).join("\n"));
check("Blog : brouillon d'article (sans IA), inconnues marquées", /\[À compléter/.test(fields));
await bpanel.screenshot({ path: `${OUT}/4-blog.png` });

// Téléphone : aucun débordement horizontal.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
const m = await login(phone);
await m.goto(`${BASE}/studio/${PROJECT}/produit`, { waitUntil: "networkidle" });
const mp = m.locator("[data-content-panel]");
await mp.waitFor({ timeout: 30_000 });
await mp.getByRole("button", { name: /Enduits et lissage/ }).first().click();
await mp.locator("[data-content-editor]").waitFor();
await m.waitForTimeout(500);
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("Téléphone : pas de débordement horizontal", overflow <= 1, `${overflow}px`);
await mp.screenshot({ path: `${OUT}/5-telephone.png` });

check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const ok = results.filter((r) => r[1]).length;
console.log(`\n${ok}/${results.length} vérifications réussies`);
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results, null, 2));
process.exit(ok === results.length ? 0 : 1);
