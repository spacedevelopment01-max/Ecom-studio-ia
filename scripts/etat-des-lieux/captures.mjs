/**
 * Captures de l'état des lieux : chaque page du Studio d'audit, ordinateur (1440) et téléphone (390), avec le relevé
 * des erreurs de script, des requêtes en échec et des débordements horizontaux. Aucune action payante : lecture seule.
 * Usage : node captures.mjs <dossier d'audit> <dossier de sortie> [filtre]
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const { chromium } = require("playwright");

const [auditDir, outDir, filter] = process.argv.slice(2);
const audit = JSON.parse(fs.readFileSync(path.join(auditDir, "audit.json"), "utf8"));
const origin = `http://localhost:${audit.port}`;
fs.mkdirSync(outDir, { recursive: true });

const TABS = ["pilote", "activite", "marque", "strategie", "boutique", "catalogue", "produit", "images", "videos", "publications", "publicites", "calendrier", "blog", "fichiers", "connexions", "prompts", "preparation", "carte", "rendez-vous", "realisations", "biens"];
const projects = audit.projects;
const firstProject = Object.values(projects)[0];

/** [nom du fichier, chemin, compte] */
const pages = [
  ["public-accueil", "/", null],
  ["public-themes", "/themes", null],
  ["public-inscription", "/inscription", null],
  ["public-connexion", "/connexion", null],
  ["public-contact", "/contact", null],
  ["public-conditions", "/conditions", null],
  ["studio-accueil", "/studio", "client"],
  ["studio-compte", "/studio/compte", "client"],
  ["studio-themes", "/studio/themes", "client"],
  ["studio-rendez-vous", "/studio/rendez-vous", "client"],
  ["studio-decouverte", "/studio/decouverte", "decouverte"],
  ["studio-accueil-decouverte", "/studio", "decouverte"],
  ["admin", "/admin", "admin"],
  ["syna-fondations", "/syna-fondations", "client"],
  ...TABS.map((t) => [`projet-${t}`, `/studio/${firstProject}/${t}`, "client"]),
  ...Object.entries(projects).flatMap(([name, id]) => {
    const slug = name.replace(/^Audit — /, "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
    const who = audit.owners[name];
    return [
      [`surmesure-${slug}-accueil`, `/api/projects/${id}/custom-theme`, who],
      [`surmesure-${slug}-atelier`, `/api/projects/${id}/custom-theme?builder=1`, who],
      [`surmesure-${slug}-pilote`, `/studio/${id}/pilote`, who],
      [`surmesure-${slug}-boutique`, `/studio/${id}/boutique`, who],
    ];
  }),
  ["banque-classique", `/api/projects/${firstProject}/custom-theme?catalog=classique`, "client"],
  ["banque-moderne", `/api/projects/${firstProject}/custom-theme?catalog=moderne`, "client"],
].filter((p) => !filter || new RegExp(filter).test(p[0]));

const browser = await chromium.launch();
const report = [];

async function login(context, who) {
  const page = await context.newPage();
  const res = await context.request.post(`${origin}/api/auth/login`, { data: { email: audit[who], password: audit.password }, headers: { "content-type": "application/json", origin } });
  await page.close();
  return res.status();
}

for (const [device, viewport, scale] of [["ordinateur", { width: 1440, height: 900 }, 1], ["telephone", { width: 390, height: 844 }, 2]]) {
  const contexts = {};
  for (const who of [null, "client", "client2", "client3", "client4", "decouverte", "admin"]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: device === "telephone", hasTouch: device === "telephone", locale: "fr-FR", userAgent: device === "telephone" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" : undefined });
    if (who) { const st = await login(ctx, who); if (st >= 400) console.log(`connexion ${who} : ${st}`); }
    contexts[who ?? "public"] = ctx;
  }
  for (const [name, url, who] of pages) {
    const ctx = contexts[who ?? "public"];
    const page = await ctx.newPage();
    const errors = [], failed = [];
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 300)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text().slice(0, 300)}`); });
    page.on("response", (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) failed.push(`${r.status()} ${r.url().replace(origin, "").slice(0, 160)}`); });
    let status = 0;
    try {
      const res = await page.goto(origin + url, { waitUntil: "networkidle", timeout: 45000 });
      status = res?.status() ?? 0;
    } catch (e) { errors.push(`navigation: ${String(e.message).slice(0, 200)}`); }
    await page.waitForTimeout(900);
    try { const skip = page.getByRole("button", { name: /^Passer$/ }); if (await skip.count()) { await skip.first().click({ timeout: 2000 }); await page.waitForTimeout(1500); } } catch { /* pas d'animation d'entrée */ }
    await page.waitForTimeout(600);
    const metrics = await page.evaluate(() => {
      const de = document.documentElement;
      const wide = [...document.querySelectorAll("body *")].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.right > de.clientWidth + 2 && getComputedStyle(el).position !== "fixed"; }).slice(0, 5).map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} (${Math.round(el.getBoundingClientRect().right)}px)`);
      return { title: document.title, scrollW: de.scrollWidth, clientW: de.clientWidth, height: de.scrollHeight, text: document.body.innerText.length, finalUrl: location.pathname + location.search, wide, english: (document.body.innerText.match(/\b(Loading|Submit|Click here|Learn more|Sign in|Sign up|Settings|Dashboard|Coming soon|Lorem ipsum)\b/g) || []).slice(0, 8) };
    }).catch(() => null);
    const file = path.join(outDir, `${name}--${device}.jpg`);
    try { await page.screenshot({ path: file, type: "jpeg", quality: 72, fullPage: false }); } catch (e) { errors.push(`capture: ${String(e.message).slice(0, 120)}`); }
    // Capture de la page entière (hauteur limitée) pour les pages longues.
    if (metrics && metrics.height > viewport.height * 1.3) {
      try { await page.screenshot({ path: path.join(outDir, `${name}--${device}--entier.jpg`), type: "jpeg", quality: 60, fullPage: true, clip: undefined }); } catch { /* page trop grande */ }
    }
    report.push({ name, device, url, who: who ?? "public", status, ...metrics, overflow: metrics ? metrics.scrollW > metrics.clientW + 2 : null, errors: [...new Set(errors)].slice(0, 8), failed: [...new Set(failed)].slice(0, 8) });
    console.log(`${device} ${name} → ${status}${metrics?.finalUrl && metrics.finalUrl !== url ? ` (→ ${metrics.finalUrl})` : ""}${errors.length ? ` · ${errors.length} erreur(s)` : ""}${failed.length ? ` · ${failed.length} requête(s) en échec` : ""}${metrics && metrics.scrollW > metrics.clientW + 2 ? ` · DÉBORDE (${metrics.scrollW} > ${metrics.clientW})` : ""}`);
    await page.close();
  }
  for (const c of Object.values(contexts)) await c.close();
}
await browser.close();
fs.writeFileSync(path.join(outDir, `rapport${filter ? "-" + filter.replace(/[^a-z0-9]+/gi, "_") : ""}.json`), JSON.stringify(report, null, 2));
console.log(`Terminé : ${report.length} captures.`);
