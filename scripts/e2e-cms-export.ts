/**
 * Test navigateur réel de l'écran « Exporter et installer » (CMS Engine V2, phase 11A), sans aucun appel d'IA :
 *   DATA_DIR=/tmp/demo EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-theme-demo.ts   (→ PROJECT)
 *   (serveur : next start sur la même base)
 *   DATA_DIR=/tmp/demo EMAIL=… PASSWORD=… PROJECT=… BASE=http://localhost:3077 npx tsx scripts/e2e-cms-export.ts
 * Parcours : découverte gratuite → export refusé (règle du produit) ; forfait attribué à la main sur la base de démo →
 * ouvrir l'écran (ordinateur) : étapes Créer → … → Installer, capacités réelles, informations à compléter ;
 * « Vérifier et télécharger » Shopify (ZIP reçu, verdict enregistré et affiché) ; autre plateforme (WooCommerce) ;
 * exports précédents ; téléphone : écran lisible, sans débordement horizontal.
 * Captures : reports/screenshots/cms-v2/studio/.
 */
import fs from "node:fs";
import { chromium, type BrowserContext } from "playwright";
import { one, run } from "@/lib/db";

const BASE = process.env.BASE ?? "http://localhost:3077";
const OUT = process.env.OUT ?? "reports/screenshots/cms-v2/studio";
const PROJECT = process.env.PROJECT!;
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, okv: boolean, detail = "") => {
  results.push([name, okv, detail]);
  console.log(`${okv ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
const ai0 = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n;

async function login(ctx: BrowserContext) {
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["produit", "boutique", "site", "marque", "visuels"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
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

const uid = one<{ user_id: string }>("SELECT user_id FROM projects WHERE id = ?", PROJECT)!.user_id;
// Base de démonstration remise en découverte gratuite (test rejouable).
run("UPDATE subscriptions SET status = 'none', plan = NULL WHERE user_id = ?", uid);
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", acceptDownloads: true });
const page = await login(desk);
const blocked = await page.request.get(`${BASE}/api/projects/${PROJECT}/theme/export?platform=shopify`);
check("Découverte gratuite : export refusé (réservé aux forfaits)", blocked.status() === 402, String(blocked.status()));
// Forfait « Créer » attribué à la main sur la base de démonstration (aucun fournisseur d'IA configuré : 0 €).
run("UPDATE subscriptions SET status = 'active', plan = 'creer' WHERE user_id = ?", uid);

await page.goto(`${BASE}/studio/${PROJECT}/boutique`, { waitUntil: "networkidle" });
await page.getByTitle(/Exporter/).first().click();
const modal = page.getByRole("dialog");
await modal.waitFor();
await page.waitForTimeout(800);
const steps = await modal.locator("ol li").allInnerTexts();
check("Étapes affichées : Créer → Personnaliser → Plateforme → Vérifier → Exporter → Installer", steps.length === 6 && /Installer/.test(steps[5]), steps.join(" | ").replace(/\s+/g, " "));
await page.screenshot({ path: `${OUT}/01-export-ordinateur.png` });
await modal.getByRole("button", { name: /Ce que permet l'export/ }).click();
await page.waitForTimeout(300);
const caps = await modal.locator("ul li").allInnerTexts();
check("Capacités réelles de la plateforme (registre) affichées", caps.some((c) => /Non vérifié/.test(c)) && caps.some((c) => /Pris en charge/.test(c)), `${caps.length} lignes`);
await page.screenshot({ path: `${OUT}/02-capacites.png` });
const missingBtn = modal.getByRole("button", { name: /à compléter/ });
if (await missingBtn.count()) {
  await missingBtn.click();
  await page.waitForTimeout(300);
  check("Informations à compléter listées (jamais inventées)", (await modal.getByText(/\[À compléter/).count()) > 0);
  await page.screenshot({ path: `${OUT}/03-a-completer.png` });
}

// Vérifier et télécharger (Shopify) : le ZIP arrive, le verdict du contrôle est enregistré et affiché.
const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 180_000 }), modal.getByRole("button", { name: /Vérifier et télécharger le thème Shopify/ }).click()]);
const name = dl.suggestedFilename();
check("Export Shopify téléchargé après contrôle (nom versionné)", /-v\d+\.zip$/.test(name), name);
await modal.getByText(/Dernier export/).waitFor({ timeout: 30_000 });
const lastText = (await modal.getByText(/Dernier export/).locator("xpath=ancestor::div[1]").innerText()).replace(/\s+/g, " ");
check("Verdict du dernier export affiché, sans « prête à vendre »", /Provisoire|Contrôlé/.test(lastText) && /reste à vérifier/.test(lastText) && !/prête à vendre/i.test(lastText), lastText.slice(0, 220));
await page.screenshot({ path: `${OUT}/04-verdict-shopify.png` });

// Autre plateforme : WordPress / WooCommerce.
await modal.getByRole("button", { name: /Exporter pour une autre plateforme/ }).click();
const [dl2] = await Promise.all([page.waitForEvent("download", { timeout: 180_000 }), modal.getByRole("button", { name: /WordPress/ }).first().click()]);
check("Export WordPress / WooCommerce depuis le même écran", /woocommerce-v\d+\.zip$/.test(dl2.suggestedFilename()), dl2.suggestedFilename());
const saved = one<{ n: number }>("SELECT COUNT(*) AS n FROM assets WHERE project_id = ? AND role = 'theme-export'", PROJECT)!.n;
const checks = one<{ n: number }>("SELECT COUNT(*) AS n FROM quality_checks WHERE project_id = ? AND deliverable = 'cms_export_v2'", PROJECT)!.n;
check("Exports rangés dans les fichiers et verdicts enregistrés (quality_checks)", saved >= 2 && checks >= 2, `${saved} export(s), ${checks} contrôle(s)`);
await modal.locator("details summary").first().click().catch(() => {});
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/05-exports-precedents.png` });

// Téléphone.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "fr-FR" });
const mp = await login(phone);
await mp.goto(`${BASE}/studio/${PROJECT}/boutique`, { waitUntil: "networkidle" });
// Téléphone : l'export se trouve dans la barre de l'aperçu (onglet « Aperçu »).
await mp.getByRole("tab", { name: /Aperçu/ }).click();
await mp.waitForTimeout(800);
await mp.getByTitle(/Exporter/).first().click();
await mp.getByRole("dialog").waitFor();
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${OUT}/06-export-telephone.png` });
await mp.getByRole("dialog").getByRole("button", { name: /Ce que permet l'export/ }).click();
await mp.waitForTimeout(300);
await mp.screenshot({ path: `${OUT}/07-capacites-telephone.png`, fullPage: true });
const over = (await mp.evaluate("document.documentElement.scrollWidth > innerWidth + 1")) as boolean;
check("Téléphone : écran d'export sans débordement horizontal", !over);

check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
const aiSpent = one<{ n: number }>("SELECT COUNT(*) AS n FROM ai_calls")!.n - ai0;
check("Aucun appel d'IA (0 €)", aiSpent === 0, String(aiSpent));
await browser.close();
fs.writeFileSync(`${OUT}/resultats.json`, JSON.stringify(results.map(([n, o, d]) => ({ test: n, ok: o, detail: d })), null, 2));
const failed = results.filter((r) => !r[1]).length;
console.log(`${results.length - failed}/${results.length} vérifications réussies`);
process.exit(failed ? 1 : 0);
