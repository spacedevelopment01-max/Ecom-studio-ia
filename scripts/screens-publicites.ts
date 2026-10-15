/**
 * Captures de l'onglet Publicités (sous-menu Piloter / Créer / Gérer) sur une base de démonstration, sans IA payante.
 *   EMAIL=… PASSWORD=… PROJECT_A=… PROJECT_B=… BASE=http://localhost:3078 OUT=reports/screenshots/publicites npx tsx scripts/screens-publicites.ts
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3078";
const OUT = process.env.OUT ?? "reports/screenshots/publicites";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
for (const [dev, vp] of [["ordi", { width: 1440, height: 900 }], ["tel", { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport: vp, locale: "fr-FR" });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      localStorage.setItem("ecs-tuto-seen-publicites", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240_000);
  page.on("pageerror", (e) => errors.push(`${dev}: ${e.message}`));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle", timeout: 240_000 });
  await page.waitForTimeout(1500);
  await page.fill("#email", process.env.EMAIL!);
  await page.fill("#password", process.env.PASSWORD!);
  await Promise.all([page.waitForURL(/studio|projets/, { waitUntil: "commit" }), page.click("button[type=submit]")]);
  for (const [name, pid] of [["service", process.env.PROJECT_B!], ["produit", process.env.PROJECT_A!]] as const) {
    for (const sec of ["vue", "strategie", "image", "video", "campagnes", "bibliotheque"]) {
      await page.goto(`${BASE}/studio/${pid}/publicites#${sec}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-ads-studio]");
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${OUT}/${dev}-${name}-${sec}.png`, fullPage: dev === "ordi" });
    }
  }
  await ctx.close();
}
console.log("erreurs de page :", errors.length ? errors : "aucune");
await browser.close();
