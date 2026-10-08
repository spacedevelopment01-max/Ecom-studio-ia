/**
 * Benchmark visuel LOCAL du Theme Engine (phase 10A) — aucun appel d'IA, aucune boutique réelle.
 *
 *   DATA_DIR=/tmp/bench npx tsx scripts/theme-v2-bench.ts seed
 *   DATA_DIR=/tmp/bench npx tsx scripts/theme-v2-bench.ts shoot --engine v1 --label avant [--only artisan,saas]
 *   DATA_DIR=/tmp/bench npx tsx scripts/theme-v2-bench.ts shoot --engine v2 --label apres
 *
 * seed  : crée un compte et les 5 projets de référence (tests/theme-v2-fixtures.ts) avec leurs médias de démonstration.
 * shoot : compose le thème de chaque projet avec le moteur demandé (v1 = moteur existant, v2 = Theme Engine V2), l'enregistre
 *         comme version du projet (ouvrable dans le studio), le rend avec le VRAI moteur d'aperçu (fichiers du thème
 *         compilé, LiquidJS, médias de la bibliothèque) et le photographie dans Chromium : accueil et page secondaire
 *         (ordinateur 1440 px et téléphone 390 px), navigation, une interaction. Contrôle visuel automatisé
 *         (scripts/lib/visual-check.ts), mesures locales de performance, résultats dans <out>/<scénario>/<label>.json.
 * Ne jamais lancer sur la base de production.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { createUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { compileTheme, type ThemeFiles } from "@/lib/theme/compile";
import { saveThemeVersion } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import type { ThemeSpec } from "@/lib/theme/spec";
import { THEME_SCENARIOS, seedThemeScenario, type ThemeScenario } from "../tests/theme-v2-fixtures";
import { serveStudio } from "./lib/studio-server";
import { keyboardCheck, reducedMotionCheck, visualCheck, type Finding } from "./lib/visual-check";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const cmd = args[0];
const IDS = path.join(process.env.DATA_DIR, "theme-bench.json");
const OUT = opt("--out") ?? "reports/screenshots/theme-v2";
const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

if (cmd === "seed") {
  const email = process.env.EMAIL ?? "demo@exemple.fr";
  const userId = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)?.id ?? (await createUser(email, process.env.PASSWORD ?? "motdepasse-demo", "Démo")).id;
  const ids: Record<string, string> = {};
  for (const s of THEME_SCENARIOS) ids[s] = await fr(() => seedThemeScenario(userId, s));
  fs.writeFileSync(IDS, JSON.stringify(ids, null, 2));
  console.log(JSON.stringify(ids));
  process.exit(0);
}
if (cmd !== "shoot") throw new Error("Commande : seed | shoot");

const engine = (opt("--engine") ?? "v2") as "v1" | "v2";
const label = opt("--label") ?? (engine === "v1" ? "avant" : "apres");
const only = opt("--only")?.split(",") as ThemeScenario[] | undefined;
const ids = JSON.parse(fs.readFileSync(IDS, "utf8")) as Record<ThemeScenario, string>;

async function compose(projectId: string): Promise<ThemeSpec> {
  if (engine === "v1") {
    const { composeShop } = await import("@/lib/engine/shop");
    return (await fr(() => composeShop(projectId, undefined, null, false))).spec;
  }
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  return (await fr(() => composeThemeV2(projectId))).spec;
}

const serve = (spec: ThemeSpec, files: ThemeFiles) => serveStudio(spec, files);

const LEGAL = /mention|condition|politique|cgv|legal|terms|privacy|confidential/i;
/** Page secondaire représentative : fiche produit (boutique) ; sinon première page de contenu (prestations, fonctionnalités…). */
export function secondaryPath(spec: ThemeSpec): string {
  const planned = (spec as any).meta?.v2?.secondary as string | undefined;
  if (planned) return planned;
  if (spec.store.business !== "services" && spec.store.product?.handle) return `/products/${spec.store.product.handle}`;
  const page = spec.store.pages.find((p) => !LEGAL.test(p.handle) && !LEGAL.test(p.title));
  return page ? `/pages/${page.handle}` : "/";
}

