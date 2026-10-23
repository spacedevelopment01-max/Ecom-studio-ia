/**
 * Lot 1 — captures de CONSTAT (aucun écran modifié par ce lot) : § 3 des CGV, offres et thèmes de l'accueil,
 * sur ordinateur (1440 px) et téléphone (390 px). Le serveur doit déjà tourner sur une base isolée.
 *
 *   BASE_URL=http://127.0.0.1:3210 npx tsx scripts/lot1/captures-constat.ts reports/lot1/captures
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3210";
const out = path.resolve(process.argv[2] ?? "reports/lot1/captures");
fs.mkdirSync(out, { recursive: true });
const shots: { name: string; url: string; selector: string; open?: string }[] = [
  { name: "cgv-forfaits", url: "/conditions", selector: "section:has(> h2:text-matches('^3\\\\.'))" },
  { name: "accueil-themes", url: "/", selector: "#themes" },
  { name: "accueil-offres", url: "/", selector: "#offre", open: "#offre details summary" },
  { name: "accueil-questions", url: "/", selector: "#questions" },
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
const result: Record<string, string[]> = {};
try {
  for (const [device, width] of [["ordinateur", 1440], ["telephone", 390]] as const) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: "fr-FR" });
    // Aucun appel sortant pendant les captures (seul le serveur local isolé répond).
    await page.route("**/*", (r) => (r.request().url().startsWith(base) || r.request().url().startsWith("data:") ? r.continue() : r.abort()));
    for (const s of shots) {
      await page.goto(base + s.url, { waitUntil: "networkidle" });
      await page.addStyleTag({ content: ".reveal{opacity:1!important;transform:none!important}" });
      if (s.open) await page.locator(s.open).first().click().catch(() => {});
      const el = page.locator(s.selector).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      const file = path.join(out, `${s.name}-${device}.png`);
      await el.screenshot({ path: file });
      (result[s.name] ??= []).push(path.basename(file));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(result, null, 2));
