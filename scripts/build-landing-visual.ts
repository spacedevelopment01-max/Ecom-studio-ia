/**
 * Visuel « Création du studio » de la section Fidélité de l'accueil :
 *   npx tsx scripts/build-landing-visual.ts  →  public/demo/drone/avant-apres.jpg
 * Même cadrage (18:11) que la photo du fournisseur pour la comparaison avant / après.
 */
import path from "node:path";
import sharp from "sharp";
import { chromium } from "playwright";

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 1800, height: 1100 } });
await page.goto("file://" + path.join(process.cwd(), "scripts", "landing", "fidelite.html"), { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
const png = await page.screenshot({ type: "png" });
await browser.close();
const out = path.join(process.cwd(), "public", "demo", "drone", "avant-apres.jpg");
await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(out);
console.log("✓", out);