const PERF_INIT = `window.__cls = 0; window.__lcp = 0; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); new PerformanceObserver((l) => { const e = l.getEntries(); window.__lcp = e[e.length - 1].startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}`;

async function open(browser: Browser, url: string, mobile: boolean, errors: string[]) {
  const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, locale: "fr-FR", deviceScaleFactor: 1 });
  await ctx.addInitScript(PERF_INIT);
  const page = await ctx.newPage();
  const net = { bytes: 0, requests: 0, js: 0, images: 0 };
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on("response", async (r) => {
    net.requests++;
    const len = Number(r.headers()["content-length"] ?? 0) || (await r.body().catch(() => Buffer.alloc(0))).length;
    net.bytes += len;
    if (/javascript/.test(r.headers()["content-type"] ?? "")) net.js += len;
    if (/image\//.test(r.headers()["content-type"] ?? "")) net.images += len;
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "networkidle" });
  const loadMs = Date.now() - t0;
  return { ctx, page, net, loadMs };
}

const still = "*{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}[data-reveal],[data-reveal] .es-w,[data-scroll-words] .es-w{opacity:1!important;transform:none!important;clip-path:none!important;filter:none!important}";

async function shot(page: Page, file: string, full = false) {
  // Capture pleine page : toutes les images chargées (sinon les images « paresseuses » hors écran restent vides).
  if (full) await page.evaluate(`Promise.all([...document.images].map((i) => { i.loading = "eager"; return i.complete && i.naturalWidth ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 4000); }); }))`);
  await page.addStyleTag({ content: still }).catch(() => {});
  await page.waitForTimeout(250);
  await page.screenshot({ path: file, fullPage: full });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const summary: Record<string, unknown> = {};
for (const s of (only ?? THEME_SCENARIOS) as ThemeScenario[]) {
  const projectId = ids[s];
  const spec = await compose(projectId);
  const v = fr(() => saveThemeVersion(projectId, spec, JSON.stringify({ fr: `Benchmark ${engine} (${label})`, en: `Benchmark ${engine} (${label})` }), "system"));
  const files = compileTheme(spec);
  const srv = await serve(spec, files);
  const dir = path.join(OUT, s);
  fs.mkdirSync(dir, { recursive: true });
  const second = secondaryPath(spec);
  const report: Record<string, any> = { scenario: s, engine, label, projectId, version: v.number, secondary: second, pages: {} };
  for (const [name, p] of [["accueil", "/"], ["secondaire", second]] as const) {
    for (const mobile of [false, true]) {
      const dev = mobile ? "mobile" : "desktop";
      const errors: string[] = [];
      const { ctx, page, net, loadMs } = await open(browser, srv.base + p, mobile, errors);
      const findings: Finding[] = await visualCheck(page, dev, { checkLinks: !mobile && name === "accueil", home: name === "accueil" });
      const perf = (await page.evaluate("({ cls: window.__cls, lcp: window.__lcp, height: document.documentElement.scrollHeight, sections: document.querySelectorAll('main [id^=shopify-section]').length })")) as Record<string, number>;
      if (process.env.DEBUG_SECTION && name === "accueil" && !mobile) {
        const el = page.locator(`[data-es-type="${process.env.DEBUG_SECTION}"]`).first();
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(1200);
        console.log("  debug", await el.evaluate(`(e) => [...e.querySelectorAll("img")].map((i) => [i.getAttribute("src"), i.complete, i.naturalWidth, getComputedStyle(i).opacity, i.getBoundingClientRect().width, i.getBoundingClientRect().height].join(" "))`));
        await el.screenshot({ path: path.join(dir, `debug-${process.env.DEBUG_SECTION}.png`) });
        await page.evaluate("scrollTo(0,0)");
      }
      await shot(page, path.join(dir, `${label}-${name}-${dev}.png`));
      await shot(page, path.join(dir, `${label}-${name}-${dev}-complet.png`), true);
      if (name === "accueil") {
        if (mobile) {
          await page.evaluate("scrollTo(0,0)");
          const opened = await page.click("[data-menu-open]", { timeout: 2000 }).then(() => true).catch(() => false);
          await page.waitForTimeout(400);
          if (opened) await page.screenshot({ path: path.join(dir, `${label}-navigation-mobile.png`) });
          if (!opened) findings.push({ check: "navigation", severity: "blocking", detail: "menu mobile introuvable" });
          await page.keyboard.press("Escape").catch(() => {});
        } else {
          await page.evaluate("scrollTo(0,0)");
          await page.locator("header").first().screenshot({ path: path.join(dir, `${label}-navigation-desktop.png`) }).catch(() => {});
          findings.push(...(await keyboardCheck(page)));
          // Interaction : première question de FAQ ouverte, sinon ajout au panier.
          const summaryEl = page.locator("main details summary").first();
          if (await summaryEl.count()) {
            await summaryEl.scrollIntoViewIfNeeded();
            await summaryEl.click();
            await page.waitForTimeout(400);
            await page.locator("main details").first().locator("xpath=ancestor::*[starts-with(@id,'shopify-section')][1]").screenshot({ path: path.join(dir, `${label}-interaction-faq.png`) }).catch(() => {});
            report.interaction = "faq";
          }
          findings.push(...(await reducedMotionCheck(page)));
        }
      } else if (!mobile && /\/products\//.test(p)) {
        const add = page.locator("form[action*='/cart/add'] [type=submit], [name=add]").first();
        if (await add.count()) {
          await add.click().catch(() => {});
          await page.waitForTimeout(900);
          await page.screenshot({ path: path.join(dir, `${label}-interaction-panier.png`) });
          report.interactionCart = true;
        }
      }
      if (errors.length) findings.push(...errors.slice(0, 3).map((e) => ({ check: "js-error", severity: "blocking" as const, detail: e.slice(0, 160) })));
      report.pages[`${name}-${dev}`] = { path: p, findings, perf: { ...perf, loadMs, requests: net.requests, kb: Math.round(net.bytes / 1024), jsKb: Math.round(net.js / 1024), imagesKb: Math.round(net.images / 1024) } };
      await ctx.close();
    }
  }
  srv.close();
  const all = Object.values(report.pages as Record<string, { findings: Finding[] }>).flatMap((x) => x.findings);
  report.blocking = all.filter((f) => f.severity === "blocking").length;
  report.warnings = all.filter((f) => f.severity === "warning").length;
  report.structure = {
    home: spec.templates.index.order.map((k) => spec.templates.index.sections[k].type),
    header: spec.groups.header.order.map((k) => [spec.groups.header.sections[k].type, (spec.groups.header.sections[k].settings as any).layout ?? (spec.groups.header.sections[k].settings as any).shape ?? ""].join(":")),
    footer: spec.groups.footer.order.map((k) => [spec.groups.footer.sections[k].type, (spec.groups.footer.sections[k].settings as any).style ?? ""].join(":")),
    templates: Object.keys(spec.templates),
    fonts: [spec.settings.type_heading_font, spec.settings.type_body_font],
    direction: spec.direction,
    v2: (spec as any).meta?.v2 ? { site: (spec as any).meta.v2.site, language: (spec as any).meta.v2.language } : null,
  };
  fs.writeFileSync(path.join(dir, `${label}.json`), JSON.stringify(report, null, 2));
  summary[s] = { version: v.number, blocking: report.blocking, warnings: report.warnings, home: report.structure.home };
  console.log(`${report.blocking ? "✗" : "✓"} ${s} (${engine}) : ${report.blocking} défaut(s) bloquant(s), ${report.warnings} avertissement(s) — ${report.structure.home.join(" › ")}`);
}
await browser.close();
fs.writeFileSync(path.join(OUT, `${label}-resume.json`), JSON.stringify(summary, null, 2));
process.exit(0);
