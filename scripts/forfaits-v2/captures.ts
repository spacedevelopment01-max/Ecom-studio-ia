/**
 * Captures des écrans des forfaits V2 (accueil, Découverte, Mes projets, abonnement, Mon compte, mobile) sur un serveur
 * lancé avec la base de test : OUT=dossier npx tsx scripts/forfaits-v2/captures.ts (serveur sur le port 3100).
 */
import { chromium, type Page } from "playwright";
const BASE = "http://localhost:3100";
const OUT = process.env.OUT!;
const errors: string[] = [];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
async function session(email: string | null, mobile = false) {
  const ctx = await browser.newContext({ locale: "fr-FR", ...(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } }) });
  await ctx.addInitScript(() => { try { sessionStorage.setItem("ecsSeen", "1"); } catch {} });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${email} pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${email} console: ${m.text()}`));
  if (email) {
    await p.goto(`${BASE}/connexion`);
    await p.fill("#email", email);
    await p.fill("#password", "motdepasse-test");
    await Promise.all([p.waitForURL(/\/studio/, { timeout: 60000 }), p.click("button[type=submit]")]);
  }
  return p;
}
const shot = (p: Page, n: string, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const settle = (p: Page) => p.waitForLoadState("networkidle").then(() => p.waitForTimeout(1500));

const anon = await session(null);
await anon.goto(`${BASE}/#offre`, { waitUntil: "networkidle" });
await anon.evaluate(() => document.getElementById("offre")?.scrollIntoView());
await anon.waitForTimeout(1500);
await anon.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
await anon.locator("#offre").screenshot({ path: `${OUT}/01-accueil-tarifs.png` });

const free = await session("decouverte@test.fr");
await settle(free); await shot(free, "02-decouverte-mes-projets", true);
await free.goto(`${BASE}/studio/decouverte`); await settle(free);
await free.evaluate(() => document.querySelectorAll(".reveal").forEach((e) => e.classList.add("in")));
await shot(free, "03-studio-demonstration", true);

const multi = await session("multi@test.fr");
await settle(multi); await shot(multi, "04-mes-projets", true);
await multi.getByRole("button", { name: "Gérer mon abonnement" }).first().click();
await multi.waitForTimeout(1500); await shot(multi, "05-gerer-abonnement");
await multi.keyboard.press("Escape");
await multi.goto(`${BASE}/studio?nouveau=1`); await settle(multi); await shot(multi, "06-nouveau-projet-avec-abonnement-libre");
await multi.goto(`${BASE}/studio/compte`); await settle(multi); await shot(multi, "07-mon-compte", true);

const mob = await session("multi@test.fr", true);
await settle(mob); await shot(mob, "08-mobile-mes-projets", true);
const mobFree = await session("decouverte@test.fr", true);
await settle(mobFree); await shot(mobFree, "09-mobile-decouverte", true);
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("débordement horizontal mobile :", overflow);
console.log("erreurs :", JSON.stringify(errors, null, 1));
await browser.close();
