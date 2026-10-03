/**
 * Parcours navigateur de bout en bout (bureau + mobile) sur un serveur lancé :
 *   BASE=http://localhost:3000 PHOTO=chemin/photo.png OUT=captures tsx scripts/e2e-browser.ts
 * Inscription → création depuis une photo → suivi du pipeline → visite de chaque espace.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, devices, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PHOTO = process.env.PHOTO!;
const OUT = process.env.OUT ?? "captures";
fs.mkdirSync(OUT, { recursive: true });
const shot = (p: Page, name: string, full = false) => p.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: full });
const errors: string[] = [];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? undefined });
const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await desk.newPage();
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

// Landing
await page.goto(BASE, { waitUntil: "networkidle" });
await shot(page, "01-landing-desktop");
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
await shot(page, "02-landing-desktop-full", true);

// Inscription
const email = `test${Date.now()}@exemple.fr`;
await page.goto(`${BASE}/inscription`);
await page.fill("#name", "Camille");
await page.fill("#email", email);
await page.fill("#password", "motdepasse-solide");
await Promise.all([page.waitForURL(/\/studio/), page.click("button[type=submit]")]);
await page.waitForLoadState("networkidle");
await shot(page, "03-studio-nouveau");

// Création depuis une photo
await page.setInputFiles("input[name=photos]", PHOTO);
await page.fill("#description", process.env.DESC ?? "");
await Promise.all([page.waitForURL(/\/studio\/[^/]+\/pilote/, { timeout: 60_000 }), page.click("button[type=submit]")]);
const projectUrl = page.url().replace(/\/pilote.*$/, "");
console.log("projet :", projectUrl);
await page.waitForTimeout(4000);
await shot(page, "04-pilote-en-cours");

// Attendre la fin du pipeline (ou une pause guidée)
const t0 = Date.now();
for (;;) {
  const r = await page.evaluate(async (u) => (await fetch(`/api/projects/${u}`)).json(), projectUrl.split("/").pop()!);
  const active = r.active ?? [];
  if (!active.length || Date.now() - t0 > 300_000) { console.log("pipeline :", JSON.stringify({ status: r.pipeline?.job?.status, msg: r.pipeline?.job?.message, err: r.pipeline?.job?.error, counts: r.counts })); break; }
  await page.waitForTimeout(3000);
}
console.log(`pipeline terminé en ${Math.round((Date.now() - t0) / 1000)} s`);
await page.reload({ waitUntil: "networkidle" });
await shot(page, "05-pilote-fini", true);

const TABS = ["produit", "marque", "boutique", "images", "videos", "prompts", "publications", "calendrier", "publicites", "fichiers", "connexions"];
for (const t of TABS) {
  await page.goto(`${projectUrl}/${t}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(t === "boutique" ? 5000 : 1500);
  await shot(page, `10-${t}-desktop`);
}
await page.goto(`${BASE}/studio/compte`, { waitUntil: "networkidle" });
await shot(page, "20-compte");
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
await shot(page, "21-admin");

// Mobile
const mob = await browser.newContext({ ...devices["iPhone 13"], storageState: await desk.storageState() });
const m = await mob.newPage();
m.on("pageerror", (e) => errors.push(`mobile pageerror: ${e.message}`));
await m.goto(BASE, { waitUntil: "networkidle" });
await shot(m, "30-landing-mobile");
await m.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } });
await shot(m, "31-landing-mobile-full", true);
for (const t of ["pilote", "boutique", "images", "calendrier", "fichiers"]) {
  await m.goto(`${projectUrl}/${t}`, { waitUntil: "networkidle" });
  await m.waitForTimeout(t === "boutique" ? 4000 : 1200);
  await shot(m, `40-${t}-mobile`);
}
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
console.log("débordement horizontal mobile (px) :", overflow);
console.log(errors.length ? `ERREURS:\n${errors.join("\n")}` : "Aucune erreur JavaScript.");
await browser.close();
