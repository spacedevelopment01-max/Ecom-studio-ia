// Outils de recette #232 : navigateur réel (Chromium), noms *.recette.test résolus vers cette machine, proxy HTTPS
// local à certificat auto-signé. Comptes et sites FICTIFS uniquement.
import fs from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
export const DIR = new URL("./", import.meta.url).pathname;
export const STUDIO = "https://studio.recette.test:3943";
export const ids = JSON.parse(fs.readFileSync(DIR + "recette.json", "utf8"));
export const OUT = DIR + "preuves/";
fs.mkdirSync(OUT, { recursive: true });
export const VIEW = { ordinateur: { width: 1440, height: 900 }, telephone: { width: 390, height: 844 } };
export async function browser() {
  return chromium.launch({ args: ["--host-resolver-rules=MAP *.recette.test 127.0.0.1", "--proxy-server=direct://"] });
}
export async function context(b, kind = "ordinateur") {
  const ctx = await b.newContext({ viewport: VIEW[kind], ignoreHTTPSErrors: true, locale: "fr-FR", ...(kind === "telephone" ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  return ctx;
}
export function watch(page, log) {
  page.on("console", (m) => m.type() === "error" && log.push(`console: ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => log.push(`pageerror: ${String(e).slice(0, 300)}`));
  page.on("response", (r) => r.status() >= 400 && log.push(`${r.status()} ${r.request().method()} ${r.url()}`));
}
export async function login(page, email) {
  await page.goto(`${STUDIO}/connexion`, { waitUntil: "networkidle" });
  await page.getByLabel("Adresse e-mail").fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill("motdepasse-test-uniquement");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await page.waitForURL(/\/studio/, { timeout: 60000 });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1500);
}
/** Navigation tolérante aux redirections du studio (une navigation interrompue est relancée une fois). */
export async function open(page, url) {
  try { await page.goto(url, { waitUntil: "domcontentloaded" }); }
  catch { await page.waitForTimeout(1500); await page.goto(url, { waitUntil: "domcontentloaded" }); }
  await page.waitForLoadState("networkidle").catch(() => {});
}
export const shot = (page, name, full = false) => page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
export const save = (name, data) => fs.writeFileSync(`${OUT}${name}.json`, JSON.stringify(data, null, 1));
