/**
 * Captures des onglets migrés vers les moteurs V2 (Marque, Images, Vidéos, Publicités, Calendrier, Blog), ordinateur
 * et téléphone, sur un projet de démonstration (moteur local, aucun appel d'IA). Vérifie aussi l'absence d'erreur
 * JavaScript et de débordement horizontal sur téléphone.
 *   (serveur) DATA_DIR=/tmp/v2s STOCK_OFFLINE=1 SOCIAL_PUBLISH_DISABLED=1 npx next start -p 3078
 *   DATA_DIR=/tmp/v2s BASE=http://localhost:3078 npx tsx scripts/screens-v1-to-v2.ts
 */
import fs from "node:fs";
import { chromium, type Page } from "playwright";
import { run } from "@/lib/db";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { seedThemeScenario } from "../tests/theme-v2-fixtures";

const BASE = process.env.BASE ?? "http://localhost:3078";
const OUT = "reports/screenshots/v1-to-v2";
fs.mkdirSync(OUT, { recursive: true });
const PASSWORD = "motdepasse-demo-v2";
const email = `v2-${Date.now()}@demo.fr`;
const u = await createUser(email, PASSWORD, "Démo");
run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
run("INSERT OR IGNORE INTO subscriptions (user_id, status, stores, updated_at) VALUES (?,?,?,?)", u.id, "none", 1, Date.now());
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
const pid = await runWithLang({ ui: "fr", content: "fr" }, () => seedThemeScenario(u.id, "cosmetic"));

const results: [string, boolean, string][] = [];
const errors: string[] = [];
const check = (name: string, ok: boolean, detail = "") => (results.push([name, ok, detail]), console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
async function session(viewport: { width: number; height: number }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: "fr-FR" });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("ecsSeen", "1");
      for (const t of ["pilote", "produit", "boutique", "site", "marque", "visuels", "images", "publicites", "calendrier", "videos", "blog"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
    } catch {}
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await Promise.all([page.waitForURL(/studio/), page.click("button[type=submit]")]);
  return page;
}
async function tab(page: Page, name: string, expect: RegExp, file: string, mobile = false) {
  await page.goto(`${BASE}/studio/${pid}/${name}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const text = await page.locator("main").innerText().catch(() => "");
  check(`${mobile ? "Téléphone" : "Ordinateur"} — ${name} : ${expect.source}`, expect.test(text));
  if (mobile) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`Téléphone — ${name} : pas de débordement horizontal`, overflow <= 1, `${overflow}px`);
  }
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: !mobile });
}

const desk = await session({ width: 1440, height: 900 });
await tab(desk, "marque", /Logo/, "marque-ordinateur");
await tab(desk, "images", /Moteur d'images/, "images-ordinateur");
await tab(desk, "videos", /plan et l'estimation/, "videos-ordinateur");
await tab(desk, "publicites", /Campagnes/, "publicites-ordinateur");
await tab(desk, "calendrier", /Ancien calendrier/, "calendrier-ordinateur");
await tab(desk, "blog", /article|Article/, "blog-ordinateur");
const phone = await session({ width: 390, height: 844 });
for (const t of ["marque", "images", "videos"]) await tab(phone, t, /./, `${t}-telephone`, true);
check("Aucune erreur JavaScript", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
const ok = results.filter((r) => r[1]).length;
console.log(`${ok}/${results.length} vérifications réussies`);
process.exit(ok === results.length ? 0 : 1);
