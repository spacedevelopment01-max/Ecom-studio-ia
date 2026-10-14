/**
 * Démo navigateur réelle de « Ma communication automatique » (Autopilot V2), sans aucun appel d'IA payant ni
 * publication réelle. Base de démonstration : scripts/seed-autopilot-demo.ts ; serveur lancé avec
 * SOCIAL_PUBLISH_DISABLED=1 et SANS worker.
 *   EMAIL=… PASSWORD=… PROJECT_A=… PROJECT_B=… BASE=http://localhost:3077 OUT=reports/screenshots/social-autopilot-v2 npx tsx scripts/e2e-autopilot-v2.ts
 * Parcours par projet : réglages (objectif, réseaux et leur état réel, fréquence 3 ou 5 par jour, 7 jours) →
 * « Préparer maintenant » (gratuit) → vue d'ensemble → calendrier semaine / liste / filtre réseau → éditeur
 * (variantes Instagram / Facebook / Pinterest, modification, approbation, programmation) → téléphone.
 */
import fs from "node:fs";
import { chromium, type Page } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3077";
const OUT = process.env.OUT ?? "reports/screenshots/social-autopilot-v2";
fs.mkdirSync(OUT, { recursive: true });
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, detail = "") => {
  results.push([name, ok, detail]);
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR", timezoneId: "Europe/Paris" });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("ecsSeen", "1");
    for (const t of ["produit", "calendrier", "publications", "pilote", "boutique", "connexions"]) localStorage.setItem(`ecs-tuto-seen-${t}`, "1");
  } catch {}
});
const page = await ctx.newPage();
page.setDefaultTimeout(240_000);
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/connexion`, { waitUntil: "networkidle", timeout: 240_000 });
await page.waitForTimeout(1500); // formulaire prêt (hydraté)
await page.fill("#email", process.env.EMAIL!);
await page.fill("#password", process.env.PASSWORD!);
await Promise.all([page.waitForURL(/studio|projets/, { waitUntil: "commit" }), page.click("button[type=submit]")]);

const shot = (p: Page, name: string, full = false) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
type Post = { id: string; status: string; network: string; blocking: string[]; media: unknown[]; caption: string; scheduledAt: number | null };

async function demo(label: string, pid: string, perDay: 3 | 5) {
  await page.goto(`${BASE}/studio/${pid}/publications`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.click('[data-section="pilote"]');
  await page.waitForSelector("[data-autopilot]");
  const states = await page.$$eval("[data-network]", (els) => els.map((e) => `${e.getAttribute("data-network")}:${e.getAttribute("data-state")}`));
  check(`${label} : état réel des réseaux affiché`, states.includes("instagram:auto_available") && states.includes("linkedin:unavailable") && states.includes("tiktok:to_connect"), states.join(" "));
  await page.click(`[data-goal="balanced"]`);
  await page.click(`[data-perday] button:has-text("${perDay} par jour")`);
  await page.fill('[data-autopilot-step="3"] input[type=number]', "7");
  await shot(page, `${label}-1-reglages`, true);
  await page.click("[data-save-activate]");
  await page.waitForSelector("[data-run-now]");
  await page.click("[data-run-now]");
  await page.waitForSelector("[data-run-result]", { timeout: 180_000 });
  const run = await page.textContent("[data-run-result]");
  check(`${label} : préparation gratuite lancée depuis l'écran`, /préparée/.test(run ?? ""), run ?? "");
  await shot(page, `${label}-2-preparation`, true);

  const r = await page.request.get(`${BASE}/api/projects/${pid}/social/v2?from=${Date.now()}&to=${Date.now() + 9 * 86_400_000}`);
  const posts = ((await r.json()).posts as Post[]).filter((p) => p.scheduledAt);
  const byDay = new Map<string, Set<string>>();
  for (const p of posts) {
    const k = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(p.scheduledAt!);
    byDay.set(k, (byDay.get(k) ?? new Set()).add(p.caption.split("\n")[0]));
  }
  const counts = [...byDay.values()].map((s) => s.size);
  check(`${label} : ${perDay} contenus par jour sur 7 jours, 3 réseaux chacun`, counts.length === 7 && counts.every((n) => n === perDay) && posts.length === 7 * perDay * 3, `${posts.length} variantes, contenus par jour : ${counts.join(",")}`);
  check(`${label} : rien d'approuvé ni de programmé sans accord`, posts.every((p) => !["approved", "scheduled"].includes(p.status)));

  await page.click('[data-section="vue"]');
  await page.waitForSelector("[data-overview]");
  check(`${label} : vue d'ensemble sans statistique inventée`, /Données indisponibles/.test((await page.textContent("[data-overview-stats]")) ?? ""));
  await shot(page, `${label}-3-vue-ensemble`, true);

  await page.click('[data-section="calendrier"]');
  await page.click('[data-view="week"]');
  await page.waitForTimeout(800);
  await shot(page, `${label}-4-calendrier-semaine`);
  await page.selectOption("[data-net-filter]", "pinterest");
  await page.waitForTimeout(400);
  await shot(page, `${label}-5-calendrier-pinterest`);
  await page.selectOption("[data-net-filter]", "all");
  await page.click('[data-view="list"]');
  await page.waitForTimeout(600);
  await shot(page, `${label}-6-liste`, true);

  // Une publication prête (visuel, aucun défaut bloquant) : variantes, modification, approbation, programmation.
  // Sinon (matière manquante, « [À compléter] ») : le client complète le texte dans l'éditeur, comme en vrai.
  const clean = posts.find((p) => p.network === "instagram" && p.media.length && !p.blocking.length);
  const ready = clean ?? posts.find((p) => p.network === "instagram" && p.media.length && p.blocking.every((b) => /compléter/.test(b)));
  check(`${label} : publication prête ${clean ? "sans défaut" : "après complément par le client"}`, !!ready, clean ? "" : `bloquée avant : ${ready?.blocking.join(" ; ")}`);
  if (!ready) return null;
  await page.click(`[data-post="${ready.id}"]`);
  await page.waitForSelector("[data-post-editor]");
  await page.waitForSelector("[data-variants]");
  const variants = await page.textContent("[data-variants]");
  check(`${label} : variantes Facebook et Pinterest visibles avant publication`, /Facebook/.test(variants ?? "") && /Pinterest/.test(variants ?? ""));
  await shot(page, `${label}-7-editeur-variantes`, true);
  for (const loc of await page.locator("[data-post-editor] textarea, [data-post-editor] input[type=text], [data-post-editor] input:not([type])").all()) {
    const v = await loc.inputValue().catch(() => "");
    if (/\[(À|A) compléter[^\]]*\]/.test(v)) await loc.fill(v.replace(/\[(À|A) compléter[^\]]*\]/g, "Texte complété par le client pendant la démonstration"));
  }
  const area = page.locator("[data-post-editor] textarea").first();
  await area.fill(`${await area.inputValue()}\n\n(Modifié pendant la démonstration.)`);
  await page.click('[data-action="save-post"]');
  await page.waitForTimeout(800);
  await page.click('[data-action="approve-post"]');
  await page.waitForTimeout(800);
  await page.click('[data-action="schedule-post"]');
  await page.waitForTimeout(1000);
  const after = await (await page.request.get(`${BASE}/api/projects/${pid}/social/v2/posts/${ready.id}`)).json();
  check(`${label} : modifiée, approuvée puis programmée depuis l'éditeur`, after.post.status === "scheduled" && /Modifié pendant la démonstration/.test(after.post.caption), after.post.status);
  await shot(page, `${label}-8-editeur-programmee`, true);
  await page.keyboard.press("Escape");
  return ready.id;
}

const a = await demo("A-cosmetique", process.env.PROJECT_A!, 3);
const b = await demo("B-platrier", process.env.PROJECT_B!, 5);

// Téléphone : réglages et calendrier.
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", timezoneId: "Europe/Paris", storageState: await ctx.storageState() });
const m = await phone.newPage();
m.setDefaultTimeout(240_000);
await m.goto(`${BASE}/studio/${process.env.PROJECT_B}/publications`, { waitUntil: "domcontentloaded", timeout: 240_000 });
await m.click('[data-section="pilote"]');
await m.waitForSelector("[data-autopilot]");
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("téléphone : pas de débordement horizontal", overflow <= 1, `${overflow}px`);
await m.screenshot({ path: `${OUT}/B-platrier-telephone-reglages.png`, fullPage: true });
await m.click('[data-section="calendrier"]');
await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/B-platrier-telephone-calendrier.png` });

check("aucune erreur JavaScript dans la page", errors.length === 0, errors.slice(0, 3).join(" | "));
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ scheduled: { A: a, B: b }, results }, null, 2));
await browser.close();
console.log(JSON.stringify({ A: a, B: b }));
