/**
 * Captures de l'organisation Publications / banques Images et Vidéos / stratégie 12 mois (ordinateur et téléphone),
 * sur une base de démonstration (scripts/seed-autopilot-demo.ts), sans aucun appel d'IA payant ni publication.
 *   EMAIL=… PASSWORD=… PROJECT_A=… PROJECT_B=… BASE=http://localhost:3078 OUT=reports/screenshots/publications npx tsx scripts/screens-publications.ts
 */
import fs from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3078";
const OUT = process.env.OUT ?? "reports/screenshots/publications";
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
for (const [dev, vp] of [["ordi", { width: 1440, height: 900 }], ["tel", { width: 390, height: 844 }]] as const) {
  const ctx = await browser.newContext({ viewport: vp, locale: "fr-FR", timezoneId: "Europe/Paris" });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["images", "videos", "publications", "calendrier", "produit", "pilote"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
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
    const shot = (n: string, full = dev === "ordi") => page.screenshot({ path: `${OUT}/${dev}-${name}-${n}.png`, fullPage: full });
    await page.goto(`${BASE}/studio/${pid}/images`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-image-bank]");
    await page.waitForTimeout(1500);
    await shot("1-banque-images");
    await page.click("[data-bank-create]");
    await page.waitForSelector("[data-bank-create-dialog]");
    await page.waitForTimeout(800);
    await shot("2-creer-image", false);
    await page.keyboard.press("Escape");
    await page.goto(`${BASE}/studio/${pid}/videos`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-video-bank]");
    await page.waitForTimeout(1200);
    await shot("3-banque-videos");
    for (const [sec, n] of [["vue", "4-vue"], ["strategie", "5-strategie"], ["image", "6-publication-image"], ["video", "7-publication-video"], ["calendrier", "8-calendrier"]] as const) {
      await page.goto(`${BASE}/studio/${pid}/publications#${sec}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("[data-social-studio]");
      await page.waitForTimeout(1800);
      await shot(n);
    }
  }
  await ctx.close();
}
console.log("erreurs de page :", errors.length ? errors : "aucune");
await browser.close();
